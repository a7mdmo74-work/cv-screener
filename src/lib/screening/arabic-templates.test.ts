import { describe, expect, it } from "vitest";
import { turboSchema } from "@/lib/schemas/turbo";
import {
  ARABIC_FLAG_QUESTION,
  arabicRecommendationTier,
  verificationQuestionsFromTurbo,
} from "@/lib/screening/arabic-templates";

describe("Arabic templates", () => {
  it("maps flags to verification questions", () => {
    const result = turboSchema.parse({
      profile: {
        currentTitle: "Accountant",
        lastEmployer: null,
        specialization: null,
        education: null,
        totalYears: 2,
        relevantYears: 2,
        uaeYears: null,
        location: null,
        leadership: null,
        software: [],
        certifications: [],
        languages: [],
      },
      scores: {
        relevantExperience: 6,
        leadership: 3,
        technicalSkills: 6,
        softwareSystems: 5,
        achievements: 4,
        uaeExperience: 2,
        jobFit: 6,
      },
      dealBreaker: false,
      strengths: "ERP data entry",
      gaps: "No UAE years",
      flags: ["date_gap", "missing_dates"],
    });
    const questions = verificationQuestionsFromTurbo(result);
    expect(questions).toContain(ARABIC_FLAG_QUESTION.date_gap);
    expect(questions).toContain(ARABIC_FLAG_QUESTION.missing_dates);
    expect(questions.some((item) => item.includes("الشهادات"))).toBe(true);
  });

  it("maps score bands to Arabic tiers", () => {
    expect(arabicRecommendationTier(82)).toContain("مرشح قوي");
    expect(arabicRecommendationTier(40)).toContain("غير مناسب");
  });
});
