import type { ScoringProfile } from "@/lib/schemas/candidate";
import type { Candidate } from "@/lib/schemas/candidate";
import type { Rubric, RubricWeights, SalaryBand } from "@/lib/schemas/rubric";
import { SCORE_CRITERIA } from "@/lib/schemas/rubric";
import type {
  RecommendationTier,
  ScoreCriterionKey,
  ScoreResult,
} from "@/lib/schemas/score";

export const SHORTLIST_LIMIT = 15;

export function weightTotal(weights: RubricWeights): number {
  return SCORE_CRITERIA.reduce((sum, key) => sum + weights[key], 0);
}

export function computeTotalScore(
  score: ScoreResult,
  weights: RubricWeights,
): number {
  if (score.dealBreakerHit) {
    return 0;
  }

  const totalWeight = weightTotal(weights);
  if (totalWeight <= 0) {
    return 0;
  }

  const byCriterion = new Map<ScoreCriterionKey, number>();
  for (const item of score.scores) {
    byCriterion.set(item.criterion, item.score);
  }

  const weighted = SCORE_CRITERIA.reduce((sum, key) => {
    const value = byCriterion.get(key) ?? 0;
    return sum + (value / 10) * weights[key];
  }, 0);

  return Math.round((weighted / totalWeight) * 1000) / 10;
}

export function recommendationTier(totalScore: number): RecommendationTier {
  if (totalScore >= 80) {
    return "Strong candidate — recommend technical interview";
  }
  if (totalScore >= 65) {
    return "Good — conditional interview";
  }
  if (totalScore >= 50) {
    return "Average — reserve list";
  }
  return "Not suitable at this time";
}

const SALARY_DISCLAIMER = "Indicative estimate, not an offer";
const SALARY_MISSING = "Not set — add salary bands";

export function suggestedSalary(
  totalScore: number,
  bands: SalaryBand[],
): string {
  if (bands.length === 0) {
    return `${SALARY_MISSING}. ${SALARY_DISCLAIMER}`;
  }

  const band = bands.find(
    (item) => totalScore >= item.minScore && totalScore <= item.maxScore,
  );
  if (!band) {
    return `${SALARY_MISSING}. ${SALARY_DISCLAIMER}`;
  }

  return `${band.minAED}–${band.maxAED} AED/month. ${SALARY_DISCLAIMER}`;
}

export function rankCandidates<T extends { totalScore: number | null }>(
  rows: T[],
): T[] {
  return [...rows].sort((left, right) => {
    const a = left.totalScore ?? -1;
    const b = right.totalScore ?? -1;
    return b - a;
  });
}

export function scoringPayloadFromCandidate(candidate: Candidate): ScoringProfile {
  return {
    currentLocation: candidate.currentLocation,
    currentTitle: candidate.currentTitle,
    lastEmployer: candidate.lastEmployer,
    specialization: candidate.specialization,
    education: candidate.education,
    totalExperienceText: candidate.totalExperienceText,
    totalYearsExperience: candidate.totalYearsExperience,
    relevantExperienceText: candidate.relevantExperienceText,
    leadershipExperienceText: candidate.leadershipExperienceText,
    uaeExperienceText: candidate.uaeExperienceText,
    softwareSystems: candidate.softwareSystems,
    technicalSkills: candidate.technicalSkills,
    certifications: candidate.certifications,
    courses: candidate.courses,
    languages: candidate.languages,
    keyAchievements: candidate.keyAchievements,
    availabilityNotice: candidate.availabilityNotice,
    expectedSalary: candidate.expectedSalary,
    evidencePages: candidate.evidencePages,
    gaps: candidate.gaps,
    inconsistencies: candidate.inconsistencies,
  };
}

export function computeDerivedFields(
  totalScore: number,
  rubric: Rubric,
): { recommendation: RecommendationTier; suggestedSalary: string } {
  return {
    recommendation: recommendationTier(totalScore),
    suggestedSalary: suggestedSalary(totalScore, rubric.salaryBands),
  };
}
