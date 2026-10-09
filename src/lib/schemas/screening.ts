import { z } from "zod";
import { candidateSchema } from "@/lib/schemas/candidate";
import {
  jobStatusSchema,
  parseStatusSchema,
  stageStatusSchema,
} from "@/lib/schemas/job";
import { rubricSchema, rubricWeightsSchema } from "@/lib/schemas/rubric";
import {
  criterionScoreSchema,
  recommendationTierSchema,
  scoreResultSchema,
} from "@/lib/schemas/score";
import { jobDescriptionSchema } from "@/lib/schemas/wizard";

export const screeningJobIdSchema = z.object({
  jobId: z.string().min(1),
});

export const deleteJobsSchema = z
  .array(z.string().min(1).max(64))
  .min(1)
  .max(50)
  .refine((jobIds) => new Set(jobIds).size === jobIds.length);

export const screeningCvIdSchema = z.object({
  jobId: z.string().min(1),
  cvId: z.string().min(1),
});

export const rerankSchema = z.object({
  jobId: z.string().min(1),
  weights: rubricWeightsSchema,
});

export const cloneJobSchema = z.object({
  sourceJobId: z.string().min(1),
  title: jobDescriptionSchema.shape.title,
  description: jobDescriptionSchema.shape.description,
  rubric: rubricSchema,
});

export const exportScopeSchema = z.enum(["all", "top15"]);

export const screeningStageSchema = z.enum([
  "draft",
  "queued",
  "extracting",
  "scoring",
  "rescoring",
  "pass_a",
  "turbo",
  "enrich",
  "done",
  "partial",
  "cancelled",
  "failed",
]);

export type ScreeningJobIdInput = z.infer<typeof screeningJobIdSchema>;
export type ScreeningCvIdInput = z.infer<typeof screeningCvIdSchema>;
export type RerankInput = z.infer<typeof rerankSchema>;
export type CloneJobInput = z.infer<typeof cloneJobSchema>;
export type ExportScope = z.infer<typeof exportScopeSchema>;
export type ScreeningStage = z.infer<typeof screeningStageSchema>;

export type ScreeningProgress = {
  jobId: string;
  title: string;
  status: z.infer<typeof jobStatusSchema>;
  stage: ScreeningStage;
  twoPass: boolean;
  turboMode: boolean;
  total: number;
  parsed: number;
  pending: number;
  extracted: number;
  scored: number;
  failed: number;
  notScreened: number;
  needsOcr: number;
  parseErrors: number;
  cvsPerMinute: number | null;
  tokensPerSecond: number | null;
  etaMinutes: number | null;
  deadlineAt: string | null;
  lockedConcurrency: number | null;
  timeBudgetMin: number;
  passACap: number;
};

export type RankedCandidate = {
  id: string;
  fileName: string;
  name: string | null;
  location: string | null;
  currentTitle: string | null;
  totalYearsExperience: number | null;
  totalExperienceText: string | null;
  uaeExperienceText: string | null;
  totalScore: number | null;
  recommendation: z.infer<typeof recommendationTierSchema> | null;
  suggestedSalary: string | null;
  strengths: string | null;
  risksAndGaps: string | null;
  verificationPoints: string[];
  stageStatus: z.infer<typeof stageStatusSchema>;
  dealBreakerHit: boolean;
  scores: z.infer<typeof criterionScoreSchema>[];
  error: string | null;
  passAScore: number | null;
  candidate: z.infer<typeof candidateSchema> | null;
};

export type UnparsedCv = {
  id: string;
  fileName: string;
  parseStatus: z.infer<typeof parseStatusSchema>;
  stageStatus: z.infer<typeof stageStatusSchema>;
  error: string | null;
};

export type JobResults = {
  jobId: string;
  title: string;
  status: z.infer<typeof jobStatusSchema>;
  twoPass: boolean;
  weights: z.infer<typeof rubricWeightsSchema>;
  includeNationalityColumn: boolean;
  top15: RankedCandidate[];
  all: RankedCandidate[];
  unparsed: UnparsedCv[];
  notScreened: UnparsedCv[];
};

export type CvDetail = {
  id: string;
  jobId: string;
  fileName: string;
  parseStatus: z.infer<typeof parseStatusSchema>;
  stageStatus: z.infer<typeof stageStatusSchema>;
  totalScore: number | null;
  recommendation: z.infer<typeof recommendationTierSchema> | null;
  suggestedSalary: string | null;
  error: string | null;
  hasFile: boolean;
  candidate: z.infer<typeof candidateSchema> | null;
  score: z.infer<typeof scoreResultSchema> | null;
  rawText: string;
};
