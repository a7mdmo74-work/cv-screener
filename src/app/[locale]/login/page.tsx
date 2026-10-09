import { Suspense } from "react";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { prisma } from "@/db/client";
import { AuthForm } from "@/components/auth/auth-form";
import { Link } from "@/i18n/navigation";
export default function LoginPage({ params }: { params: Promise<{ locale: "en" | "ar" }> }) { return <Suspense><LoginView params={params} /></Suspense>; }
async function LoginView({ params }: { params: Promise<{ locale: "en" | "ar" }> }) {
  await connection(); const { locale } = await params;
  if (!await prisma.user.count()) redirect(`/${locale}/setup`);
  const t = await getTranslations({ locale, namespace: "auth" });
  return <main className="mx-auto my-12 w-full max-w-md space-y-6 rounded-xl border border-border bg-surface p-6"><h1 className="text-2xl font-semibold">{t("sign_in")}</h1><AuthForm /><Link href="/setup" className="text-sm text-accent">{t("setup_link")}</Link></main>;
}

// Authentication may redirect at request time; do not validate a prefetched shell.
export const instant = false;
