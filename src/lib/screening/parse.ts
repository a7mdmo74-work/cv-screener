import { candidateSchema, type Candidate } from "@/lib/schemas/candidate";
import { scoreResultSchema, type ScoreResult } from "@/lib/schemas/score";

export function parseCandidateJson(json: string | null): Candidate | null {
  if (!json) {
    return null;
  }
  try {
    return candidateSchema.parse(JSON.parse(json));
  } catch {
    return null;
  }
}

export function parseScoreJson(json: string | null): ScoreResult | null {
  if (!json) {
    return null;
  }
  try {
    return scoreResultSchema.parse(JSON.parse(json));
  } catch {
    return null;
  }
}
