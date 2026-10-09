import Link from "next/link";
import { JobWizard } from "@/components/wizard/job-wizard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function NewJobPage() {
  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 content-start gap-8 px-4 py-8 sm:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] sm:gap-12 sm:px-6 sm:py-12 lg:gap-16">
      <aside className="space-y-6 sm:sticky sm:top-8 sm:self-start">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <BackIcon />
          Screening workspace
        </Link>
        <div className="space-y-4">
          <Badge
            variant="outline"
            className="border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200"
          >
            Structured hiring
          </Badge>
          <div>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              Set up a consistent candidate review.
            </h1>
            <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400 sm:text-base">
              Define the role first, agree on a fair rubric, then assess every
              CV against the same criteria.
            </p>
          </div>
        </div>

        <Card className="border-indigo-100 bg-gradient-to-br from-white to-indigo-50/70 dark:border-indigo-950 dark:from-zinc-950 dark:to-indigo-950/30">
          <CardContent className="space-y-4 pt-5 sm:pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700 dark:text-indigo-300">
              Screening setup
            </p>
            <SetupStep
              number="01"
              title="Describe the role"
              description="Set the job context and requirements."
            />
            <SetupStep
              number="02"
              title="Clarify what matters"
              description="Answer optional questions to focus the assessment."
            />
            <SetupStep
              number="03"
              title="Confirm your rubric"
              description="Review the criteria before adding candidate CVs."
            />
          </CardContent>
        </Card>
        <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          Candidate recommendations are decision support. Keep human review
          central and assess job-related evidence only.
        </p>
      </aside>

      <section aria-labelledby="new-screening-title" className="min-w-0 space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            New screening round
          </p>
          <h2
            id="new-screening-title"
            className="mt-1 text-xl font-semibold tracking-tight"
          >
            Configure the role
          </h2>
        </div>
        <Card>
          <CardContent className="pt-5 sm:pt-6">
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
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
        {number}
      </span>
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="mt-0.5 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function BackIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m14 18-6-6 6-6" />
    </svg>
  );
}
