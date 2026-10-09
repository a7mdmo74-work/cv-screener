import { describe, expect, it } from "vitest";
import { fallbackRubricFromJob } from "@/lib/wizard/fallback-rubric";

describe("fallbackRubricFromJob", () => {
  it("builds a rubric from the job description without an LLM", () => {
    const rubric = fallbackRubricFromJob({
      title: "Junior Accountant",
      description: [
        "Bachelor's degree in Accounting",
        "Minimum 2 years of experience in data entry",
        "Good computer skills and familiarity with ERP systems",
        "Prepare and process invoices",
      ].join("\n"),
      geographicScope: "United Arab Emirates",
      employmentType: "Full-time",
      seniorityLevel: "Entry",
      includeNationalityColumn: true,
    });

    expect(rubric.minYearsExperience).toBe(2);
    expect(rubric.education).toBe("Bachelor's degree");
    expect(rubric.mustHave.some((item) => /bachelor|erp|account/i.test(item))).toBe(
      true,
    );
    expect(rubric.mustHave.join(" ")).not.toMatch(/leading company/i);
    expect(rubric.weights.jobFit).toBe(10);
  });

  it("uses the junior year floor and real requirements for dual-role JDs", () => {
    const rubric = fallbackRubricFromJob({
      title: "Senior Accountant • Junior Accountant",
      description: [
        "A leading company in landscaping contracting, based in Abu Dhabi, is looking to hire the below:",
        "Positions:",
        "Senior Accountant: Minimum 5 years of experience",
        "Junior Accountant: Minimum 2 years of experience in data entry",
        "Bachelor’s degree in Accounting, Finance, or a related field.",
        "Strong experience in ERP systems (e.g., Zoho, SAP, Oracle, Odoo).",
        "Ensure timely VAT filing and compliance with UAE regulations.",
      ].join("\n"),
      geographicScope: "United Arab Emirates",
      employmentType: "Full-time",
      seniorityLevel: "Supervisory",
      includeNationalityColumn: true,
    });

    expect(rubric.minYearsExperience).toBe(2);
    expect(rubric.location).toBe("Abu Dhabi");
    expect(rubric.mustHave.some((item) => /ERP/i.test(item))).toBe(true);
    expect(rubric.mustHave.some((item) => /VAT/i.test(item))).toBe(true);
    expect(rubric.mustHave.join(" ")).not.toMatch(/leading company/i);
  });
});
