"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Menu } from "@base-ui/react/menu";
import { Link, useRouter } from "@/i18n/navigation";
import type { AuthenticatedUser } from "@/lib/auth/policy";
import {
  ChevronDown,
  LogOut,
  UserRound,
  Users,
} from "lucide-react";

const menuItemClassName =
  "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-start text-sm text-foreground outline-none transition-colors hover:bg-surface-muted focus-visible:bg-surface-muted data-highlighted:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60";

export function UserMenu({ user }: { user: AuthenticatedUser }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutFailed(false);

    try {
      const result = await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });

      if (!result.ok) {
        setSignOutFailed(true);
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setSignOutFailed(true);
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <Menu.Root onOpenChange={(open) => !open && setSignOutFailed(false)}>
      <Menu.Trigger
        className="flex h-9 max-w-44 items-center gap-2 rounded-lg px-2 text-xs font-medium text-foreground outline-none transition-colors hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring sm:max-w-56"
        aria-label={user.name}
      >
        <span className="truncate">{user.name}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end" className="z-50 outline-none">
          <Menu.Popup className="w-64 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg outline-none">
            <div className="border-b border-border px-3 py-2.5">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p dir="ltr" className="mt-0.5 truncate text-start text-xs text-muted">
                {user.email}
              </p>
            </div>

            <Menu.LinkItem
              closeOnClick
              render={<Link href="/account" />}
              className={menuItemClassName}
            >
              <UserRound className="size-4 text-muted" aria-hidden="true" />
              {t("account")}
            </Menu.LinkItem>

            {user.role === "admin" ? (
              <Menu.LinkItem
              closeOnClick
                render={<Link href="/admin/users" />}
                className={menuItemClassName}
              >
                <Users className="size-4 text-muted" aria-hidden="true" />
                {t("users")}
              </Menu.LinkItem>
            ) : null}

            <div className="my-1 border-t border-border" />

            <Menu.Item
              className={menuItemClassName}
              disabled={signingOut}
              closeOnClick={false}
              onClick={() => void signOut()}
            >
              <LogOut className="size-4 text-muted" aria-hidden="true" />
              {signingOut ? t("signing_out") : t("sign_out")}
            </Menu.Item>

            {signOutFailed ? (
              <p role="alert" className="px-3 py-2 text-xs text-danger">
                {t("failed")}
              </p>
            ) : null}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
