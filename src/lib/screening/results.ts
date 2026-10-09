import { existsSync } from "node:fs";
import { computeDerivedFields, rankCandidates } from "@/lib/ranking/rank";
import {
  displayJobStatus,
  parseStatusSchema,
  stageStatusSchema,
} from "@/lib/schemas/job";
import type { Rubric } from "@/lib/schemas/rubric";
import type { RankedCandidate } from "@/lib/schemas/screening";
import type { Candidate } from "@/lib/schemas/candidate";
import { displayCandidateName, extractNationality } from "@/lib/parsing/contact";
import { parseCandidateJson, parseScoreJson } from "@/lib/screening/parse";

function withNationality(
  candidate: Candidate | null,
  rawText: string | undefined,
): Candidate | null {
  if (!candidate) {
    return null;
  }
  const stored = candidate.nationality?.trim() ?? "";
  if (stored.length > 0 && stored.toLowerCase() !== "null") {
    return candidate;
  }
  const found = rawText ? extractNationality(rawText) : null;
  if (!found) {
    return candidate;
  }
  return { ...candidate, nationality: found };
}

export function toRankedCandidate(
  cv: {
    id: string;
    fileName: string;
    extractionJson: string | null;
    scoreJson: string | null;
    totalScore: number | null;
    stageStatus: string;
    error: string | null;
    passAScore?: number | null;
    rawText?: string;
  },
  rubric: Rubric,
): RankedCandidate {
  const candidate = withNationality(parseCandidateJson(cv.extractionJson), cv.rawText);
  const score = parseScoreJson(cv.scoreJson);
  const derived =
    cv.totalScore === null
      ? null
      : computeDerivedFields(cv.totalScore, rubric);

  return {
    id: cv.id,
    fileName: cv.fileName,
    name: displayCandidateName(candidate?.fullName, cv.fileName),
    location: candidate?.currentLocation ?? null,
    currentTitle: candidate?.currentTitle ?? null,
    totalYearsExperience: candidate?.totalYearsExperience ?? null,
    totalExperienceText: candidate?.totalExperienceText ?? null,
    uaeExperienceText: candidate?.uaeExperienceText ?? null,
    totalScore: cv.totalScore,
    recommendation: derived?.recommendation ?? null,
    suggestedSalary: derived?.suggestedSalary ?? null,
    strengths: score?.strengths ?? null,
    risksAndGaps: score?.risksAndGaps ?? null,
    verificationPoints: score?.verificationPoints ?? [],
    stageStatus: stageStatusSchema.parse(cv.stageStatus),
    dealBreakerHit: score?.dealBreakerHit ?? false,
    scores: score?.scores ?? [],
    error: cv.error,
    passAScore: cv.passAScore ?? null,
    candidate,
  };
}

export function rankJobCandidates(
  cvs: Array<{
    id: string;
    fileName: string;
    extractionJson: string | null;
    scoreJson: string | null;
    totalScore: number | null;
    stageStatus: string;
    error: string | null;
    passAScore?: number | null;
    rawText?: string;
  }>,
  rubric: Rubric,
): RankedCandidate[] {
  return rankCandidates(cvs.map((cv) => toRankedCandidate(cv, rubric)));
}

export function parseJobStatus(status: string, notScreened = 0) {
  return displayJobStatus(status, notScreened);
}

export function parseParseStatus(status: string) {
  return parseStatusSchema.parse(status);
}

export function fileExists(filePath: string): boolean {
  return filePath.length > 0 && existsSync(filePath);
}
