"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { uploadAndParseCvs } from "@/actions/cvs";
import { startScreening } from "@/actions/screening";
import { primaryButtonClassName } from "@/components/wizard/styles";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { JobStatus, ParseStatus } from "@/lib/schemas/job";
import {
  startScreeningSchema,
  type CvListItem,
  type StartScreeningInput,
} from "@/lib/schemas/upload";
import { MAX_UPLOAD_FILES, UPLOAD_BATCH_SIZE } from "@/lib/parsing/constants";

const statusLabel: Record<ParseStatus, string> = {
  pending: "Pending",
  parsed: "Parsed",
  needs_ocr: "Needs OCR",
  error: "Error",
};

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
    neutral: "text-zinc-900 dark:text-zinc-50",
    success: "text-emerald-700 dark:text-emerald-300",
    warning: "text-amber-700 dark:text-amber-300",
    danger: "text-red-700 dark:text-red-300",
  }[tone];

  return (
    <Card className="p-3 sm:p-4">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
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
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [cvs, setCvs] = useState(initialCvs);
  const [error, setError] = useState<string | null>(null);
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
  const turboMode = form.watch("turboMode");

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
      setError(`A job can include at most ${MAX_UPLOAD_FILES} CVs`);
      return;
    }

    const zips = incoming.filter((file) => isZipName(file.name));
    const others = incoming.filter((file) => !isZipName(file.name));
    const selected = [...zips, ...others.slice(0, remainingSlots)];
    const unpacking = zips.length > 0;
    startUpload(async () => {
      setError(null);
      let skipped = 0;
      for (let offset = 0; offset < selected.length; offset += UPLOAD_BATCH_SIZE) {
        const batch = selected.slice(offset, offset + UPLOAD_BATCH_SIZE);
        setProgress(
          unpacking
            ? "Unpacking ZIP and parsing CVs…"
            : `Parsing ${Math.min(offset + batch.length, selected.length)} of ${selected.length}`,
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
      if (skipped > 0) {
        setError(
          `${skipped} files were skipped because a job can include at most ${MAX_UPLOAD_FILES} CVs.`,
        );
      }
      setProgress(null);
    });
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </div>
      ) : null}

      <section
        className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-6 text-center transition-colors hover:border-indigo-300 dark:border-indigo-900 dark:bg-indigo-950/20 dark:hover:border-indigo-700 sm:p-8"
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          if (event.dataTransfer.files.length > 0) {
            enqueueFiles(event.dataTransfer.files);
          }
        }}
      >
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-indigo-100 bg-white text-indigo-700 shadow-sm dark:border-indigo-900 dark:bg-zinc-950 dark:text-indigo-300">
          <UploadIcon />
        </div>
        <p className="mt-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Drop candidate CVs here or choose files
        </p>
        <p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          Add files in batches before you start. PDF and DOCX are supported, as
          well as ZIP archives (up to 500 MB). Maximum {MAX_UPLOAD_FILES} CVs,
          15 MB each.
        </p>
        <input
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
        <button
          className={`${primaryButtonClassName} mt-4`}
          disabled={!draft || uploading || remainingSlots <= 0}
          type="button"
          onClick={() => inputRef.current?.click()}
        >
          {uploading
            ? "Parsing…"
            : remainingSlots <= 0
              ? "Upload limit reached"
              : cvs.length > 0
                  ? "Add more CVs"
                : "Choose files"}
        </button>
        {progress ? (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{progress}</p>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <UploadMetric label="Uploaded" value={cvs.length} />
          <UploadMetric label="Ready to screen" value={counts.parsed} tone="success" />
          <UploadMetric label="Need OCR" value={counts.needs_ocr} tone="warning" />
          <UploadMetric label="Errors" value={counts.error} tone="danger" />
        </div>
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h3 className="text-sm font-semibold">Candidate files</h3>
            <Badge variant="secondary">{cvs.length} total</Badge>
          </div>
          {cvs.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Your candidate list is empty
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Uploaded CVs will appear here with their parsing status.
              </p>
            </div>
          ) : (
            <ul className="max-h-96 divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
              {cvs.map((cv) => (
                <li
                  key={cv.id}
                  className="flex flex-col gap-2 px-4 py-3 text-sm transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-900/60 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="min-w-0 truncate font-medium">{cv.fileName}</span>
                  <span className="flex min-w-0 items-center gap-3">
                    <Badge
                      variant={
                        cv.parseStatus === "parsed"
                          ? "success"
                          : cv.parseStatus === "needs_ocr"
                            ? "warning"
                            : "danger"
                      }
                    >
                      {statusLabel[cv.parseStatus]}
                    </Badge>
                    {cv.error ? (
                      <span className="max-w-xs truncate text-xs text-zinc-500">
                        {cv.error}
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
          className="flex flex-col gap-4 rounded-xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/60 p-4 dark:border-indigo-950 dark:from-zinc-950 dark:to-indigo-950/20 sm:p-5"
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
            <label className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-white/80 p-3 dark:border-zinc-800 dark:bg-zinc-950/70">
              <input type="checkbox" disabled={starting} {...form.register("turboMode")} />
              <span>
                <span className="font-semibold">Turbo mode</span>
                <span className="mt-0.5 block text-zinc-500 dark:text-zinc-400">
                  Fast free mode: Pass A ranks everyone, then turbo scores every
                  parsed CV with qwen3:4b. Use a Pass A cap only if you want a
                  shorter run.
                </span>
              </span>
            </label>
            {turboMode ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs text-zinc-500">Time budget (min)</span>
                  <input
                    type="number"
                    min={5}
                    max={240}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
                    disabled={starting}
                    {...form.register("timeBudgetMin", { valueAsNumber: true })}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-zinc-500">
                    Pass A cap (0 = all files)
                  </span>
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
                    disabled={starting}
                    {...form.register("passACap", { valueAsNumber: true })}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-zinc-500">Concurrency</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
                    disabled={starting}
                    {...form.register("concurrency")}
                  >
                    <option value="auto">Auto</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="6">6</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-zinc-500">Enrich top K</span>
                  <input
                    type="number"
                    min={0}
                    max={40}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
                    disabled={starting}
                    {...form.register("enrichCount", { valueAsNumber: true })}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs text-zinc-500">Bulk model</span>
                  <input
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
                    disabled={starting}
                    {...form.register("bulkModel")}
                  />
                </label>
              </div>
            ) : (
              <label className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-white/80 p-3 dark:border-zinc-800 dark:bg-zinc-950/70">
                <input type="checkbox" disabled={starting} {...form.register("twoPass")} />
                <span>
                  <span className="font-medium">Two-pass scoring</span>
                  <span className="mt-0.5 block text-zinc-500 dark:text-zinc-400">
                    Legacy: extract then score, optional rescore of the top 40.
                  </span>
                </span>
              </label>
            )}
          </div>
          <button
            className={primaryButtonClassName}
            disabled={starting || uploading || counts.parsed === 0}
            type="submit"
          >
            {starting ? "Queueing…" : "Start screening"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-zinc-500">
          This job is {jobStatus}. New uploads are locked.
        </p>
      )}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14.5v3A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-3"
      />
    </svg>
  );
}
