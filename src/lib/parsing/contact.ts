import { detectHeaderName, isSectionTitle } from "@/lib/parsing/anonymize";

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const LINKEDIN_RE =
  /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|pub)\/[\w%.-]+\/?/gi;
const PHONE_RE =
  /(?:(?:tel|phone|mobile|cell|whatsapp)\s*[:\-]?\s*)?(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?0?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}\b/gi;

function firstMatch(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  const value = match?.[0]?.trim();
  return value && value.length > 0 ? value : null;
}

export function nameFromFileName(fileName: string): string | null {
  const base = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const cleaned = base
    .replace(/\b(cv|resume|updated|copy|final|ats|new|old)\b/gi, "")
    .replace(/\(\d+\)/g, "")
    .replace(/\d{5,}/g, "")
    .replace(/[-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length < 3 || isSectionTitle(cleaned)) {
    return null;
  }
  const words = cleaned.split(/\s+/);
  if (words.length < 2 || words.length > 6) {
    return cleaned.length >= 4 ? cleaned : null;
  }
  if (words.every((word) => /^[\p{L}'’.]+$/u.test(word))) {
    return cleaned;
  }
  return cleaned;
}

export function displayCandidateName(
  fullName: string | null | undefined,
  fileName: string,
): string | null {
  if (fullName && !isSectionTitle(fullName)) {
    return fullName;
  }
  return nameFromFileName(fileName);
}

export function extractNationality(rawText: string): string | null {
  const match = rawText.match(
    /(?:nationality|citizenship|الجنسية)\s*[:：\-]\s*([^\n|•]{2,60})/iu,
  );
  const captured = match?.[1]?.trim().replace(/\s+/g, " ") ?? "";
  if (captured.length === 0) {
    return null;
  }
  const value =
    captured
      .split(/\b(?:visa|marital|sex|gender|driving|date of birth|d\.?o\.?b)\b/i)[0]
      ?.replace(/[\s:–—\-,;/]+$/g, "")
      .trim() ?? "";
  if (value.length < 2 || value.length > 40 || /\d/.test(value)) {
    return null;
  }
  if (/^(n\/a|na|none|unknown|not specified|null)$/i.test(value)) {
    return null;
  }
  return value;
}

export function extractContactFields(
  rawText: string,
  fileName?: string,
): {
  fullName: string | null;
  phone: string | null;
  email: string | null;
  linkedin: string | null;
} {
  const linkedin = firstMatch(rawText, LINKEDIN_RE);
  const email = firstMatch(rawText, EMAIL_RE);
  let phone = firstMatch(rawText, PHONE_RE);
  if (phone && email && phone.includes("@")) {
    phone = null;
  }
  if (phone && /linkedin/i.test(phone)) {
    phone = null;
  }

  const header = detectHeaderName(rawText);
  return {
    fullName: displayCandidateName(header, fileName ?? ""),
    phone,
    email,
    linkedin,
  };
}
