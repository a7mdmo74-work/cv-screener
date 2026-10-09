import { Suspense } from "react";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { prisma } from "@/db/client";
import { AuthForm } from "@/components/auth/auth-form";
export default function SetupPage({ params }: { params: Promise<{ locale: "en" | "ar" }> }) { return <Suspense><SetupView params={params} /></Suspense>; }
async function SetupView({ params }: { params: Promise<{ locale: "en" | "ar" }> }) {
  await connection(); const { locale } = await params;
  if (await prisma.user.count() || await prisma.authSetup.findUnique({ where: { id: "singleton" } })) redirect(`/${locale}/login`);
  const t = await getTranslations({ locale, namespace: "auth" });
  return <main className="mx-auto my-12 w-full max-w-md space-y-6 rounded-xl border border-border bg-surface p-6"><h1 className="text-2xl font-semibold">{t("setup")}</h1><AuthForm setup /></main>;
}

// Authentication may redirect at request time; do not validate a prefetched shell.
export const instant = false;
