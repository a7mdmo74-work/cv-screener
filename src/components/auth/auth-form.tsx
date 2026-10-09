"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { firstRunSetup } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export function AuthForm({ setup = false }: { setup?: boolean }) {
  const t = useTranslations("auth"); const router = useRouter();
  const [pending, setPending] = useState(false); const [failed, setFailed] = useState(false);
  return <form className="space-y-4" onSubmit={async event => {
    event.preventDefault(); setPending(true); setFailed(false);
    const form = new FormData(event.currentTarget);
    try {
      const input = { email: String(form.get("email")), password: String(form.get("password")), name: String(form.get("name") ?? ""), role: "admin" };
      const result = setup ? await firstRunSetup(input, String(form.get("token"))) : { ok: (await fetch("/api/auth/sign-in/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: input.email, password: input.password }) })).ok };
      if (result.ok) { router.replace(setup ? "/login" : "/"); router.refresh(); } else setFailed(true);
    } catch { setFailed(true); } finally { setPending(false); }
  }}>
    {setup && <><p className="text-sm text-muted">{t("setup_help")}</p><label className="block">{t("setup_key")}<Input name="token" type="password" required autoComplete="off" /></label><label className="block">{t("name")}<Input name="name" required maxLength={100} autoComplete="name" /></label></>}
    <label className="block">{t("email")}<Input name="email" type="email" required maxLength={254} autoComplete="username" /></label>
    <label className="block">{t("password")}<Input name="password" type="password" required minLength={12} maxLength={72} autoComplete={setup ? "new-password" : "current-password"} /></label>
    {setup && <p className="text-sm text-muted">{t("password_help")}</p>}
    {failed && <p role="alert" className="text-danger">{t("failed")}</p>}
    <Button type="submit" disabled={pending}>{t(setup ? "setup" : "sign_in")}</Button>
  </form>;
}
