import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/db/client";
import { auth } from "./config";
import { assertRole, AuthorizationError, type AuthenticatedUser, type Role } from "./policy";

export async function requireRole(required: Role = "viewer", requestHeaders?: Headers): Promise<AuthenticatedUser> {
  const session = await auth.api.getSession({ headers: requestHeaders ?? await headers() });
  const user = session ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, email: true, role: true, disabled: true, deletedAt: true } }) : null;
  assertRole(user, required);
  return { id: user!.id, name: user!.name, email: user!.email, role: user!.role as Role };
}
export async function requirePageRole(locale: string, role: Role = "viewer") {
  try { return await requireRole(role); }
  catch (error) {
    if (error instanceof AuthorizationError) redirect(`/${locale}/${error.status === 401 ? "login" : "forbidden"}`);
    throw error;
  }
}
export async function routeAccess(request: Request, role: Role = "viewer") {
  try { await requireRole(role, request.headers); return null; }
  catch (error) {
    if (error instanceof AuthorizationError) return Response.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
    throw error;
  }
}
