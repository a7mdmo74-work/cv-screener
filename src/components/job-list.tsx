import { requirePageRole } from "@/lib/auth/server";
import { ReviewerOnly } from "@/components/auth/access-provider";
import { errorText } from "@/i18n/errors";

import { useTranslations } from "next-intl";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { connection } from "next/server";
import { listJobs } from "@/actions/jobs";
import { JobListClient } from "@/components/job-list-client";

export function JobListFallback() {
  const t = useTranslations();

  return (
    <div aria-busy="true" className="rounded-xl border border-border bg-surface p-6 text-sm text-muted">
      <p role="status">{t("jobs.loading_screening_jobs")}</p>
      <div aria-hidden="true" className="mt-4 space-y-3">
        {["w-3/4", "w-1/2", "w-2/3"].map(width => (
          <div key={width} className={`h-3 animate-pulse rounded bg-skeleton ${width}`} />
        ))}
      </div>
    </div>
  );
}

export async function JobList() {
  const t = await getTranslations();

  await connection();
  const user = await requirePageRole(await getLocale());
  const result = await listJobs();

  if (!result.ok) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-danger bg-danger-bg p-6 text-sm text-danger"
      >
        {errorText(t, result.error)}
      </div>
    );
  }

  if (result.data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border-strong bg-surface p-10 text-center">
        <h2 className="text-lg font-semibold text-foreground">{t("jobs.no_screening_jobs_yet")}</h2>
        <p className="mt-2 text-sm text-muted">{t("jobs.create_a_job_upload_cvs_and_rank_candidates_against_a_rubric")}</p>
        <ReviewerOnly><Link href="/jobs/new"
          className="mt-6 inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
        >{t("jobs.new_screening")}</Link></ReviewerOnly>
      </div>
    );
  }

  return <JobListClient jobs={result.data} canDelete={user.role !== "viewer"} />;
}
