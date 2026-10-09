export const DOCX_PAGE_LABEL = "N/A";

export function parsePagesJson(json: string | null | undefined): string[] {
  if (!json) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function formatPagedText(pages: string[], fallbackText: string): string {
  if (pages.length === 0) {
    return fallbackText;
  }

  return pages
    .map((page, index) => `[[PAGE ${index + 1}]]\n${page}`.trim())
    .join("\n\n");
}

export function evidencePagesLabel(pages: string[]): string {
  return pages.length === 0 ? DOCX_PAGE_LABEL : "";
}
