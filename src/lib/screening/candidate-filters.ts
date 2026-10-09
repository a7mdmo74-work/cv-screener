import type { RecommendationTier } from "@/lib/schemas/score";
import { SENIORITY_LEVEL_OPTIONS } from "@/lib/schemas/job-fields";

export const NOT_STATED = "Not stated";

export const CANDIDATE_SENIORITY_LEVELS = [
  ...SENIORITY_LEVEL_OPTIONS,
  NOT_STATED,
] as const;

export type CandidateSeniority = (typeof CANDIDATE_SENIORITY_LEVELS)[number];

export const RECOMMENDATION_LABELS: Record<RecommendationTier, string> = {
  "Strong candidate — recommend technical interview": "Strong",
  "Good — conditional interview": "Good",
  "Average — reserve list": "Reserve",
  "Not suitable at this time": "Not suitable",
};

export type CandidateSort = "rank" | "name" | "years" | "nationality";

export type CandidateViewFilters = {
  query: string;
  nationality: string;
  seniority: string;
  language: string;
  recommendation: string;
  minScore: number | null;
  hideDealBreakers: boolean;
  shortlistOnly: boolean;
};

export const EMPTY_CANDIDATE_FILTERS: CandidateViewFilters = {
  query: "",
  nationality: "",
  seniority: "",
  language: "",
  recommendation: "",
  minScore: null,
  hideDealBreakers: false,
  shortlistOnly: false,
};

export type FilterChoice = {
  value: string;
  label: string;
  count: number;
};

export type FilterableCandidate = {
  id: string;
  fileName: string;
  name: string | null;
  location: string | null;
  currentTitle: string | null;
  totalYearsExperience: number | null;
  totalScore: number | null;
  recommendation: RecommendationTier | null;
  dealBreakerHit: boolean;
  strengths: string | null;
  candidate: {
    nationality: string | null;
    currentLocation: string | null;
    currentTitle: string | null;
    lastEmployer: string | null;
    specialization: string | null;
    languages: string[];
    technicalSkills: string[];
    softwareSystems?: string[];
    totalYearsExperience: number | null;
  } | null;
};

const EMPTY_MARKERS = new Set([
  "",
  "null",
  "n/a",
  "na",
  "none",
  "unknown",
  "not specified",
  "not stated",
  "-",
  "—",
]);

const JUNIOR_TITLE =
  /\b(junior|jr\.?|intern|trainee|graduate|entry[- ]level)\b/i;
const EXECUTIVE_TITLE =
  /\b(chief|ceo|cto|cfo|coo|cio|vice president|\bvp\b|director|head of|general manager|executive)\b/i;
const LEADERSHIP_TITLE =
  /\b(senior manager|group manager|team lead|tech lead|team leader|lead|principal|staff)\b/i;
const SUPERVISORY_TITLE =
  /\b(supervisor|supervisory|manager|superintendent|senior|sr\.?)\b/i;
const MID_TITLE = /\b(mid[- ]level|intermediate)\b/i;

export function statedValue(value: string | null | undefined): string | null {
  const trimmed = value?.trim().replace(/\s+/g, " ") ?? "";
  if (EMPTY_MARKERS.has(trimmed.toLowerCase())) {
    return null;
  }
  return trimmed;
}

export function displayNationality(value: string | null | undefined): string {
  return statedValue(value) ?? NOT_STATED;
}

export function candidateTitle(row: FilterableCandidate): string | null {
  return statedValue(row.currentTitle ?? row.candidate?.currentTitle);
}

export function candidateYears(row: FilterableCandidate): number | null {
  const years = row.totalYearsExperience ?? row.candidate?.totalYearsExperience;
  if (typeof years !== "number" || !Number.isFinite(years) || years < 0) {
    return null;
  }
  return years;
}

export function candidateNationality(row: FilterableCandidate): string {
  return displayNationality(row.candidate?.nationality);
}

export function candidateLocation(row: FilterableCandidate): string {
  return statedValue(row.location ?? row.candidate?.currentLocation) ?? NOT_STATED;
}

export function seniorityFromYears(years: number): Exclude<CandidateSeniority, "Not stated"> {
  if (years < 3) {
    return "Junior";
  }
  if (years < 7) {
    return "Mid-level";
  }
  if (years < 11) {
    return "Supervisory";
  }
  if (years < 16) {
    return "Supervisory and leadership";
  }
  return "Executive";
}

export function inferSeniority(
  title: string | null | undefined,
  years: number | null | undefined,
): CandidateSeniority {
  const cleaned = statedValue(title);
  if (cleaned) {
    const junior = JUNIOR_TITLE.test(cleaned);
    const executive = EXECUTIVE_TITLE.test(cleaned);
    if (junior && !executive) {
      return "Junior";
    }
    if (executive) {
      return "Executive";
    }
    if (LEADERSHIP_TITLE.test(cleaned)) {
      return "Supervisory and leadership";
    }
    if (SUPERVISORY_TITLE.test(cleaned)) {
      return "Supervisory";
    }
    if (MID_TITLE.test(cleaned)) {
      return "Mid-level";
    }
  }

  if (typeof years === "number" && Number.isFinite(years) && years >= 0) {
    return seniorityFromYears(years);
  }

  return NOT_STATED;
}

