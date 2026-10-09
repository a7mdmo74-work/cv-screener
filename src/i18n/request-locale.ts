import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { safeLocale } from "./locale";
export async function requestLocale(request:Request) {
  const explicit=new URL(request.url).searchParams.get("locale");
  return safeLocale(explicit ?? (await cookies()).get("NEXT_LOCALE")?.value);
}
export async function requestErrors(request:Request) {return getTranslations({locale:await requestLocale(request),namespace:"errors"});}
