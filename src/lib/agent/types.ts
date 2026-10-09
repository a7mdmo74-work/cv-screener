import { z } from "zod";
export const confidenceSchema = z.enum(["high", "medium", "low"]);
export const evidenceSchema = z.object({ reference: z.string().max(120), snippet: z.string().max(500), confidence: confidenceSchema });
export const agentMetadataSchema = z.object({
  personaVersion: z.string(), promptVersion: z.string(), skillId: z.string(), skillVersion: z.string(), model: z.string(), variant: z.enum(["compact", "full"]), inputHash: z.string(), knowledgeVersion: z.string(), knowledgeAsOf: z.string(),
  knowledgeEntries: z.array(z.object({ id: z.string(), version: z.number(), verifiedAt: z.string().nullable() })),
  confidence: confidenceSchema, insufficientEvidence: z.boolean(), needsHumanReview: z.boolean(), violations: z.array(z.string()), latencyMs: z.number(), promptTokens: z.number(), completionTokens: z.number(),
});
export type AgentMetadata = z.infer<typeof agentMetadataSchema>;
export const assuranceShape = { confidence: confidenceSchema.default("low"), insufficientEvidence: z.boolean().default(true) };
export const taggedText = z.string().max(1800);
export const findingSchema = z.object({ fact: taggedText, evidence: z.array(evidenceSchema).max(8), ...assuranceShape });
