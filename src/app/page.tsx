import Link from "next/link";
import { Suspense } from "react";
import { JobList, JobListFallback } from "@/components/job-list";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Screening jobs
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Review local CV screening runs and start a new one.
          </p>
        </div>
        <Link
          href="/jobs/new"
          className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          New screening
        </Link>
      </div>
      <Suspense fallback={<JobListFallback />}>
        <JobList />
      </Suspense>
    </main>
  );
}
