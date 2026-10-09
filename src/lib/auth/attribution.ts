import { prisma } from "@/db/client";
import { assertRole, type AuthenticatedUser } from "./policy";
import { decisionSchema } from "@/lib/schemas/workflow";

// Call only after requireRole(). Recheck inside the transaction to prevent
// revocation races, and never accept a reviewer/actor ID from submitted data.
export async function reviewKnowledgeChange(actor: AuthenticatedUser, id: string, outcome: "approved" | "rejected", note: string) {
  return prisma.$transaction(async tx => {
    assertRole(await tx.user.findUnique({ where: { id: actor.id } }), "hr_reviewer");
    const previous = await tx.knowledgeChange.findUniqueOrThrow({ where: { id } });
    if (previous.status !== "pending") throw new Error("ALREADY_REVIEWED");
    const change = await tx.knowledgeChange.update({ where: { id }, data: { status: outcome, reviewedBy: actor.id, reviewedAt: new Date(), reviewNote: note } });
    await tx.knowledgeAudit.create({ data: { actorId: actor.id, action: `knowledge_${outcome}`, entityType: "knowledge_change", entityId: id, beforeJson: JSON.stringify(previous), afterJson: JSON.stringify(change), note } });
    return change;
  });
}
export async function recordDecision(actor: AuthenticatedUser, cvId: string, decision: unknown, notes: string) {
  const parsed = decisionSchema.parse(decision);
  return prisma.$transaction(async tx => {
    assertRole(await tx.user.findUnique({ where: { id: actor.id } }), "hr_reviewer");
    const previous = await tx.decision.findUnique({ where: { cvId } });
    const data = { outcome: parsed.outcome, conditionsJson: JSON.stringify(parsed.conditions), decidedBy: actor.id, authenticatedUserId: actor.id, decidedAt: new Date(), notes };
    const result = await tx.decision.upsert({ where: { cvId }, create: { cvId, ...data }, update: data });
    await tx.knowledgeAudit.create({ data: { actorId: actor.id, action: "decision_recorded", entityType: "decision", entityId: cvId, beforeJson: previous ? JSON.stringify(previous) : null, afterJson: JSON.stringify(result) } });
    return result;
  });
}
