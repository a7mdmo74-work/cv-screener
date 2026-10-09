import { z } from "zod";
import { scoreCriterionKeySchema } from "@/lib/schemas/rubric";

export { SCORE_CRITERIA, scoreCriterionKeySchema } from "@/lib/schemas/rubric";
export type { ScoreCriterionKey } from "@/lib/schemas/rubric";

export const criterionScoreSchema = z.object({
  criterion: scoreCriterionKeySchema,
  score: z.number().min(0).max(10),
  evidence: z.string(),
});

export const scoreResultSchema = z.object({
  scores: z.array(criterionScoreSchema),
  dealBreakerHit: z.boolean(),
  strengths: z.string(),
  risksAndGaps: z.string(),
  verificationPoints: z.array(z.string()),
  recommendationNarrative: z.string(),
});

export const recommendationTierSchema = z.enum([
  "Strong candidate — recommend technical interview",
  "Good — conditional interview",
  "Average — reserve list",
  "Not suitable at this time",
]);

export type CriterionScore = z.infer<typeof criterionScoreSchema>;
export type ScoreResult = z.infer<typeof scoreResultSchema>;
export type RecommendationTier = z.infer<typeof recommendationTierSchema>;
