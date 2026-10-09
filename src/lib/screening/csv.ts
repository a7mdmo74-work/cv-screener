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

export function buildResultsCsv(rows: RankedCandidate[]): string {
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

  const lines = [header.join(",")];
  rows.forEach((row, index) => {
    lines.push(
      [
        csvCell(index + 1),
        csvCell(row.name),
        csvCell(row.fileName),
        csvCell(row.totalScore),
        csvCell(row.recommendation),
        ...SCORE_CRITERIA.map((key) => csvCell(criterionScore(row, key))),
        csvCell(row.dealBreakerHit),
        csvCell(row.location),
        csvCell(row.totalYearsExperience),
        csvCell(row.suggestedSalary),
        csvCell(row.strengths),
      ].join(","),
    );
  });

  return `${lines.join("\n")}\n`;
}
