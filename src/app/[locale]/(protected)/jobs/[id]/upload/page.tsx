import { requirePageRole } from "@/lib/auth/server";
import { errorText } from "@/i18n/errors";
import { safeLocale } from "@/i18n/locale";
import * as rootParams from "next/root-params";
import { ArrowLeft, Files, ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { listCvs } from "@/actions/cvs";
import { getJob } from "@/actions/jobs";
import { CvUploader } from "@/components/upload/cv-uploader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function UploadPage({
  params,
}: {
  params: Promise<{ id: string; locale: "en" | "ar" }>;
}) {
  const locale = safeLocale(await rootParams.locale());
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">{t("upload.loading_candidate_upload")}</p>
        }
      >
        <UploadView params={params} />
      </Suspense>
    </main>
  );
}

async function UploadView({ params }: { params: Promise<{ id: string; locale: "en" | "ar" }> }) {
  const { id, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  await connection();
  await requirePageRole(locale, "hr_reviewer");

  const [jobResult, cvResult] = await Promise.all([getJob(id), listCvs(id)]);
  if (!jobResult.ok) {
    notFound();
  }
  if (!cvResult.ok) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-danger bg-danger-bg p-4 text-sm text-danger"
      >
        {errorText(t, cvResult.error)}
      </div>
    );
  }

  const job = jobResult.data;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7">
        <Link
          href={`/jobs/${job.id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
          {job.title}
        </Link>
        <Separator className="my-5" />
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-3xl">
            <Badge
              variant="outline"
              className="gap-1.5 border-accent bg-surface-muted text-accent"
            ><Files className="size-3.5" aria-hidden="true" />{t("upload.step_2_candidate_pool")}</Badge>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t("upload.add_cvs_to_your_screening_round")}</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">{t("upload.for_role", {title: job.title})}</p>
          </div>
          <Badge variant="secondary" className="px-3 py-1">{t("upload.draft_screening")}</Badge>
        </div>
      </div>
      <Card className="overflow-hidden border-border shadow-md">
        <div className="flex items-start gap-3 border-b border-border bg-surface-muted px-5 py-4 sm:px-7">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-accent">
            <Files className="size-5" aria-hidden="true" />
          </span>
          <div className="flex-1">
            <h2 className="text-base font-semibold">{t("upload.build_your_candidate_pool")}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("upload.add_individual_cvs_or_a_zip_archive_you_can_upload_in_batches_before_you_start_screening")}</p>
          </div>
          <ShieldCheck className="hidden size-5 text-success sm:block" aria-hidden="true" />
        </div>
        <CardContent className="p-5 sm:p-7">
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

// Authentication may redirect at request time; do not validate a prefetched shell.
export const instant = false;
