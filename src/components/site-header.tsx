
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { BriefcaseBusiness, Plus } from "lucide-react";

export function SiteHeader({ children, canReview = true }: { children: ReactNode; canReview?: boolean }) {
  const t = useTranslations();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:h-16 lg:flex-nowrap lg:py-0 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 text-sm font-semibold tracking-tight text-foreground"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-sm">
            <BriefcaseBusiness className="size-4.5" aria-hidden="true" />
          </span>
          <span className="truncate">{t("nav.cv_screener")}</span>
        </Link>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:gap-3 lg:w-auto lg:shrink-0 lg:flex-nowrap">
          {canReview && <Link
            href="/jobs/new"
            className={buttonVariants({
              size: "sm",
              className:
 "h-9 gap-1.5 bg-accent px-3 text-accent-foreground hover:bg-accent-hover",
            })}
          >
            <Plus className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t("nav.new_screening")}</span>
          </Link>}
          <ThemeToggle />
          <Suspense>
            <LanguageSwitcher />
          </Suspense>
          {children}
        </div>
      </div>
    </header>
  );
}
