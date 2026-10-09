import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const state = vi.hoisted(() => ({ headers: new Headers(), directory: "", setupKey: "test-setup-token-with-at-least-32-characters", sendInvitation: vi.fn(), mailConfigured: true }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "ar" }));
vi.mock("@/lib/auth/invitation", () => ({ invitationMailer: () => {
  if (!state.mailConfigured) throw new Error("MISSING_SMTP");
  return state.sendInvitation;
} }));
vi.mock("next/headers", () => ({ headers: async () => state.headers }));
vi.mock("@/db/client", async () => {
  const { mkdtempSync } = await import("node:fs"); const { tmpdir } = await import("node:os");
  const { default: Sqlite } = await import("better-sqlite3");
  const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
  const { PrismaClient } = await import("@/generated/prisma/client");
  state.directory = mkdtempSync(join(tmpdir(), "cv-auth-test-"));
  const file = join(state.directory, "test.db"); const sqlite = new Sqlite(file);
  for (const dir of readdirSync("prisma/migrations").filter(v => /^\d/.test(v)).sort()) sqlite.exec(readFileSync(`prisma/migrations/${dir}/migration.sql`, "utf8"));
  sqlite.close();
  return { prisma: new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: `file:${file}` }) }) };
});
import { prisma } from "@/db/client";
import { assertRole, AuthorizationError, roles, validPassword, type AuthenticatedUser } from "./policy";
import { setupAdmin, createAccount, updateAccount } from "./accounts";
import { requireRole } from "./server";
import { GET as authGet, POST as authPost } from "@/app/api/auth/[...all]/route";
import { reviewKnowledgeProposal } from "@/actions/approvals";
import { recordDecision } from "./attribution";
import { createJob } from "@/actions/wizard";
import { updateMyProfile, removeUser, addUser } from "@/actions/auth";
import { GET as csvDownload } from "@/app/jobs/[id]/export/route";
import { GET as xlsxDownload } from "@/app/jobs/[id]/export/xlsx/route";
import { GET as cvDownload } from "@/app/jobs/[id]/files/[cvId]/route";
import { GET as wordDownload } from "@/app/export/summary/docx/route";

