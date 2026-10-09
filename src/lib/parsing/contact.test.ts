import { describe, expect, it } from "vitest";
import { extractContactFields, extractNationality } from "@/lib/parsing/contact";

describe("extractContactFields", () => {
  it("reads name, email, phone, and LinkedIn from raw text", () => {
    const result = extractContactFields(
      [
        "Ahmed Amer",
        "Site Engineer",
        "hello@example.com",
        "Phone: +971 50 123 4567",
        "https://www.linkedin.com/in/ahmed-amer",
      ].join("\n"),
    );

    expect(result.fullName).toBe("Ahmed Amer");
    expect(result.email).toBe("hello@example.com");
    expect(result.phone).toContain("971");
    expect(result.linkedin).toMatch(/linkedin\.com\/in\/ahmed-amer/i);
  });

  it("reads a labeled nationality and ignores company names", () => {
    expect(extractNationality("Nationality: Egyptian\nLanguages: Arabic")).toBe(
      "Egyptian",
    );
    expect(extractNationality("Nationality \t: Indian | Visa Status: Visit visa")).toBe(
      "Indian",
    );
    expect(extractNationality("NATIONAL TECHNICAL SERVICES – Karachi")).toBeNull();
    expect(extractNationality("national Building Materials Trading LLC")).toBeNull();
  });

  it("falls back to the filename when the header is a section title", () => {
    const result = extractContactFields(
      "Key Achievements\nExcel, SAP\n",
      "Neha Khandelwal.pdf",
    );
    expect(result.fullName).toBe("Neha Khandelwal");
  });
});
