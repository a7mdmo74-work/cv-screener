const SECTION_TITLE =
  /^(professional summary|key achievements|curriculum vitae|resume|cv|profile|objective|education|experience|skills|contact|summary|work history|personal details)$/i;

export function isSectionTitle(line: string): boolean {
  return SECTION_TITLE.test(line.trim());
}

function looksLikeName(line: string): boolean {
  if (isSectionTitle(line)) {
    return false;
  }
  if (line.length > 60 || /\d/.test(line) || /@/.test(line)) {
    return false;
  }
  const words = line.split(/\s+/);
  if (words.length < 2 || words.length > 5) {
    return false;
  }
  return words.every((word) => /^[\p{L}'’-]+$/u.test(word));
}

export function detectHeaderName(text: string): string | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 8);

  return lines.find((line) => looksLikeName(line)) ?? null;
}

export function anonymizeCvText(rawText: string): string {
  let text = rawText;

  const headerName = detectHeaderName(text);
  if (headerName) {
    const escaped = headerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    text = text.replace(new RegExp(escaped, "gi"), "[NAME]");
  }

  text = text.replace(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|pub)\/[\w%.-]+\/?/gi,
    "[LINKEDIN]",
  );
  text = text.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL]");
  text = text.replace(
    /(?:tel|phone|mobile|cell|whatsapp)\s*[:\-]?\s*[+\d][\d\s().-]{6,}/gi,
    "[PHONE]",
  );
  text = text.replace(
    /(?:\+|00)\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/g,
    "[PHONE]",
  );
  text = text.replace(
    /\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g,
    "[PHONE]",
  );
  text = text.replace(
    /(?:date of birth|d\.?o\.?b\.?|born|birthday)\s*[:\-]?\s*[^\n]*/gi,
    "[DATE OF BIRTH]",
  );
  text = text.replace(/(?:^|\n)\s*age\s*[:\-]?\s*\d{1,2}\b/gi, "\n[AGE]");
  text = text.replace(
    /(?:nationality|citizenship)\s*[:\-]?\s*[^\n]*/gi,
    "[NATIONALITY]",
  );
  text = text.replace(/(?:gender|sex)\s*[:\-]?\s*[^\n]*/gi, "[GENDER]");
  text = text.replace(
    /(?:marital status|married|single|divorced|widowed)\s*[:\-]?\s*[^\n]*/gi,
    "[MARITAL STATUS]",
  );
  text = text.replace(
    /(?:profile\s*)?(?:photo|photograph|headshot|passport photo)\b/gi,
    "[PHOTO]",
  );

  return text.replace(/\n{3,}/g, "\n\n").trim();
}
