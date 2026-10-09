import { describe, expect, it } from "vitest";
import { anonymizeCvText, detectHeaderName } from "@/lib/parsing/anonymize";

describe("detectHeaderName", () => {
  it("reads a two-word name from the first lines", () => {
    expect(detectHeaderName("Ahmed Amer\nSoftware Engineer\nBerlin")).toBe(
      "Ahmed Amer",
    );
  });

  it("ignores emails and numbered lines", () => {
    expect(
      detectHeaderName("hello@example.com\nSoftware Engineer 2"),
    ).toBeNull();
  });

  it("ignores section titles such as Key Achievements", () => {
    expect(detectHeaderName("Key Achievements\nExcel, SAP")).toBeNull();
    expect(detectHeaderName("PROFESSIONAL SUMMARY\nAccountant")).toBeNull();
  });
});

describe("anonymizeCvText", () => {
  it("replaces name, email, LinkedIn, and labeled phone", () => {
    const result = anonymizeCvText(
      [
        "Ahmed Amer",
        "hello@example.com",
        "Phone: +971 50 123 4567",
        "https://www.linkedin.com/in/ahmed-amer",
        "Nationality: Egyptian",
        "Built APIs in Node.js",
      ].join("\n"),
    );

    expect(result).toContain("[NAME]");
    expect(result).toContain("[EMAIL]");
    expect(result).toContain("[PHONE]");
    expect(result).toContain("[LINKEDIN]");
    expect(result).toContain("[NATIONALITY]");
    expect(result).toContain("Built APIs in Node.js");
    expect(result).not.toContain("Ahmed Amer");
    expect(result).not.toContain("hello@example.com");
    expect(result).not.toContain("linkedin.com/in/ahmed-amer");
  });
});
