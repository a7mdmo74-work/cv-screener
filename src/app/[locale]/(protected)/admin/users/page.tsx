import { Suspense } from "react";
import { requirePageRole } from "@/lib/auth/server";
import { prisma } from "@/db/client";
import { UsersPanel } from "@/components/auth/users-panel";
import { roles } from "@/lib/auth/policy";
import { z } from "zod";
export default function UsersPage({ params }: { params: Promise<{ locale: string }> }) { return <Suspense><UsersView params={params} /></Suspense>; }
async function UsersView({ params }: { params: Promise<{ locale: string }> }) {
  const actor = await requirePageRole((await params).locale, "admin");
  const [users, activeAdmins] = await Promise.all([
    prisma.user.findMany({ where: { deletedAt: null, id: { not: actor.id } }, select: { id: true, name: true, email: true, role: true, disabled: true }, orderBy: { createdAt: "asc" } }),
    prisma.user.count({ where: { deletedAt: null, role: "admin", disabled: false } }),
  ]);
  return <UsersPanel users={users.map(user => ({ ...user, role: z.enum(roles).parse(user.role) }))} activeAdmins={activeAdmins} />;
}

// Authentication may redirect at request time; do not validate a prefetched shell.
export const instant = false;
