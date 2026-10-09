"use server";
import { requireRole } from "@/lib/auth/server";
import { errorCode } from "@/i18n/errors";

import { revalidatePath } from "next/cache";
import { prisma } from "@/db/client";
import {
  SHORTLIST_LIMIT,
  computeDerivedFields,
  computeTotalScore,
} from "@/lib/ranking/rank";
import type { ActionResult } from "@/lib/schemas/action";
import type {
  CloneJobInput,
  CvDetail,
  JobResults,
  RerankInput,
  ScreeningCvIdInput,
  ScreeningJobIdInput,
  ScreeningProgress,
} from "@/lib/schemas/screening";
import {
  cloneJobSchema,
  rerankSchema,
  screeningCvIdSchema,
  screeningJobIdSchema,
} from "@/lib/schemas/screening";
import { startScreeningSchema, type StartScreeningInput } from "@/lib/schemas/upload";
import { stageStatusSchema } from "@/lib/schemas/job";
import { parseRubric } from "@/lib/schemas/rubric";
import { parseTurboSettings } from "@/lib/schemas/turbo";
import {
  PASS_A_CAP_ERROR,
  etaQueueSize,
  projectRemainingMinutes,
} from "@/lib/screening/scheduler";
import { extractNationality } from "@/lib/parsing/contact";
import { parseCandidateJson, parseScoreJson } from "@/lib/screening/parse";
import { inferStage } from "@/lib/screening/progress";
import {
  fileExists,
  parseJobStatus,
  parseParseStatus,
  rankJobCandidates,
} from "@/lib/screening/results";

function revalidateJob(jobId: string) {
  revalidatePath("/[locale]", "page");
  for (const locale of ["en", "ar"]) {
    revalidatePath(`/${locale}/jobs/${jobId}`);
    revalidatePath(`/${locale}/jobs/${jobId}/upload`);
  }
}

export async function startScreening(
  input: StartScreeningInput,
): Promise<ActionResult<{ id: string }>> {
  await requireRole("hr_reviewer");
  const parsed = startScreeningSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: errorCode(parsed.error.issues[0]?.message ?? "Invalid request") };
  }

  try {
    const job = await prisma.job.findUnique({
      where: { id: parsed.data.jobId },
      include: {
        _count: {
          select: {
            cvs: { where: { parseStatus: "parsed" } },
          },
        },
      },
    });

    if (!job) {
      return { ok: false, error: errorCode("Screening job not found") };
    }

    if (job.status !== "draft") {
      return { ok: false, error: errorCode("This job has already been started") };
    }

    if (job._count.cvs === 0) {
      return {
        ok: false,
        error: "NO_PARSED_CVS",
      };
    }

    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "queued",
        twoPass: parsed.data.twoPass,
        turboMode: parsed.data.turboMode,
        turboSettingsJson: JSON.stringify({
          timeBudgetMin: parsed.data.timeBudgetMin,
          passACap: parsed.data.passACap,
          concurrency:
            parsed.data.concurrency === "auto"
              ? "auto"
              : Number(parsed.data.concurrency),
          enrichCount: parsed.data.enrichCount,
          bulkModel: parsed.data.bulkModel,
          judgeTop10: false,
        }),
        screeningStartedAt: null,
        deadlineAt: null,
        lockedConcurrency:
          parsed.data.concurrency === "auto"
            ? null
            : Number(parsed.data.concurrency),
        cvsPerMinute: null,
        tokensPerSecond: null,
      },
    });

    revalidateJob(job.id);
    return { ok: true, data: { id: job.id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to start screening";
    return { ok: false, error: errorCode(message) };
  }
}

