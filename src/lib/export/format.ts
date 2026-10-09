export const MISSING = "Not stated";
export const MISSING_AR = "غير مذكور";
export const HEADER_FILL = "17365D";
export const LABEL_FILL = "D9EAF7";
export const HEADER_FONT = "FFFFFF";
export const LABEL_FONT = "17365D";

export function displayValue(
  value: string | number | null | undefined,
  missing = MISSING,
): string {
  if (value === null || value === undefined) {
    return missing;
  }
  const text = String(value).trim();
  return text.length > 0 ? text : missing;
}

export function joinList(values: string[] | null | undefined): string {
  if (!values || values.length === 0) {
    return MISSING;
  }
  const cleaned = values.map((item) => item.trim()).filter((item) => item.length > 0);
  return cleaned.length > 0 ? cleaned.join("; ") : MISSING;
}

export function todayStamp(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function sanitizeFilePart(value: string): string {
  return value.replace(/[^\w\u0600-\u06FF.-]+/g, "_").slice(0, 80) || "export";
}
