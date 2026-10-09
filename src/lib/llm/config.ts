import { env } from "@/lib/env";

export const DEFAULT_BULK_MODEL = "qwen3:4b";
export const FAST_PASS_A_CAP = 0;
export const FAST_CONCURRENCY = 2;
export const FAST_ENRICH_COUNT = 0;

export const llmConfig = {
  host: env.OLLAMA_HOST,
  extractModel: env.OLLAMA_EXTRACT_MODEL,
  scoreModel: env.OLLAMA_SCORE_MODEL,
  bulkModel: env.OLLAMA_BULK_MODEL ?? DEFAULT_BULK_MODEL,
  concurrency: env.SCREENING_CONCURRENCY,
  timeBudgetMin: env.TIME_BUDGET_MIN,
  turboTruncateChars: env.TURBO_TRUNCATE_CHARS,
} as const;

export const TURBO_NUM_CTX = 2048;
export const TURBO_NUM_PREDICT = 200;
export const TURBO_KEEP_ALIVE = -1;
export const TURBO_TIMEOUT_MS = 45_000;
export const AUTO_CONCURRENCY_CANDIDATES = [2, 3, 4, 6] as const;
export const AUTO_TUNE_CV_COUNT = 24;
