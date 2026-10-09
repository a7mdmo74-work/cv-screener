import { z } from "zod";

export const SCORE_CRITERIA = [
  "relevantExperience",
  "leadership",
  "technicalSkills",
  "softwareSystems",
  "achievements",
  "uaeExperience",
  "jobFit",
] as const;

export const scoreCriterionKeySchema = z.enum(SCORE_CRITERIA);

export const DEFAULT_RUBRIC_WEIGHTS = {
  relevantExperience: 25,
  leadership: 10,
  technicalSkills: 20,
  softwareSystems: 10,
  achievements: 10,
  uaeExperience: 15,
  jobFit: 10,
} as const;

export const CRITERION_LABELS: Record<(typeof SCORE_CRITERIA)[number], string> = {
  relevantExperience: "Relevant experience",
  leadership: "Leadership",
  technicalSkills: "Technical skills",
  softwareSystems: "Software and systems",
  achievements: "Achievements",
  uaeExperience: "UAE experience",
  jobFit: "Job fit",
};

export const rubricWeightsSchema = z.object({
  relevantExperience: z.number().min(0),
  leadership: z.number().min(0),
  technicalSkills: z.number().min(0),
  softwareSystems: z.number().min(0),
  achievements: z.number().min(0),
  uaeExperience: z.number().min(0),
  jobFit: z.number().min(0),
});

export const salaryBandSchema = z.object({
  minScore: z.number().min(0).max(100),
  maxScore: z.number().min(0).max(100),
  minAED: z.number().min(0),
  maxAED: z.number().min(0),
});

export const llmRubricSchema = z.object({
  mustHave: z.array(z.string()),
  niceToHave: z.array(z.string()),
  minYearsExperience: z.number().nullable(),
  education: z.string().nullable(),
  languages: z.array(z.string()),
  location: z.string().nullable(),
  dealBreakers: z.array(z.string()),
  weights: rubricWeightsSchema,
});

export const rubricSchema = llmRubricSchema.extend({
  outputLanguage: z.enum(["en", "ar"]).optional(),
  geographicScope: z.string(),
  employmentType: z.string(),
  seniorityLevel: z.string(),
  currency: z.string(),
  includeNationalityColumn: z.boolean(),
  salaryBands: z.array(salaryBandSchema),
});

export type ScoreCriterionKey = z.infer<typeof scoreCriterionKeySchema>;
export type RubricWeights = z.infer<typeof rubricWeightsSchema>;
export type SalaryBand = z.infer<typeof salaryBandSchema>;
export type LlmRubric = z.infer<typeof llmRubricSchema>;
export type Rubric = z.infer<typeof rubricSchema>;

function cleanText(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.toLowerCase() === "null") {
    return null;
  }
  return trimmed;
}

function cleanList(values: string[]): string[] {
  return values
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && value.toLowerCase() !== "null");
}

function cleanRequired(value: string, fallback: string): string {
  const cleaned = cleanText(value);
  return cleaned ?? fallback;
}

export function normalizeRubric(
  rubric: LlmRubric & Partial<Pick<
    Rubric,
    | "outputLanguage"
    | "geographicScope"
    | "employmentType"
    | "seniorityLevel"
    | "currency"
    | "includeNationalityColumn"
    | "salaryBands"
  >>,
): Rubric {
  return {
    outputLanguage: rubric.outputLanguage,
    mustHave: cleanList(rubric.mustHave),
    niceToHave: cleanList(rubric.niceToHave),
    minYearsExperience: rubric.minYearsExperience,
    education: cleanText(rubric.education),
    languages: cleanList(rubric.languages),
    location: cleanText(rubric.location),
    dealBreakers: cleanList(rubric.dealBreakers),
    weights: rubric.weights,
    geographicScope: cleanRequired(rubric.geographicScope ?? "", ""),
    employmentType: cleanRequired(rubric.employmentType ?? "", ""),
    seniorityLevel: cleanRequired(rubric.seniorityLevel ?? "", ""),
    currency: cleanRequired(rubric.currency ?? "", "AED"),
    includeNationalityColumn: rubric.includeNationalityColumn ?? false,
    salaryBands: rubric.salaryBands ?? [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function coerceLegacyRubric(data: unknown): unknown {
  if (!isRecord(data)) {
    return data;
  }

  const weightsIn = isRecord(data.weights) ? data.weights : {};
  const hasNewWeights = SCORE_CRITERIA.every(
    (key) => typeof weightsIn[key] === "number",
  );

  return {
    ...data,
    mustHave: stringArray(data.mustHave),
    niceToHave: stringArray(data.niceToHave),
    languages: stringArray(data.languages),
    dealBreakers: stringArray(data.dealBreakers),
    minYearsExperience:
      typeof data.minYearsExperience === "number" ? data.minYearsExperience : null,
    education: typeof data.education === "string" ? data.education : null,
    location: typeof data.location === "string" ? data.location : null,
    weights: hasNewWeights ? weightsIn : { ...DEFAULT_RUBRIC_WEIGHTS },
  };
}

export function parseRubric(data: unknown): Rubric {
  const parsed = rubricSchema.safeParse(data);
  if (parsed.success) {
    return normalizeRubric(parsed.data);
  }

  const llm = llmRubricSchema.safeParse(data);
  if (llm.success) {
    return normalizeRubric(llm.data);
  }

  return normalizeRubric(llmRubricSchema.parse(coerceLegacyRubric(data)));
}

export function mergeJobMetadata(
  rubric: LlmRubric | Rubric,
  metadata: {
    outputLanguage?: "en" | "ar";
    geographicScope: string;
    employmentType: string;
    seniorityLevel: string;
    currency: string;
    includeNationalityColumn: boolean;
    salaryBands?: SalaryBand[];
  },
): Rubric {
  return normalizeRubric({
    ...rubric,
    ...metadata,
    salaryBands:
      metadata.salaryBands ??
      ("salaryBands" in rubric ? rubric.salaryBands : []),
  });
}
