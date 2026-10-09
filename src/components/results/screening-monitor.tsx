"use client";
import { ReviewerOnly, useCanReview } from "@/components/auth/access-provider";
import { useUiFormatter } from "@/i18n/format";

import { stageStatusKeys, parseStatusKeys, screeningStageKeys } from "@/i18n/labels";
import { errorText } from "@/i18n/errors";

import { useTranslations, useLocale } from "next-intl";

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

const workingKeys = {
  queued: "results.queued_behind_another_job_or_waiting_for_the_worker_cancel_does_not_interrupt_an_in_flight",
  extracting: "status.working_extracting", scoring: "status.working_scoring", rescoring: "status.working_rescoring",
  pass_a: "results.pass_a_is_ranking_cvs_with_keywords_and_years_no_llm_yet", turbo: "results.pass_a_ranked_every_cv_turbo_is_scoring_the_top_cap_with_one_local_call_each",
  enrich: "status.working_enrich", partial: "results.fast_pass_finished_remaining_cvs_kept_their_pass_a_rank_continue_to_screen_more",
} as const;

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block size-5 shrink-0 animate-spin rounded-full border-2 border-border border-t-accent"
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
  const canReview = useCanReview();
  const t = useTranslations();
  const format = useUiFormatter();
  const locale = useLocale();

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
          className="rounded-lg border border-danger bg-danger-bg p-3 text-sm text-danger"
        >
          {error ? errorText(t, error) : null}
        </div>
      ) : null}

      <section
        className="rounded-xl border border-border bg-surface p-5"
        aria-live="polite"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {inFlight ? <Spinner /> : null}
            <div>
              <h2 className="text-sm font-semibold">
                {inFlight && !hasResults ? t("status.working") : t("results.screening_progress")}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {t(screeningStageKeys[progress.stage])}
                {progress.twoPass ? " · Two-pass" : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasResults ? (
              <>
                <a
                  href={`/jobs/${jobId}/export?locale=${locale}`}
                  className={secondaryButtonClassName}
                >{t("results.export_csv")}</a>
                <details className="relative">
                  <summary
                    className={`${secondaryButtonClassName} cursor-pointer list-none`}
                  >{t("results.export_excel")}</summary>
                  <div className="absolute end-0 z-20 mt-2 w-48 overflow-hidden rounded-lg border border-border bg-surface py-1 text-sm shadow-lg">
                    <a
                      href={`/jobs/${jobId}/export/xlsx?scope=all`}
                      className="block px-3 py-2 hover:bg-surface-muted"
                    >{t("results.all_scored")}</a>
                    <a
                      href={`/jobs/${jobId}/export/xlsx?scope=top15`}
                      className="block px-3 py-2 hover:bg-surface-muted"
                    >{t("results.top_15")}</a>
                  </div>
                </details>
              </>
            ) : null}
            {canReview && canCancel ? (
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
                {cancelling ? t("results.cancelling") : t("results.cancel")}
              </button>
            ) : null}
          </div>
        </div>
        {inFlight && !hasResults ? (
          <p className="mt-4 text-sm text-foreground">
            {t(workingKeys[progress.stage as keyof typeof workingKeys] ?? "status.working_default")}{" "}
            {progress.passACap > 0
              ? t("results.cap_summary", {count: progress.parsed, cap: progress.passACap})
              : t("results.candidate_lists_appear_after_the_first_scored_cv")}
          </p>
        ) : null}
        {progress.stage === "partial" ? (
          <p className="mt-4 rounded-lg bg-warning-bg p-3 text-sm text-warning">{t("results.partial_summary", {scored: progress.scored, remaining: progress.notScreened})}</p>
        ) : null}
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-muted">
          <div
            className={`h-full bg-accent  ${inFlight ? "animate-pulse" : ""}`}
            style={{
              width: `${progress.status === "done" ? 100 : Math.min(100, percent)}%`,
            }}
          />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted">{t("results.parsed")}</dt>
            <dd>{format.number(progress.parsed)}</dd>
          </div>
          <div>
            <dt className="text-muted">{t("results.extracted")}</dt>
            <dd>{format.number(progress.extracted)}</dd>
          </div>
          <div>
            <dt className="text-muted">{t("results.scored_64")}</dt>
            <dd>{format.number(progress.scored)}</dd>
          </div>
          <div>
            <dt className="text-muted">{t("results.failed")}</dt>
            <dd>{format.number(progress.failed)}</dd>
          </div>
        </dl>
        {progress.turboMode ? (
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted">{t("results.cvs_min")}</dt>
              <dd>{progress.cvsPerMinute == null ? "—" : format.number(progress.cvsPerMinute)}</dd>
            </div>
            <div>
              <dt className="text-muted">{t("results.tokens_s")}</dt>
              <dd>{progress.tokensPerSecond == null ? "—" : format.number(progress.tokensPerSecond)}</dd>
            </div>
            <div>
              <dt className="text-muted">{t("results.eta")}</dt>
              <dd>
                {progress.etaMinutes == null ? "—" : t("common.minutes", {count: format.number(progress.etaMinutes)})}
              </dd>
            </div>
            <div>
              <dt className="text-muted">{t("results.remaining")}</dt>
              <dd>
                {progress.turboMode
                  ? progress.pending
                  : progress.pending + progress.notScreened}
              </dd>
            </div>
          </dl>
        ) : null}
        {progress.status === "queued" ? (
          <p className="mt-4 rounded-lg bg-warning-bg p-3 text-sm text-warning">{t("results.the_worker_runs_one_job_at_a_time_if_you_cancelled_the_previous_job_restart")}{" "}
            <code className="font-mono">{t("results.npm_run_worker")}</code>{t("results.so_this_one_starts_immediately_otherwise_start_the_worker_if_it_is_not_running")}</p>
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
        <section className="overflow-hidden rounded-xl border border-warning bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-warning px-4 py-3 text-sm font-semibold">
            <span>{t("results.not_screened")}</span>
            <button
              className={secondaryButtonClassName}
              disabled={!canReview || continuing || inFlight || !canContinueRemaining}
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
              {continuing ? t("results.queueing") : t("results.continue_screening_remaining")}
            </button>
          </div>
          <ul className="divide-y divide-border text-sm">
            {results.notScreened.map((cv) => {
              const ranked = results.all.find((row) => row.id === cv.id);
              return (
                <li key={cv.id} className="px-4 py-3">
                  <p className="font-medium"><bdi>{cv.fileName}</bdi></p>
                  <p className="text-muted">{t("results.pass_a")}{ranked?.passAScore ?? "—"}
                    {cv.error ? ` · ${cv.error ? errorText(t, cv.error) : null}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {showLists && results.unparsed.length > 0 ? (
        <section className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold">{t("results.unparsed_failed_cvs")}</div>
          <ul className="divide-y divide-border text-sm">
            {results.unparsed.map((cv) => (
              <li key={cv.id} className="px-4 py-3">
                <p className="font-medium"><bdi>{cv.fileName}</bdi></p>
                <p className="text-muted">
                  {cv.parseStatus === "parsed" ? t(stageStatusKeys[cv.stageStatus]) : t(parseStatusKeys[cv.parseStatus])}
                  {cv.error ? ` · ${cv.error ? errorText(t, cv.error) : null}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hasResults ? (
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold">{t("results.re_rank")}</h2>
          <p className="mt-1 text-sm text-muted">{t("results.totals_are_computed_in_code_from_the_stored_criterion_scores_changing_weights_does_not_cal")}</p>
          <div className="mt-4">
            <ReviewerOnly><RerankForm
              jobId={jobId}
              weights={results.weights}
              onError={setError}
              onResults={setResults}
            /></ReviewerOnly>
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
