import { use, type ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { ArrowLeft, Check, ClipboardList, FileText, ListChecks, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { JobWizard } from "@/components/wizard/job-wizard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function NewJobPage({ params }: { params: Promise<{ locale: "en" | "ar" }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations();

  return (
    <main className="mx-auto grid w-full max-w-7xl flex-1 content-start gap-8 px-4 py-7 sm:px-6 sm:py-10 lg:grid-cols-[minmax(250px,0.72fr)_minmax(0,1.28fr)] lg:gap-10 lg:px-8">
      <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
          {t("jobs.screening_workspace")}
        </Link>

        <div className="rounded-3xl border border-border bg-surface p-6 text-foreground shadow-xl sm:p-8">
          <Badge className="border-border bg-surface text-accent hover:bg-surface">
            <ClipboardList className="me-1.5 size-3.5" aria-hidden="true" />
            {t("jobs.structured_hiring")}
          </Badge>
          <h1 className="mt-6 text-3xl font-semibold leading-tight tracking-tight sm:text-[2rem]">
            {t("jobs.set_up_a_consistent_candidate_review")}
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted">
            {t("jobs.define_the_role_first_agree_on_a_fair_rubric_then_assess_every_cv_against_the_same_criteri")}
          </p>

          <div className="mt-8 space-y-5">
            <SetupStep
              number="01"
              title={t("jobs.describe_the_role")}
              description={t("jobs.set_the_job_context_and_requirements")}
              icon={<FileText className="size-4" aria-hidden="true" />}
            />
            <SetupStep
              number="02"
              title={t("jobs.clarify_what_matters")}
              description={t("jobs.answer_optional_questions_to_focus_the_assessment")}
              icon={<ListChecks className="size-4" aria-hidden="true" />}
            />
            <SetupStep
              number="03"
              title={t("jobs.confirm_your_rubric")}
              description={t("jobs.review_the_criteria_before_adding_candidate_cvs")}
              icon={<Check className="size-4" aria-hidden="true" />}
            />
          </div>
        </div>

        <div className="flex gap-3 rounded-2xl border border-accent bg-surface-muted p-4">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
          <p className="text-xs leading-5 text-accent">
            {t("jobs.candidate_recommendations_are_decision_support_keep_human_review_central_and_assess_job_re")}
          </p>
        </div>
      </aside>

      <section aria-labelledby="new-screening-title" className="min-w-0">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              {t("jobs.new_screening_round")}
            </p>
            <h2
              id="new-screening-title"
              className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              {t("jobs.configure_the_role")}
            </h2>
          </div>
        </div>
        <Card className="overflow-hidden border-border shadow-md">
          <CardContent className="p-5 sm:p-7">
            <JobWizard />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function SetupStep({
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
    <div className="flex gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-accent">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold tabular-nums text-accent">{number}</span>
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
      </div>
    </div>
  );
}

// Authentication may redirect at request time; do not validate a prefetched shell.
export const instant = false;
