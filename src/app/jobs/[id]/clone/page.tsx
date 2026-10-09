import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getJob } from "@/actions/jobs";
import { DEFAULT_JOB_DETAILS, JobWizard } from "@/components/wizard/job-wizard";

export default function CloneJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <Suspense
        fallback={
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Loading job to clone…
          </p>
        }
      >
        <CloneJobForm params={params} />
      </Suspense>
    </main>
  );
}

async function CloneJobForm({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connection();
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
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Back to job
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          Clone for another role
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Parsed CVs and Stage 1 extraction are reused. Only scoring is queued
          for the new rubric.
        </p>
      </div>
      <JobWizard
        sourceJobId={job.id}
        initialDetails={{
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
