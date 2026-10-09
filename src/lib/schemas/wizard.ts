import { z } from "zod";
import {
  rubricSchema,
  rubricWeightsSchema,
  salaryBandSchema,
} from "@/lib/schemas/rubric";

export const jobDescriptionSchema = z.object({
  title: z.string().trim().min(2, "Enter a job title").max(200),
  description: z
    .string()
    .trim()
    .min(20, "Add a bit more detail so the model can ask useful questions")
    .max(20000),
  geographicScope: z.string().trim().min(1, "Enter the geographic scope").max(200),
  employmentType: z.string().trim().min(1, "Enter the employment type").max(100),
  seniorityLevel: z.string().trim().min(1, "Enter the seniority level").max(100),
  outputLanguage: z.enum(["ar", "en"]).optional(),
  includeNationalityColumn: z.boolean(),
});

export const clarifyingQuestionsSchema = z.object({
  questions: z.array(z.string().min(1)).max(8),
});

export const clarifyingAnswerSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

export const clarifyingAnswersSchema = z.object({
  answers: z.array(clarifyingAnswerSchema),
});

const stringListItemSchema = z.object({
  value: z.string(),
});

export const salaryBandFormSchema = z.object({
  minScore: z.number().min(0).max(100),
  maxScore: z.number().min(0).max(100),
  minAED: z.number().min(0),
  maxAED: z.number().min(0),
});

export const rubricFormSchema = z.object({
  mustHave: z.array(stringListItemSchema),
  niceToHave: z.array(stringListItemSchema),
  minYearsExperience: z.string(),
  education: z.string(),
  languages: z.array(stringListItemSchema),
  location: z.string(),
  dealBreakers: z.array(stringListItemSchema),
  geographicScope: z.string(),
  employmentType: z.string(),
  seniorityLevel: z.string(),
  includeNationalityColumn: z.boolean(),
  salaryBands: z.array(salaryBandSchema),
  weights: rubricWeightsSchema,
});

export const createJobInputSchema = z.object({
  title: jobDescriptionSchema.shape.title,
  description: jobDescriptionSchema.shape.description,
  rubric: rubricSchema,
});

export type JobDescriptionInput = z.infer<typeof jobDescriptionSchema>;
export type ClarifyingQuestions = z.infer<typeof clarifyingQuestionsSchema>;
export type ClarifyingAnswer = z.infer<typeof clarifyingAnswerSchema>;
export type ClarifyingAnswers = z.infer<typeof clarifyingAnswersSchema>;
export type RubricFormValues = z.infer<typeof rubricFormSchema>;
export type CreateJobInput = z.infer<typeof createJobInputSchema>;
export type SalaryBandForm = z.infer<typeof salaryBandFormSchema>;
