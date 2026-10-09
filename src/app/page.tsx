import Link from "next/link";
import { Suspense } from "react";
import { JobList, JobListFallback } from "@/components/job-list";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-9 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-6 rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-white to-indigo-50/70 p-6 shadow-sm dark:border-indigo-950 dark:from-zinc-950 dark:to-indigo-950/30 sm:flex-row sm:items-end sm:justify-between sm:p-8">
        <div className="max-w-2xl space-y-4">
          <Badge
            variant="outline"
            className="border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200"
          >
            People operations · Hiring workspace
          </Badge>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Structured candidate screening
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400 sm:text-base">
              Build a role-specific rubric, evaluate CVs consistently, and keep
              every hiring round organized from one workspace.
            </p>
          </div>
        </div>
        <Link
          href="/jobs/new"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:bg-indigo-500 dark:text-white dark:hover:bg-indigo-400"
        >
          Create screening round
          <ArrowIcon />
        </Link>
      </header>

      <section aria-labelledby="workflow-title" className="space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            One consistent workflow
          </p>
          <h2
            id="workflow-title"
            className="mt-1 text-xl font-semibold tracking-tight"
          >
            From role requirements to a confident shortlist
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <WorkflowStep
            number="01"
            title="Define the role"
            description="Add the job description and confirm what matters."
          />
          <WorkflowStep
            number="02"
            title="Review the rubric"
            description="Set consistent criteria before looking at CVs."
          />
          <WorkflowStep
            number="03"
            title="Screen candidates"
            description="Upload CVs and review evidence side by side."
          />
        </div>
      </section>

      <section aria-labelledby="screening-activity-title" className="space-y-4">
        <div className="flex flex-col gap-1 border-b border-zinc-200 pb-4 dark:border-zinc-800 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Your workspace
            </p>
            <h2
              id="screening-activity-title"
              className="mt-1 text-xl font-semibold tracking-tight"
            >
              Screening rounds
            </h2>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Open a round to continue screening or review candidate results.
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
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <Card className="flex gap-3 p-4 sm:p-5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200">
        {number}
      </span>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      </div>
    </Card>
  );
}

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 12h14m-6-6 6 6-6 6"
      />
    </svg>
  );
}
