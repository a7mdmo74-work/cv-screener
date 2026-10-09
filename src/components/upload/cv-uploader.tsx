"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { uploadAndParseCvs } from "@/actions/cvs";
import { startScreening } from "@/actions/screening";
import {
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/wizard/styles";
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
        className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-950"
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
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Drop PDF, DOCX, or ZIP files here
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Add files in as many batches as you need before starting screening.
          ZIP archives are unpacked (up to 500 MB). {MAX_UPLOAD_FILES} CVs max,
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
          className={`${secondaryButtonClassName} mt-4`}
          disabled={!draft || uploading || remainingSlots <= 0}
          type="button"
          onClick={() => inputRef.current?.click()}
        >
          {uploading
            ? "Parsing…"
            : remainingSlots <= 0
              ? "Upload limit reached"
              : cvs.length > 0
                ? "Add more files"
                : "Choose files"}
        </button>
        {progress ? (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{progress}</p>
        ) : null}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap gap-3 border-b border-zinc-200 px-4 py-3 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          <span>{cvs.length} uploaded</span>
          <span>{counts.parsed} parsed</span>
          <span>{counts.needs_ocr} need OCR</span>
          <span>{counts.error} errors</span>
        </div>
        {cvs.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">
            No CVs uploaded yet.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {cvs.map((cv) => (
              <li
                key={cv.id}
                className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="truncate font-medium">{cv.fileName}</span>
                <span className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      cv.parseStatus === "parsed"
                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                        : cv.parseStatus === "needs_ocr"
                          ? "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                          : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
                    }`}
                  >
                    {statusLabel[cv.parseStatus]}
                  </span>
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
      </section>

      {draft ? (
        <form
          className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
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
            <label className="flex items-start gap-3">
              <input type="checkbox" disabled={starting} {...form.register("turboMode")} />
              <span>
                <span className="font-medium">Turbo mode</span>
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
              <label className="flex items-start gap-3">
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
