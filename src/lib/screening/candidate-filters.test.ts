import { describe, expect, it } from "vitest";
import type { RecommendationTier } from "@/lib/schemas/score";
import {
  candidateSeniority,
  candidatesToCsv,
  collectFilterOptions,
  EMPTY_CANDIDATE_FILTERS,
  filterCandidates,
  inferSeniority,
  interviewPreset,
  type FilterableCandidate,
} from "@/lib/screening/candidate-filters";

function row(
  overrides: Partial<FilterableCandidate> & { id: string },
): FilterableCandidate {
  return {
    fileName: `${overrides.id}.pdf`,
    name: overrides.id,
    location: null,
    currentTitle: null,
    totalYearsExperience: null,
    totalScore: 70,
    recommendation: "Good — conditional interview",
    dealBreakerHit: false,
    strengths: null,
    candidate: null,
    ...overrides,
  };
}

describe("inferSeniority", () => {
  it("reads seniority from the job title before years", () => {
    expect(inferSeniority("Junior Accountant", 20)).toBe("Junior");
    expect(inferSeniority("HR Director", 4)).toBe("Executive");
    expect(inferSeniority("Senior Manager", 6)).toBe("Supervisory and leadership");
    expect(inferSeniority("Team Lead", null)).toBe("Supervisory and leadership");
    expect(inferSeniority("Site Supervisor", null)).toBe("Supervisory");
    expect(inferSeniority("Senior Engineer", null)).toBe("Supervisory");
    expect(inferSeniority("Mid-level Analyst", null)).toBe("Mid-level");
  });

  it("falls back to years when the title has no seniority word", () => {
    expect(inferSeniority("Engineer", 1)).toBe("Junior");
    expect(inferSeniority("Engineer", 4)).toBe("Mid-level");
    expect(inferSeniority("Engineer", 8)).toBe("Supervisory");
    expect(inferSeniority("Engineer", 12)).toBe("Supervisory and leadership");
    expect(inferSeniority("Engineer", 16)).toBe("Executive");
    expect(inferSeniority("Engineer", null)).toBe("Not stated");
    expect(inferSeniority(null, null)).toBe("Not stated");
  });
});

describe("filterCandidates", () => {
  const rows = [
    row({
      id: "a",
      name: "Sara Hassan",
      currentTitle: "Senior Supervisor",
      totalYearsExperience: 9,
      totalScore: 84,
      recommendation: "Strong candidate — recommend technical interview",
      location: "Abu Dhabi",
      strengths: "Site delivery",
      candidate: {
        nationality: "Egyptian",
        currentLocation: "Abu Dhabi",
        currentTitle: "Senior Supervisor",
        lastEmployer: "Aldar",
        specialization: "Civil",
        languages: ["Arabic", "English"],
        technicalSkills: ["AutoCAD"],
        totalYearsExperience: 9,
      },
    }),
    row({
      id: "b",
      name: "John Smith",
      currentTitle: "Junior Engineer",
      totalYearsExperience: 2,
      totalScore: 48,
      recommendation: "Not suitable at this time",
      dealBreakerHit: true,
      location: "Dubai",
      candidate: {
        nationality: "british",
        currentLocation: "Dubai",
        currentTitle: "Junior Engineer",
        lastEmployer: null,
        specialization: null,
        languages: ["English"],
        technicalSkills: [],
        totalYearsExperience: 2,
      },
    }),
    row({
      id: "c",
      name: "No Profile",
      totalScore: 66,
      recommendation: "Good — conditional interview",
    }),
  ];

  it("filters by nationality, seniority, and hides deal-breakers", () => {
    const matched = filterCandidates(
      rows,
      {
        ...EMPTY_CANDIDATE_FILTERS,
        nationality: "Egyptian",
        seniority: "Supervisory",
        hideDealBreakers: true,
      },
      new Set(),
      "rank",
    );
    expect(matched.map((item) => item.id)).toEqual(["a"]);
    expect(candidateSeniority(rows[0]!)).toBe("Supervisory");
  });

  it("matches a multi-word search and the interview preset", () => {
    const matched = filterCandidates(
      rows,
      { ...interviewPreset(), query: "sara autocad" },
      new Set(),
      "rank",
    );
    expect(matched.map((item) => item.id)).toEqual(["a"]);
  });

  it("keeps only the shortlist and sorts by name", () => {
    const matched = filterCandidates(
      rows,
      { ...EMPTY_CANDIDATE_FILTERS, shortlistOnly: true },
      new Set(["c", "a"]),
      "name",
    );
    expect(matched.map((item) => item.id)).toEqual(["c", "a"]);
  });

  it("builds filter choices from the CVs and narrows the other lists", () => {
    const options = collectFilterOptions(rows);
    expect(options.nationalities.map((choice) => choice.value)).toEqual([
      "british",
      "Egyptian",
      "Not stated",
    ]);
    expect(options.nationalities.find((choice) => choice.value === "Egyptian")?.count).toBe(1);
    expect(options.seniorities.map((choice) => choice.value)).toContain("Junior");
    expect(options.languages.map((choice) => choice.value)).toEqual(["Arabic", "English"]);
    expect(options.recommendations.map((choice) => choice.value)).toContain(
      "Strong candidate — recommend technical interview" satisfies RecommendationTier,
    );

    const narrowed = collectFilterOptions(
      rows,
      { ...EMPTY_CANDIDATE_FILTERS, nationality: "Egyptian" },
      new Set(),
    );
    expect(narrowed.seniorities.map((choice) => choice.value)).toEqual(["Supervisory"]);
    expect(narrowed.nationalities.map((choice) => choice.value)).toContain("british");
  });

  it("escapes csv cells", () => {

    const csv = candidatesToCsv([
      row({ id: "q", name: 'Ada "A" Lovelace', fileName: "ada.pdf" }),
    ]);
    expect(csv.startsWith("\uFEFFRank,")).toBe(true);
    expect(csv).toContain('"Ada ""A"" Lovelace"');
  });
});
