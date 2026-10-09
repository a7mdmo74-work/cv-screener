import type { Candidate } from "@/lib/schemas/candidate";
import { SCORE_CRITERIA } from "@/lib/schemas/rubric";
import type { ScoreResult } from "@/lib/schemas/score";
import type { ContactJson, TurboResult } from "@/lib/schemas/turbo";
import {
  arabicNarrative,
  arabicRecommendationTier,
  verificationQuestionsFromTurbo,
} from "@/lib/screening/arabic-templates";
import { computeTotalScore } from "@/lib/ranking/rank";
import type { Rubric } from "@/lib/schemas/rubric";

export function dampenTurboResult(result: TurboResult, rubric: Rubric): TurboResult {
  const scores = { ...result.scores };
  const profile = result.profile;
  const years = profile.relevantYears ?? profile.totalYears ?? 0;
  const leadershipText = profile.leadership?.trim() ?? "";

  if (scores.leadership >= 7 && leadershipText.length === 0 && years < 4) {
    scores.leadership = Math.min(scores.leadership, 3);
  }
  if (
    scores.uaeExperience >= 7 &&
    (profile.uaeYears == null || profile.uaeYears <= 0)
  ) {
    scores.uaeExperience = Math.min(scores.uaeExperience, 2);
  }
  if (scores.achievements >= 8 && result.strengths.trim().length < 20) {
    scores.achievements = Math.min(scores.achievements, 5);
  }
  const minYears = rubric.minYearsExperience;
  if (minYears != null && years > 0 && years + 1 < minYears) {
    scores.jobFit = Math.min(scores.jobFit, 5);
    scores.relevantExperience = Math.min(scores.relevantExperience, 6);
  }

  return { ...result, scores };
}

export function turboToScoreResult(result: TurboResult): ScoreResult {
  return {
    scores: SCORE_CRITERIA.map((criterion) => ({
      criterion,
      score: result.scores[criterion],
      evidence: "turbo",
    })),
    dealBreakerHit: result.dealBreaker,
    strengths: result.strengths,
    risksAndGaps: result.gaps,
    verificationPoints: verificationQuestionsFromTurbo(result),
    recommendationNarrative: "",
  };
}

export function turboToCandidate(
  result: TurboResult,
  contact: ContactJson,
): Candidate {
  const profile = result.profile;
  const yearsText =
    profile.totalYears == null ? null : `${profile.totalYears} years`;
  const relevantText =
    profile.relevantYears == null ? null : `${profile.relevantYears} years`;
  const uaeText = profile.uaeYears == null ? null : `${profile.uaeYears} years`;

  return {
    fullName: contact.fullName,
    nationality: null,
    currentLocation: profile.location,
    currentTitle: profile.currentTitle,
    lastEmployer: profile.lastEmployer,
    specialization: profile.specialization,
    education: profile.education,
    totalExperienceText: yearsText,
    totalYearsExperience: profile.totalYears,
    availabilityNotice: null,
    expectedSalary: null,
    dataQualityNote: result.flags.length > 0 ? result.flags.join(", ") : null,
    evidencePages: null,
    phone: contact.phone,
    email: contact.email,
    linkedin: contact.linkedin,
    relevantExperienceText: relevantText,
    leadershipExperienceText: profile.leadership,
    uaeExperienceText: uaeText,
    softwareSystems: profile.software,
    technicalSkills: profile.software,
    certifications: profile.certifications,
    courses: [],
    languages: profile.languages,
    keyAchievements: result.strengths ? [result.strengths] : [],
    gaps: result.gaps ? [result.gaps] : [],
    inconsistencies: result.flags,
  };
}

export function finalizeTurboScore(
  result: TurboResult,
  rubric: Rubric,
): { score: ScoreResult; totalScore: number; candidate: Candidate } {
  const damped = dampenTurboResult(result, rubric);
  const score = turboToScoreResult(damped);
  const totalScore = computeTotalScore(score, rubric.weights);
  score.recommendationNarrative = arabicNarrative({
    totalScore,
    strengths: result.strengths,
    gaps: result.gaps,
  });
  return {
    score,
    totalScore,
    candidate: turboToCandidate(result, {
      fullName: null,
      phone: null,
      email: null,
      linkedin: null,
    }),
  };
}

export function attachContact(
  candidate: Candidate,
  contact: ContactJson,
): Candidate {
  return {
    ...candidate,
    fullName: contact.fullName ?? candidate.fullName,
    phone: contact.phone,
    email: contact.email,
    linkedin: contact.linkedin,
  };
}

export function arabicTierForScore(totalScore: number): string {
  return arabicRecommendationTier(totalScore);
}
