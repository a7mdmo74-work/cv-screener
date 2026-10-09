"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inputClassName, labelClassName } from "@/components/wizard/styles";
import { CircleAlert, CircleCheck, KeyRound } from "lucide-react";

export function PasswordForm() {
  const t = useTranslations("auth");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<"saved" | "failed" | null>(null);

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        setPending(true);
        setMessage(null);

        try {
          const response = await fetch("/api/auth/change-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              currentPassword: data.get("currentPassword"),
              newPassword: data.get("newPassword"),
              revokeOtherSessions: true,
            }),
          });
          setMessage(response.ok ? "saved" : "failed");
          if (response.ok) form.reset();
        } catch {
          setMessage("failed");
        } finally {
          setPending(false);
        }
      }}
    >
      <label className="block">
        <span className={labelClassName}>{t("current_password")}</span>
        <Input
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className={`${inputClassName} h-10`}
        />
      </label>

      <label className="block">
        <span className={labelClassName}>{t("new_password_required")}</span>
        <Input
          name="newPassword"
          type="password"
          required
          minLength={12}
          maxLength={72}
          autoComplete="new-password"
          className={`${inputClassName} h-10`}
        />
      </label>

      {message ? (
        <Alert
          role="status"
          variant={message === "failed" ? "destructive" : "default"}
          className={
            message === "failed"
              ? "border-danger bg-danger-bg text-danger"
              : "border-success bg-success-bg text-success"
          }
        >
          {message === "failed" ? (
            <CircleAlert className="size-4" aria-hidden="true" />
          ) : (
            <CircleCheck className="size-4" aria-hidden="true" />
          )}
          <AlertDescription className="text-current">{t(message)}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full gap-2 sm:w-auto">
        <KeyRound className="size-4" aria-hidden="true" />
        {pending ? t("saving") : t("password_change")}
      </Button>
    </form>
  );
}
