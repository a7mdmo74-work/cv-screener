"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;
const choices = [
  { value: "light", Icon: Sun },
  { value: "dark", Icon: Moon },
  { value: "system", Icon: Monitor },
] as const;

export function ThemeToggle() {
  const t = useTranslations("theme");
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!mounted) {
    return <span aria-hidden="true" className="inline-block h-9 w-28 shrink-0" />;
  }

  return (
    <div data-slot="theme-toggle" role="group" aria-label={t("choose_theme")} className="flex h-9 shrink-0 items-center gap-0.5 rounded-full border border-border bg-surface p-0.5">
      {choices.map(({ value, Icon }) => (
        <Button
          key={value}
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t(value)}
          aria-pressed={theme === value}
          title={t(value)}
          onClick={() => setTheme(value)}
          className="size-8 rounded-full text-muted aria-pressed:bg-accent aria-pressed:text-accent-foreground aria-pressed:hover:bg-accent-hover aria-pressed:hover:text-accent-foreground"
        >
          <Icon className="size-4" aria-hidden="true" />
        </Button>
      ))}
    </div>
  );
}
