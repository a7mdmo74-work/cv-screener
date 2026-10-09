import * as rootParams from "next/root-params";
import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
export default getRequestConfig(async ({ locale: explicitLocale }) => {
  const requested = explicitLocale ?? await rootParams.locale();
  const locale = hasLocale(routing.locales,requested) ? requested : routing.defaultLocale;
  return {locale,messages:(await import(`../../messages/${locale}.json`)).default,timeZone:"Asia/Dubai",formats:{number:{standard:{numberingSystem:"latn"}},dateTime:{standard:{year:"numeric",month:"short",day:"numeric",calendar:"gregory",numberingSystem:"latn"}}}};
});
