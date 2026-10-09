import type { Metadata } from "next";
import { DM_Sans, Geist_Mono, Noto_Sans_Arabic } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/theme-provider";
import "../globals.css";
const dmSans=DM_Sans({variable:"--font-dm-sans",subsets:["latin"]});
const mono=Geist_Mono({variable:"--font-geist-mono",subsets:["latin"]});
const arabic=Noto_Sans_Arabic({variable:"--font-arabic",subsets:["arabic"],weight:["400","500","600","700"]});
export function generateStaticParams(){return routing.locales.map(locale=>({locale}));}
export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{const {locale}=await params;if(!hasLocale(routing.locales,locale))notFound();const t=await getTranslations({locale,namespace:"common"});return {title:t("title"),description:t("description")};}
export default async function LocaleLayout({children,params}:{children:React.ReactNode;params:Promise<{locale:string}>}) {
  const {locale}=await params;if(!hasLocale(routing.locales,locale))notFound();setRequestLocale(locale);
  const messages=await getMessages();
  return <html lang={locale} dir={locale==="ar"?"rtl":"ltr"} suppressHydrationWarning className={`${dmSans.variable} ${mono.variable} ${arabic.variable} h-full antialiased`}><body className="flex min-h-full flex-col bg-background text-foreground" style={{fontFamily:locale==="ar"?"var(--font-arabic), Arial, sans-serif":"var(--font-dm-sans), Arial, sans-serif"}}><ThemeProvider><NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Dubai">{children}</NextIntlClientProvider></ThemeProvider></body></html>;
}
