import { requirePageRole } from "@/lib/auth/server";
import { ReviewerOnly } from "@/components/auth/access-provider";
import { jobStatusKeys } from "@/i18n/labels";
import { errorText } from "@/i18n/errors";
import { safeLocale } from "@/i18n/locale";
import * as rootParams from "next/root-params";

import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getJob } from "@/actions/jobs";
import { getJobResults, getScreeningProgress } from "@/actions/screening";
import { Disclosure } from "@/components/disclosure";
import { ScreeningMonitor } from "@/components/results/screening-monitor";
import { SCORE_CRITERIA } from "@/lib/schemas/rubric";

export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string; locale: "en" | "ar" }>;
}) {
  const locale = safeLocale(await rootParams.locale());
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <Suspense
        fallback={
          <p className="text-sm text-muted">{t("jobs.loading_job")}</p>
        }
      >
        <JobDetail params={params} />
      </Suspense>
    </main>
  );
}

async function JobDetail({ params }: { params: Promise<{ id: string; locale: "en" | "ar" }> }) {
  const { id, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  await connection();
  await requirePageRole(locale, "viewer");
  const result = await getJob(id);

  if (!result.ok) {
    notFound();
  }

  const job = result.data;
  const [progressResult, resultsResult] =
    job.status === "draft"
      ? [null, null]
      : await Promise.all([getScreeningProgress(id), getJobResults(id)]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/"
          className="text-sm text-muted hover:text-foreground"
        >{t("jobs.back_to_jobs")}</Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
            <p className="mt-1 text-sm text-muted">
              {t(jobStatusKeys[job.status])} · {t("common.cv_count", {count: job.cvCount})}
              {job.twoPass ? t("jobs.two_pass") : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ReviewerOnly><Link href={`/jobs/${job.id}/clone`}
              className="inline-flex items-center rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-muted"
            >{t("jobs.clone_for_another_role")}</Link></ReviewerOnly>
            {job.status === "draft" ? (
              <ReviewerOnly><Link href={`/jobs/${job.id}/upload`}
                className="inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
              >{t("jobs.upload_cvs")}</Link></ReviewerOnly>
            ) : null}
          </div>
        </div>
      </div>
      <Disclosure
        title={t("jobs.job_description")}
        defaultOpen={job.status === "draft"}
        className="rounded-xl border border-border bg-surface"
      >
        <p className="px-5 pb-5 whitespace-pre-wrap text-sm text-foreground">
          {job.description}
        </p>
      </Disclosure>
      {job.rubric ? (
        <Disclosure
          title={t("jobs.rubric")}
          defaultOpen={job.status === "draft"}
          className="rounded-xl border border-border bg-surface"
        >
          <dl className="grid gap-4 px-5 pb-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">{t("jobs.geographic_scope")}</dt>
              <dd>{job.rubric.geographicScope || t("jobs.not_specified")}</dd>
            </div>
            <div>
              <dt className="text-muted">{t("jobs.employment_type")}</dt>
              <dd>{job.rubric.employmentType || t("jobs.not_specified")}</dd>
            </div>
            <div>
              <dt className="text-muted">{t("jobs.seniority")}</dt>
              <dd>{job.rubric.seniorityLevel || t("jobs.not_specified")}</dd>
            </div>
            <div>
              <dt className="text-muted">{t("jobs.must_have")}</dt>
              <dd>{job.rubric.mustHave.join(", ") || t("jobs.none")}</dd>
            </div>
            <div>
              <dt className="text-muted">{t("jobs.nice_to_have")}</dt>
              <dd>{job.rubric.niceToHave.join(", ") || t("jobs.none")}</dd>
            </div>
            <div>
              <dt className="text-muted">{t("jobs.min_years")}</dt>
              <dd>{job.rubric.minYearsExperience ?? t("jobs.not_specified")}</dd>
            </div>
            <div>
              <dt className="text-muted">{t("jobs.education")}</dt>
              <dd>{job.rubric.education ?? t("jobs.not_specified")}</dd>
            </div>
            <div>
              <dt className="text-muted">{t("jobs.languages")}</dt>
              <dd>{job.rubric.languages.join(", ") || t("jobs.none")}</dd>
            </div>
            <div>
              <dt className="text-muted">{t("jobs.location")}</dt>
              <dd>{job.rubric.location ?? t("jobs.not_specified")}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted">{t("jobs.deal_breakers")}</dt>
              <dd>{job.rubric.dealBreakers.join(", ") || t("jobs.none")}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted">{t("jobs.weights")}</dt>
              <dd>
                {SCORE_CRITERIA.map(
                  (key) => `${t(`status.${key}`)} ${job.rubric?.weights[key] ?? 0}`,
                ).join(" · ")}
              </dd>
            </div>
          </dl>
        </Disclosure>
      ) : null}

      {progressResult && resultsResult ? (
        !progressResult.ok ? (
          <div
            role="alert"
            className="rounded-lg border border-danger bg-danger-bg p-4 text-sm text-danger"
          >
            {errorText(t, progressResult.error)}
          </div>
        ) : !resultsResult.ok ? (
          <div
            role="alert"
            className="rounded-lg border border-danger bg-danger-bg p-4 text-sm text-danger"
          >
            {errorText(t, resultsResult.error)}
          </div>
        ) : (
          <ScreeningMonitor
            jobId={job.id}
            initialProgress={progressResult.data}
            initialResults={resultsResult.data}
          />
        )
      ) : null}
    </div>
  );
}

// Authentication may redirect at request time; do not validate a prefetched shell.
export const instant = false;
