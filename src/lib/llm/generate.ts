import type { z } from "zod";
import { ollama } from "@/lib/llm/client";
import { zodToJsonSchema } from "@/lib/llm/json-schema";
import { hydrateTurboPayload, parseJsonLoose } from "@/lib/llm/json-repair";
import { TimeoutError, withTimeout } from "@/lib/llm/timeout";

const MAX_ATTEMPTS = 3;
const WIZARD_TIMEOUT_MS = 20_000;

function isThinkUnsupported(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /think/i.test(message);
}

export async function generateStructured<T>(
  schema: z.ZodType<T>,
  options: {
    model: string;
    system: string;
    user: string;
    numCtx?: number;
    timeoutMs?: number;
    maxAttempts?: number;
  },
): Promise<T> {
  const format = zodToJsonSchema(schema);
  let lastError = "Unknown LLM error";
  let useThinkFlag = true;
  const attempts = options.maxAttempts ?? MAX_ATTEMPTS;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const user =
      useThinkFlag || attempt === 0
        ? options.user
        : `${options.user}\n\n/no_think`;

    try {
      const chat = ollama.chat({
        model: options.model,
        messages: [
          { role: "system", content: options.system },
          { role: "user", content: user },
        ],
        format,
        ...(useThinkFlag ? { think: false as const } : {}),
        stream: false,
        options: {
          temperature: 0,
          num_ctx: options.numCtx ?? 8192,
        },
      });
      const response = options.timeoutMs
        ? await withTimeout(
            chat,
            options.timeoutMs,
            `Ollama timed out after ${Math.round(options.timeoutMs / 1000)}s`,
          )
        : await chat;

      const content = response.message.content.trim();
      const parsed: unknown = JSON.parse(content);
      return schema.parse(parsed);
    } catch (error) {
      if (error instanceof TimeoutError) {
        throw error;
      }
      if (useThinkFlag && isThinkUnsupported(error)) {
        useThinkFlag = false;
      }
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  throw new Error(
    `LLM output failed validation after ${attempts} attempts: ${lastError}`,
  );
}

export const wizardGenerateOptions = {
  timeoutMs: WIZARD_TIMEOUT_MS,
  maxAttempts: 1,
  numCtx: 4096,
} as const;

export type TurboGenerateResult<T> = {
  value: T;
  promptTokens: number;
  completionTokens: number;
};

export async function generateTurboStructured<T>(
  schema: z.ZodType<T>,
  options: {
    model: string;
    system: string;
    user: string;
    numCtx: number;
    numPredict: number;
    keepAlive: number;
    timeoutMs?: number;
  },
): Promise<TurboGenerateResult<T>> {
  let lastError = "Unknown LLM error";
  let useThinkFlag = true;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const chat = ollama.chat({
        model: options.model,
        messages: [
          { role: "system", content: options.system },
          { role: "user", content: options.user },
        ],
        format: "json",
        keep_alive: options.keepAlive,
        ...(useThinkFlag ? { think: false as const } : {}),
        stream: false,
        options: {
          temperature: 0,
          num_ctx: options.numCtx,
          num_predict: options.numPredict,
        },
      });
      const response = options.timeoutMs
        ? await withTimeout(
            chat,
            options.timeoutMs,
            `Turbo timed out after ${Math.round(options.timeoutMs / 1000)}s`,
          )
        : await chat;

      const content = response.message.content.trim();
      const parsed: unknown = hydrateTurboPayload(parseJsonLoose(content));
      return {
        value: schema.parse(parsed),
        promptTokens: response.prompt_eval_count ?? 0,
        completionTokens: response.eval_count ?? 0,
      };
    } catch (error) {
      if (error instanceof TimeoutError) {
        throw error;
      }
      if (useThinkFlag && isThinkUnsupported(error)) {
        useThinkFlag = false;
        continue;
      }
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  throw new Error(`Turbo LLM call failed: ${lastError}`);
}
