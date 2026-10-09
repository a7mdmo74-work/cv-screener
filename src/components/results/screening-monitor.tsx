"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  cancelScreening,
  continueScreeningRemaining,
  getCvDetail,
  getJobResults,
  getScreeningProgress,
} from "@/actions/screening";
import { CvDrawer } from "@/components/results/cv-drawer";
import { RerankForm } from "@/components/results/rerank-form";
import { ResultsBoard } from "@/components/results/results-board";
import {
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/wizard/styles";
import type { CvDetail, JobResults, ScreeningProgress } from "@/lib/schemas/screening";
import { PASS_A_CAP_ERROR } from "@/lib/screening/stage-messages";

const STAGE_LABEL: Record<ScreeningProgress["stage"], string> = {
  draft: "Draft",
  queued: "Waiting for the local worker",
  extracting: "AI is reading CVs",
  scoring: "AI is scoring candidates",
  rescoring: "AI is rescoring the top 40",
  pass_a: "Pass A ranking",
  turbo: "Turbo screening",
  enrich: "Enriching top candidates",
  done: "Done",
  partial: "Partial — shortlist ready",
  cancelled: "Cancelled",
  failed: "Failed",
};

const WORKING_COPY: Partial<Record<ScreeningProgress["stage"], string>> = {
  queued:
    "Queued behind another job, or waiting for the worker. Cancel does not interrupt an in-flight Ollama call until you restart the worker.",
  extracting:
    "AI is working — extracting names, experience, and skills from each CV.",
  scoring: "AI is working — scoring candidates against your rubric.",
  rescoring:
    "AI is working — rescoring the top 40 with the larger model.",
  pass_a: "Pass A is ranking CVs with keywords and years. No LLM yet.",
  turbo:
    "Pass A ranked every CV. Turbo is scoring the top cap with one local call each.",
  enrich: "AI is enriching the top shortlist with a deeper pass.",
  partial:
    "Fast pass finished. Remaining CVs kept their Pass A rank. Continue to screen more.",
};

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block size-5 shrink-0 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"
    />
  );
}