export async function continueScreeningRemaining(
  input: ScreeningJobIdInput,
): Promise<ActionResult<{ id: string }>> {
  await requireRole("hr_reviewer");
  const parsed = screeningJobIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: errorCode("Invalid job") };
  }

  try {
    const job = await prisma.job.findUnique({
      where: { id: parsed.data.jobId },
    });
    if (!job) {
      return { ok: false, error: errorCode("Screening job not found") };
    }

    const remaining = await prisma.cv.count({
      where: {
        jobId: job.id,
        stageStatus: "not_screened_time_budget",
        NOT: { error: PASS_A_CAP_ERROR },
      },
    });
    if (remaining === 0) {
      return { ok: false, error: errorCode("No remaining CVs to screen") };
    }

    const settings = parseTurboSettings(job.turboSettingsJson);
    await prisma.cv.updateMany({
      where: {
        jobId: job.id,
        stageStatus: "not_screened_time_budget",
        NOT: { error: PASS_A_CAP_ERROR },
      },
      data: { stageStatus: "pending", error: null },
    });
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "queued",
        screeningStartedAt: new Date(),
        deadlineAt: new Date(Date.now() + settings.timeBudgetMin * 60_000),
      },
    });

    revalidateJob(job.id);
    return { ok: true, data: { id: job.id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to continue screening";
    return { ok: false, error: errorCode(message) };
  }
}

