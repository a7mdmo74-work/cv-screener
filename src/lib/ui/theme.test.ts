import { readFileSync, readdirSync } from "node:fs";
import { resolve, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { assertContrast, contrastRatio, readThemeTokens, resolveToken } from "../../../scripts/check-contrast";
import { recommendationTierSchema } from "@/lib/schemas/score";
import { recommendationTiers, tierClasses } from "@/lib/ui/tiers";
import { rawColorAllowlist, rawColorViolations } from "@/lib/ui/color-guard";

const css = readFileSync(resolve("src/app/globals.css"), "utf8");

describe("theme palettes", () => {
  it("defines identical active tokens in light and dark, including aliases", () => {
    const { light, dark, constants } = readThemeTokens(css);
    expect(Object.keys(light).sort()).toEqual(Object.keys(dark).sort());
    for (const palette of [light, dark]) {
      for (const key of Object.keys(palette)) expect(resolveToken(palette, key, constants)).toBeTruthy();
    }
  });

  it("passes WCAG AA text and control contrast in both palettes", () => {
    expect(assertContrast(css)).toHaveLength(126);
    expect(contrastRatio("#000000", "#FFFFFF")).toBe(21);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBe(1);
    expect(() => assertContrast(css.replace("--muted: #9AA8BD", "--muted: #172236"))).toThrow("dark: muted");
  });

  it("covers every schema tier using the required semantic meaning", () => {
    expect(Object.keys(recommendationTiers)).toEqual(recommendationTierSchema.options);
    expect(Object.values(recommendationTiers)).toEqual(["success", "info", "warning", "danger"]);
    for (const tone of Object.values(recommendationTiers)) {
      expect(tierClasses[tone]).toContain(`bg-${tone}-bg`);
      expect(tierClasses[tone]).toContain(`text-${tone}`);
    }
  });

  it("forces print tokens to the same light sources, independent of .dark", () => {
    const { light } = readThemeTokens(css);
    const print = css.slice(css.indexOf("@media print"));
    for (const [key, value] of Object.entries(light)) expect(print).toContain(`--${key}: ${value} !important`);
    expect(print).toContain("color-scheme: light !important");
  });
});

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(?:tsx?|jsx?|css)$/.test(path) ? [path] : [];
  });
}

describe("raw UI color guard", () => {
  it("rejects fixed color classes, arbitrary colors, SVG colors and inline colors", () => {
    for (const source of ["dark:hover:bg-white/50", "border-t-zinc-900", "ring-offset-slate-100", "text-[#123456]", "bg-[rgb(0,0,0)]", 'style={{ color: "white" }}', 'fill="red"', "text-fuchsia-500"]) {
      expect(rawColorViolations(source), source).not.toEqual([]);
    }
    expect(rawColorViolations('bg-surface text-muted border-border-strong fill="currentColor" style={{ color: "var(--info)" }}')).toEqual([]);
  });

  it("contains no unallowlisted raw colors in components or app routes", () => {
    const violations = [...sourceFiles(resolve("src/components")), ...sourceFiles(resolve("src/app"))].flatMap(path => {
      const name = relative(process.cwd(), path);
      if (name in rawColorAllowlist) return [];
      return rawColorViolations(readFileSync(path, "utf8")).map(value => `${name}: ${value}`);
    });
    expect(violations).toEqual([]);
  });
});
