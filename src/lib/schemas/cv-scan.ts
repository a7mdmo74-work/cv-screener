import { z } from "zod";
import { MAX_FILE_BYTES } from "@/lib/parsing/constants";

export const cvScanResultSchema = z.object({
  overall_score: z.number().min(0).max(100),
  match_score: z.number().min(0).max(100),
  ats_score: z.number().min(0).max(100),
  years_experience: z.number().min(0).nullable(),
  matched_skills: z.array(z.string()),
  missing_skills: z.array(z.string()),
  missing_keywords: z.array(z.string()),
  strengths: z.array(z.string()),
  red_flags: z.array(z.string()),
  formatting_issues: z.array(z.string()),
  improvements: z.array(z.string()),
  recommendation: z.enum(["strong_yes", "yes", "maybe", "no"]),
  summary: z.string(),
});

export const cvScanRequestSchema = z.object({
  cv: z
    .instanceof(File)
    .refine(
      (file) => /\.(pdf|docx|txt)$/i.test(file.name),
      "Upload a PDF, DOCX, or TXT file.",
    )
    .refine((file) => file.size > 0, "CV file is empty")
    .refine(
      (file) => file.size <= MAX_FILE_BYTES,
      `CV file must be no larger than ${Math.floor(MAX_FILE_BYTES / (1024 * 1024))} MB`,
    ),
  jobDescription: z.string().trim().min(1).max(30_000),
});

export type CvScanResult = z.infer<typeof cvScanResultSchema>;
