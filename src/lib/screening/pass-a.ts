import type { Rubric } from "@/lib/schemas/rubric";

const YEAR_RE =
  /(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?|سنة|سنوات|عام|أعوام)/gi;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function termFrequency(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
}

function cosine(left: Map<string, number>, right: Map<string, number>): number {
  let dot = 0;
  let leftSq = 0;
  let rightSq = 0;
  for (const [token, value] of left) {
    leftSq += value * value;
    const other = right.get(token);
    if (other) {
      dot += value * other;
    }
  }
  for (const value of right.values()) {
    rightSq += value * value;
  }
  if (leftSq === 0 || rightSq === 0) {
    return 0;
  }
  return dot / (Math.sqrt(leftSq) * Math.sqrt(rightSq));
}

function keywordHits(haystack: string, needles: string[]): number {
  if (needles.length === 0) {
    return 0;
  }
  const lower = haystack.toLowerCase();
  let hits = 0;
  for (const needle of needles) {
    const token = needle.trim().toLowerCase();
    if (token.length > 1 && lower.includes(token)) {
      hits += 1;
    }
  }
  return hits / needles.length;
}

function yearsFromText(text: string): number | null {
  let max = 0;
  let found = false;
  for (const match of text.matchAll(YEAR_RE)) {
    const value = Number(match[1]);
    if (Number.isFinite(value)) {
      found = true;
      max = Math.max(max, value);
    }
  }
  return found ? max : null;
}

export function computePassAScore(input: {
  anonymizedText: string;
  jobDescription: string;
  rubric: Rubric;
}): number {
  const text = input.anonymizedText;
  const jobTokens = tokenize(
    [
      input.jobDescription,
      ...input.rubric.mustHave,
      ...input.rubric.niceToHave,
      input.rubric.education ?? "",
      input.rubric.location ?? "",
    ].join(" "),
  );
  const cvTokens = tokenize(text);
  const embedding = cosine(termFrequency(jobTokens), termFrequency(cvTokens));
  const must = keywordHits(text, input.rubric.mustHave);
  const nice = keywordHits(text, input.rubric.niceToHave);
  const locationNeedles = [
    input.rubric.location,
    input.rubric.geographicScope,
    "uae",
    "abu dhabi",
    "dubai",
    "الإمارات",
    "أبوظبي",
  ].filter((item): item is string => Boolean(item && item.length > 0));
  const location = keywordHits(text, locationNeedles);

  const years = yearsFromText(text);
  let yearsScore = 0.5;
  if (input.rubric.minYearsExperience != null && years != null) {
    yearsScore = Math.min(1, years / Math.max(input.rubric.minYearsExperience, 1));
  } else if (years != null) {
    yearsScore = Math.min(1, years / 10);
  }

  const total =
    embedding * 40 + must * 30 + nice * 10 + yearsScore * 10 + location * 10;
  return Math.round(Math.min(100, Math.max(0, total)) * 10) / 10;
}

export function orderByPassA<T extends { passAScore: number | null; id: string }>(
  rows: T[],
): T[] {
  return [...rows].sort((left, right) => {
    const delta = (right.passAScore ?? -1) - (left.passAScore ?? -1);
    if (delta !== 0) {
      return delta;
    }
    return left.id.localeCompare(right.id);
  });
}
