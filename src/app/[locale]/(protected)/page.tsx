import { ReviewerOnly } from "@/components/auth/access-provider";
import { safeLocale } from "@/i18n/locale";
import * as rootParams from "next/root-params";
import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowUpRight, ClipboardCheck, FileSearch, Scale, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Suspense } from "react";
import { JobList, JobListFallback } from "@/components/job-list";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export default async function HomePage() {
  const locale = safeLocale(await rootParams.locale());
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
      <section className="relative isolate overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
        <div className="absolute inset-y-0 end-0 -z-10 hidden w-2/5 bg-surface-muted lg:block" />
        <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col items-start justify-center p-6 sm:p-9 lg:p-12">
            <Badge
              variant="outline"
              className="gap-1.5 border-accent bg-surface-muted px-3 py-1 text-accent"
            >
              <Sparkles className="size-3.5" aria-hidden="true" />
              {t("jobs.people_operations_hiring_workspace")}
            </Badge>
            <h1 className="mt-6 max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {t("jobs.structured_candidate_screening")}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
              {t("jobs.build_a_role_specific_rubric_evaluate_cvs_consistently_and_keep_every_hiring_round_organiz")}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ReviewerOnly><Link href="/jobs/new"
                className={buttonVariants({
                  size: "lg",
                  className:
 "h-11 gap-2 bg-accent px-5 text-accent-foreground shadow-sm hover:bg-accent-hover",
                })}
              >
                {t("jobs.create_screening_round")}
                <ArrowUpRight className="size-4 rtl:-rotate-90" aria-hidden="true" />
              </Link></ReviewerOnly>
             
            </div>
          </div>

          <div className="hidden items-center p-8 lg:flex lg:ps-2 lg:pe-10">
            <div className="w-full rounded-2xl border border-border bg-surface p-6 shadow-lg backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                 
                  <h2 className="mt-2 text-lg font-semibold tracking-tight">
                    {t("jobs.from_role_requirements_to_a_confident_shortlist")}
                  </h2>
                </div>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-accent">
                  <ClipboardCheck className="size-5" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-6 space-y-3">
                <WorkflowStep
                  number="01"
                  title={t("jobs.define_the_role")}
                  description={t("jobs.add_the_job_description_and_confirm_what_matters")}
                  icon={<FileSearch className="size-4" aria-hidden="true" />}
                />
                <WorkflowStep
                  number="02"
                  title={t("jobs.review_the_rubric")}
                  description={t("jobs.set_consistent_criteria_before_looking_at_cvs")}
                  icon={<Scale className="size-4" aria-hidden="true" />}
                />
                <WorkflowStep
                  number="03"
                  title={t("jobs.screen_candidates")}
                  description={t("jobs.upload_cvs_and_review_evidence_side_by_side")}
                  icon={<ClipboardCheck className="size-4" aria-hidden="true" />}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="screening-activity-title" className="space-y-5">
        <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              {t("jobs.your_workspace")}
            </p>
            <h2
              id="screening-activity-title"
              className="mt-2 text-2xl font-semibold tracking-tight"
            >
              {t("jobs.screening_rounds")}
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted">
            {t("jobs.open_a_round_to_continue_screening_or_review_candidate_results")}
          </p>
        </div>
        <Suspense fallback={<JobListFallback />}>
          <JobList />
        </Suspense>
      </section>
    </main>
  );
}

function WorkflowStep({
  number,
  title,
  description,
  icon,
}: {
  number: string;
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Card className="flex items-center gap-3 border-border bg-surface p-3 shadow-none">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-accent">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-0.5 text-xs leading-5 text-muted">
          {description}
        </p>
      </div>
      <span className="self-start pt-0.5 text-[11px] font-semibold tabular-nums text-muted">
        {number}
      </span>
    </Card>
  );
}

// Authentication may redirect at request time; do not validate a prefetched shell.
export const instant = false;
