import { connection } from "next/server";
import { prisma } from "@/db/client";
import { parseRubric } from "@/lib/schemas/rubric";
import { buildResultsCsv } from "@/lib/screening/csv";
import { rankJobCandidates } from "@/lib/screening/results";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await connection();
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
    return new Response("Screening job not found", { status: 404 });
  }

  const rubric = parseRubric(JSON.parse(job.rubricJson));
  const ranked = rankJobCandidates(job.cvs, rubric);
  const csv = buildResultsCsv(ranked);
  const fileName = `${job.title.replace(/[^\w.-]+/g, "-").slice(0, 60) || "results"}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
