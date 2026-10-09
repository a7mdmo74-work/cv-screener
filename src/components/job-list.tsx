import Link from "next/link";
import { connection } from "next/server";
import { listJobs } from "@/actions/jobs";
import { JobListClient } from "@/components/job-list-client";

export function JobListFallback() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
      Loading screening jobs…
    </div>
  );
}

export async function JobList() {
  await connection();
  const result = await listJobs();

  if (!result.ok) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
      >
        {result.error}
      </div>
    );
  }

  if (result.data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          No screening jobs yet
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Create a job, upload CVs, and rank candidates against a rubric.
        </p>
        <Link
          href="/jobs/new"
          className="mt-6 inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          New screening
        </Link>
      </div>
    );
  }

  return <JobListClient jobs={result.data} />;
}