let admin: AuthenticatedUser; let reviewer: AuthenticatedUser; let viewer: AuthenticatedUser;
let adminCookie = ""; let reviewerCookie = ""; let viewerCookie = "";
const password = "Correct-password-123";
function request(endpoint: string, body: unknown, origin = "http://localhost:3000") {
  return new Request(`http://localhost:3000/api/auth${endpoint}`, { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
async function login(email: string) {
  const response = await authPost(request("/sign-in/email", { email, password }));
  expect(response.status, await response.clone().text()).toBe(200);
  const cookie = response.headers.getSetCookie().find(value => value.includes("session_token="));
  expect(cookie).toMatch(/HttpOnly/i); expect(cookie).toMatch(/Secure/i); expect(cookie).toMatch(/SameSite=Lax/i);
  return cookie!.split(";")[0];
}
beforeAll(async () => {
  process.env.AUTH_SETUP_TOKEN = state.setupKey;
  const attempts = await Promise.allSettled([1, 2].map(() => setupAdmin({ name: "Admin", email: "admin@example.test", password, role: "viewer" }, state.setupKey)));
  expect(attempts.filter(r => r.status === "fulfilled")).toHaveLength(1);
  const id = (attempts.find(r => r.status === "fulfilled") as PromiseFulfilledResult<string>).value;
  admin = { id, name: "Admin", email: "admin@example.test", role: "admin" };
  const hrId = await createAccount(admin, { name: "Reviewer", email: "hr@example.test", password, role: "hr_reviewer" });
  reviewer = { id: hrId, name: "Reviewer", email: "hr@example.test", role: "hr_reviewer" };
  const viewerId = await createAccount(admin, { name: "Viewer", email: "viewer@example.test", password, role: "viewer" });
  viewer = { id: viewerId, name: "Viewer", email: "viewer@example.test", role: "viewer" };
  adminCookie = await login(admin.email); reviewerCookie = await login(reviewer.email); viewerCookie = await login(viewer.email);
}, 30000);
afterAll(async () => { await prisma.$disconnect(); rmSync(state.directory, { recursive: true, force: true }); });

describe("authentication boundaries", () => {
  it("stores bcrypt hashes, locks first setup and records the admin identity", async () => {
    const account = await prisma.account.findFirstOrThrow({ where: { userId: admin.id } });
    expect(account.password).toMatch(/^\$2[aby]\$12\$/); expect(account.password).not.toBe(password);
    await expect(setupAdmin({ name: "Other", email: "other@example.test", password, role: "admin" }, state.setupKey)).rejects.toThrow("SETUP_COMPLETE");
    expect((await prisma.knowledgeAudit.findFirstOrThrow({ where: { action: "admin_setup" } })).actorId).toBe(admin.id);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: admin.id } })).role).toBe("admin");
  });
  it("rejects wrong setup keys and bcrypt truncation", async () => {
    await expect(setupAdmin({}, "wrong-token")).rejects.toThrow("SETUP_DENIED");
    expect(validPassword("short")).toBe(false); expect(validPassword("ع".repeat(37))).toBe(false); expect(validPassword(password)).toBe(true);
  });
  it("enforces every role combination and rejects unknown/disabled users", () => {
    for (const role of roles) for (const required of roles) {
      const allowed = role === "admin" || role === required || (role === "hr_reviewer" && required === "viewer");
      if (allowed) expect(() => assertRole({ role }, required)).not.toThrow(); else expect(() => assertRole({ role }, required)).toThrow(AuthorizationError);
    }
    for (const user of [null, { role: "superuser" }, { role: "admin", disabled: true }]) expect(() => assertRole(user, "viewer")).toThrow();
  });
  it("denies unauthenticated Server Actions and all file/export endpoints", async () => {
    state.headers = new Headers(); await expect(requireRole()).rejects.toMatchObject({ status: 401 });
    await expect(createJob({} as never)).rejects.toMatchObject({ status: 401 });
    const request = new Request("http://localhost:3000/jobs/test/export");
    const context = { params: Promise.resolve({ id: "test", cvId: "test" }) };
    for (const result of await Promise.all([csvDownload(request, context), xlsxDownload(request, context), cvDownload(request, context), wordDownload(request)])) expect(result.status).toBe(401);
  });
  it("allows viewer reads, rejects mutations and checks current roles", async () => {
    state.headers = new Headers({ cookie: viewerCookie }); expect((await requireRole()).id).toBe(viewer.id);
    await expect(createJob({} as never)).rejects.toMatchObject({ status: 403 });
    await expect(requireRole("admin")).rejects.toMatchObject({ status: 403 });
    state.headers = new Headers({ cookie: reviewerCookie }); expect((await requireRole("hr_reviewer")).id).toBe(reviewer.id);
    await expect(requireRole("admin")).rejects.toMatchObject({ status: 403 });
  });
  it("rejects login CSRF and disables public signup/role editing endpoints", async () => {
    expect((await authPost(request("/sign-in/email", { email: admin.email, password }, "https://attacker.test"))).status).toBe(403);
    expect((await authPost(request("/sign-up/email", {}))).status).toBe(404);
    expect((await authPost(request("/update-user", { role: "admin" }))).status).toBe(404);
    expect((await authGet(new Request("http://localhost:3000/api/auth/sign-up/email"))).status).toBe(404);
  });
  it("rejects oversized auth payloads and mutation GET requests", async () => {
    expect((await authPost(request("/sign-in/email", { email: "test@example.test", password: "a".repeat(5000) }))).status).toBe(413);
    expect((await authGet(new Request("http://localhost:3000/api/auth/sign-out"))).status).toBe(405);
  });
  it("persists an account login budget despite changing forwarded IPs", async () => {
    const attempts = [];
    for (let i = 0; i < 6; i++) {
      const req = request("/sign-in/email", { email: "unknown@example.test", password }); req.headers.set("x-forwarded-for", `203.0.113.${i}`);
      attempts.push((await authPost(req)).status);
    }
    expect(attempts.slice(0, 5)).not.toContain(200); expect(attempts[5]).toBe(429);
  }, 15000);
});

