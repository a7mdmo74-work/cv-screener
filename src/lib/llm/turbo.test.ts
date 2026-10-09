import { describe, expect, it } from "vitest";
import { FORBIDDEN_SCORING_FIELDS } from "@/lib/schemas/candidate";
import { turboUserPrompt, turboSystemPrompt } from "@/lib/llm/turbo-prompt";
import { DEFAULT_RUBRIC_WEIGHTS, type Rubric } from "@/lib/schemas/rubric";
import { assertNoPii } from "@/lib/llm/turbo";
import { smartTruncateAnonymized } from "@/lib/parsing/smart-truncate";

const rubric: Rubric = {
  mustHave: ["ERP"],
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

describe("turbo input fairness", () => {
  it("sends anonymized text only and no forbidden PII field names in the user payload", () => {
    const anonymized =
      "[NAME] is an accountant in Abu Dhabi using ERP. Email [EMAIL].";
    const truncated = smartTruncateAnonymized(anonymized, 3500);
    const user = turboUserPrompt(truncated, true);
    expect(user).toContain("CV text:");
    expect(user).not.toMatch(/jane@example.com/i);
    for (const field of FORBIDDEN_SCORING_FIELDS) {
      expect(user.toLowerCase()).not.toContain(`"${field.toLowerCase()}":`);
    }
    expect(() => assertNoPii(truncated)).not.toThrow();
    expect(turboSystemPrompt(rubric).toLowerCase()).toContain("non-pii");
  });

  it("rejects raw emails in turbo input", () => {
    expect(() => assertNoPii("Contact jane@example.com")).toThrow();
  });
});
