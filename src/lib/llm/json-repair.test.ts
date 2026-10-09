import { describe, expect, it } from "vitest";
import { hydrateTurboPayload, parseJsonLoose, repairJsonText } from "@/lib/llm/json-repair";
import { turboSchema } from "@/lib/schemas/turbo";

const prefix = `{
  "profile": {
    "currentTitle": "Accountant",
    "lastEmployer": "Acme",
    "specialization": null,
    "education": "BSc",
    "totalYears": 4,
    "relevantYears": 3,
    "uaeYears": 2,
    "location": "Abu Dhabi",
    "leadership": null,
    "software": ["Excel"],
    "certifications": [],
    "languages": ["English"]
  },
  "scores": {
    "relevantExperience": 7,
    "leadership": 2,
    "technicalSkills": 8,
    "softwareSystems": 6,
    "achievements": 5,
    "uaeExperience": 4,
    "jobFit": 7
  },
  "dealBreaker": false,
  "strengths": "UAE accounts`;

describe("repairJsonText", () => {
  it("closes a truncated turbo payload so turboSchema can parse it", () => {
    const repaired = repairJsonText(prefix);
    const parsed = turboSchema.parse(hydrateTurboPayload(parseJsonLoose(repaired)));
    expect(parsed.profile.currentTitle).toBe("Accountant");
    expect(parsed.scores.jobFit).toBe(7);
    expect(parsed.flags).toEqual([]);
  });

  it("strips markdown fences", () => {
    const repaired = repairJsonText("```json\n{\"dealBreaker\":false}\n```");
    expect(JSON.parse(repaired)).toEqual({ dealBreaker: false });
  });

  it("repairs empty values and unquoted keys from qwen3:4b", () => {
    const emptyValue = `{"scores":{"relevantExperience":7,"leadership":}}`;
    const parsed = turboSchema.parse(hydrateTurboPayload(parseJsonLoose(emptyValue)));
    expect(parsed.scores.relevantExperience).toBe(7);
    expect(parsed.scores.leadership).toBe(0);

    const unquoted = `{"profile":{currentTitle:"Accountant"},"scores":{jobFit:8}}`;
    const second = turboSchema.parse(hydrateTurboPayload(parseJsonLoose(unquoted)));
    expect(second.profile.currentTitle).toBe("Accountant");
    expect(second.scores.jobFit).toBe(8);
  });
});
