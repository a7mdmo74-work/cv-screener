import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePageRole } from "@/lib/auth/server";
import { PasswordForm } from "@/components/auth/password-form";
import { ProfileForm } from "@/components/auth/profile-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AtSign, KeyRound, ShieldCheck, UserRound } from "lucide-react";

export default function AccountPage() {
  return <Suspense><AccountDetails /></Suspense>;
}

async function AccountDetails() {
  const locale = await getLocale();
  const user = await requirePageRole(locale);
  const t = await getTranslations("auth");

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="flex items-start gap-4">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-sm">
          <UserRound className="size-5" aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{t("account")}</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">{t("account_profile_description")}</p>
        </div>
      </header>

      <Card className="overflow-hidden border-border-strong/60 shadow-md">
        <div className="h-1.5 bg-accent" aria-hidden="true" />
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex min-w-0 items-center gap-4">
            <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent ring-1 ring-inset ring-accent/20 sm:size-16">
              <UserRound className="size-7" aria-hidden="true" />
            </span>
            <div className="min-w-0 space-y-1">
              <p className="break-words text-lg font-semibold text-foreground sm:text-xl">{user.name}</p>
              <p className="flex min-w-0 items-center gap-2 text-sm text-muted">
                <AtSign className="size-4 shrink-0" aria-hidden="true" />
                <bdi className="truncate">{user.email}</bdi>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start rounded-full border border-accent/25 bg-accent/5 px-3 py-1.5 text-sm font-medium text-accent sm:self-center">
            <KeyRound className="size-4" aria-hidden="true" />
            <span>{t(user.role)}</span>
          </div>
        </div>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card className="h-full">
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-foreground">
              <UserRound className="size-4" aria-hidden="true" />
            </span>
            <div className="space-y-1.5">
              <CardTitle>{t("profile_details")}</CardTitle>
              <CardDescription>{t("profile_form_description")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent><ProfileForm name={user.name} email={user.email} /></CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-foreground">
              <ShieldCheck className="size-4" aria-hidden="true" />
            </span>
            <div className="space-y-1.5">
              <CardTitle>{t("password_change")}</CardTitle>
              <CardDescription>{t("password_form_description")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <PasswordForm />
            <div className="flex items-start gap-3 rounded-xl border border-info/50 bg-info-bg p-3.5 text-info">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p className="text-xs leading-5 sm:text-sm">{t("password_session_notice")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export const instant = false;
