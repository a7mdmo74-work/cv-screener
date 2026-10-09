import { describe, expect, it } from "vitest";
import { buildUnifiedSummaryDocx } from "@/lib/export/word";
import { DEFAULT_RUBRIC_WEIGHTS, type Rubric } from "@/lib/schemas/rubric";

const rubric: Rubric = {
  mustHave: [],
  niceToHave: [],
  minYearsExperience: null,
  education: null,
  languages: [],
  location: null,
  dealBreakers: [],
  weights: { ...DEFAULT_RUBRIC_WEIGHTS },
  geographicScope: "Abu Dhabi and Dubai",
  employmentType: "Full-time",
  seniorityLevel: "Supervisory",
  currency: "AED",
  includeNationalityColumn: true,
  salaryBands: [],
};

describe("buildUnifiedSummaryDocx", () => {
  it("returns a docx buffer", async () => {
    const buffer = await buildUnifiedSummaryDocx({
      jobs: [
        {
          title: "Site engineer",
          rubric,
          scoredCount: 1,
          top15: [
            {
              id: "1",
              fileName: "a.pdf",
              name: "Candidate A",
              location: "Dubai",
              currentTitle: "Engineer",
              totalYearsExperience: 8,
              totalExperienceText: "8 years",
              uaeExperienceText: "Dubai",
              totalScore: 88,
              recommendation: "Strong candidate — recommend technical interview",
              suggestedSalary: "Not set",
              strengths: null,
              risksAndGaps: null,
              verificationPoints: [],
              stageStatus: "scored",
              dealBreakerHit: false,
              scores: [],
              error: null,
              passAScore: 80,
              candidate: null,
            },
          ],
        },
      ],
    });
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
  });
});

it("exports Arabic static text and bidirectional paragraphs", async () => {
  const buffer=await buildUnifiedSummaryDocx({locale:"ar",jobs:[{title:"Site engineer",rubric,scoredCount:0,top15:[]}]});
  const {default:AdmZip}=await import("adm-zip");
  const xml=new AdmZip(buffer).readAsText("word/document.xml");
  expect(xml).toContain("ملخص موحّد للفرز");
  expect(xml).toContain("Site engineer");
  expect(xml).toContain("w:bidi");
  expect(xml).toContain("w:bidiVisual");
});