describe("authenticated audit attribution", () => {
  it("sends admin invitations only after account creation and keeps delivery failures distinct", async () => {
    const input = { name: "Invited", email: "invited@example.test", password, role: "viewer" };
    state.headers = new Headers();
    await expect(addUser(input)).rejects.toMatchObject({ status: 401 });
    state.headers = new Headers({ cookie: viewerCookie });
    await expect(addUser(input)).rejects.toMatchObject({ status: 403 });
    expect(state.sendInvitation).not.toHaveBeenCalled();
    state.headers = new Headers({ cookie: adminCookie });
    state.mailConfigured = false;
    expect(await addUser({ ...input, email: "invalid" })).toEqual({ ok: false, error: "invalid_user_details" });
    expect(await addUser(input)).toEqual({ ok: false, error: "invitation_configuration_failed" });
    expect(await prisma.user.findUnique({ where: { email: input.email } })).toBeNull();
    state.mailConfigured = true;
    expect(await addUser({ ...input, password: "too-short" })).toEqual({ ok: false, error: "invalid_password" });
    expect(await prisma.user.findUnique({ where: { email: input.email } })).toBeNull();
    state.sendInvitation.mockImplementationOnce(async (account, locale) => {
      const user = await prisma.user.findUniqueOrThrow({ where: { email: account.email } });
      const credential = await prisma.account.findFirstOrThrow({ where: { userId: user.id } });
      expect(credential.password).not.toBe(password);
      const audit = await prisma.knowledgeAudit.findFirstOrThrow({ where: { entityId: user.id, action: "user_created" } });
      expect(audit.actorId).toBe(admin.id);
      expect(audit.afterJson).not.toContain(password);
      expect(locale).toBe("ar");
    });
    expect(await addUser(input)).toEqual({ ok: true, invitationSent: true });
    expect(state.sendInvitation).toHaveBeenCalledWith(input, "ar");
    expect(await addUser(input)).toEqual({ ok: false, error: "email_taken" });
    expect(state.sendInvitation).toHaveBeenCalledTimes(1);
    state.sendInvitation.mockRejectedValueOnce(new Error("SMTP_TIMEOUT"));
    const failed = { ...input, email: "delivery-failed@example.test" };
    expect(await addUser(failed)).toEqual({ ok: true, invitationSent: false });
    expect(await prisma.user.findUnique({ where: { email: failed.email } })).not.toBeNull();
  });
  it("allows users to update only their own name and records the authenticated identity", async () => {
    state.headers = new Headers();
    await expect(updateMyProfile({ name: "Updated" })).rejects.toMatchObject({ status: 401 });
    state.headers = new Headers({ cookie: viewerCookie });
    for (const input of [{ name: "   " }, { name: "a".repeat(101) }, { name: "Spoof", id: admin.id }, { name: "Spoof", role: "admin", email: admin.email }]) {
      expect(await updateMyProfile(input)).toEqual({ ok: false });
    }
    expect(await prisma.knowledgeAudit.count({ where: { action: "profile_updated" } })).toBe(0);
    expect(await updateMyProfile({ name: "  Viewer Updated  " })).toEqual({ ok: true, name: "Viewer Updated" });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: viewer.id } });
    expect(user.name).toBe("Viewer Updated");
    expect(user.email).toBe(viewer.email);
    expect(user.role).toBe("viewer");
    expect((await requireRole()).name).toBe("Viewer Updated");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: admin.id } })).name).toBe("Admin");
    const audit = await prisma.knowledgeAudit.findFirstOrThrow({ where: { action: "profile_updated" } });
    expect(audit.actorId).toBe(viewer.id);
    expect(audit.entityId).toBe(viewer.id);
    expect(JSON.parse(audit.beforeJson!)).toEqual({ name: "Viewer" });
    expect(JSON.parse(audit.afterJson!)).toEqual({ name: "Viewer Updated" });
  });
  it("ignores a submitted reviewer identity and atomically records approvals", async () => {
    const change = await prisma.knowledgeChange.create({ data: { proposalJson: "{}" } });
    state.headers = new Headers({ cookie: viewerCookie });
    await expect(reviewKnowledgeProposal({ id: change.id, outcome: "approved", note: "Reviewed", reviewedBy: admin.id })).rejects.toMatchObject({ status: 403 });
    expect((await prisma.knowledgeChange.findUniqueOrThrow({ where: { id: change.id } })).status).toBe("pending");
    state.headers = new Headers({ cookie: reviewerCookie });
    await reviewKnowledgeProposal({ id: change.id, outcome: "approved", note: "Reviewed", reviewedBy: admin.id, actorId: admin.id });
    expect((await prisma.knowledgeChange.findUniqueOrThrow({ where: { id: change.id } })).reviewedBy).toBe(reviewer.id);
    const audit = await prisma.knowledgeAudit.findFirstOrThrow({ where: { entityId: change.id } });
    expect(audit.actorId).toBe(reviewer.id); expect(JSON.parse(audit.beforeJson!).status).toBe("pending"); expect(JSON.parse(audit.afterJson!).status).toBe("approved");
    await expect(reviewKnowledgeProposal({ id: change.id, outcome: "rejected", note: "Again" })).rejects.toThrow("ALREADY_REVIEWED");
    expect(await prisma.knowledgeAudit.count({ where: { entityId: change.id } })).toBe(1);
  });
  it("records decisions with user IDs while preserving supplied decision calculations", async () => {
    const job = await prisma.job.create({ data: { title: "Test", description: "Test", rubricJson: "{}" } });
    const cv = await prisma.cv.create({ data: { jobId: job.id, fileName: "test.pdf", filePath: "test.pdf" } });
    const decision = { outcome: "Hold", composite: 62, weights: { cv: 25, exam: 35, interview: 40 }, conditions: ["Verify experience"], gates: [], recommendedTitle: "Accountant", level: "mid" };
    await expect(recordDecision(viewer, cv.id, decision, "Reviewed")).rejects.toMatchObject({ status: 403 });
    const record = await recordDecision(reviewer, cv.id, decision, "Reviewed");
    expect(record.decidedBy).toBe(reviewer.id); expect(record.authenticatedUserId).toBe(reviewer.id); expect(record.outcome).toBe("Hold");
    expect(JSON.parse(record.conditionsJson)).toEqual(decision.conditions);
    expect((await prisma.knowledgeAudit.findFirstOrThrow({ where: { entityId: cv.id } })).actorId).toBe(reviewer.id);
  });
  it("restricts removal to admins, revokes access and preserves historical attribution", async () => {
    state.headers = new Headers();
    await expect(removeUser({ id: reviewer.id })).rejects.toMatchObject({ status: 401 });
    for (const cookie of [viewerCookie, reviewerCookie]) {
      state.headers = new Headers({ cookie });
      await expect(removeUser({ id: admin.id })).rejects.toMatchObject({ status: 403 });
    }
    const email = "remove@example.test";
    const id = await createAccount(admin, { name: "Remove Me", email, password, role: "hr_reviewer" });
    const cookie = await login(email);
    const change = await prisma.knowledgeChange.create({ data: { proposalJson: "{}", status: "approved", reviewedBy: id } });
    const historicAudit = await prisma.knowledgeAudit.create({ data: { actorId: id, action: "knowledge_approved", entityType: "knowledge_change", entityId: change.id } });
    state.headers = new Headers({ cookie: adminCookie });
    expect(await removeUser({ id, actorId: reviewer.id })).toEqual({ ok: false, error: "failed" });
    expect(await removeUser({ id })).toEqual({ ok: true });
    const removed = await prisma.user.findUniqueOrThrow({ where: { id } });
    expect(removed.deletedAt).not.toBeNull();
    expect(removed.disabled).toBe(true);
    expect(await prisma.account.count({ where: { userId: id } })).toBe(0);
    expect(await prisma.session.count({ where: { userId: id } })).toBe(0);
    expect(await prisma.user.count({ where: { id, deletedAt: null } })).toBe(0);
    expect((await prisma.knowledgeChange.findUniqueOrThrow({ where: { id: change.id } })).reviewedBy).toBe(id);
    expect((await prisma.knowledgeAudit.findUniqueOrThrow({ where: { id: historicAudit.id } })).actorId).toBe(id);
    const audit = await prisma.knowledgeAudit.findFirstOrThrow({ where: { entityId: id, action: "user_removed" } });
    expect(audit.actorId).toBe(admin.id);
    expect(JSON.parse(audit.beforeJson!).email).toBe(email);
    state.headers = new Headers({ cookie });
    await expect(requireRole()).rejects.toMatchObject({ status: 401 });
    await expect(updateAccount(admin, id, "viewer", false)).rejects.toThrow("USER_REMOVED");
    const replacement = await createAccount(admin, { name: "Replacement", email, password, role: "viewer" });
    expect(replacement).not.toBe(id);
  });
  it("refuses to remove the last active admin without changing its session", async () => {
    state.headers = new Headers({ cookie: adminCookie });
    expect(await removeUser({ id: admin.id })).toEqual({ ok: false, error: "last_admin_required" });
    expect((await requireRole("admin")).id).toBe(admin.id);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: admin.id } })).deletedAt).toBeNull();
    expect(await prisma.knowledgeAudit.count({ where: { action: "user_removed", entityId: admin.id } })).toBe(0);
  });
  it("prevents last-admin removal, revokes sessions and records account updates", async () => {
    await expect(updateAccount(admin, admin.id, "viewer", false)).rejects.toThrow("LAST_ADMIN");
    await updateAccount(admin, viewer.id, "viewer", true);
    expect(await prisma.session.count({ where: { userId: viewer.id } })).toBe(0);
    state.headers = new Headers({ cookie: viewerCookie }); await expect(requireRole()).rejects.toMatchObject({ status: 401 });
    expect((await authPost(request("/sign-in/email", { email: viewer.email, password }))).status).not.toBe(200);
    expect((await prisma.knowledgeAudit.findFirstOrThrow({ where: { entityId: viewer.id, action: "user_updated" } })).actorId).toBe(admin.id);
    state.headers = new Headers({ cookie: adminCookie }); expect((await requireRole("admin")).id).toBe(admin.id);
  });
});
