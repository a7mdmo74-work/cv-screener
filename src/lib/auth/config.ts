import "dotenv/config";
import { betterAuth } from "better-auth/minimal";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/db/client";
import { validPassword } from "./policy";

export function authOrigin() {
  const url = new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3000");
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) throw new Error("BETTER_AUTH_URL requires HTTPS outside localhost");
  return url.origin;
}
export function hashPassword(password: string) {
  if (!validPassword(password)) throw new Error("PASSWORD_POLICY");
  return hash(password, 12);
}
export const auth = betterAuth({
  baseURL: authOrigin(),
  secret: (() => { const secret = process.env.BETTER_AUTH_SECRET; if (!secret || secret.length < 32) throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters"); return secret; })(),
  database: prismaAdapter(prisma, { provider: "sqlite", transaction: true }),
  trustedOrigins: [authOrigin()],
  emailAndPassword: {
    enabled: true, disableSignUp: true, minPasswordLength: 12, maxPasswordLength: 72,
    password: { hash: hashPassword, verify: async ({ hash: stored, password }) => validPassword(password) && compare(password, stored) },
  },
  user: { additionalFields: { role: { type: "string", defaultValue: "viewer", input: false }, disabled: { type: "boolean", defaultValue: false, input: false } } },
  databaseHooks: { session: { create: { before: async session => { const user = await prisma.user.findUnique({ where: { id: session.userId } }); return Boolean(user && !user.disabled && !user.deletedAt); } } } },
  session: { expiresIn: 60 * 60 * 8, updateAge: 60 * 60, cookieCache: { enabled: false } },
  advanced: { useSecureCookies: true, defaultCookieAttributes: { httpOnly: true, secure: true, sameSite: "lax" } },
  rateLimit: { enabled: true, storage: "database", window: 60, max: 60, customRules: { "/sign-in/email": { window: 300, max: 5 } } },
});
