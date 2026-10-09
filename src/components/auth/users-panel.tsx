"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { addUser, changeUser, removeUser } from "@/actions/auth";
import { roles, type Role } from "@/lib/auth/policy";
import { Toast } from "@base-ui/react/toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/toast";
import { labelClassName } from "@/components/wizard/styles";
import {
  KeyRound,
  ShieldCheck,
  UserRound,
  UserPlus,
  Users,
  Trash2,
} from "lucide-react";

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  disabled: boolean;
};

export function UsersPanel({ users, activeAdmins }: { users: ManagedUser[]; activeAdmins: number }) {
  const t = useTranslations("common");
  return (
    <Toast.Provider>
      <UsersPanelContent users={users} activeAdmins={activeAdmins} />
      <Toaster closeLabel={t("close")} />
    </Toast.Provider>
  );
}

function UsersPanelContent({ users, activeAdmins }: { users: ManagedUser[]; activeAdmins: number }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const toastManager = Toast.useToastManager();
  const [pending, setPending] = useState(false);

  function notify(message: "failed" | "saved" | "removed" | "last_admin_required" | "invitation_sent" | "invitation_failed" | "invitation_configuration_failed" | "invalid_user_details" | "invalid_password" | "email_taken") {
    toastManager.add({
      title: t(message),
      type: message === "saved" || message === "removed" || message === "invitation_sent" ? "success" : "error",
    });
  }

  function confirmRemove(user: ManagedUser) {
    toastManager.add({
      title: t("confirm_remove_user"),
      description: t("remove_user_confirmation", { name: user.name }),
      type: "error",
      timeout: 0,
      actionProps: {
        children: t("remove_user"),
        onClick: () => void remove(user),
      },
    });
  }

  async function remove(user: ManagedUser) {
    setPending(true);
    try {
      const result = await removeUser({ id: user.id });
      if (result.ok) {
        notify("removed");
        router.refresh();
      } else notify(result.error);
    } catch { notify("failed"); }
    finally { setPending(false); }
  }

  async function submit(form: HTMLFormElement, id?: string) {
    setPending(true);
    const data = new FormData(form);

    try {
      const result = id
        ? await changeUser({
            id,
            role: data.get("role"),
            disabled: data.get("disabled") === "true",
            password: String(data.get("password") || "") || undefined,
          })
        : await addUser({
            name: data.get("name"),
            email: data.get("email"),
            password: data.get("password"),
            role: data.get("role"),
          });

      if (result.ok) {
        notify("invitationSent" in result ? (result.invitationSent ? "invitation_sent" : "invitation_failed") : "saved");
      } else {
        notify("error" in result && (result.error === "invitation_configuration_failed" || result.error === "invalid_user_details" || result.error === "invalid_password" || result.error === "email_taken" || result.error === "last_admin_required") ? result.error : "failed");
      }
      if (result.ok) {
        router.refresh();
        if (!id) form.reset();
      }
    } catch {
      notify("failed");
    } finally {
      setPending(false);
    }
  }

  function roleSelect(value: string, id?: string) {
    return (
      <label className="block">
        <span className={labelClassName}>{t("role")}</span>
        <select
          id={id ? `role-${id}` : undefined}
          name="role"
          defaultValue={value}
          className="!h-10 !w-full !min-w-0 !p-0 rounded-lg border border-border-strong bg-surface text-sm leading-5 text-foreground outline-none ring-ring transition focus:border-accent focus:ring-2 disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-foreground disabled:border-border-strong"
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {t(role)}
            </option>
          ))}
        </select>
      </label>
    );
  }

  async function toggleDisabled(user: ManagedUser) {
    setPending(true);
    try {
      const result = await changeUser({
        id: user.id,
        role: user.role,
        disabled: !user.disabled,
      });
      notify(result.ok ? "saved" : "failed");
      if (result.ok) router.refresh();
    } catch {
      notify("failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Users className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {t("users")}
              </h1>
              <p className="mt-1 text-sm text-muted">{t("manage_users_description")}</p>
            </div>
        </div>
        <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted">
              <Users className="size-3.5" aria-hidden="true" />
              {t("total_users")}: <b className="text-foreground">{users.length}</b>
            </span>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(17rem,0.72fr)_minmax(0,1.28fr)]">
        <Card className="lg:sticky lg:top-24">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <UserPlus className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <CardTitle>{t("create_user")}</CardTitle>
                  <CardDescription className="mt-1">{t("create_user_description")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit(event.currentTarget);
                }}
              >
                <label className="block">
                  <span className={labelClassName}>{t("name")}</span>
                  <Input
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={100}
                    className="h-10"
                  />
                </label>
                <label className="block">
                  <span className={labelClassName}>{t("email")}</span>
                  <Input
                    dir="ltr"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    className="h-10 text-left"
                  />
                </label>
                <label className="block">
                  <span className={labelClassName}>{t("password")}</span>
                  <Input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={12}
                    maxLength={72}
                    className="h-10"
                  />
                </label>
                <p className="-mt-2 flex items-start gap-2 text-xs leading-5 text-muted">
                  <KeyRound className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  {t("password_help")}
                </p>
                {roleSelect("viewer")}
                <Button type="submit" className="w-full gap-2" disabled={pending}>
                  <UserPlus className="size-4" aria-hidden="true" />
                  {pending ? t("saving") : t("create_user")}
                </Button>
              </form>
            </CardContent>
        </Card>

        <section className="space-y-4" aria-labelledby="managed-users-heading">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="size-4 text-accent" aria-hidden="true" />
                <h2 id="managed-users-heading" className="text-lg font-semibold text-foreground">
                  {t("users")}
                </h2>
              </div>
              <span className="text-xs text-muted">{t("total_users")}: {users.length}</span>
            </div>
            <div className="space-y-3">
            {users.map((user) => (
              <Card key={user.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <form
                    className="space-y-0"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submit(event.currentTarget, user.id);
                    }}
                  >
                    <input type="hidden" name="disabled" value={user.disabled ? "true" : "false"} />
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent" aria-hidden="true">
                          {user.name.trim().charAt(0).toLocaleUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold text-foreground">{user.name}</h3>
                          <p dir="ltr" className="mt-0.5 break-all text-left text-xs text-muted">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={pending || (user.role === "admin" && !user.disabled && activeAdmins <= 1)}
                        onClick={() => void toggleDisabled(user)}
                        aria-label={t(user.disabled ? "enable_user" : "disable_user", { name: user.name })}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-75 disabled:cursor-not-allowed disabled:opacity-60 ${
                          user.disabled ? "bg-warning-bg text-warning" : "bg-success-bg text-success"
                        }`}
                      >
                        <span className={`size-1.5 rounded-full ${user.disabled ? "bg-warning" : "bg-success"}`} aria-hidden="true" />
                        {user.disabled ? t("disabled") : t("active")}
                      </button>
                    </div>

                    <div className="border-t border-border bg-background/40 p-4 sm:px-5">
                      {roleSelect(user.role, user.id)}
                    </div>

                    <div className="grid gap-3 px-4 pb-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:px-5">
                      <label className="block">
                        <span className={labelClassName}>{t("new_password")}</span>
                        <Input
                          name="password"
                          type="password"
                          autoComplete="new-password"
                          minLength={12}
                          maxLength={72}
                          className="h-10"
                        />
                      </label>
                      <Button type="submit" variant="outline" disabled={pending} className="gap-2">
                        <UserRound className="size-4" aria-hidden="true" />
                        {pending ? t("saving") : t("save")}
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-2 sm:px-5">
                      {user.role === "admin" && !user.disabled && activeAdmins <= 1 ? (
                        <p className="text-xs text-muted">{t("last_admin_required")}</p>
                      ) : (
                        <span className="text-xs text-muted">{t(user.role)}</span>
                      )}
                      <Button type="button" variant="ghost" disabled={pending || (user.role === "admin" && !user.disabled && activeAdmins <= 1)} onClick={() => confirmRemove(user)} className="h-8 text-danger hover:bg-danger-bg hover:text-danger">
                        <Trash2 className="size-4" aria-hidden="true" />
                        {t("remove_user")}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ))}
            </div>
        </section>
      </div>
    </main>
  );
}
