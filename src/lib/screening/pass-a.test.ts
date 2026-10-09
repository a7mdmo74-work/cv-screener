import { describe, expect, it } from "vitest";
import { DEFAULT_RUBRIC_WEIGHTS, type Rubric } from "@/lib/schemas/rubric";
import { computePassAScore, orderByPassA } from "@/lib/screening/pass-a";

const rubric: Rubric = {
  mustHave: ["ERP", "accounting"],
  niceToHave: ["SAP"],
  minYearsExperience: 2,
  education: "Bachelor",
  languages: ["English"],
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

describe("Pass A", () => {
  it("scores a matching CV above an unrelated one and keeps DESC order", () => {
    const match = computePassAScore({
      anonymizedText:
        "Accountant with 4 years ERP and SAP in Abu Dhabi landscaping accounts.",
      jobDescription: "Junior Accountant Abu Dhabi ERP data entry",
      rubric,
    });
    const miss = computePassAScore({
      anonymizedText: "Chef with kitchen experience in Europe.",
      jobDescription: "Junior Accountant Abu Dhabi ERP data entry",
      rubric,
    });
    expect(match).toBeGreaterThan(miss);
    const ordered = orderByPassA([
      { id: "b", passAScore: miss },
      { id: "a", passAScore: match },
    ]);
    expect(ordered.map((row) => row.id)).toEqual(["a", "b"]);
  });
});
