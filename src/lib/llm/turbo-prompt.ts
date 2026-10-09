import { SCORE_CRITERIA, type Rubric } from "@/lib/schemas/rubric";
import { LLM_GROUNDING_RULES, SENIOR_HR_MANAGER_ROLE } from "@/lib/llm/prompts";

export const TURBO_SYSTEM_PREFIX = [
  SENIOR_HR_MANAGER_ROLE,
  LLM_GROUNDING_RULES,
  "Compact JSON only. Scores object first, then profile. No Arabic. No quotes.",
  "Non-PII profile only. Missing = null. Never invent.",
  "scores keys: relevantExperience,leadership,technicalSkills,softwareSystems,achievements,uaeExperience,jobFit. Ints 0-10. Conservative; 9-10 only with evidence.",
  "If the JD has Senior and Junior tracks, score jobFit for the better-matching track.",
  "flags max 3: date_gap,overlap,summary_mismatch,future_date,missing_dates.",
  "strengths/gaps max 80 chars.",
].join(" ");

export function turboRubricBlock(rubric: Rubric): string {
  const weights = SCORE_CRITERIA.map(
    (key) => `${key}:${rubric.weights[key]}`,
  ).join(",");
  return [
    `Must:${rubric.mustHave.slice(0, 6).join("; ") || "none"}`,
    `Nice:${rubric.niceToHave.slice(0, 4).join("; ") || "none"}`,
    `MinYears:${rubric.minYearsExperience ?? "n"}`,
    `Edu:${rubric.education ?? "n"}`,
    `Loc:${rubric.location ?? rubric.geographicScope ?? "n"}`,
    `DB:${rubric.dealBreakers.slice(0, 3).join("; ") || "none"}`,
    `W:${weights}`,
  ].join("\n");
}

export function turboSystemPrompt(rubric: Rubric): string {
  return `${TURBO_SYSTEM_PREFIX}\n${turboRubricBlock(rubric)}`;
}

export function turboUserPrompt(anonymizedText: string, includeFlags: boolean): string {
  const flagLine = includeFlags
    ? "Include flags when date issues are explicit."
    : "Do not include flags; return flags as [].";
  return `CV text:\n${anonymizedText}\n\n${flagLine}`;
}
