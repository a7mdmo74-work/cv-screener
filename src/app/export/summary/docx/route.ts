import { routeAccess } from "@/lib/auth/server";
import { requestLocale } from "@/i18n/request-locale";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { prisma } from "@/db/client";
import { todayStamp } from "@/lib/export/format";
import { buildUnifiedSummaryDocx } from "@/lib/export/word";
import { SHORTLIST_LIMIT } from "@/lib/ranking/rank";
import { parseRubric } from "@/lib/schemas/rubric";
import { rankJobCandidates } from "@/lib/screening/results";

export async function GET(request: Request) {
  const denied = await routeAccess(request, "viewer");
  if (denied) return denied;

  await connection();
  const locale = await requestLocale(request);
  const t = await getTranslations({locale,namespace:"errors"});
  const jobIds = (new URL(request.url).searchParams.get("jobIds") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  if (jobIds.length === 0) {
    return new Response(t("EXPORT_SELECT"), { status: 400 });
  }

  const jobs = await prisma.job.findMany({
    where: { id: { in: jobIds } },
    include: { cvs: true },
  });
  const ordered = jobIds
    .map((id) => jobs.find((job) => job.id === id))
    .filter((job): job is NonNullable<typeof job> => Boolean(job));

  if (ordered.length === 0) {
    return new Response(t("JOB_NOT_FOUND"), { status: 404 });
  }

  const payload = ordered.map((job) => {
    const rubric = parseRubric(JSON.parse(job.rubricJson));
    const ranked = rankJobCandidates(
      job.cvs.filter((cv) => cv.parseStatus === "parsed"),
      rubric,
    );
    const scored = ranked.filter((row) => row.stageStatus === "scored");
    return {
      title: job.title,
      rubric,
      top15: scored.slice(0, SHORTLIST_LIMIT),
      scoredCount: scored.length,
    };
  });

  const buffer = await buildUnifiedSummaryDocx({ jobs: payload, locale });
  const fileName = `unified_screening_summary_${todayStamp()}.docx`;
  const encoded = encodeURIComponent(fileName);

  return new Response(new Uint8Array(buffer), {
    headers: {
        "Cache-Control": "private, no-store",
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`,
    },
  });
}
