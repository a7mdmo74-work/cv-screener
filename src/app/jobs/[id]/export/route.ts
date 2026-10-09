import { routeAccess } from "@/lib/auth/server";
import { requestLocale } from "@/i18n/request-locale";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { prisma } from "@/db/client";
import { parseRubric } from "@/lib/schemas/rubric";
import { buildResultsCsv } from "@/lib/screening/csv";
import { rankJobCandidates } from "@/lib/screening/results";

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
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      cvs: {
        where: { parseStatus: "parsed" },
        select: {
          id: true,
          fileName: true,
          extractionJson: true,
          scoreJson: true,
          totalScore: true,
          stageStatus: true,
          error: true,
          rawText: true,
        },
      },
    },
  });

  if (!job) {
    return new Response(t("JOB_NOT_FOUND"), { status: 404 });
  }

  const rubric = parseRubric(JSON.parse(job.rubricJson));
  const ranked = rankJobCandidates(job.cvs, rubric);
  const csv = buildResultsCsv(ranked, locale);
  const fileName = `${job.title.replace(/[^\w.-]+/g, "-").slice(0, 60) || "results"}.csv`;

  return new Response(csv, {
    headers: {
        "Cache-Control": "private, no-store",
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
