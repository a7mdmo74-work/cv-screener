
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { getOllamaHealth } from "@/actions/health";

const toneClasses = {
  green:
    "border-success bg-success-bg text-success",
  amber:
    "border-warning bg-warning-bg text-warning",
  red: "border-danger bg-danger-bg text-danger",
} as const;

export function OllamaStatusFallback() {
  const t = useTranslations();

  return (
    <span
      role="status"
      className="inline-flex items-center rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted"
    >{t("header.checking_ollama")}</span>
  );
}

export async function OllamaStatusBadge() {
  const t = await getTranslations();

  const result = await getOllamaHealth();

  if (!result.ok) {
    return (
      <span
        role="status"
        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses.red}`}
      >{t("header.ollama_error")}</span>
    );
  }

  const { reachable, extractModelPresent, scoreModelPresent, missingModels } =
    result.data;

  if (!reachable) {
    return (
      <span
        role="status"
        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses.red}`}
        title={t("header.ollama_is_not_reachable_at_the_configured_host")}
      >{t("header.ollama_offline")}</span>
    );
  }

  if (!extractModelPresent || !scoreModelPresent) {
    return (
      <span
        role="status"
        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses.amber}`}
        title={t("header.missing_models", {models: missingModels.join(", ")})}
      >{t("header.ollama_missing_models")}</span>
    );
  }

  return (
    <span
      role="status"
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses.green}`}
      title={t("header.ollama_is_reachable_and_both_configured_models_are_available")}
    >{t("header.ollama_ready")}</span>
  );
}
