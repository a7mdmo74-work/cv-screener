import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { listCvs } from "@/actions/cvs";
import { getJob } from "@/actions/jobs";
import { CvUploader } from "@/components/upload/cv-uploader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function UploadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <Suspense
        fallback={
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Loading candidate upload…
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
      <div className="border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <Link
          href={`/jobs/${job.id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <BackIcon />
          {job.title}
        </Link>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge
              variant="outline"
              className="border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200"
            >
              Step 2 · Candidate pool
            </Badge>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Add CVs to your screening round
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Upload all candidates for{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {job.title}
              </span>
              . Every parsed CV will be assessed using the same role rubric.
            </p>
          </div>
          <Badge variant="secondary">Draft screening</Badge>
        </div>
      </div>
      <Card>
        <CardContent className="space-y-5 pt-5 sm:pt-6">
          <div>
            <h2 className="text-base font-semibold">Build your candidate pool</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Add individual CVs or a ZIP archive. You can upload in batches
              before you start screening.
            </p>
          </div>
          <CvUploader
            jobId={job.id}
            jobStatus={job.status}
            initialCvs={cvResult.data}
          />
        </CardContent>
      </Card>
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
