/** Exact paths only. UI components/pages have no intentional fixed-color exceptions. */
export const rawColorAllowlist = {
  "src/app/globals.css": "The single source for theme palettes and native-element colors.",
} as const;

export function rawColorViolations(source: string): string[] {
  const patterns = [
    /\b(?:bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|outline|fill|stroke|shadow|divide|accent|caret|decoration|placeholder|from|via|to)-(?:white|black|(?:gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+)\b/g,
    /\b(?:bg|text|border|ring|outline|fill|stroke|shadow|accent|caret|decoration|from|via|to)-\[(?:white|black|red|blue|green|yellow|gray|grey|orange|purple|pink|silver|navy|teal|aqua|maroon|lime|olive|fuchsia)\]/gi,
    /#[\da-f]{3,8}\b/gi,
    /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\([^)]*\)/gi,
    /\b(?:color|background(?:Color)?|borderColor|fill|stroke)\s*(?:=\s*["']|:\s*["'])(?!var\(|currentColor|none|transparent|inherit|initial|unset)[a-z]+["']/g,
  ];
  return patterns.flatMap(pattern => [...source.matchAll(pattern)].map(match => match[0]));
}
