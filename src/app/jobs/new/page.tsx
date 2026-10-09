import Link from "next/link";
import { JobWizard } from "@/components/wizard/job-wizard";

export default function NewJobPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <div>
        <Link
          href="/"
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Back to jobs
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          New screening
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Describe the role, answer a few clarifying questions, then review the
          scoring rubric.
        </p>
      </div>
      <JobWizard />
    </main>
  );
}
