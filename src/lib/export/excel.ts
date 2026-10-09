import { exportTranslator, salaryText } from "@/i18n/export";
import type { Locale } from "@/i18n/routing";
import { errorCode } from "@/i18n/errors";
import { recommendationTier } from "@/lib/ranking/rank";
import ExcelJS from "exceljs";
import {
  SCORE_CRITERIA,
  type Rubric,
} from "@/lib/schemas/rubric";
import { SHORTLIST_LIMIT } from "@/lib/ranking/rank";
import type { JobResults, RankedCandidate } from "@/lib/schemas/screening";
import {
  HEADER_FILL,
  HEADER_FONT,
  LABEL_FILL,
  LABEL_FONT,
  displayValue,
  joinList,
} from "@/lib/export/format";
import { GENERIC_INTERVIEW_ROWS } from "@/lib/export/interview";

export const DETAIL_HEADERS = [
  "Rank",
  "Name",
  "Score %",
  "Recommendation",
  "Phone",
  "Email",
  "LinkedIn",
  "Nationality",
  "Current location",
  "Current title",
  "Last employer",
  "Specialization",
  "Education",
  "Total experience",
  "Relevant experience",
  "Leadership experience",
  "UAE experience",
  "Software and systems",
  "Technical skills",
  "Certifications",
  "Courses",
  "Languages",
  "Key achievements",
  "Strengths",
  "Gaps / risks",
  "Availability / notice",
  "Expected salary",
  "Suggested salary AED/month",
  "Data quality",
  "Evidence pages",
  "CV file name",
] as const;

export const SHORTLIST_HEADERS = [
  "Rank",
  "Name",
  "Score %",
  "Location",
  "Current title",
  "Phone",
  "Email",
  "Total experience",
  "UAE experience",
  "Key strengths",
  "Verification points before offer",
  "Suggested salary",
  "Recommendation",
] as const;

export const EXCEL_SHEET_NAMES = [
  "Guidelines and summary",
  "Detailed ranking",
  "Shortlist",
  "Verification and interview",
  "Could not screen",
] as const;

function styleHeader(cell: ExcelJS.Cell) {
  cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: `FF${HEADER_FONT}` } };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: `FF${HEADER_FILL}` },
  };
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  cell.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
}

function styleBody(cell: ExcelJS.Cell, asNumber = false) {
  cell.font = { name: "Calibri", size: 11 };
  cell.alignment = { vertical: "top", wrapText: true };
  cell.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  if (asNumber) {
    cell.numFmt = "0";
  }
}

function applyView(sheet: ExcelJS.Worksheet, freezeHeader = false) {
  sheet.views = [
    {
      rightToLeft: false,
      state: freezeHeader ? "frozen" : "normal",
      ySplit: freezeHeader ? 1 : 0,
    },
  ];
}

function detailHeaders(includeNationality: boolean): string[] {
  return includeNationality
    ? [...DETAIL_HEADERS]
    : DETAIL_HEADERS.filter((header) => header !== "Nationality");
}

function detailRow(
  row: RankedCandidate,
  rank: number,
  includeNationality: boolean,
  locale: Locale,
): Array<string | number> {
  const candidate = row.candidate;
  const {label} = exportTranslator(locale);
  const missing = label("Not stated");
  const values: Array<string | number> = [
    rank,
    displayValue(row.name, missing),
    row.totalScore ?? 0,
    displayValue(
      row.totalScore == null ? null : label(recommendationTier(row.totalScore)),
      missing,
    ),
    displayValue(candidate?.phone, missing),
    displayValue(candidate?.email, missing),
    displayValue(candidate?.linkedin, missing),
  ];
  if (includeNationality) {
    values.push(displayValue(candidate?.nationality, missing));
  }
  values.push(
    displayValue(candidate?.currentLocation, missing),
    displayValue(candidate?.currentTitle, missing),
    displayValue(candidate?.lastEmployer, missing),
    displayValue(candidate?.specialization, missing),
    displayValue(candidate?.education, missing),
    displayValue(candidate?.totalExperienceText, missing),
    displayValue(candidate?.relevantExperienceText, missing),
    displayValue(candidate?.leadershipExperienceText, missing),
    displayValue(candidate?.uaeExperienceText, missing),
    joinList(candidate?.softwareSystems) === "Not stated"
      ? missing
      : joinList(candidate?.softwareSystems),
    joinList(candidate?.technicalSkills) === "Not stated"
      ? missing
      : joinList(candidate?.technicalSkills),
    joinList(candidate?.certifications) === "Not stated"
      ? missing
      : joinList(candidate?.certifications),
    joinList(candidate?.courses) === "Not stated" ? missing : joinList(candidate?.courses),
    joinList(candidate?.languages) === "Not stated"
      ? missing
      : joinList(candidate?.languages),
    joinList(candidate?.keyAchievements) === "Not stated"
      ? missing
      : joinList(candidate?.keyAchievements),
    displayValue(row.strengths, missing),
    displayValue(row.risksAndGaps, missing),
    displayValue(candidate?.availabilityNotice, missing),
    displayValue(candidate?.expectedSalary, missing),
    salaryText(row.suggestedSalary, locale),
    displayValue(candidate?.dataQualityNote, missing),
    displayValue(candidate?.evidencePages, missing),
    displayValue(row.fileName, missing),
  );
  return values;
}

