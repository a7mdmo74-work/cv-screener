import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { listCvs } from "@/actions/cvs";
import { getJob } from "@/actions/jobs";
import { CvUploader } from "@/components/upload/cv-uploader";

export default function UploadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <Suspense
        fallback={
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Loading upload…
          </p>
        }
      >
        <UploadView params={params} />
      </Suspense>
    </main>
  );
}

async function UploadView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connection();

  const [jobResult, cvResult] = await Promise.all([getJob(id), listCvs(id)]);
  if (!jobResult.ok) {
    notFound();
  }
  if (!cvResult.ok) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
      >
        {cvResult.error}
      </div>
    );
  }

  const job = jobResult.data;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/jobs/${job.id}`}
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Back to job
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          Upload CVs
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {job.title} · PDF, DOCX, or ZIP. You can upload more later while this
          job is still a draft.
        </p>
      </div>
      <CvUploader
        jobId={job.id}
        jobStatus={job.status}
        initialCvs={cvResult.data}
      />
    </div>
  );
}
