import { hasLocale } from "next-intl";
import { routing } from "./routing";
export function safeLocale(value:unknown) { return hasLocale(routing.locales,value)?value:routing.defaultLocale; }
export function resolveLocale(...candidates: unknown[]) {
  for (const candidate of candidates) if (hasLocale(routing.locales, candidate)) return candidate;
  return routing.defaultLocale;
}
export async function configuredLocale(input: { explicit?: string; requestLocale: Promise<string | undefined>; readSegment: () => Promise<string | undefined>; readCookie: () => Promise<string | undefined> }) {
  const fromRequest = await input.requestLocale;
  let fromSegment: string | undefined;
  if (!hasLocale(routing.locales, input.explicit) && !hasLocale(routing.locales, fromRequest)) {
    try { fromSegment = await input.readSegment(); } catch { fromSegment = undefined; }
  }
  const fromCookie = hasLocale(routing.locales, input.explicit) || hasLocale(routing.locales, fromRequest) || hasLocale(routing.locales, fromSegment) ? undefined : await input.readCookie();
  return resolveLocale(input.explicit, fromRequest, fromSegment, fromCookie);
}
export function exportUrl(path:string,locale:"en"|"ar") {return `${path}${path.includes("?")?"&":"?"}locale=${locale}`;}