function writeHeaderRow(sheet: ExcelJS.Worksheet, headers: readonly string[]) {
  const row = sheet.getRow(1);
  headers.forEach((header, index) => {
    const cell = row.getCell(index + 1);
    cell.value = header;
    styleHeader(cell);
  });
  row.height = 28;
}

function writeBodyRow(
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  values: Array<string | number>,
) {
  const row = sheet.getRow(rowNumber);
  values.forEach((value, index) => {
    const cell = row.getCell(index + 1);
    cell.value = value;
    styleBody(cell, typeof value === "number");
  });
}

export async function buildJobWorkbook(
  jobTitle: string,
  rubric: Rubric,
  results: JobResults,
  scope: "all" | "top15",
  locale: Locale = "en",
): Promise<ExcelJS.Workbook> {
  const { t, label } = exportTranslator(locale);
  const workbook = new ExcelJS.Workbook();
  const scored = results.all.filter((row) => row.stageStatus === "scored");
  const rows = scope === "top15" ? scored.slice(0, SHORTLIST_LIMIT) : scored;
  const includeNationality = rubric.includeNationalityColumn;
  const headers = detailHeaders(includeNationality);

  const summary = workbook.addWorksheet(label(EXCEL_SHEET_NAMES[0]));
  applyView(summary);
  summary.mergeCells("A1:F1");
  const titleCell = summary.getCell("A1");
  titleCell.value = t("export.ranking_title", {title:jobTitle});
  titleCell.font = {
    name: "Calibri",
    size: 16,
    bold: true,
    color: { argb: `FF${HEADER_FONT}` },
  };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: `FF${HEADER_FILL}` },
  };
  titleCell.alignment = { vertical: "middle", wrapText: true };
  summary.getRow(1).height = 28;

  const methodology = SCORE_CRITERIA.map(
    (key) => `${t(`status.${key}`)} (${rubric.weights[key]})`,
  ).join("; ");
  const topNames = results.top15
    .slice(0, SHORTLIST_LIMIT)
    .map((row) => displayValue(row.name))
    .join("; ");

  const kv: Array<[string, string | number]> = [
    ["Role", jobTitle],
    ["Geographic scope", displayValue(rubric.geographicScope)],
    ["CVs reviewed", results.all.length + results.unparsed.length + results.notScreened.length],
    ["Scoring method", methodology],
    ["Initial top candidates", topNames || displayValue(null)],
    [
      "Notice",
      "Suggested salary is an indicative estimate, not an offer. Verify certificates, dates, references, work eligibility, and notice period before a final decision.",
    ],
    [
      "Privacy and fairness",
      "Contact details are for hiring communication only. Do not use nationality, age, gender, or marital status as exclusion criteria. Scoring is based on competence and the role requirements.",
    ],
  ];

  kv.forEach(([label, value], index) => {
    const rowNumber = index + 3;
    summary.mergeCells(`B${rowNumber}:F${rowNumber}`);
    const labelCell = summary.getCell(`A${rowNumber}`);
    const valueCell = summary.getCell(`B${rowNumber}`);
    labelCell.value = exportTranslator(locale).label(label);
    valueCell.value = label === "Notice" || label === "Privacy and fairness" ? exportTranslator(locale).label(String(value)) : value;
    labelCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: `FF${LABEL_FONT}` } };
    labelCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${LABEL_FILL}` },
    };
    labelCell.alignment = { vertical: "top", wrapText: true };
    valueCell.font = { name: "Calibri", size: 11 };
    valueCell.alignment = { vertical: "top", wrapText: true };
    summary.getRow(rowNumber).height = 32;
  });
  summary.getColumn(1).width = 28;
  summary.getColumn(2).width = 80;

  const detail = workbook.addWorksheet(label(EXCEL_SHEET_NAMES[1]));
  applyView(detail, true);
  writeHeaderRow(detail, headers.map(label));
  rows.forEach((row, index) => {
    writeBodyRow(detail, index + 2, detailRow(row, index + 1, includeNationality, locale));
  });
  detail.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(rows.length + 1, 1), column: headers.length },
  };
  if (rows.length > 0) {
    detail.addConditionalFormatting({
      ref: `C2:C${rows.length + 1}`,
      rules: [
        {
          type: "colorScale",
          priority: 1,
          cfvo: [
            { type: "num", value: 0 },
            { type: "num", value: 50 },
            { type: "num", value: 100 },
          ],
          color: [{ argb: "FFF8696B" }, { argb: "FFFFEB84" }, { argb: "FF63BE7B" }],
        },
      ],
    });
  }
  headers.forEach((header, index) => {
    const column = detail.getColumn(index + 1);
    if (header === "Name") {
      column.width = 28;
    } else if (header === "Recommendation") {
      column.width = 46;
    } else if (
      header.toLowerCase().includes("experience") ||
      header.toLowerCase().includes("skills") ||
      header.toLowerCase().includes("achievements") ||
      header.toLowerCase().includes("gaps") ||
      header.toLowerCase().includes("strengths") ||
      header.toLowerCase().includes("verification")
    ) {
      column.width = 48;
    } else {
      column.width = 22;
    }
  });
  const shortlist = workbook.addWorksheet(label(EXCEL_SHEET_NAMES[2]));
  applyView(shortlist, true);
  writeHeaderRow(shortlist, SHORTLIST_HEADERS.map(label));
  results.top15.forEach((row, index) => {
    writeBodyRow(shortlist, index + 2, [
      index + 1,
      displayValue(row.name),
      row.totalScore ?? 0,
      displayValue(row.location),
      displayValue(row.currentTitle),
      displayValue(row.candidate?.phone),
      displayValue(row.candidate?.email),
      displayValue(row.totalExperienceText),
      displayValue(row.uaeExperienceText),
      displayValue(row.strengths),
      (row.verificationPoints ?? []).length > 0
        ? (row.verificationPoints ?? []).join("\n")
        : displayValue(null),
      salaryText(row.suggestedSalary, locale),
      row.recommendation ? label(row.recommendation) : label("Not stated"),
    ]);
  });
  SHORTLIST_HEADERS.forEach((header, index) => {
    shortlist.getColumn(index + 1).width =
      header === "Name" ? 28 : header === "Recommendation" ? 46 : 32;
  });

  const interview = workbook.addWorksheet(label(EXCEL_SHEET_NAMES[3]));
  applyView(interview);
  writeHeaderRow(interview, ["Theme", "Suggested verification questions"].map(label));
  GENERIC_INTERVIEW_ROWS.forEach((item, index) => {
    writeBodyRow(interview, index + 2, [label(item.axis), label(item.questions)]);
  });
  results.top15.forEach((row, index) => {
    writeBodyRow(interview, GENERIC_INTERVIEW_ROWS.length + 2 + index, [
      displayValue(row.name),
      (row.verificationPoints ?? []).join("\n") || displayValue(null),
    ]);
  });
  interview.getColumn(1).width = 28;
  interview.getColumn(2).width = 110;

  const skipped = [...results.unparsed, ...results.notScreened];
  if (skipped.length > 0) {
    const failed = workbook.addWorksheet(label(EXCEL_SHEET_NAMES[4]));
    applyView(failed, true);
    writeHeaderRow(failed, ["File name", "Status", "Reason"].map(label));
    skipped.forEach((cv, index) => {
      writeBodyRow(failed, index + 2, [
        cv.fileName,
        t(`status.${cv.parseStatus === "parsed" ? cv.stageStatus : cv.parseStatus}`),
        cv.error ? t(`errors.${errorCode(cv.error)}`) : label("Not stated"),
      ]);
    });
    failed.getColumn(1).width = 40;
    failed.getColumn(2).width = 18;
    failed.getColumn(3).width = 60;
  }

  for (const sheet of workbook.worksheets) { sheet.views = sheet.views.map(view => ({...view, rightToLeft: locale === "ar"})); }
  return workbook;
}

export function excelSheetNames(workbook: ExcelJS.Workbook): string[] {
  return workbook.worksheets.map((sheet) => sheet.name);
}

export function headerValues(sheet: ExcelJS.Worksheet): string[] {
  const row = sheet.getRow(1);
  const values: string[] = [];
  row.eachCell({ includeEmpty: false }, (cell) => {
    values.push(String(cell.value ?? ""));
  });
  return values;
}
