import { describe, expect, it } from "vitest";
import {
  DOCX_PAGE_LABEL,
  evidencePagesLabel,
  formatPagedText,
  parsePagesJson,
} from "@/lib/parsing/pages";

describe("formatPagedText", () => {
  it("wraps pages with [[PAGE n]] markers", () => {
    expect(formatPagedText(["First", "Second"], "fallback")).toContain(
      "[[PAGE 1]]",
    );
    expect(formatPagedText(["First", "Second"], "fallback")).toContain(
      "[[PAGE 2]]",
    );
  });

  it("falls back when there are no pages", () => {
    expect(formatPagedText([], "plain text")).toBe("plain text");
    expect(evidencePagesLabel([])).toBe(DOCX_PAGE_LABEL);
  });

  it("parses stored page JSON", () => {
    expect(parsePagesJson(JSON.stringify(["a", "b"]))).toEqual(["a", "b"]);
    expect(parsePagesJson("not-json")).toEqual([]);
  });
});
