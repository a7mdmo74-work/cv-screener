import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getJob } from "@/actions/jobs";
import { getJobResults, getScreeningProgress } from "@/actions/screening";
import { Disclosure } from "@/components/disclosure";
import { ScreeningMonitor } from "@/components/results/screening-monitor";
import { CRITERION_LABELS, SCORE_CRITERIA } from "@/lib/schemas/rubric";

export default function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <Suspense
        fallback={
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Loading job…
          </p>
        }
      >
        <JobDetail params={params} />
      </Suspense>
    </main>
  );
}

async function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connection();
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
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Back to jobs
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {job.status} · {job.cvCount} {job.cvCount === 1 ? "CV" : "CVs"}
              {job.twoPass ? " · Two-pass" : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/jobs/${job.id}/clone`}
              className="inline-flex items-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Clone for another role
            </Link>
            {job.status === "draft" ? (
              <Link
                href={`/jobs/${job.id}/upload`}
                className="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Upload CVs
              </Link>
            ) : null}
          </div>
        </div>
      </div>
      <Disclosure
        title="Job description"
        defaultOpen={job.status === "draft"}
        className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
      >
        <p className="px-5 pb-5 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
          {job.description}
        </p>
      </Disclosure>
      {job.rubric ? (
        <Disclosure
          title="Rubric"
          defaultOpen={job.status === "draft"}
          className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
        >
          <dl className="grid gap-4 px-5 pb-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">Geographic scope</dt>
              <dd>{job.rubric.geographicScope || "Not specified"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Employment type</dt>
              <dd>{job.rubric.employmentType || "Not specified"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Seniority</dt>
              <dd>{job.rubric.seniorityLevel || "Not specified"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Must have</dt>
              <dd>{job.rubric.mustHave.join(", ") || "None"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Nice to have</dt>
              <dd>{job.rubric.niceToHave.join(", ") || "None"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Min years</dt>
              <dd>{job.rubric.minYearsExperience ?? "Not specified"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Education</dt>
              <dd>{job.rubric.education ?? "Not specified"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Languages</dt>
              <dd>{job.rubric.languages.join(", ") || "None"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Location</dt>
              <dd>{job.rubric.location ?? "Not specified"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-zinc-500">Deal-breakers</dt>
              <dd>{job.rubric.dealBreakers.join(", ") || "None"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-zinc-500">Weights</dt>
              <dd>
                {SCORE_CRITERIA.map(
                  (key) => `${CRITERION_LABELS[key]} ${job.rubric?.weights[key] ?? 0}`,
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
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            {progressResult.error}
          </div>
        ) : !resultsResult.ok ? (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            {resultsResult.error}
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
