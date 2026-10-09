import { describe, expect, it } from "vitest";
import { inferStage } from "@/lib/screening/progress";
import { buildResultsCsv } from "@/lib/screening/csv";
import type { RankedCandidate } from "@/lib/schemas/screening";

describe("inferStage", () => {
  it("returns extracting while pending CVs remain", () => {
    expect(
      inferStage({
        status: "running",
        pending: 3,
        extracted: 1,
        scored: 0,
        twoPass: false,
      }),
    ).toBe("extracting");
  });

  it("returns rescoring after the first pass in two-pass mode", () => {
    expect(
      inferStage({
        status: "running",
        pending: 0,
        extracted: 0,
        scored: 12,
        twoPass: true,
      }),
    ).toBe("rescoring");
  });

  it("returns partial when a done job still has unscreened CVs", () => {
    expect(
      inferStage({
        status: "done",
        pending: 0,
        extracted: 0,
        scored: 33,
        twoPass: false,
        turboMode: true,
        notScreened: 145,
      }),
    ).toBe("partial");
  });

  it("keeps terminal job statuses", () => {
    expect(
      inferStage({
        status: "cancelled",
        pending: 2,
        extracted: 0,
        scored: 0,
        twoPass: false,
      }),
    ).toBe("cancelled");
  });
});

describe("buildResultsCsv", () => {
  it("escapes quotes and commas", () => {
    const row: RankedCandidate = {
      id: "1",
      fileName: "cv, \"senior\".pdf",
      name: "Jane, Doe",
      location: "Berlin",
      currentTitle: "Engineer",
      totalYearsExperience: 5,
      totalExperienceText: "5 years",
      uaeExperienceText: null,
      totalScore: 81.5,
      recommendation: "Strong candidate — recommend technical interview",
      suggestedSalary: "Not set",
      strengths: "Strong, careful writer",
      risksAndGaps: null,
      verificationPoints: [],
      stageStatus: "scored",
      dealBreakerHit: false,
      scores: [
        { criterion: "relevantExperience", score: 8, evidence: "TS" },
        { criterion: "leadership", score: 8, evidence: "5y" },
        { criterion: "technicalSkills", score: 8, evidence: "BSc" },
        { criterion: "softwareSystems", score: 8, evidence: "EN" },
        { criterion: "achievements", score: 8, evidence: "stable" },
        { criterion: "uaeExperience", score: 7, evidence: "none" },
        { criterion: "jobFit", score: 8, evidence: "fit" },
      ],
      error: null,
      passAScore: 50,
      candidate: null,
    };

    const csv = buildResultsCsv([row]);
    expect(csv).toContain("\"cv, \"\"senior\"\".pdf\"");
    expect(csv).toContain("\"Jane, Doe\"");
    expect(csv.split("\n")[0]).toContain("totalScore");
    expect(csv.split("\n")[0]).toContain("relevantExperience");
  });
});
