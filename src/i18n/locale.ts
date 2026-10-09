import { hasLocale } from "next-intl";
import { routing } from "./routing";
export function safeLocale(value:unknown) { return hasLocale(routing.locales,value)?value:routing.defaultLocale; }
export function exportUrl(path:string,locale:"en"|"ar") {return `${path}${path.includes("?")?"&":"?"}locale=${locale}`;}
