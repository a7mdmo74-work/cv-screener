export const roles = ["admin", "hr_reviewer", "viewer"] as const;
export type Role = (typeof roles)[number];
export type AuthenticatedUser = { id: string; name: string; email: string; role: Role };
export class AuthorizationError extends Error {
  constructor(public status: 401 | 403) { super(status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN"); }
}
export function assertRole(user: { role: string; disabled?: boolean; deletedAt?: Date | null } | null, required: Role): asserts user is { role: Role; disabled?: boolean; deletedAt?: Date | null } {
  if (!user || user.disabled || user.deletedAt) throw new AuthorizationError(401);
  const permitted = user.role === "admin" || user.role === required || (required === "viewer" && user.role === "hr_reviewer");
  if (!roles.includes(user.role as Role) || !permitted) throw new AuthorizationError(403);
}
export function validPassword(password: string) {
  return password.length >= 12 && Buffer.byteLength(password, "utf8") <= 72;
}
