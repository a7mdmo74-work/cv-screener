import { describe, expect, it } from "vitest";
import { defaultTurboSettings, turboSchema } from "@/lib/schemas/turbo";

const valid = {
  profile: {
    currentTitle: "Accountant",
    lastEmployer: "Acme",
    specialization: "GL",
    education: "BSc Accounting",
    totalYears: 4,
    relevantYears: 3,
    uaeYears: 2,
    location: "Abu Dhabi",
    leadership: "Supervised 2 clerks",
    software: ["Excel", "SAP"],
    certifications: ["CPA"],
    languages: ["English", "Arabic"],
  },
  scores: {
    relevantExperience: 7,
    leadership: 4,
    technicalSkills: 8,
    softwareSystems: 7,
    achievements: 5,
    uaeExperience: 6,
    jobFit: 7,
  },
  dealBreaker: false,
  strengths: "UAE accounts experience",
  gaps: "No ERP lead role",
  flags: ["date_gap"] as const,
};

describe("turboSchema", () => {
  it("accepts a compact turbo payload", () => {
    expect(turboSchema.parse(valid).profile.currentTitle).toBe("Accountant");
  });

  it("defaults to a fast free local pass", () => {
    const settings = defaultTurboSettings();
    expect(settings.passACap).toBe(0);
    expect(settings.concurrency).toBe(2);
    expect(settings.enrichCount).toBe(0);
    expect(settings.bulkModel).toBe("qwen3:4b");
    expect(settings.timeBudgetMin).toBe(30);
  });

  it("rejects invented long strengths", () => {
    expect(() =>
      turboSchema.parse({
        ...valid,
        strengths: "x".repeat(121),
      }),
    ).toThrow();
  });
});
