const SECTION_ORDER = [
  "summary",
  "experience",
  "education",
  "skills",
  "certifications",
] as const;

const HEADER_ALIASES: Record<(typeof SECTION_ORDER)[number], RegExp> = {
  summary:
    /^(summary|profile|objective|about|professional summary|الملخص|نبذة)$/i,
  experience:
    /^(experience|work experience|employment|career|الخبرة|الخبرات|التوظيف)$/i,
  education: /^(education|academic|qualifications|التعليم|المؤهلات)$/i,
  skills: /^(skills|technical skills|competenc|المهارات)$/i,
  certifications:
    /^(certifications?|licen[cs]es?|courses|الشهادات|التراخيص)$/i,
};

const DROP_LINE =
  /^(references?|hobbies|interests|declaration|i hereby|personal details|passport|national id|المراجع|الهوايات)$/i;

function classifyHeader(line: string): (typeof SECTION_ORDER)[number] | null {
  const trimmed = line.replace(/[:\s]+$/g, "").trim();
  for (const key of SECTION_ORDER) {
    if (HEADER_ALIASES[key].test(trimmed)) {
      return key;
    }
  }
  return null;
}

export function collapseWhitespace(text: string): string {
  return text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export function dropDuplicateLines(text: string): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.length === 0) {
      if (lines[lines.length - 1] !== "") {
        lines.push("");
      }
      continue;
    }
    const key = line.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    lines.push(line);
  }
  return lines.join("\n");
}

export function smartTruncateAnonymized(
  text: string,
  limit: number,
): string {
  const cleaned = dropDuplicateLines(collapseWhitespace(text));
  const buckets: Record<(typeof SECTION_ORDER)[number] | "other", string[]> = {
    summary: [],
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    other: [],
  };

  let current: (typeof SECTION_ORDER)[number] | "other" = "other";
  for (const raw of cleaned.split("\n")) {
    const line = raw.trim();
    if (line.length === 0) {
      continue;
    }
    if (DROP_LINE.test(line)) {
      current = "other";
      continue;
    }
    const header = classifyHeader(line);
    if (header) {
      current = header;
      continue;
    }
    buckets[current].push(line);
  }

  const parts: string[] = [];
  let used = 0;
  for (const key of SECTION_ORDER) {
    if (used >= limit) {
      break;
    }
    const block = buckets[key].join("\n");
    if (block.length === 0) {
      continue;
    }
    const remaining = limit - used;
    const slice = block.slice(0, remaining);
    parts.push(slice);
    used += slice.length + 1;
  }

  if (used < limit && buckets.other.length > 0) {
    const extra = buckets.other.join("\n").slice(0, limit - used);
    if (extra.length > 0) {
      parts.push(extra);
    }
  }

  const joined = parts.join("\n").trim();
  return joined.length > 0 ? joined.slice(0, limit) : cleaned.slice(0, limit);
}

export function containsPiiMarkers(text: string): boolean {
  return /\[(?:NAME|EMAIL|PHONE|LINKEDIN|NATIONALITY|AGE|GENDER|MARITAL STATUS|PHOTO|DATE OF BIRTH)\]/i.test(
    text,
  );
}

export function looksLikeRawPii(text: string): boolean {
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)) {
    return true;
  }
  if (/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|pub)\//i.test(text)) {
    return true;
  }
  return false;
}
