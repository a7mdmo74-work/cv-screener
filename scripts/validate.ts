import { readFileSync } from "node:fs";
import { prisma } from "@/db/client";
import { parseRubric } from "@/lib/schemas/rubric";
import { rankJobCandidates } from "@/lib/screening/results";

function parseCsv(path: string): string[] {
  const text = readFileSync(path, "utf8");
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .slice(0, 10);
}

async function main() {
  const csvPath = process.argv[2] ?? "expected.csv";
  const expected = parseCsv(csvPath);
  const job = await prisma.job.findFirst({
    where: { status: "done" },
    orderBy: { createdAt: "desc" },
    include: {
      cvs: {
        select: {
          id: true,
          fileName: true,
          extractionJson: true,
          scoreJson: true,
          totalScore: true,
          stageStatus: true,
          error: true,
          passAScore: true,
        },
      },
    },
  });
  if (!job) {
    console.error("No done job to validate");
    process.exit(1);
  }
  const rubric = parseRubric(JSON.parse(job.rubricJson));
  const top10 = rankJobCandidates(
    job.cvs.filter((cv) => cv.stageStatus === "scored"),
    rubric,
  )
    .slice(0, 10)
    .map((row) => row.fileName);
  const overlap = top10.filter((name) => expected.includes(name)).length;
  console.log(
    `Job ${job.title}: top-10 overlap ${overlap}/10 against ${csvPath}`,
  );
  console.log("Predicted:", top10.join(" | "));
  console.log("Expected:", expected.join(" | "));
}

void main();