export function candidateSeniority(row: FilterableCandidate): CandidateSeniority {
  return inferSeniority(candidateTitle(row), candidateYears(row));
}

export function recommendationLabel(tier: RecommendationTier | null): string {
  return tier ? RECOMMENDATION_LABELS[tier] : NOT_STATED;
}

export function filtersAreActive(filters: CandidateViewFilters): boolean {
  return (
    filters.query.trim().length > 0 ||
    filters.nationality.length > 0 ||
    filters.seniority.length > 0 ||
    filters.language.length > 0 ||
    filters.recommendation.length > 0 ||
    filters.minScore !== null ||
    filters.hideDealBreakers ||
    filters.shortlistOnly
  );
}

export function isInterviewPreset(filters: CandidateViewFilters): boolean {
  const preset = interviewPreset();
  return (Object.keys(preset) as Array<keyof CandidateViewFilters>).every(
    (key) => filters[key] === preset[key],
  );
}

export function interviewPreset(): CandidateViewFilters {
  return {
    ...EMPTY_CANDIDATE_FILTERS,
    minScore: 65,
    hideDealBreakers: true,
  };
}

export type CandidateFilterOptions = {
  nationalities: FilterChoice[];
  seniorities: FilterChoice[];
  languages: FilterChoice[];
  recommendations: FilterChoice[];
};

