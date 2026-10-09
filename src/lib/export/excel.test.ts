import { describe, expect, it } from "vitest";
import {
  DETAIL_HEADERS,
  EXCEL_SHEET_NAMES,
  SHORTLIST_HEADERS,
  buildJobWorkbook,
  excelSheetNames,
  headerValues,
} from "@/lib/export/excel";
import { DEFAULT_RUBRIC_WEIGHTS, type Rubric } from "@/lib/schemas/rubric";
import type { JobResults, RankedCandidate } from "@/lib/schemas/screening";

const rubric: Rubric = {
  mustHave: ["AutoCAD"],
  niceToHave: [],
  minYearsExperience: 5,
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

function candidateRow(id: string, score: number): RankedCandidate {
  return {
    id,
    fileName: `${id}.pdf`,
    name: `Candidate ${id}`,
    location: "Dubai",
    currentTitle: "Site engineer",
    totalYearsExperience: 8,
    totalExperienceText: "8 years",
    uaeExperienceText: "Dubai",
    totalScore: score,
    recommendation: "Strong candidate — recommend technical interview",
    suggestedSalary: "Not set — add salary bands. Indicative estimate, not an offer",
    strengths: "Site experience",
    risksAndGaps: "No certificate",
    verificationPoints: ["Verify the certificate"],
    stageStatus: "scored",
    dealBreakerHit: false,
    scores: [],
    error: null,
    passAScore: 70,
    candidate: {
      fullName: `Candidate ${id}`,
      nationality: "EG",
      currentLocation: "Dubai",
      currentTitle: "Site engineer",
      lastEmployer: "Company",
      specialization: "Civil",
      education: "Bachelor",
      totalExperienceText: "8 years",
      totalYearsExperience: 8,
      availabilityNotice: "1 month",
      expectedSalary: "18000",
      dataQualityNote: "Clear",
      evidencePages: "1-2",
      phone: "+971500000000",
      email: `${id}@example.com`,
      linkedin: null,
      relevantExperienceText: "Sites",
      leadershipExperienceText: "Team",
      uaeExperienceText: "Dubai",
      softwareSystems: ["AutoCAD"],
      technicalSkills: ["Quantities"],
      certifications: [],
      courses: [],
      languages: ["English"],
      keyAchievements: ["Cost saving"],
      gaps: [],
      inconsistencies: [],
    },
  };
}

function results(includeUnparsed: boolean): JobResults {
  const top = candidateRow("a", 88);
  return {
    jobId: "job-1",
    title: "Site engineer",
    status: "done",
    twoPass: false,
    weights: rubric.weights,
    includeNationalityColumn: true,
    top15: [top],
    all: [top, candidateRow("b", 70)],
    notScreened: [],
    unparsed: includeUnparsed
      ? [
          {
            id: "scan",
            fileName: "scanned.pdf",
            parseStatus: "needs_ocr",
            stageStatus: "pending",
            error: "No extractable text",
          },
        ]
      : [],
  };
}

describe("buildJobWorkbook", () => {
  it("builds four sheets with 31 detail columns", async () => {
    const workbook = await buildJobWorkbook(
      "Site engineer",
      rubric,
      results(false),
      "all",
    );
    const names = excelSheetNames(workbook);
    expect(names).toEqual(EXCEL_SHEET_NAMES.slice(0, 4));

    const detail = workbook.getWorksheet(EXCEL_SHEET_NAMES[1]);
    expect(detail).toBeDefined();
    expect(detail?.views[0]?.rightToLeft).toBe(false);
    expect(headerValues(detail!)).toEqual([...DETAIL_HEADERS]);
    expect(headerValues(detail!)).toHaveLength(31);

    const shortlist = workbook.getWorksheet(EXCEL_SHEET_NAMES[2]);
    expect(headerValues(shortlist!)).toEqual([...SHORTLIST_HEADERS]);
    expect(headerValues(shortlist!)).toHaveLength(13);

    const summary = workbook.getWorksheet(EXCEL_SHEET_NAMES[0]);
    expect(String(summary?.getCell("A1").value)).toContain("Candidate ranking");
    expect(String(summary?.getCell("A3").value)).toBe("Role");
  });

  it("omits nationality when the flag is off and adds the unparsed sheet", async () => {
    const withoutNationality = {
      ...rubric,
      includeNationalityColumn: false,
    };
    const workbook = await buildJobWorkbook(
      "Site engineer",
      withoutNationality,
      results(true),
      "top15",
    );
    const names = excelSheetNames(workbook);
    expect(names).toContain(EXCEL_SHEET_NAMES[4]);
    const headers = headerValues(workbook.getWorksheet(EXCEL_SHEET_NAMES[1])!);
    expect(headers).toHaveLength(30);
    expect(headers).not.toContain("Nationality");
    expect(headers[0]).toBe("Rank");
    expect(headers.at(-1)).toBe("CV file name");
  });
});

it("exports Arabic headers and RTL views without translating user data", async () => {
  const workbook = await buildJobWorkbook("Site engineer",rubric,results(false),"all","ar");
  for (const sheet of workbook.worksheets) expect(sheet.views[0].rightToLeft).toBe(true);
  const detail=workbook.worksheets[1];
  expect(headerValues(detail)[0]).toBe("الترتيب");
  expect(headerValues(detail)[2]).toBe("الدرجة %");
  expect(detail.getCell("B2").value).toBe("Candidate a");
  expect(detail.getCell("J2").value).toBe("Site engineer");
  const buffer=await workbook.xlsx.writeBuffer();
  expect(Buffer.from(buffer).subarray(0,2).toString()).toBe("PK");
});
