import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
export default async function ForbiddenPage({ params }: { params: Promise<{ locale: "en" | "ar" }> }) {
  const { locale } = await params; const t = await getTranslations({ locale, namespace: "auth" });
  return <main className="mx-auto my-12 space-y-4 p-6"><h1>{t("forbidden")}</h1><Link href="/">{t("back")}</Link></main>;
}
