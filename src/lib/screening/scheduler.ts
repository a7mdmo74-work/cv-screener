import { AUTO_CONCURRENCY_CANDIDATES } from "@/lib/llm/config";
import {
  TIME_BUDGET_ERROR,
  TURBO_FAIL_PREFIX,
} from "@/lib/screening/stage-messages";

export {
  PASS_A_CAP_ERROR,
  TIME_BUDGET_ERROR,
  TIME_BUDGET_STAGE,
  TURBO_FAIL_PREFIX,
} from "@/lib/screening/stage-messages";

export function isResumableTurboError(error: string | null | undefined): boolean {
  if (!error) {
    return false;
  }
  return error === TIME_BUDGET_ERROR || error.startsWith(TURBO_FAIL_PREFIX);
}

export type ConcurrencySample = {
  concurrency: number;
  cvCount: number;
  elapsedMs: number;
};

export function deadlineFrom(startedAt: Date, timeBudgetMin: number): Date {
  return new Date(startedAt.getTime() + timeBudgetMin * 60_000);
}

export function isPastDeadline(now: Date, deadline: Date): boolean {
  return now.getTime() >= deadline.getTime();
}

export function cvsPerMinute(processed: number, elapsedMs: number): number {
  if (processed <= 0 || elapsedMs <= 0) {
    return 0;
  }
  return Math.round((processed / (elapsedMs / 60_000)) * 10) / 10;
}

export function tokensPerSecond(
  promptTokens: number,
  completionTokens: number,
  elapsedMs: number,
): number {
  const tokens = promptTokens + completionTokens;
  if (tokens <= 0 || elapsedMs <= 0) {
    return 0;
  }
  return Math.round((tokens / (elapsedMs / 1000)) * 10) / 10;
}

export function etaQueueSize(input: {
  pending: number;
  notScreened: number;
  turboMode: boolean;
}): number {
  return input.turboMode ? input.pending : input.pending + input.notScreened;
}

export function projectRemainingMinutes(
  remaining: number,
  ratePerMinute: number,
): number | null {
  if (ratePerMinute <= 0) {
    return null;
  }
  return Math.round((remaining / ratePerMinute) * 10) / 10;
}

export function pickBestConcurrency(samples: ConcurrencySample[]): number {
  let best: number = AUTO_CONCURRENCY_CANDIDATES[0];
  let bestRate = -1;
  for (const sample of samples) {
    const rate = cvsPerMinute(sample.cvCount, sample.elapsedMs);
    if (rate > bestRate) {
      bestRate = rate;
      best = sample.concurrency;
    }
  }
  return best;
}

export function chunkForAutoTune(
  total: number,
  candidates: readonly number[] = AUTO_CONCURRENCY_CANDIDATES,
): Array<{ concurrency: number; count: number }> {
  const per = Math.max(1, Math.floor(total / candidates.length));
  return candidates.map((concurrency) => ({ concurrency, count: per }));
}

