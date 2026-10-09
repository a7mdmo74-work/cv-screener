import { requirePageRole } from "@/lib/auth/server";
import { safeLocale } from "@/i18n/locale";
import * as rootParams from "next/root-params";

import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getJob } from "@/actions/jobs";
import { DEFAULT_JOB_DETAILS, JobWizard } from "@/components/wizard/job-wizard";

export default async function CloneJobPage({
  params,
}: {
  params: Promise<{ id: string; locale: "en" | "ar" }>;
}) {
  const locale = safeLocale(await rootParams.locale());
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <Suspense
        fallback={
          <p className="text-sm text-muted">{t("jobs.loading_job_to_clone")}</p>
        }
      >
        <CloneJobForm params={params} />
      </Suspense>
    </main>
  );
}

async function CloneJobForm({ params }: { params: Promise<{ id: string; locale: "en" | "ar" }> }) {
  const { id, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  await connection();
  await requirePageRole(locale, "hr_reviewer");
  const result = await getJob(id);

  if (!result.ok) {
    notFound();
  }

  const job = result.data;
  const rubric = job.rubric;
  if (!rubric) {
    notFound();
  }

  return (
    <>
      <div>
        <Link
          href={`/jobs/${job.id}`}
          className="text-sm text-muted hover:text-foreground"
        >{t("jobs.back_to_job")}</Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{t("jobs.clone_for_another_role")}</h1>
        <p className="mt-1 text-sm text-muted">{t("jobs.parsed_cvs_and_stage_1_extraction_are_reused_only_scoring_is_queued_for_the_new_rubric")}</p>
      </div>
      <JobWizard
        sourceJobId={job.id}
        initialDetails={{
          outputLanguage: rubric.outputLanguage,
          title: job.title,
          description: job.description,
          geographicScope:
            rubric.geographicScope || DEFAULT_JOB_DETAILS.geographicScope,
          employmentType:
            rubric.employmentType || DEFAULT_JOB_DETAILS.employmentType,
          seniorityLevel:
            rubric.seniorityLevel || DEFAULT_JOB_DETAILS.seniorityLevel,
          includeNationalityColumn: rubric.includeNationalityColumn,
        }}
        initialRubric={rubric}
      />
    </>
  );
}

// Authentication may redirect at request time; do not validate a prefetched shell.
export const instant = false;
