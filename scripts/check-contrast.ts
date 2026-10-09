import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

type Tokens = Record<string, string>;
export function readThemeTokens(css = readFileSync(resolve("src/app/globals.css"), "utf8")) {
  function block(selector: string): Tokens {
    const start = css.indexOf(`${selector} {`);
    if (start < 0) throw new Error(`Missing palette: ${selector}`);
    const body = css.slice(start, css.indexOf("}", start));
    return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
  }
  const constants = block(":root");
  return { light: block(":root, .print-light"), dark: block(".dark"), constants };
}

export function resolveToken(tokens: Tokens, name: string, constants: Tokens = {}, seen: string[] = []): string {
  if (seen.includes(name)) throw new Error(`Circular token: ${name}`);
  const value = tokens[name] ?? constants[name];
  if (!value) throw new Error(`Missing token: ${name}`);
  const alias = /^var\(--([\w-]+)\)$/.exec(value);
  return alias ? resolveToken(tokens, alias[1], constants, [...seen, name]) : value;
}

export function contrastRatio(foreground: string, background: string): number {
  function luminance(hex: string): number {
    if (!/^#[\da-f]{6}$/i.test(hex)) throw new Error(`Expected an opaque six-digit hex token, received ${hex}`);
    const channels = [1, 3, 5].map(offset => {
      const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function checkContrast(css?: string) {
  const { light, dark, constants } = readThemeTokens(css);
  const checks: { mode: string; foreground: string; background: string; ratio: number; minimum: number }[] = [];
  for (const [mode, tokens] of Object.entries({ light, dark })) {
    const pairs: [string, string, number][] = [];
    for (const bg of ["background", "surface", "surface-muted", "table-header", "table-row-hover"]) {
      for (const fg of ["foreground", "muted", "accent", "success", "info", "warning", "danger"]) pairs.push([fg, bg, 4.5]);
      for (const fg of ["border", "border-strong", "ring", "focus-ring"]) pairs.push([fg, bg, 3]);
    }
    for (const tone of ["success", "info", "warning", "danger"]) pairs.push([tone, `${tone}-bg`, 4.5]);
    pairs.push(["accent-foreground", "accent", 4.5], ["accent-foreground", "accent-hover", 4.5], ["selection-foreground", "selection", 4.5], ["disabled-foreground", "disabled", 4.5]);
    for (const [fg, bg, minimum] of pairs) {
      checks.push({ mode, foreground: fg, background: bg, ratio: contrastRatio(resolveToken(tokens, fg, constants), resolveToken(tokens, bg, constants)), minimum });
    }
  }
  return checks;
}

export function assertContrast(css?: string) {
  const checks = checkContrast(css);
  const failures = checks.filter(check => check.ratio < check.minimum);
  if (failures.length) throw new Error(failures.map(c => `${c.mode}: ${c.foreground} on ${c.background} = ${c.ratio.toFixed(2)}:1 (requires ${c.minimum}:1)`).join("\n"));
  return checks;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const checks = assertContrast();
    console.log(`Contrast passed: ${checks.length} token pairs in light and dark.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
