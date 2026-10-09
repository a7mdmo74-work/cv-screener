import { describe, expect, it } from "vitest";
import { DEFAULT_RUBRIC_WEIGHTS, type Rubric } from "@/lib/schemas/rubric";
import { turboSchema } from "@/lib/schemas/turbo";
import { computeTotalScore } from "@/lib/ranking/rank";
import { dampenTurboResult, turboToScoreResult } from "@/lib/screening/turbo-map";

const rubric: Rubric = {
  mustHave: [],
  niceToHave: [],
  minYearsExperience: 2,
  education: null,
  languages: [],
  location: "Abu Dhabi",
  dealBreakers: [],
  weights: { ...DEFAULT_RUBRIC_WEIGHTS },
  geographicScope: "Abu Dhabi",
  employmentType: "Full-time",
  seniorityLevel: "Junior",
  currency: "AED",
  includeNationalityColumn: false,
  salaryBands: [],
};

describe("turbo mapping / re-rank", () => {
  it("recomputes totals from stored turbo JSON without an LLM call", () => {
    const turbo = turboSchema.parse({
      profile: {
        currentTitle: "Accountant",
        lastEmployer: "Acme",
        specialization: null,
        education: "BSc",
        totalYears: 3,
        relevantYears: 3,
        uaeYears: 1,
        location: "Abu Dhabi",
        leadership: null,
        software: ["Excel"],
        certifications: [],
        languages: ["English"],
      },
      scores: {
        relevantExperience: 8,
        leadership: 2,
        technicalSkills: 7,
        softwareSystems: 6,
        achievements: 5,
        uaeExperience: 4,
        jobFit: 7,
      },
      dealBreaker: false,
      strengths: "ERP",
      gaps: "Leadership",
      flags: [],
    });
    const stored = JSON.stringify(turbo);
    const parsed = turboSchema.parse(JSON.parse(stored));
    const score = turboToScoreResult(parsed);
    const total = computeTotalScore(score, rubric.weights);
    const heavier = computeTotalScore(score, {
      ...rubric.weights,
      relevantExperience: 40,
      jobFit: 5,
    });
    expect(total).toBeGreaterThan(0);
    expect(heavier).not.toBe(total);
  });

  it("dampens leadership and UAE when the profile contradicts the scores", () => {
    const inflated = turboSchema.parse({
      profile: {
        currentTitle: "Accountant",
        lastEmployer: "Acme",
        specialization: null,
        education: "BSc",
        totalYears: 2,
        relevantYears: 2,
        uaeYears: null,
        location: "Cairo",
        leadership: null,
        software: ["Excel"],
        certifications: [],
        languages: ["English"],
      },
      scores: {
        relevantExperience: 10,
        leadership: 10,
        technicalSkills: 10,
        softwareSystems: 10,
        achievements: 10,
        uaeExperience: 10,
        jobFit: 10,
      },
      dealBreaker: false,
      strengths: "ERP",
      gaps: "None",
      flags: [],
    });
    const damped = dampenTurboResult(inflated, rubric);
    expect(damped.scores.leadership).toBeLessThanOrEqual(3);
    expect(damped.scores.uaeExperience).toBeLessThanOrEqual(2);
    expect(damped.scores.achievements).toBeLessThanOrEqual(5);
  });
});