export function ScreeningMonitor({
  jobId,
  initialProgress,
  initialResults,
}: {
  jobId: string;
  initialProgress: ScreeningProgress;
  initialResults: JobResults;
}) {
  const [progress, setProgress] = useState(initialProgress);
  const [results, setResults] = useState(initialResults);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, startCancel] = useTransition();
  const [continuing, startContinue] = useTransition();
  const [detail, setDetail] = useState<CvDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const refresh = useCallback(async () => {
    const [progressResult, resultsResult] = await Promise.all([
      getScreeningProgress(jobId),
      getJobResults(jobId),
    ]);
    if (progressResult.ok) {
      setProgress(progressResult.data);
    } else {
      setError(progressResult.error);
    }
    if (resultsResult.ok) {
      setResults(resultsResult.data);
    }
  }, [jobId]);

  useEffect(() => {
    const active =
      progress.status === "queued" || progress.status === "running";
    if (!active) {
      return;
    }
    const timer = window.setInterval(() => {
      void refresh();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [progress.status, refresh]);

  const processed = progress.extracted + progress.scored + progress.failed;
  const totalWork = Math.max(progress.parsed, 1);
  const percent = Math.round((processed / totalWork) * 100);
  const inFlight =
    progress.status === "queued" || progress.status === "running";
  const scoredRows = results.all.filter((row) => row.stageStatus === "scored");
  const hasResults = scoredRows.length > 0;
  const showLists = hasResults || !inFlight;
  const canCancel = inFlight;
  const canContinueRemaining = results.notScreened.some(
    (cv) => cv.error !== PASS_A_CAP_ERROR,
  );

  async function openCv(cvId: string) {
    setDrawerOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    const result = await getCvDetail({ jobId, cvId });
    setDetailLoading(false);
    if (!result.ok) {
      setDetail(null);
      setDetailError(result.error);
      return;
    }
    setDetail(result.data);
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
        className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
        aria-live="polite"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {inFlight ? <Spinner /> : null}
            <div>
              <h2 className="text-sm font-semibold">
                {inFlight && !hasResults ? "AI is working" : "Screening progress"}
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {STAGE_LABEL[progress.stage]}
                {progress.twoPass ? " · Two-pass" : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasResults ? (
              <>
                <a
                  href={`/jobs/${jobId}/export`}
                  className={secondaryButtonClassName}
                >
                  Export CSV
                </a>
                <details className="relative">
                  <summary
                    className={`${secondaryButtonClassName} cursor-pointer list-none`}
                  >
                    Export Excel
                  </summary>
                  <div className="absolute end-0 z-20 mt-2 w-48 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-950">
                    <a
                      href={`/jobs/${jobId}/export/xlsx?scope=all`}
                      className="block px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    >
                      All scored
                    </a>
                    <a
                      href={`/jobs/${jobId}/export/xlsx?scope=top15`}
                      className="block px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    >
                      Top 15
                    </a>
                  </div>
                </details>
              </>
            ) : null}
            {canCancel ? (
              <button
                className={primaryButtonClassName}
                disabled={cancelling}
                type="button"
                onClick={() => {
                  startCancel(async () => {
                    const result = await cancelScreening({ jobId });
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    await refresh();
                  });
                }}
              >
                {cancelling ? "Cancelling…" : "Cancel"}
              </button>
            ) : null}
          </div>
        </div>
        {inFlight && !hasResults ? (
          <p className="mt-4 text-sm text-zinc-700 dark:text-zinc-300">
            {WORKING_COPY[progress.stage] ??
              "AI is working on this screening job."}{" "}
            {progress.passACap > 0
              ? `Pass A ranked ${progress.parsed}. Turbo scoring top ${progress.passACap}.`
              : "Candidate lists appear after the first scored CV."}
          </p>
        ) : null}
        {progress.stage === "partial" ? (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            Partial run: {progress.scored} scored, {progress.notScreened} not
            screened. Top 15 is from the turbo-scored set.
          </p>
        ) : null}
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className={`h-full bg-zinc-900 dark:bg-zinc-100 ${inFlight ? "animate-pulse" : ""}`}
            style={{
              width: `${progress.status === "done" ? 100 : Math.min(100, percent)}%`,
            }}
          />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-zinc-500">Parsed</dt>
            <dd>{progress.parsed}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Extracted</dt>
            <dd>{progress.extracted}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Scored</dt>
            <dd>{progress.scored}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Failed</dt>
            <dd>{progress.failed}</dd>
          </div>
        </dl>
        {progress.turboMode ? (
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-zinc-500">CVs/min</dt>
              <dd>{progress.cvsPerMinute ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Tokens/s</dt>
              <dd>{progress.tokensPerSecond ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">ETA</dt>
              <dd>
                {progress.etaMinutes == null ? "—" : `${progress.etaMinutes} min`}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Remaining</dt>
              <dd>
                {progress.turboMode
                  ? progress.pending
                  : progress.pending + progress.notScreened}
              </dd>
            </div>
          </dl>
        ) : null}
        {progress.status === "queued" ? (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            The worker runs one job at a time. If you cancelled the previous
            job, restart{" "}
            <code className="font-mono">npm run worker</code> so this one starts
            immediately. Otherwise start the worker if it is not running.
          </p>
        ) : null}
      </section>

      {showLists && scoredRows.length > 0 ? (
        <ResultsBoard
          jobId={jobId}
          rows={scoredRows}
          onOpen={(cvId) => {
            void openCv(cvId);
          }}
        />
      ) : null}

      {(!inFlight || results.notScreened.length > 0) &&
      results.notScreened.length > 0 ? (
        <section className="overflow-hidden rounded-xl border border-amber-200 bg-white dark:border-amber-900 dark:bg-zinc-950">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 px-4 py-3 text-sm font-semibold dark:border-amber-900">
            <span>Not screened</span>
            <button
              className={secondaryButtonClassName}
              disabled={continuing || inFlight || !canContinueRemaining}
              type="button"
              onClick={() => {
                startContinue(async () => {
                  const result = await continueScreeningRemaining({ jobId });
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  await refresh();
                });
              }}
            >
              {continuing ? "Queueing…" : "Continue screening remaining"}
            </button>
          </div>
          <ul className="divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
            {results.notScreened.map((cv) => {
              const ranked = results.all.find((row) => row.id === cv.id);
              return (
                <li key={cv.id} className="px-4 py-3">
                  <p className="font-medium">{cv.fileName}</p>
                  <p className="text-zinc-500">
                    Pass A {ranked?.passAScore ?? "—"}
                    {cv.error ? ` · ${cv.error}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {showLists && results.unparsed.length > 0 ? (
        <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold dark:border-zinc-800">
            Unparsed / failed CVs
          </div>
          <ul className="divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
            {results.unparsed.map((cv) => (
              <li key={cv.id} className="px-4 py-3">
                <p className="font-medium">{cv.fileName}</p>
                <p className="text-zinc-500">
                  {cv.parseStatus === "parsed" ? cv.stageStatus : cv.parseStatus}
                  {cv.error ? ` · ${cv.error}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hasResults ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold">Re-rank</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Totals are computed in code from the stored criterion scores. Changing
            weights does not call the model again. Excel and Word exports use the
            updated totals.
          </p>
          <div className="mt-4">
            <RerankForm
              jobId={jobId}
              weights={results.weights}
              onError={setError}
              onResults={setResults}
            />
          </div>
        </section>
      ) : null}

      {drawerOpen ? (
        <CvDrawer
          detail={detail}
          loading={detailLoading}
          error={detailError}
          onClose={() => {
            setDrawerOpen(false);
            setDetail(null);
            setDetailError(null);
          }}
        />
      ) : null}
    </div>
  );
}
