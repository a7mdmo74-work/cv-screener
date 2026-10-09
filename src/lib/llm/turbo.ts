import {
  TURBO_KEEP_ALIVE,
  TURBO_NUM_CTX,
  TURBO_NUM_PREDICT,
  TURBO_TIMEOUT_MS,
} from "@/lib/llm/config";
import { generateTurboStructured } from "@/lib/llm/generate";
import { turboSystemPrompt, turboUserPrompt } from "@/lib/llm/turbo-prompt";
import {
  looksLikeRawPii,
} from "@/lib/parsing/smart-truncate";
import { smartTruncateAnonymized } from "@/lib/parsing/smart-truncate";
import type { Rubric } from "@/lib/schemas/rubric";
import { turboSchema, type TurboResult } from "@/lib/schemas/turbo";

export type TurboCallResult = {
  result: TurboResult;
  promptTokens: number;
  completionTokens: number;
  truncatedChars: number;
};

export function assertNoPii(text: string): void {
  if (looksLikeRawPii(text)) {
    throw new Error("Turbo input must not contain raw PII");
  }
}

export async function turboScreenCv(input: {
  model: string;
  rubric: Rubric;
  anonymizedText: string;
  truncateChars: number;
}): Promise<TurboCallResult> {
  const system = turboSystemPrompt(input.rubric);
  const primary = smartTruncateAnonymized(input.anonymizedText, input.truncateChars);
  assertNoPii(primary);

  try {
    const generated = await generateTurboStructured(turboSchema, {
      model: input.model,
      system,
      user: turboUserPrompt(primary, true),
      numCtx: TURBO_NUM_CTX,
      numPredict: TURBO_NUM_PREDICT,
      keepAlive: TURBO_KEEP_ALIVE,
      timeoutMs: TURBO_TIMEOUT_MS,
    });
    return {
      result: generated.value,
      promptTokens: generated.promptTokens,
      completionTokens: generated.completionTokens,
      truncatedChars: primary.length,
    };
  } catch {
    const fallback = smartTruncateAnonymized(input.anonymizedText, 1600);
    assertNoPii(fallback);
    const generated = await generateTurboStructured(turboSchema, {
      model: input.model,
      system,
      user: turboUserPrompt(fallback, false),
      numCtx: TURBO_NUM_CTX,
      numPredict: TURBO_NUM_PREDICT,
      keepAlive: TURBO_KEEP_ALIVE,
      timeoutMs: TURBO_TIMEOUT_MS,
    });
    return {
      result: generated.value,
      promptTokens: generated.promptTokens,
      completionTokens: generated.completionTokens,
      truncatedChars: fallback.length,
    };
  }
}
