import { exportTranslator, salaryText } from "@/i18n/export";
import type { Locale } from "@/i18n/routing";
import { SCORE_CRITERIA } from "@/lib/schemas/rubric";
import type { RankedCandidate } from "@/lib/schemas/screening";

function csvCell(value: string | number | boolean | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function criterionScore(row: RankedCandidate, key: string): string {
  const match = row.scores.find((item) => item.criterion === key);
  return match ? String(match.score) : "";
}

export function buildResultsCsv(rows: RankedCandidate[], locale: Locale = "en"): string {
  const {label, t} = exportTranslator(locale);
  const header = [
    "rank",
    "name",
    "fileName",
    "totalScore",
    "recommendation",
    ...SCORE_CRITERIA,
    "dealBreakerHit",
    "location",
    "yearsExperience",
    "suggestedSalary",
    "strengths",
  ];

  const headerLabels: Record<string,string> = {rank:"Rank",name:"Name",fileName:"File name",totalScore:"Score",recommendation:"Recommendation",dealBreakerHit:"Deal-breaker",location:"Location",yearsExperience:"Years",suggestedSalary:"Suggested salary",strengths:"Strengths"};
  const lines = [header.map(key=>csvCell(locale === "en" ? key : headerLabels[key] ? label(headerLabels[key]) : t(`status.${key as typeof SCORE_CRITERIA[number]}`))).join(",")];
  rows.forEach((row, index) => {
    lines.push(
      [
        csvCell(index + 1),
        csvCell(row.name),
        csvCell(row.fileName),
        csvCell(row.totalScore),
        csvCell(row.recommendation ? label(row.recommendation) : ""),
        ...SCORE_CRITERIA.map((key) => csvCell(criterionScore(row, key))),
        csvCell(row.dealBreakerHit),
        csvCell(row.location),
        csvCell(row.totalYearsExperience),
        csvCell(salaryText(row.suggestedSalary, locale)),
        csvCell(row.strengths),
      ].join(","),
    );
  });

  return `\uFEFF${lines.join("\n")}\n`;
}
