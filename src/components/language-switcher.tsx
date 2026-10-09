"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTransition } from "react";
export function LanguageSwitcher() {
  const locale=useLocale(),t=useTranslations("nav"),pathname=usePathname(),router=useRouter(),query=useSearchParams();
  const [pending,startTransition]=useTransition();
  const target=locale==="ar"?"en":"ar";
  return <button type="button" lang={target} dir="ltr" aria-label={t(target==="ar"?"switch_to_arabic":"switch_to_english")} disabled={pending} className="cursor-pointer inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border border-border px-2 text-sm font-semibold text-foreground transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50" onClick={()=>startTransition(()=>router.replace(`${pathname}${query.size?`?${query.toString()}`:""}`,{locale:target}))}>{locale==="ar"?"EN":"ع"}</button>;
}
