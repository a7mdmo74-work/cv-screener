import { z } from "zod";
import { SCORE_CRITERIA } from "@/lib/schemas/rubric";
import {
  FAST_CONCURRENCY,
  FAST_ENRICH_COUNT,
  FAST_PASS_A_CAP,
  llmConfig,
} from "@/lib/llm/config";

export const TURBO_FLAGS = [
  "date_gap",
  "overlap",
  "summary_mismatch",
  "future_date",
  "missing_dates",
] as const;

export const turboFlagSchema = z.enum(TURBO_FLAGS);

export const turboScoresSchema = z.object({
  relevantExperience: z.number().int().min(0).max(10),
  leadership: z.number().int().min(0).max(10),
  technicalSkills: z.number().int().min(0).max(10),
  softwareSystems: z.number().int().min(0).max(10),
  achievements: z.number().int().min(0).max(10),
  uaeExperience: z.number().int().min(0).max(10),
  jobFit: z.number().int().min(0).max(10),
});

export const turboProfileSchema = z.object({
  currentTitle: z.string().nullable(),
  lastEmployer: z.string().nullable(),
  specialization: z.string().nullable(),
  education: z.string().nullable(),
  totalYears: z.number().nullable(),
  relevantYears: z.number().nullable(),
  uaeYears: z.number().nullable(),
  location: z.string().nullable(),
  leadership: z.string().max(100).nullable(),
  software: z.array(z.string()).max(6),
  certifications: z.array(z.string()).max(5),
  languages: z.array(z.string()).max(4),
});

export const turboSchema = z.object({
  profile: turboProfileSchema,
  scores: turboScoresSchema,
  dealBreaker: z.boolean(),
  strengths: z.string().max(120),
  gaps: z.string().max(120),
  flags: z.array(turboFlagSchema).max(3),
});

export const turboRetrySchema = z.object({
  profile: turboProfileSchema,
  scores: turboScoresSchema,
  dealBreaker: z.boolean(),
  strengths: z.string().max(120),
  gaps: z.string().max(120),
  flags: z.array(turboFlagSchema).max(3),
});

export const contactJsonSchema = z.object({
  fullName: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  linkedin: z.string().nullable(),
});

export const concurrencyModeSchema = z.union([
  z.literal("auto"),
  z.number().int().min(1).max(8),
]);

export const turboSettingsSchema = z.object({
  timeBudgetMin: z.number().int().min(5).max(240),
  passACap: z.number().int().min(0),
  concurrency: concurrencyModeSchema,
  enrichCount: z.number().int().min(0).max(40),
  bulkModel: z.string().min(1),
  judgeTop10: z.boolean(),
  truncateChars: z.number().int().min(1000).max(8000),
});

export const defaultTurboSettings = (): TurboSettings => ({
  timeBudgetMin: llmConfig.timeBudgetMin,
  passACap: FAST_PASS_A_CAP,
  concurrency: FAST_CONCURRENCY,
  enrichCount: FAST_ENRICH_COUNT,
  bulkModel: llmConfig.bulkModel,
  judgeTop10: false,
  truncateChars: llmConfig.turboTruncateChars,
});

export function parseTurboSettings(raw: string | null | undefined): TurboSettings {
  let data: unknown = {};
  if (raw && raw.length > 0) {
    try {
      data = JSON.parse(raw) as unknown;
    } catch {
      data = {};
    }
  }
  const parsed = turboSettingsSchema.partial().safeParse(data);
  return { ...defaultTurboSettings(), ...(parsed.success ? parsed.data : {}) };
}

export const TURBO_CRITERIA = SCORE_CRITERIA;

export type TurboFlag = z.infer<typeof turboFlagSchema>;
export type TurboScores = z.infer<typeof turboScoresSchema>;
export type TurboProfile = z.infer<typeof turboProfileSchema>;
export type TurboResult = z.infer<typeof turboSchema>;
export type ContactJson = z.infer<typeof contactJsonSchema>;
export type TurboSettings = z.infer<typeof turboSettingsSchema>;
