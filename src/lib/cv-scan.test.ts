import { describe, expect, it } from "vitest";
import { readCV } from "@/lib/cv-scan";
import {
  cvScanRequestSchema,
  cvScanResultSchema,
} from "@/lib/schemas/cv-scan";

describe("CV scan", () => {
  it("extracts text from TXT files", async () => {
    const file = new File(["  Product manager with five years of experience.  "], "resume.txt");

    await expect(readCV(file)).resolves.toBe(
      "Product manager with five years of experience.",
    );
  });

  it("rejects unsupported file extensions", async () => {
    const file = new File(["resume"], "resume.rtf");

    await expect(readCV(file)).rejects.toThrow(
      "Unsupported CV format. Upload a PDF, DOCX, or TXT file.",
    );
  });

  it("validates uploaded CVs and job descriptions", () => {
    const input = {
      cv: new File(["resume"], "resume.txt"),
      jobDescription: "Product manager",
    };

    expect(cvScanRequestSchema.safeParse(input).success).toBe(true);
    expect(
      cvScanRequestSchema.safeParse({
        ...input,
        cv: new File(["resume"], "resume.rtf"),
      }).success,
    ).toBe(false);
  });

  it("validates the complete scan result shape and score ranges", () => {
    const result = {
      overall_score: 80,
      match_score: 75,
      ats_score: 90,
      years_experience: 5,
      matched_skills: ["Product strategy"],
      missing_skills: [],
      missing_keywords: [],
      strengths: ["Relevant experience"],
      red_flags: [],
      formatting_issues: [],
      improvements: [],
      recommendation: "yes",
      summary: "Good fit for the role.",
    };

    expect(cvScanResultSchema.safeParse(result).success).toBe(true);
    expect(
      cvScanResultSchema.safeParse({ ...result, ats_score: 101 }).success,
    ).toBe(false);
  });
});
