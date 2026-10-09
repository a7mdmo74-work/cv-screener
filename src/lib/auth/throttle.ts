import { createHash } from "node:crypto";
import { prisma } from "@/db/client";
// Persistent account + global budgets work without trusting forwarded IP headers.
export async function consumeBudget(scope: string, identifier: string, max: number, seconds = 300) {
  const key = createHash("sha256").update(`${scope}:${identifier}`).digest("hex");
  const now = new Date();
  return prisma.$transaction(async tx => {
    const previous = await tx.authThrottle.findUnique({ where: { key } });
    if (!previous || now.getTime() - previous.windowStart.getTime() >= seconds * 1000) {
      await tx.authThrottle.upsert({ where: { key }, create: { key, count: 1, windowStart: now }, update: { count: 1, windowStart: now } });
      return true;
    }
    if (previous.count >= max) return false;
    await tx.authThrottle.update({ where: { key }, data: { count: { increment: 1 } } });
    return true;
  });
}
