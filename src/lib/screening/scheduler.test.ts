import { describe, expect, it } from "vitest";
import {
  TIME_BUDGET_ERROR,
  TIME_BUDGET_STAGE,
  TURBO_FAIL_PREFIX,
  cvsPerMinute,
  deadlineFrom,
  etaQueueSize,
  isPastDeadline,
  isResumableTurboError,
  pickBestConcurrency,
} from "@/lib/screening/scheduler";

describe("turbo scheduler", () => {
  it("stops at the deadline", () => {
    const started = new Date("2026-10-08T10:00:00Z");
    const deadline = deadlineFrom(started, 55);
    expect(isPastDeadline(new Date("2026-10-08T10:54:00Z"), deadline)).toBe(false);
    expect(isPastDeadline(new Date("2026-10-08T10:55:00Z"), deadline)).toBe(true);
  });

  it("resumes time-budget and turbo JSON leftovers, not Pass A cap", () => {
    const rows = [
      { id: "1", stageStatus: "scored", error: null },
      { id: "2", stageStatus: TIME_BUDGET_STAGE, error: TIME_BUDGET_ERROR },
      { id: "3", stageStatus: TIME_BUDGET_STAGE, error: "Outside Pass A cap" },
      {
        id: "4",
        stageStatus: TIME_BUDGET_STAGE,
        error: `${TURBO_FAIL_PREFIX}bad json`,
      },
    ];
    const resumable = rows.filter(
      (row) =>
        row.stageStatus === TIME_BUDGET_STAGE &&
        isResumableTurboError(row.error),
    );
    expect(resumable.map((row) => row.id)).toEqual(["2", "4"]);
  });

  it("locks the fastest concurrency sample", () => {
    expect(
      pickBestConcurrency([
        { concurrency: 2, cvCount: 6, elapsedMs: 60_000 },
        { concurrency: 4, cvCount: 6, elapsedMs: 30_000 },
        { concurrency: 6, cvCount: 6, elapsedMs: 45_000 },
      ]),
    ).toBe(4);
    expect(cvsPerMinute(6, 30_000)).toBe(12);
  });

  it("excludes Pass A leftovers from turbo ETA", () => {
    expect(
      etaQueueSize({ pending: 26, notScreened: 160, turboMode: true }),
    ).toBe(26);
    expect(
      etaQueueSize({ pending: 26, notScreened: 10, turboMode: false }),
    ).toBe(36);
  });
});
