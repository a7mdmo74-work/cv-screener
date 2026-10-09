"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { updateMyProfile } from "@/actions/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inputClassName, labelClassName } from "@/components/wizard/styles";
import { CircleAlert, CircleCheck, UserRound } from "lucide-react";

export function ProfileForm({ name: initialName, email }: { name: string; email: string }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<"saved" | "failed" | null>(null);

  return (
    <form className="space-y-5" onSubmit={async event => {
      event.preventDefault();
      setPending(true);
      setMessage(null);
      try {
        const result = await updateMyProfile({ name });
        if (result.ok) {
          setName(result.name);
          setMessage("saved");
          router.refresh();
        } else setMessage("failed");
      } catch { setMessage("failed"); }
      finally { setPending(false); }
    }}>
      <label className="block">
        <span className={labelClassName}>{t("name")}</span>
        <Input name="name" value={name} onChange={event => { setName(event.target.value); setMessage(null); }} required maxLength={100} autoComplete="name" disabled={pending} className={`${inputClassName} h-10`} />
      </label>
      <label className="block">
        <span className={labelClassName}>{t("email")}</span>
        <Input name="email" value={email} readOnly type="email" dir="ltr" autoComplete="email" className={`${inputClassName} h-10`} aria-describedby="account-email-notice" />
      </label>
      <p id="account-email-notice" className="text-xs leading-5 text-muted">{t("email_read_only")}</p>
      {message && (
        <Alert role="status" variant={message === "failed" ? "destructive" : "default"} className={message === "failed" ? "border-danger bg-danger-bg text-danger" : "border-success bg-success-bg text-success"}>
          {message === "failed" ? <CircleAlert className="size-4" aria-hidden="true" /> : <CircleCheck className="size-4" aria-hidden="true" />}
          <AlertDescription className="text-current">{t(message)}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={pending || !name.trim() || name.trim() === initialName} className="w-full gap-2 sm:w-auto">
        <UserRound className="size-4" aria-hidden="true" />
        {pending ? t("saving") : t("save_profile")}
      </Button>
    </form>
  );
}
