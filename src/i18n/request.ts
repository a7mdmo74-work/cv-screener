import { cookies } from "next/headers";
import * as rootParams from "next/root-params";
import { getRequestConfig } from "next-intl/server";
import { configuredLocale } from "./locale";
import { routing } from "./routing";

// Root params throw inside Server Actions. Prefer the middleware locale, then the cookie.
export default getRequestConfig(async ({ locale: explicitLocale, requestLocale }) => {
  const locale = await configuredLocale({
    explicit: explicitLocale,
    requestLocale,
    readSegment: () => rootParams.locale(),
    readCookie: async () => {
      try {
        const cookie = routing.localeCookie;
        const name = cookie && typeof cookie === "object" ? cookie.name : undefined;
        return name ? (await cookies()).get(name)?.value : undefined;
      }
      catch { return undefined; }
    },
  });
  return {locale,messages:(await import(`../../messages/${locale}.json`)).default,timeZone:"Asia/Dubai",formats:{number:{standard:{numberingSystem:"latn"}},dateTime:{standard:{year:"numeric",month:"short",day:"numeric",calendar:"gregory",numberingSystem:"latn"}}}};
});
