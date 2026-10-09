import { describe, expect, it } from "vitest";
import { truncateText } from "@/lib/llm/truncate";

describe("truncateText", () => {
  it("returns short text unchanged", () => {
    expect(truncateText("hello", 10)).toBe("hello");
  });

  it("appends a truncation marker", () => {
    expect(truncateText("abcdefghij", 4)).toBe("abcd\n\n[TRUNCATED]");
  });
});