function compareStated(left: string, right: string): number {
  if (left === NOT_STATED && right !== NOT_STATED) {
    return 1;
  }
  if (right === NOT_STATED && left !== NOT_STATED) {
    return -1;
  }
  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

function choiceList(
  values: string[],
  preferred: string,
  sort: "alpha" | "count" | "seniority" | "recommendation",
): FilterChoice[] {
  const counts = new Map<string, FilterChoice>();
  for (const value of values) {
    const key = value.toLowerCase();
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    const chosen =
      preferred.length > 0 && preferred.toLowerCase() === key ? preferred : value;
    counts.set(key, { value: chosen, label: chosen, count: 1 });
  }

  const choices = [...counts.values()];
  if (sort === "seniority") {
    const order = new Map(
      CANDIDATE_SENIORITY_LEVELS.map((level, index) => [level, index]),
    );
    choices.sort(
      (left, right) =>
        (order.get(left.value as CandidateSeniority) ?? 99) -
        (order.get(right.value as CandidateSeniority) ?? 99),
    );
    return choices;
  }
  if (sort === "recommendation") {
    const order = new Map(
      (Object.keys(RECOMMENDATION_LABELS) as RecommendationTier[]).map((tier, index) => [
        tier,
        index,
      ]),
    );
    choices.sort(
      (left, right) => (order.get(left.value as RecommendationTier) ?? 99) -
        (order.get(right.value as RecommendationTier) ?? 99),
    );
    for (const choice of choices) {
      choice.label = recommendationLabel(choice.value as RecommendationTier);
    }
    return choices;
  }
  choices.sort((left, right) => {
    const stated = compareStated(left.value, right.value);
    if (left.value === NOT_STATED || right.value === NOT_STATED) {
      return stated;
    }
    if (sort === "count" && left.count !== right.count) {
      return right.count - left.count;
    }
    return stated;
  });
  return choices;
}

export function facetIsUseful(choices: readonly FilterChoice[]): boolean {
  return choices.some((choice) => choice.value !== NOT_STATED);
}

function rowsExcept(
  rows: FilterableCandidate[],
  filters: CandidateViewFilters,
  shortlisted: ReadonlySet<string>,
  reset: Partial<CandidateViewFilters>,
): FilterableCandidate[] {
  return rows.filter((row) =>
    matchesCandidateFilters(row, { ...filters, ...reset }, shortlisted),
  );
}

export function collectFilterOptions(
  rows: FilterableCandidate[],
  filters: CandidateViewFilters = EMPTY_CANDIDATE_FILTERS,
  shortlisted: ReadonlySet<string> = new Set(),
): CandidateFilterOptions {
  const nationalities = choiceList(
    rowsExcept(rows, filters, shortlisted, { nationality: "" }).map((row) =>
      candidateNationality(row),
    ),
    filters.nationality,
    "alpha",
  );
  const seniorities = choiceList(
    rowsExcept(rows, filters, shortlisted, { seniority: "" }).map((row) =>
      candidateSeniority(row),
    ),
    filters.seniority,
    "seniority",
  );
  const languages = choiceList(
    rowsExcept(rows, filters, shortlisted, { language: "" }).flatMap((row) =>
      (row.candidate?.languages ?? [])
        .map((language) => statedValue(language))
        .filter((language): language is string => Boolean(language)),
    ),
    filters.language,
    "alpha",
  );
  const recommendations = choiceList(
    rowsExcept(rows, filters, shortlisted, { recommendation: "" }).flatMap((row) =>
      row.recommendation ? [row.recommendation] : [],
    ),
    filters.recommendation,
    "recommendation",
  );

  return {
    nationalities,
    seniorities,
    languages,
    recommendations,
  };
}

function searchHaystack(row: FilterableCandidate): string {
  return [
    row.name,
    row.fileName,
    candidateTitle(row),
    candidateLocation(row),
    candidateNationality(row),
    row.candidate?.lastEmployer,
    row.candidate?.specialization,
    ...(row.candidate?.languages ?? []),
    ...(row.candidate?.technicalSkills ?? []),
    row.strengths,
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ")
    .toLowerCase();
}

export function matchesCandidateFilters(
  row: FilterableCandidate,
  filters: CandidateViewFilters,
  shortlisted: ReadonlySet<string>,
): boolean {
  const terms = filters.query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);
  if (terms.length > 0) {
    const haystack = searchHaystack(row);
    if (!terms.every((term) => haystack.includes(term))) {
      return false;
    }
  }

  if (
    filters.nationality.length > 0 &&
    candidateNationality(row).toLowerCase() !== filters.nationality.toLowerCase()
  ) {
    return false;
  }

  if (filters.seniority.length > 0 && candidateSeniority(row) !== filters.seniority) {
    return false;
  }

  if (filters.language.length > 0) {
    const wanted = filters.language.toLowerCase();
    const languages = (row.candidate?.languages ?? [])
      .map((language) => statedValue(language)?.toLowerCase())
      .filter((language): language is string => Boolean(language));
    if (!languages.includes(wanted)) {
      return false;
    }
  }

  if (
    filters.recommendation.length > 0 &&
    row.recommendation !== filters.recommendation
  ) {
    return false;
  }

  if (filters.minScore !== null && (row.totalScore ?? -1) < filters.minScore) {
    return false;
  }

  if (filters.hideDealBreakers && row.dealBreakerHit) {
    return false;
  }

  if (filters.shortlistOnly && !shortlisted.has(row.id)) {
    return false;
  }

  return true;
}

export function sortCandidates<T extends FilterableCandidate>(
  rows: T[],
  sort: CandidateSort,
): T[] {
  if (sort === "rank") {
    return [...rows];
  }

  return [...rows].sort((left, right) => {
    if (sort === "name") {
      return (left.name ?? left.fileName).localeCompare(right.name ?? right.fileName, undefined, {
        sensitivity: "base",
      });
    }
    if (sort === "years") {
      const leftYears = candidateYears(left);
      const rightYears = candidateYears(right);
      if (leftYears === null && rightYears === null) {
        return 0;
      }
      if (leftYears === null) {
        return 1;
      }
      if (rightYears === null) {
        return -1;
      }
      return rightYears - leftYears;
    }
    return compareStated(candidateNationality(left), candidateNationality(right));
  });
}

export function filterCandidates<T extends FilterableCandidate>(
  rows: T[],
  filters: CandidateViewFilters,
  shortlisted: ReadonlySet<string>,
  sort: CandidateSort,
): T[] {
  const matched = rows.filter((row) =>
    matchesCandidateFilters(row, filters, shortlisted),
  );
  return sortCandidates(matched, sort);
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function candidatesToCsv(rows: FilterableCandidate[]): string {
  const headers = [
    "Rank",
    "Name",
    "File",
    "Nationality",
    "Seniority",
    "Years",
    "Location",
    "Title",
    "Score",
    "Recommendation",
    "Deal-breaker",
  ];
  const lines = [
    headers.join(","),
    ...rows.map((row, index) => {
      const years = candidateYears(row);
      return [
        String(index + 1),
        row.name ?? "",
        row.fileName,
        candidateNationality(row),
        candidateSeniority(row),
        years === null ? "" : String(years),
        candidateLocation(row),
        candidateTitle(row) ?? "",
        row.totalScore === null ? "" : String(row.totalScore),
        recommendationLabel(row.recommendation),
        row.dealBreakerHit ? "Yes" : "No",
      ]
        .map(csvCell)
        .join(",");
    }),
  ];
  return `\uFEFF${lines.join("\n")}`;
}

export function formatShortlist(rows: FilterableCandidate[]): string {
  if (rows.length === 0) {
    return "";
  }
  const lines = rows.map((row, index) => {
    const years = candidateYears(row);
    return [
      `${index + 1}. ${row.name ?? row.fileName}`,
      candidateTitle(row) ?? "Title not stated",
      candidateNationality(row),
      candidateSeniority(row),
      years === null ? "Years not stated" : `${years} years`,
      row.totalScore === null ? "No score" : String(row.totalScore),
      recommendationLabel(row.recommendation),
    ].join(" | ");
  });
  return lines.join("\n");
}
