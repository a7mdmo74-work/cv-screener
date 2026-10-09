export const EXTRACT_TEXT_LIMIT = 20_000;
export const EXTRACT_NUM_CTX = 16_384;
export const SCORE_NUM_CTX = 16_384;

export function truncateText(text: string, limit: number): string {
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, limit)}\n\n[TRUNCATED]`;
}
