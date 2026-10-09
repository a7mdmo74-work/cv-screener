import { describe, expect, it } from "vitest";
import { TimeoutError, withTimeout } from "@/lib/llm/timeout";

describe("withTimeout", () => {
  it("returns the value when the promise finishes in time", async () => {
    await expect(withTimeout(Promise.resolve(7), 50, "slow")).resolves.toBe(7);
  });

  it("rejects when the deadline is exceeded", async () => {
    const delayed = new Promise<number>((resolve) => {
      setTimeout(() => resolve(1), 80);
    });
    await expect(withTimeout(delayed, 20, "wizard timed out")).rejects.toBeInstanceOf(
      TimeoutError,
    );
  });
});