export async function cancelScreening(
  input: ScreeningJobIdInput,
): Promise<ActionResult<{ id: string }>> {
  await requireRole("hr_reviewer");
  const parsed = screeningJobIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: errorCode("Invalid job") };
  }

  try {
    const job = await prisma.job.findUnique({
      where: { id: parsed.data.jobId },
      select: { id: true, status: true },
    });

    if (!job) {
      return { ok: false, error: errorCode("Screening job not found") };
    }

    if (job.status !== "queued" && job.status !== "running") {
      return { ok: false, error: errorCode("Only queued or running jobs can be cancelled") };
    }

    await prisma.job.update({
      where: { id: job.id },
      data: { status: "cancelled" },
    });

    revalidateJob(job.id);
    return { ok: true, data: { id: job.id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to cancel screening";
    return { ok: false, error: errorCode(message) };
  }
}

export async function getScreeningProgress(
  jobId: string,
): Promise<ActionResult<ScreeningProgress>> {
  await requireRole("viewer");
  const parsed = screeningJobIdSchema.safeParse({ jobId });
  if (!parsed.success) {
    return { ok: false, error: errorCode("Invalid job") };
  }

  try {
    const job = await prisma.job.findUnique({
      where: { id: parsed.data.jobId },
      include: {
        cvs: {
          select: { parseStatus: true, stageStatus: true },
        },
      },
    });

    if (!job) {
      return { ok: false, error: errorCode("Screening job not found") };
    }

    const counts = {
      total: job.cvs.length,
      parsed: 0,
      pending: 0,
      extracted: 0,
      scored: 0,
      failed: 0,
      notScreened: 0,
      needsOcr: 0,
      parseErrors: 0,
    };

    for (const cv of job.cvs) {
      if (cv.parseStatus === "parsed") {
        counts.parsed += 1;
        if (cv.stageStatus === "pending") {
          counts.pending += 1;
        } else if (cv.stageStatus === "extracted") {
          counts.extracted += 1;
        } else if (cv.stageStatus === "scored") {
          counts.scored += 1;
        } else if (cv.stageStatus === "failed") {
          counts.failed += 1;
        } else if (cv.stageStatus === "not_screened_time_budget") {
          counts.notScreened += 1;
        }
      } else if (cv.parseStatus === "needs_ocr") {
        counts.needsOcr += 1;
      } else if (cv.parseStatus === "error") {
        counts.parseErrors += 1;
      }
    }

    const settings = parseTurboSettings(job.turboSettingsJson);
    const remaining = etaQueueSize({
      pending: counts.pending,
      notScreened: counts.notScreened,
      turboMode: job.turboMode,
    });
    const rate = job.cvsPerMinute ?? 0;

    return {
      ok: true,
      data: {
        jobId: job.id,
        title: job.title,
        status: parseJobStatus(job.status, counts.notScreened),
        stage: inferStage({
          status: job.status,
          pending: counts.pending,
          extracted: counts.extracted,
          scored: counts.scored,
          twoPass: job.twoPass,
          turboMode: job.turboMode,
          notScreened: counts.notScreened,
        }),
        passACap: settings.passACap,
        twoPass: job.twoPass,
        turboMode: job.turboMode,
        ...counts,
        cvsPerMinute: job.cvsPerMinute,
        tokensPerSecond: job.tokensPerSecond,
        etaMinutes: projectRemainingMinutes(remaining, rate),
        deadlineAt: job.deadlineAt ? job.deadlineAt.toISOString() : null,
        lockedConcurrency: job.lockedConcurrency,
        timeBudgetMin: settings.timeBudgetMin,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load screening progress";
    return { ok: false, error: errorCode(message) };
  }
}

export async function getJobResults(
  jobId: string,
): Promise<ActionResult<JobResults>> {
  await requireRole("viewer");
  const parsed = screeningJobIdSchema.safeParse({ jobId });
  if (!parsed.success) {
    return { ok: false, error: errorCode("Invalid job") };
  }

  try {
    const job = await prisma.job.findUnique({
      where: { id: parsed.data.jobId },
      include: {
        cvs: {
          select: {
            id: true,
            fileName: true,
            parseStatus: true,
            extractionJson: true,
            scoreJson: true,
            totalScore: true,
            stageStatus: true,
            error: true,
            passAScore: true,
            rawText: true,
          },
        },
      },
    });

    if (!job) {
      return { ok: false, error: errorCode("Screening job not found") };
    }

    const rubric = parseRubric(JSON.parse(job.rubricJson));
    const parsedCvs = job.cvs.filter((cv) => cv.parseStatus === "parsed");
    const ranked = rankJobCandidates(parsedCvs, rubric);
    const unparsed = job.cvs
      .filter(
        (cv) =>
          cv.parseStatus === "needs_ocr" ||
          cv.parseStatus === "error" ||
          cv.stageStatus === "failed",
      )
      .map((cv) => ({
        id: cv.id,
        fileName: cv.fileName,
        parseStatus: parseParseStatus(cv.parseStatus),
        stageStatus: stageStatusSchema.parse(cv.stageStatus),
        error: cv.error,
      }));
    const notScreened = job.cvs
      .filter((cv) => cv.stageStatus === "not_screened_time_budget")
      .map((cv) => ({
        id: cv.id,
        fileName: cv.fileName,
        parseStatus: parseParseStatus(cv.parseStatus),
        stageStatus: stageStatusSchema.parse(cv.stageStatus),
        error: cv.error,
      }));

    return {
      ok: true,
      data: {
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
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load screening results";
    return { ok: false, error: errorCode(message) };
  }
}

export async function getCvDetail(
  input: ScreeningCvIdInput,
): Promise<ActionResult<CvDetail>> {
  await requireRole("viewer");
  const parsed = screeningCvIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: errorCode("Invalid request") };
  }

  try {
    const cv = await prisma.cv.findFirst({
      where: { id: parsed.data.cvId, jobId: parsed.data.jobId },
    });

    if (!cv) {
      return { ok: false, error: errorCode("CV not found") };
    }

    const job = await prisma.job.findUnique({
      where: { id: cv.jobId },
      select: { rubricJson: true },
    });
    const rubric = job ? parseRubric(JSON.parse(job.rubricJson)) : null;
    const parsedCandidate = parseCandidateJson(cv.extractionJson);
    const labeledNationality = extractNationality(cv.rawText);
    const candidate =
      parsedCandidate &&
      labeledNationality &&
      (parsedCandidate.nationality == null ||
        parsedCandidate.nationality.trim().length === 0)
        ? { ...parsedCandidate, nationality: labeledNationality }
        : parsedCandidate;
    const score = parseScoreJson(cv.scoreJson);
    const derived =
      cv.totalScore === null || !rubric
        ? null
        : computeDerivedFields(cv.totalScore, rubric);

    return {
      ok: true,
      data: {
        id: cv.id,
        jobId: cv.jobId,
        fileName: cv.fileName,
        parseStatus: parseParseStatus(cv.parseStatus),
        stageStatus: stageStatusSchema.parse(cv.stageStatus),
        totalScore: cv.totalScore,
        recommendation: derived?.recommendation ?? null,
        suggestedSalary: derived?.suggestedSalary ?? null,
        error: cv.error,
        hasFile: fileExists(cv.filePath),
        candidate,
        score,
        rawText: cv.rawText,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load this CV";
    return { ok: false, error: errorCode(message) };
  }
}

export async function rerankJob(
  input: RerankInput,
): Promise<ActionResult<JobResults>> {
  await requireRole("hr_reviewer");
  const parsed = rerankSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: errorCode(parsed.error.issues[0]?.message ?? "Invalid weights") };
  }

  try {
    const job = await prisma.job.findUnique({
      where: { id: parsed.data.jobId },
      include: {
        cvs: {
          where: { parseStatus: "parsed", stageStatus: "scored" },
          select: {
            id: true,
            scoreJson: true,
          },
        },
      },
    });

    if (!job) {
      return { ok: false, error: errorCode("Screening job not found") };
    }

    const rubric = parseRubric(JSON.parse(job.rubricJson));
    const nextRubric = { ...rubric, weights: parsed.data.weights };

    await prisma.job.update({
      where: { id: job.id },
      data: { rubricJson: JSON.stringify(nextRubric) },
    });

    await Promise.all(
      job.cvs.map(async (cv) => {
        const score = parseScoreJson(cv.scoreJson);
        if (!score) {
          return;
        }
        await prisma.cv.update({
          where: { id: cv.id },
          data: { totalScore: computeTotalScore(score, nextRubric.weights) },
        });
      }),
    );

    revalidateJob(job.id);
    return getJobResults(job.id);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to re-rank candidates";
    return { ok: false, error: errorCode(message) };
  }
}

export async function cloneJobWithCvs(
  input: CloneJobInput,
): Promise<ActionResult<{ id: string }>> {
  await requireRole("hr_reviewer");
  const parsed = cloneJobSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: errorCode(parsed.error.issues[0]?.message ?? "Invalid request") };
  }

  try {
    const source = await prisma.job.findUnique({
      where: { id: parsed.data.sourceJobId },
      include: { cvs: true },
    });
    if (!source) {
      return { ok: false, error: errorCode("Source screening job not found") };
    }

    const job = await prisma.job.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        rubricJson: JSON.stringify(parseRubric(parsed.data.rubric)),
        status: source.cvs.some((cv) => cv.parseStatus === "parsed")
          ? "queued"
          : "draft",
        twoPass: source.twoPass,
        turboMode: source.turboMode,
        turboSettingsJson: source.turboSettingsJson,
        cvs: {
          create: source.cvs.map((cv) => ({
            fileName: cv.fileName,
            filePath: cv.filePath,
            contentHash: cv.contentHash,
            rawText: cv.rawText,
            pagesJson: cv.pagesJson,
            anonymizedText: cv.anonymizedText,
            contactJson: cv.contactJson,
            parseStatus: cv.parseStatus,
            extractionJson: cv.extractionJson,
            scoreJson: null,
            turboJson: null,
            passAScore: cv.passAScore,
            totalScore: null,
            stageStatus:
              cv.parseStatus === "parsed" && cv.extractionJson
                ? "extracted"
                : "pending",
            error: cv.parseStatus === "parsed" ? null : cv.error,
          })),
        },
      },
      select: { id: true },
    });

    revalidatePath("/[locale]", "page");
    revalidateJob(job.id);
    return { ok: true, data: { id: job.id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to clone this screening job";
    return { ok: false, error: errorCode(message) };
  }
}
