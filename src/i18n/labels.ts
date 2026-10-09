import type { useTranslations } from "next-intl";
import { labelKeys } from "./label-keys";
export type Translator = ReturnType<typeof useTranslations<never>>;
export function uiLabel(t:Translator,value:string|null|undefined):string { if(value==null)return t("status.not_stated");const key=labelKeys[value as keyof typeof labelKeys];return key?t(key):value; }
export const jobStatusKeys={draft:"status.draft",queued:"status.queued",running:"status.running",done:"status.done",partial:"status.partial",cancelled:"status.cancelled",failed:"status.failed"} as const;
export const parseStatusKeys={pending:"status.pending",parsed:"status.parsed",needs_ocr:"status.needs_ocr",error:"status.error"} as const;
export const stageStatusKeys={pending:"status.pending",extracted:"status.extracted",scored:"status.scored",failed:"status.failed",not_screened_time_budget:"status.not_screened_time_budget"} as const;
export const screeningStageKeys={draft:"status.draft",queued:"results.waiting_for_the_local_worker",extracting:"status.extracting",scoring:"status.scoring",rescoring:"status.rescoring",pass_a:"status.pass_a",turbo:"status.turbo",enrich:"status.enrich",done:"status.done",partial:"status.partial_ready",cancelled:"status.cancelled",failed:"status.failed"} as const;
