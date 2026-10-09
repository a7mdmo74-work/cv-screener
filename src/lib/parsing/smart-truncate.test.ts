import { describe, expect, it } from "vitest";
import {
  looksLikeRawPii,
  smartTruncateAnonymized,
} from "@/lib/parsing/smart-truncate";

describe("smartTruncateAnonymized", () => {
  it("keeps experience before boilerplate and respects the limit", () => {
    const text = [
      "Summary",
      "Junior accountant in Abu Dhabi.",
      "Experience",
      "GL and AP for a nursery contractor.",
      "References",
      "Available on request",
      "Hobbies",
      "Football",
    ].join("\n");
    const truncated = smartTruncateAnonymized(text, 80);
    expect(truncated).toContain("GL and AP");
    expect(truncated.toLowerCase()).not.toContain("football");
    expect(truncated.length).toBeLessThanOrEqual(80);
  });
});

describe("looksLikeRawPii", () => {
  it("flags emails and linkedin URLs", () => {
    expect(looksLikeRawPii("Contact jane@example.com")).toBe(true);
    expect(looksLikeRawPii("linkedin.com/in/jane")).toBe(true);
    expect(looksLikeRawPii("GL accountant in Abu Dhabi")).toBe(false);
  });
});
