"use client";

import { parseStatusKeys } from "@/i18n/labels";
import { errorText } from "@/i18n/errors";

import { jobStatusKeys } from "@/i18n/labels";
import { useTranslations } from "next-intl";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { AlertCircle, FileText, LoaderCircle, Play, UploadCloud } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { uploadAndParseCvs } from "@/actions/cvs";
import { startScreening } from "@/actions/screening";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { JobStatus, ParseStatus } from "@/lib/schemas/job";
import {
  startScreeningSchema,
  type CvListItem,
  type StartScreeningInput,
} from "@/lib/schemas/upload";
import { MAX_UPLOAD_FILES, UPLOAD_BATCH_SIZE } from "@/lib/parsing/constants";

function UploadMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const valueColor = {
    neutral: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  }[tone];

  return (
    <Card className="p-3 sm:p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${valueColor}`}>
        {value}
      </p>
    </Card>
  );
}

export function CvUploader({
  jobId,
  jobStatus,
  initialCvs,
}: {
  jobId: string;
  jobStatus: JobStatus;
  initialCvs: CvListItem[];
}) {
  const t = useTranslations();

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [cvs, setCvs] = useState(initialCvs);
  const [skippedCount, setSkippedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const [progress, setProgress] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const [starting, startTransition] = useTransition();
  const draft = jobStatus === "draft";

  const form = useForm<StartScreeningInput>({
    resolver: zodResolver(startScreeningSchema),
    defaultValues: {
      jobId,
      twoPass: false,
      turboMode: true,
      timeBudgetMin: 30,
      passACap: 0,
      concurrency: "2",
      enrichCount: 0,
      bulkModel: "qwen3:4b",
    },
  });
  const turboMode = useWatch({ control: form.control, name: "turboMode" });

  const counts = useMemo(() => {
    return cvs.reduce(
      (acc, cv) => {
        acc[cv.parseStatus] += 1;
        return acc;
      },
      { pending: 0, parsed: 0, needs_ocr: 0, error: 0 } satisfies Record<
        ParseStatus,
        number
      >,
    );
  }, [cvs]);

  const remainingSlots = MAX_UPLOAD_FILES - cvs.length;

  function isZipName(name: string) {
    return name.toLowerCase().endsWith(".zip");
  }

  function enqueueFiles(fileList: FileList | File[]) {

    if (!draft) {
      return;
    }

    const incoming = Array.from(fileList);
    if (remainingSlots <= 0) {
      setError("UPLOAD_LIMIT");
      return;
    }

    const zips = incoming.filter((file) => isZipName(file.name));
    const others = incoming.filter((file) => !isZipName(file.name));
    const selected = [...zips, ...others.slice(0, remainingSlots)];
    const unpacking = zips.length > 0;
    startUpload(async () => {
      setError(null);
      setSkippedCount(0);
      let skipped = 0;
      for (let offset = 0; offset < selected.length; offset += UPLOAD_BATCH_SIZE) {
        const batch = selected.slice(offset, offset + UPLOAD_BATCH_SIZE);
        setProgress(
          unpacking
            ? t("upload.unpacking_zip_and_parsing_cvs")
            : t("upload.parsing_count", {count: Math.min(offset + batch.length, selected.length), total: selected.length}),
        );
        const formData = new FormData();
        formData.set("jobId", jobId);
        for (const file of batch) {
          formData.append("files", file);
        }
        const result = await uploadAndParseCvs(formData);
        if (!result.ok) {
          setError(result.error);
          setProgress(null);
          return;
        }
        skipped += result.data.skipped;
        setCvs((current) => [...current, ...result.data.cvs]);
      }
      setSkippedCount(skipped);
      setProgress(null);
    });
  }

  return (
    <div className="space-y-6">
      {skippedCount > 0 ? <p role="status">{t("upload.skipped_limit", {count: skippedCount, max: MAX_UPLOAD_FILES})}</p> : null}
      {error ? (
        <Alert variant="destructive" className="border-danger bg-danger-bg text-danger">
          <AlertCircle className="size-4" aria-hidden="true" />
          <AlertDescription className="text-current">{errorText(t, error, {max: MAX_UPLOAD_FILES})}</AlertDescription>
        </Alert>
      ) : null}

      <section
        className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors sm:p-9 ${
          error ? "border-danger bg-danger-bg" : dragging || uploading
            ? "border-accent bg-surface-muted ring-2 ring-ring"
            : "border-border-strong bg-surface hover:border-accent"
        }`}
        onDragEnter={(event) => {
          event.preventDefault();
          dragDepth.current += 1;
          if (draft && !uploading) setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          if (event.dataTransfer.files.length > 0) {
            enqueueFiles(event.dataTransfer.files);
          }
        }}
      >
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-accent bg-surface text-accent shadow-sm">
          <UploadCloud className="size-7" aria-hidden="true" />
        </div>
        <p className="mt-5 text-base font-semibold text-foreground">{t("upload.drop_candidate_cvs_here_or_choose_files")}</p>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{t("upload.limits", {max: MAX_UPLOAD_FILES})}</p>
        <input dir="auto"
          ref={inputRef}
          className="sr-only"
          type="file"
          accept=".pdf,.docx,.zip,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip"
          multiple
          disabled={!draft || uploading || remainingSlots <= 0}
          onChange={(event) => {
            if (event.target.files) {
              enqueueFiles(event.target.files);
              event.target.value = "";
            }
          }}
        />
        <Button
          className="mt-5 h-10 gap-2 bg-accent px-5 text-accent-foreground hover:bg-accent-hover"
          disabled={!draft || uploading || remainingSlots <= 0}
          type="button"
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <UploadCloud className="size-4" aria-hidden="true" />
          )}
          {uploading
            ? t("upload.parsing")
            : remainingSlots <= 0
              ? t("upload.upload_limit_reached")
              : cvs.length > 0
                  ? t("upload.add_more_cvs")
                : t("upload.choose_files")}
        </Button>
        {progress ? (
          <p role="status" className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            {progress}
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <UploadMetric label={t("upload.uploaded")} value={cvs.length} />
          <UploadMetric label={t("upload.ready_to_screen")} value={counts.parsed} tone="success" />
          <UploadMetric label={t("upload.need_ocr")} value={counts.needs_ocr} tone="warning" />
          <UploadMetric label={t("upload.errors")} value={counts.error} tone="danger" />
        </div>
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-muted px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-2.5">
              <FileText className="size-4 text-accent" aria-hidden="true" />
              <h3 className="text-sm font-semibold">{t("upload.candidate_files")}</h3>
            </div>
            <Badge variant="secondary" className="tabular-nums">{t("common.count_total", {count: cvs.length})}</Badge>
          </div>
          {cvs.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-medium text-foreground">{t("upload.your_candidate_list_is_empty")}</p>
              <p className="mt-1 text-xs text-muted">{t("upload.uploaded_cvs_will_appear_here_with_their_parsing_status")}</p>
            </div>
          ) : (
            <ul className="max-h-96 divide-y divide-border overflow-y-auto ">
              {cvs.map((cv) => (
                <li
                  key={cv.id}
                  className="flex flex-col gap-2 px-4 py-3 text-sm transition-colors hover:bg-surface-muted sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="min-w-0 truncate font-medium"><bdi>{cv.fileName}</bdi></span>
                  <span className="flex min-w-0 items-center gap-3">
                    <Badge
                      variant={
                        cv.parseStatus === "parsed"
                          ? "success"
                          : cv.parseStatus === "needs_ocr"
                            ? "warning"
                            : cv.parseStatus === "pending"
                              ? "secondary"
                              : "danger"
                      }
                    >
                      {t(parseStatusKeys[cv.parseStatus])}
                    </Badge>
                    {cv.error ? (
                      <span className="max-w-xs truncate text-xs text-muted">
                        {cv.error ? errorText(t, cv.error) : null}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {draft ? (
        <form
          className="flex flex-col gap-5 rounded-2xl border border-accent bg-surface-muted p-4 shadow-sm sm:p-6"
          onSubmit={form.handleSubmit((values) => {
            setError(null);
            startTransition(async () => {
              const result = await startScreening(values);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              router.push(`/jobs/${result.data.id}`);
            });
          })}
        >
          <div className="flex flex-1 flex-col gap-3 text-sm">
            <label className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3">
              <input type="checkbox" disabled={starting} {...form.register("turboMode")} />
              <span>
                <span className="font-semibold">{t("upload.turbo_mode")}</span>
                <span className="mt-0.5 block text-muted">{t("upload.fast_free_mode_pass_a_ranks_everyone_then_turbo_scores_every_parsed_cv_with_qwen3_4b_use_a")}</span>
              </span>
            </label>
            {turboMode ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs text-muted">{t("upload.time_budget_min")}</span>
                  <Input dir="auto"
                    type="number"
                    min={5}
                    max={240}
                    className="mt-1.5 h-10 bg-background"
                    disabled={starting}
                    {...form.register("timeBudgetMin", { valueAsNumber: true })}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted">{t("upload.pass_a_cap_0_all_files")}</span>
                  <Input dir="auto"
                    type="number"
                    min={0}
                    className="mt-1.5 h-10 bg-background"
                    disabled={starting}
                    {...form.register("passACap", { valueAsNumber: true })}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted">{t("upload.concurrency")}</span>
                  <select
                    className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring"
                    disabled={starting}
                    {...form.register("concurrency")}
                  >
                    <option value="auto">{t("upload.auto")}</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="6">6</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-muted">{t("upload.enrich_top_k")}</span>
                  <Input dir="auto"
                    type="number"
                    min={0}
                    max={40}
                    className="mt-1.5 h-10 bg-background"
                    disabled={starting}
                    {...form.register("enrichCount", { valueAsNumber: true })}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs text-muted">{t("upload.bulk_model")}</span>
                  <Input dir="auto"
                    className="mt-1.5 h-10 bg-background"
                    disabled={starting}
                    {...form.register("bulkModel")}
                  />
                </label>
              </div>
            ) : (
              <label className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3">
                <input type="checkbox" disabled={starting} {...form.register("twoPass")} />
                <span>
                  <span className="font-medium">{t("upload.two_pass_scoring")}</span>
                  <span className="mt-0.5 block text-muted">{t("upload.legacy_extract_then_score_optional_rescore_of_the_top_40")}</span>
                </span>
              </label>
            )}
          </div>
          <Button
            className="h-10 gap-2 bg-accent text-accent-foreground hover:bg-accent-hover"
            disabled={starting || uploading || counts.parsed === 0}
            type="submit"
          >
            {starting ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="size-4" aria-hidden="true" />
            )}
            {starting ? t("upload.queueing") : t("upload.start_screening")}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted">{t("upload.locked", {status: t(jobStatusKeys[jobStatus])})}</p>
      )}
    </div>
  );
}
