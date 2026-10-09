import { randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/db/client";
import { hashPassword } from "./config";
import { assertRole, roles, type AuthenticatedUser, type Role } from "./policy";

export async function updateOwnName(actor: AuthenticatedUser, name: string) {
  const validatedName = z.string().trim().min(1).max(100).parse(name);
  return prisma.$transaction(async tx => {
    const current = await tx.user.findUnique({ where: { id: actor.id } });
    assertRole(current, "viewer");
    await tx.user.update({ where: { id: actor.id }, data: { name: validatedName } });
    await tx.knowledgeAudit.create({
      data: {
        actorId: actor.id, action: "profile_updated", entityType: "user", entityId: actor.id,
        beforeJson: JSON.stringify({ name: current!.name }),
        afterJson: JSON.stringify({ name: validatedName }),
      },
    });
    return validatedName;
  });
}

export const accountInput = z.object({ name: z.string().trim().min(1).max(100), email: z.email().max(254).transform(v => v.toLowerCase()), password: z.string(), role: z.enum(roles) });
export function validSetupToken(input: string) {
  const expected = process.env.AUTH_SETUP_TOKEN;
  return Boolean(expected && expected.length >= 32 && Buffer.byteLength(input) === Buffer.byteLength(expected) && timingSafeEqual(Buffer.from(input), Buffer.from(expected)));
}
export async function setupAdmin(input: unknown, token: string) {
  if (!validSetupToken(token)) throw new Error("SETUP_DENIED");
  const data = accountInput.parse(input); const password = await hashPassword(data.password); const id = randomUUID();
  return prisma.$transaction(async tx => {
    if (await tx.user.count() || await tx.authSetup.findUnique({ where: { id: "singleton" } })) throw new Error("SETUP_COMPLETE");
    await tx.authSetup.create({ data: { id: "singleton" } });
    const user = await tx.user.create({ data: { id, email: data.email, name: data.name, role: "admin", accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password } } } });
    await tx.knowledgeAudit.create({ data: { actorId: id, action: "admin_setup", entityType: "user", entityId: id, afterJson: JSON.stringify({ role: "admin", email: data.email }) } });
    return user.id;
  });
}
export async function createAccount(actor: AuthenticatedUser, input: unknown) {
  const data = accountInput.parse(input); const password = await hashPassword(data.password); const id = randomUUID();
  return prisma.$transaction(async tx => {
    const current = await tx.user.findUnique({ where: { id: actor.id } });
    assertRole(current, "admin");
    await tx.user.create({ data: { id, name: data.name, email: data.email, role: data.role, accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password } } } });
    await tx.knowledgeAudit.create({ data: { actorId: actor.id, action: "user_created", entityType: "user", entityId: id, afterJson: JSON.stringify({ role: data.role, email: data.email }) } });
    return id;
  });
}
export async function updateAccount(actor: AuthenticatedUser, id: string, role: Role, disabled: boolean, newPassword?: string) {
  const password = newPassword ? await hashPassword(newPassword) : undefined;
  if (!roles.includes(role)) throw new Error("INVALID_ROLE");
  return prisma.$transaction(async tx => {
    const current = await tx.user.findUnique({ where: { id: actor.id } });
    assertRole(current, "admin");
    const target = await tx.user.findUniqueOrThrow({ where: { id } });
    if (target.deletedAt) throw new Error("USER_REMOVED");
    if (target.role === "admin" && !target.disabled && (role !== "admin" || disabled) && await tx.user.count({ where: { role: "admin", disabled: false, deletedAt: null } }) <= 1) throw new Error("LAST_ADMIN");
    await tx.user.update({ where: { id }, data: { role, disabled } });
    if (password) await tx.account.updateMany({ where: { userId: id, providerId: "credential" }, data: { password } });
    await tx.session.deleteMany({ where: { userId: id } });
    await tx.knowledgeAudit.create({ data: { actorId: actor.id, action: "user_updated", entityType: "user", entityId: id, beforeJson: JSON.stringify({ role: target.role, disabled: target.disabled }), afterJson: JSON.stringify({ role, disabled, passwordReset: Boolean(password) }) } });
  });
}

export async function removeAccount(actor: AuthenticatedUser, id: string) {
  return prisma.$transaction(async tx => {
    assertRole(await tx.user.findUnique({ where: { id: actor.id } }), "admin");
    const target = await tx.user.findUniqueOrThrow({ where: { id } });
    if (target.deletedAt) throw new Error("USER_REMOVED");
    if (target.role === "admin" && !target.disabled && await tx.user.count({ where: { role: "admin", disabled: false, deletedAt: null } }) <= 1) throw new Error("LAST_ADMIN");
    await tx.session.deleteMany({ where: { userId: id } });
    await tx.account.deleteMany({ where: { userId: id } });
    // Retain the identity row referenced by past approvals and decisions.
    // Release the sign-in email so an admin can create a replacement account.
    const removed = await tx.user.update({
      where: { id },
      data: { disabled: true, deletedAt: new Date(), email: `removed-${id}@removed.invalid`, emailVerified: false, image: null },
    });
    await tx.knowledgeAudit.create({
      data: {
        actorId: actor.id, action: "user_removed", entityType: "user", entityId: id,
        beforeJson: JSON.stringify({ name: target.name, email: target.email, role: target.role, disabled: target.disabled }),
        afterJson: JSON.stringify({ disabled: true, deletedAt: removed.deletedAt }),
      },
    });
  });
}
