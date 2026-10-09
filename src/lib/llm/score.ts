import { generateStructured } from "@/lib/llm/generate";
import { scoreCandidatePrompt } from "@/lib/llm/prompts";
import { SCORE_NUM_CTX } from "@/lib/llm/truncate";
import { scoringPayloadFromCandidate } from "@/lib/ranking/rank";
import type { Candidate } from "@/lib/schemas/candidate";
import type { Rubric } from "@/lib/schemas/rubric";
import { scoreResultSchema, type ScoreResult } from "@/lib/schemas/score";

export async function scoreCandidate(
  model: string,
  candidate: Candidate,
  rubric: Rubric,
): Promise<ScoreResult> {
  const profile = scoringPayloadFromCandidate(candidate);
  const prompt = scoreCandidatePrompt(profile, rubric);
  return generateStructured(scoreResultSchema, {
    model,
    system: prompt.system,
    user: prompt.user,
    numCtx: SCORE_NUM_CTX,
  });
}
