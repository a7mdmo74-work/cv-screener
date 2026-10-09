"use server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
import { reviewKnowledgeChange } from "@/lib/auth/attribution";
export async function reviewKnowledgeProposal(input: unknown) {
  const actor = await requireRole("hr_reviewer");
  const data = z.object({ id: z.string().min(1), outcome: z.enum(["approved", "rejected"]), note: z.string().trim().min(1).max(2000) }).parse(input);
  await reviewKnowledgeChange(actor, data.id, data.outcome, data.note);
  return { ok: true };
}
