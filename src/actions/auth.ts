"use server";
import { headers } from "next/headers";
import { z } from "zod";
import { authOrigin } from "@/lib/auth/config";
import { setupAdmin, createAccount, updateAccount, accountInput } from "@/lib/auth/accounts";
import { invitationMailer } from "@/lib/auth/invitation";
import { getLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth/server";
import { consumeBudget } from "@/lib/auth/throttle";
import { roles } from "@/lib/auth/policy";
import { updateOwnName, removeAccount } from "@/lib/auth/accounts";

function accountError(error: unknown) {
  if (error instanceof Error && error.message === "PASSWORD_POLICY") return "invalid_password" as const;
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
  if (code === "P2002" || (error instanceof Error && /unique constraint/i.test(error.message))) return "email_taken" as const;
  return "failed" as const;
}
export async function removeUser(input: unknown) {
  const actor = await requireRole("admin");
  const parsed = z.object({ id: z.string().min(1).max(128) }).strict().safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "failed" as const };
  try {
    await removeAccount(actor, parsed.data.id);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error && error.message === "LAST_ADMIN" ? "last_admin_required" as const : "failed" as const };
  }
}
export async function updateMyProfile(input: unknown) {
  const actor = await requireRole("viewer");
  const parsed = z.object({ name: z.string().trim().min(1).max(100) }).strict().safeParse(input);
  if (!parsed.success) return { ok: false as const };
  try {
    const name = await updateOwnName(actor, parsed.data.name);
    return { ok: true as const, name };
  } catch { return { ok: false as const }; }
}
export async function firstRunSetup(input: unknown, token: string) {
  const h = await headers();
  if (h.get("origin") !== authOrigin()) return { ok: false };
  if (!await consumeBudget("setup", "all", 5)) return { ok: false };
  try { await setupAdmin(input, token); return { ok: true }; } catch { return { ok: false }; }
}
export async function addUser(input: unknown) {
  const actor = await requireRole("admin");
  let account: z.infer<typeof accountInput>;
  let sendInvitation: ReturnType<typeof invitationMailer>;
  let locale: string;
  try { account = accountInput.parse(input); }
  catch { return { ok: false as const, error: "invalid_user_details" as const }; }
  try { sendInvitation = invitationMailer(); }
  catch { return { ok: false as const, error: "invitation_configuration_failed" as const }; }
  try { locale = await getLocale(); }
  catch { locale = "en"; }
  try { await createAccount(actor, account); }
  catch (error) { return { ok: false as const, error: accountError(error) }; }
  try {
    await sendInvitation(account, locale);
    return { ok: true as const, invitationSent: true };
  } catch {
    // Creation committed; do not report it as failed and encourage duplicate creation.
    return { ok: true as const, invitationSent: false };
  }
}
export async function changeUser(input: unknown) {
  const actor = await requireRole("admin");
  const data = z.object({ id: z.string(), role: z.enum(roles), disabled: z.boolean(), password: z.string().optional() }).parse(input);
  try { await updateAccount(actor, data.id, data.role, data.disabled, data.password); return { ok: true }; } catch { return { ok: false }; }
}
