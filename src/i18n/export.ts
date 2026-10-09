import { createTranslator } from "next-intl";
import en from "../../messages/en.json";
import ar from "../../messages/ar.json";
import { exportKeys } from "./export-keys";
import { labelKeys } from "./label-keys";
import type { Locale } from "./routing";
export function exportTranslator(locale:Locale="en") {
  const t=createTranslator({locale,messages:locale==="ar"?ar:en});
  const label=(text:string)=>{const key=exportKeys[text as keyof typeof exportKeys];const known=labelKeys[text as keyof typeof labelKeys];return key?t(`export.${key}`):known?t(known):text;};
  return {t,label};
}
export function salaryText(value:string|null|undefined,locale:Locale="en") {
  const {t,label}=exportTranslator(locale);
  if(!value)return label("Not stated");
  if(value.startsWith("Not set — add salary bands"))return t("export.salary_not_set");
  const match=value.match(/^(\d+)–(\d+) AED\/month\. Indicative estimate, not an offer$/);
  return match?t("export.salary_range",{min:match[1],max:match[2]}):value;
}
