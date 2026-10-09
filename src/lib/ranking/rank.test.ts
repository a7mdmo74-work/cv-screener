import { describe, expect, it } from "vitest";
import { scoreCandidatePrompt } from "@/lib/llm/prompts";
import type { Candidate } from "@/lib/schemas/candidate";
import { FORBIDDEN_SCORING_FIELDS } from "@/lib/schemas/candidate";
import {
  DEFAULT_RUBRIC_WEIGHTS,
  parseRubric,
  type Rubric,
  type RubricWeights,
} from "@/lib/schemas/rubric";
import type { ScoreResult } from "@/lib/schemas/score";
import {
  computeDerivedFields,
  computeTotalScore,
  rankCandidates,
  scoringPayloadFromCandidate,
  suggestedSalary,
  weightTotal,
} from "@/lib/ranking/rank";

const weights: RubricWeights = { ...DEFAULT_RUBRIC_WEIGHTS };

const rubric: Rubric = {
  mustHave: ["AutoCAD"],
  niceToHave: [],
  minYearsExperience: 5,
  education: "Bachelor",
  languages: ["Arabic"],
  location: "Abu Dhabi",
  dealBreakers: ["No site experience"],
  weights,
  geographicScope: "Abu Dhabi and Dubai",
  employmentType: "Full-time",
  seniorityLevel: "Supervisory",
  currency: "AED",
  includeNationalityColumn: true,
  salaryBands: [
    { minScore: 80, maxScore: 100, minAED: 18000, maxAED: 22000 },
    { minScore: 65, maxScore: 79, minAED: 14000, maxAED: 17999 },
  ],
};

function score(overrides: Partial<ScoreResult> = {}): ScoreResult {
  return {
    scores: [
      { criterion: "relevantExperience", score: 8, evidence: "site work" },
      { criterion: "leadership", score: 6, evidence: "team of 8" },
      { criterion: "technicalSkills", score: 10, evidence: "AutoCAD" },
      { criterion: "softwareSystems", score: 5, evidence: "Excel" },
      { criterion: "achievements", score: 7, evidence: "cost saving" },
      { criterion: "uaeExperience", score: 8, evidence: "Dubai" },
      { criterion: "jobFit", score: 8, evidence: "landscape" },
    ],
    dealBreakerHit: false,
    strengths: "Clear site experience",
    risksAndGaps: "No professional licence",
    verificationPoints: ["Verify the bachelor certificate"],
    recommendationNarrative: "Suitable candidate; verify salary expectations.",
    ...overrides,
  };
}

const candidate: Candidate = {
  fullName: "Jane Doe",
  nationality: "DE",
  currentLocation: "Berlin",
  currentTitle: "Engineer",
  lastEmployer: "Acme",
  specialization: "Civil",
  education: "BSc",
  totalExperienceText: "6 years",
  totalYearsExperience: 6,
  availabilityNotice: "1 month",
  expectedSalary: "15000",
  dataQualityNote: "Clear CV",
  evidencePages: "1-2",
  phone: "+1 555 0100",
  email: "jane@example.com",
  linkedin: "https://linkedin.com/in/janedoe",
  relevantExperienceText: "Sites",
  leadershipExperienceText: "Led 4",
  uaeExperienceText: null,
  softwareSystems: ["AutoCAD"],
  technicalSkills: ["TypeScript"],
  certifications: [],
  courses: [],
  languages: ["English"],
  keyAchievements: ["Saved 10%"],
  gaps: [],
  inconsistencies: [],
};

describe("computeTotalScore", () => {
  it("computes a weighted 0-100 total", () => {
    expect(weightTotal(weights)).toBe(100);
    expect(computeTotalScore(score(), weights)).toBe(78);
  });

  it("returns 0 when a deal-breaker is hit", () => {
    expect(computeTotalScore(score({ dealBreakerHit: true }), weights)).toBe(0);
  });

  it("treats missing criteria as 0", () => {
    expect(
      computeTotalScore(
        {
          scores: [
            { criterion: "relevantExperience", score: 10, evidence: "all" },
          ],
          dealBreakerHit: false,
          strengths: "partial",
          risksAndGaps: "",
          verificationPoints: [],
          recommendationNarrative: "partial",
        },
        weights,
      ),
    ).toBe(25);
  });
});

describe("rankCandidates", () => {
  it("sorts higher totals first and keeps nulls last", () => {
    const ranked = rankCandidates([
      { id: "b", totalScore: 40 },
      { id: "c", totalScore: null },
      { id: "a", totalScore: 90 },
    ]);
    expect(ranked.map((row) => row.id)).toEqual(["a", "b", "c"]);
  });
});

describe("derived fields", () => {
  it("maps salary bands in code", () => {
    expect(suggestedSalary(82, rubric.salaryBands)).toContain("18000–22000");
    expect(suggestedSalary(40, rubric.salaryBands)).toContain("Not set");
    expect(suggestedSalary(80, [])).toContain("add salary bands");
  });

  it("assigns recommendation tiers without the LLM", () => {
    expect(computeDerivedFields(80, rubric).recommendation).toBe(
      "Strong candidate — recommend technical interview",
    );
    expect(computeDerivedFields(70, rubric).recommendation).toBe(
      "Good — conditional interview",
    );
    expect(computeDerivedFields(55, rubric).recommendation).toBe(
      "Average — reserve list",
    );
    expect(computeDerivedFields(10, rubric).recommendation).toBe(
      "Not suitable at this time",
    );
  });
});

describe("scoringPayloadFromCandidate", () => {
  it("omits contact and nationality fields before scoring", () => {
    const payload = scoringPayloadFromCandidate(candidate);
    for (const field of FORBIDDEN_SCORING_FIELDS) {
      expect(Object.keys(payload)).not.toContain(field);
    }
    expect(payload).not.toHaveProperty("fullName");
    expect(payload).not.toHaveProperty("phone");
    expect(payload).not.toHaveProperty("email");
    expect(payload).not.toHaveProperty("linkedin");
    expect(payload).not.toHaveProperty("nationality");
    expect(payload.technicalSkills).toEqual(["TypeScript"]);
    expect(payload.currentLocation).toBe("Berlin");
  });

  it("keeps forbidden fields out of the scoring prompt", () => {
    const prompt = scoreCandidatePrompt(
      scoringPayloadFromCandidate(candidate),
      rubric,
    );
    expect(prompt.system).toContain("senior HR manager");
    expect(prompt.system).toContain("15-person interview shortlist");
    expect(prompt.user).not.toContain("Jane Doe");
    expect(prompt.user).not.toContain("jane@example.com");
    expect(prompt.user).not.toContain("+1 555 0100");
    expect(prompt.user).not.toContain("linkedin.com/in/janedoe");
    expect(prompt.user).not.toMatch(/"nationality"/);
  });
});

describe("parseRubric", () => {
  it("upgrades legacy 5-criterion weights", () => {
    const parsed = parseRubric({
      mustHave: ["Node"],
      niceToHave: [],
      minYearsExperience: 3,
      education: "BSc",
      languages: ["English"],
      location: "Berlin",
      dealBreakers: [],
      weights: {
        skills: 40,
        experience: 30,
        education: 10,
        languages: 10,
        stability: 10,
      },
    });
    expect(parsed.weights).toEqual(DEFAULT_RUBRIC_WEIGHTS);
    expect(parsed.mustHave).toEqual(["Node"]);
    expect(parsed.currency).toBe("AED");
  });
});
