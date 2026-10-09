import { routeAccess } from "@/lib/auth/server";
import { requestLocale } from "@/i18n/request-locale";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { prisma } from "@/db/client";
import { buildJobWorkbook } from "@/lib/export/excel";
import { sanitizeFilePart, todayStamp } from "@/lib/export/format";
import { SHORTLIST_LIMIT } from "@/lib/ranking/rank";
import { parseRubric } from "@/lib/schemas/rubric";
import { exportScopeSchema } from "@/lib/schemas/screening";
import { parseJobStatus, parseParseStatus, rankJobCandidates } from "@/lib/screening/results";
import { stageStatusSchema } from "@/lib/schemas/job";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const denied = await routeAccess(request, "viewer");
  if (denied) return denied;

  await connection();
  const locale = await requestLocale(request);
  const t = await getTranslations({locale,namespace:"errors"});
  const { id } = await context.params;
  const scope = exportScopeSchema.catch("all").parse(
    new URL(request.url).searchParams.get("scope") ?? "all",
  );

  const job = await prisma.job.findUnique({
    where: { id },
    include: { cvs: true },
  });
  if (!job) {
    return new Response(t("JOB_NOT_FOUND"), { status: 404 });
  }

  const rubric = parseRubric(JSON.parse(job.rubricJson));
  const parsedCvs = job.cvs.filter((cv) => cv.parseStatus === "parsed");
  const ranked = rankJobCandidates(parsedCvs, rubric);
    const toUnparsed = (cv: (typeof job.cvs)[number]) => ({
      id: cv.id,
      fileName: cv.fileName,
      parseStatus: parseParseStatus(cv.parseStatus),
      stageStatus: stageStatusSchema.parse(cv.stageStatus),
      error: cv.error,
    });
    const unparsed = job.cvs
      .filter(
        (cv) =>
          cv.parseStatus === "needs_ocr" ||
          cv.parseStatus === "error" ||
          cv.stageStatus === "failed",
      )
      .map(toUnparsed);
    const notScreened = job.cvs
      .filter((cv) => cv.stageStatus === "not_screened_time_budget")
      .map(toUnparsed);

  const workbook = await buildJobWorkbook(
    job.title,
    rubric,
    {
      jobId: job.id,
      title: job.title,
      status: parseJobStatus(job.status, notScreened.length),
      twoPass: job.twoPass,
      weights: rubric.weights,
      includeNationalityColumn: rubric.includeNationalityColumn,
      top15: ranked
        .filter((row) => row.stageStatus === "scored")
        .slice(0, SHORTLIST_LIMIT),
      all: ranked,
      unparsed,
      notScreened,
    },
    scope,
    locale,
  );

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const fileName = `candidates_${sanitizeFilePart(job.title)}_${todayStamp()}.xlsx`;
  const encoded = encodeURIComponent(fileName);

  return new Response(new Uint8Array(buffer), {
    headers: {
        "Cache-Control": "private, no-store",
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`,
    },
  });
}
