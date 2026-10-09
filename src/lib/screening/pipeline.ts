import { prisma } from "@/db/client";
import {
  AUTO_CONCURRENCY_CANDIDATES,
  AUTO_TUNE_CV_COUNT,
  llmConfig,
} from "@/lib/llm/config";
import { extractCandidate } from "@/lib/llm/extract";
import { scoreCandidate } from "@/lib/llm/score";
import { unloadOtherModels } from "@/lib/llm/pin-model";
import { turboScreenCv } from "@/lib/llm/turbo";
import { computeTotalScore, rankCandidates } from "@/lib/ranking/rank";
import { parseRubric, type Rubric } from "@/lib/schemas/rubric";
import {
  contactJsonSchema,
  parseTurboSettings,
  type ContactJson,
  type TurboSettings,
} from "@/lib/schemas/turbo";
import { parseCandidateJson } from "@/lib/screening/parse";
import { computePassAScore, orderByPassA } from "@/lib/screening/pass-a";
import {
  PASS_A_CAP_ERROR,
  TIME_BUDGET_ERROR,
  TIME_BUDGET_STAGE,
  TURBO_FAIL_PREFIX,
  cvsPerMinute,
  deadlineFrom,
  isPastDeadline,
  isResumableTurboError,
  pickBestConcurrency,
  tokensPerSecond,
  type ConcurrencySample,
} from "@/lib/screening/scheduler";
import {
  attachContact,
  dampenTurboResult,
  turboToCandidate,
  turboToScoreResult,
} from "@/lib/screening/turbo-map";
import { arabicNarrative } from "@/lib/screening/arabic-templates";
import pLimit from "p-limit";

async function isCancelled(jobId: string): Promise<boolean> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { status: true },
  });
  return job?.status === "cancelled";
}

function parseContact(raw: string | null | undefined): ContactJson {
  try {
    return contactJsonSchema.parse(JSON.parse(raw || "{}"));
  } catch {
    return { fullName: null, phone: null, email: null, linkedin: null };
  }
}

export async function extractOneCv(cvId: string, model: string): Promise<void> {
  const cv = await prisma.cv.findUnique({ where: { id: cvId } });
  if (!cv || cv.parseStatus !== "parsed") {
    return;
  }
  if (await isCancelled(cv.jobId)) {
    return;
  }

  try {
    const extracted = await extractCandidate(model, {
      rawText: cv.rawText,
      anonymizedText: cv.anonymizedText,
      pagesJson: cv.pagesJson,
    });
    await prisma.cv.update({
      where: { id: cv.id },
      data: {
        extractionJson: JSON.stringify(extracted),
        stageStatus: "extracted",
        error: null,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Extraction failed";
    await prisma.cv.update({
      where: { id: cv.id },
      data: { stageStatus: "failed", error: message },
    });
  }
}

export async function scoreOneCv(
  cvId: string,
  rubric: Rubric,
  model: string,
): Promise<void> {
  const cv = await prisma.cv.findUnique({ where: { id: cvId } });
  if (!cv || cv.parseStatus !== "parsed") {
    return;
  }
  if (await isCancelled(cv.jobId)) {
    return;
  }

  const candidate = parseCandidateJson(cv.extractionJson);
  if (!candidate) {
    await prisma.cv.update({
      where: { id: cv.id },
      data: {
        stageStatus: "failed",
        error: "Missing extracted candidate data",
      },
    });
    return;
  }

  try {
    const score = await scoreCandidate(model, candidate, rubric);
    await prisma.cv.update({
      where: { id: cv.id },
      data: {
        scoreJson: JSON.stringify(score),
        totalScore: computeTotalScore(score, rubric.weights),
        stageStatus: "scored",
        error: null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scoring failed";
    await prisma.cv.update({
      where: { id: cv.id },
      data: { stageStatus: "failed", error: message },
    });
  }
}

export async function processJob(jobId: string): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    return;
  }

  if (job.status === "queued") {
    const claimed = await prisma.job.updateMany({
      where: { id: jobId, status: "queued" },
      data: { status: "running" },
    });
    if (claimed.count === 0) {
      return;
    }
  } else if (job.status !== "running") {
    return;
  }

  if (await isCancelled(jobId)) {
    return;
  }

  if (job.turboMode) {
    await processTurboJob(jobId);
    return;
  }

  await processLegacyJob(jobId);
}

async function processLegacyJob(jobId: string): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || (await isCancelled(jobId))) {
    return;
  }

  const rubric = parseRubric(JSON.parse(job.rubricJson));
  const limit = pLimit(llmConfig.concurrency);

  const pendingExtract = await prisma.cv.findMany({
    where: { jobId, parseStatus: "parsed", stageStatus: "pending" },
    select: { id: true },
  });

  await Promise.all(
    pendingExtract.map((cv) =>
      limit(async () => {
        if (await isCancelled(jobId)) {
          return;
        }
        await extractOneCv(cv.id, llmConfig.extractModel);
      }),
    ),
  );

  if (await isCancelled(jobId)) {
    return;
  }

  const pendingScore = await prisma.cv.findMany({
    where: { jobId, parseStatus: "parsed", stageStatus: "extracted" },
    select: { id: true },
  });

  const firstPassModel = job.twoPass ? llmConfig.extractModel : llmConfig.scoreModel;
  await Promise.all(
    pendingScore.map((cv) =>
      limit(async () => {
        if (await isCancelled(jobId)) {
          return;
        }
        await scoreOneCv(cv.id, rubric, firstPassModel);
      }),
    ),
  );

  if (await isCancelled(jobId)) {
    return;
  }

  if (job.twoPass) {
    const scored = await prisma.cv.findMany({
      where: { jobId, parseStatus: "parsed", stageStatus: "scored" },
      select: { id: true, totalScore: true },
    });
    const top40 = rankCandidates(scored).slice(0, 40);
    await Promise.all(
      top40.map((cv) =>
        limit(async () => {
          if (await isCancelled(jobId)) {
            return;
          }
          await scoreOneCv(cv.id, rubric, llmConfig.scoreModel);
        }),
      ),
    );
  }

  if (await isCancelled(jobId)) {
    return;
  }

  await prisma.job.updateMany({
    where: { id: jobId, status: "running" },
    data: { status: "done" },
  });
}

async function processTurboJob(jobId: string): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || (await isCancelled(jobId))) {
    return;
  }

  const rubric = parseRubric(JSON.parse(job.rubricJson));
  const settings = parseTurboSettings(job.turboSettingsJson);
  await unloadOtherModels(settings.bulkModel);
  const startedAt = job.screeningStartedAt ?? new Date();
  const deadline = job.deadlineAt ?? deadlineFrom(startedAt, settings.timeBudgetMin);

  if (!job.screeningStartedAt || !job.deadlineAt) {
    await prisma.job.update({
      where: { id: jobId },
      data: { screeningStartedAt: startedAt, deadlineAt: deadline },
    });
  }

  await runPassA(jobId, job.description, rubric);

  const queue = await loadTurboQueue(jobId, settings);
  if (queue.length === 0) {
    await maybeEnrich(jobId, rubric, settings);
    await finishIfRunning(jobId);
    return;
  }

  const locked =
    job.lockedConcurrency ??
    (typeof settings.concurrency === "number" ? settings.concurrency : null);

  let remaining = queue;
  let concurrency = locked ?? 4;
  let processed = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  const runStarted = Date.now();

  // Auto-tune only when the user picks Auto. Fast mode locks concurrency 2.
  if (locked == null && settings.concurrency === "auto" && remaining.length >= 8) {
    const tuned = await autoTune(
      jobId,
      remaining.slice(0, AUTO_TUNE_CV_COUNT),
      rubric,
      settings,
      deadline,
    );
    concurrency = tuned.concurrency;
    processed += tuned.processed;
    promptTokens += tuned.promptTokens;
    completionTokens += tuned.completionTokens;
    remaining = remaining.slice(tuned.processed);
    await prisma.job.update({
      where: { id: jobId },
      data: { lockedConcurrency: concurrency },
    });
  } else if (locked == null && typeof settings.concurrency === "number") {
    concurrency = settings.concurrency;
    await prisma.job.update({
      where: { id: jobId },
      data: { lockedConcurrency: concurrency },
    });
  }

  const stopped = await screenBatch(
    jobId,
    remaining,
    concurrency,
    rubric,
    settings,
    deadline,
    async (batchProcessed, batchPrompt, batchCompletion) => {
      const elapsed = Date.now() - runStarted;
      await prisma.job.update({
        where: { id: jobId },
        data: {
          cvsPerMinute: cvsPerMinute(processed + batchProcessed, elapsed),
          tokensPerSecond: tokensPerSecond(
            promptTokens + batchPrompt,
            completionTokens + batchCompletion,
            elapsed,
          ),
        },
      });
    },
  );
  processed += stopped.processed;
  promptTokens += stopped.promptTokens;
  completionTokens += stopped.completionTokens;

  const elapsed = Date.now() - runStarted;
  await prisma.job.update({
    where: { id: jobId },
    data: {
      cvsPerMinute: cvsPerMinute(processed, elapsed),
      tokensPerSecond: tokensPerSecond(promptTokens, completionTokens, elapsed),
    },
  });

  if (await isCancelled(jobId)) {
    return;
  }

  if (!stopped.hitDeadline) {
    await maybeEnrich(jobId, rubric, settings);
  }

  await finishIfRunning(jobId);
}

async function runPassA(
  jobId: string,
  jobDescription: string,
  rubric: Rubric,
): Promise<void> {
  const cvs = await prisma.cv.findMany({
    where: { jobId, parseStatus: "parsed", passAScore: null },
    select: { id: true, anonymizedText: true },
  });
  for (const cv of cvs) {
    const score = computePassAScore({
      anonymizedText: cv.anonymizedText,
      jobDescription,
      rubric,
    });
    await prisma.cv.update({
      where: { id: cv.id },
      data: { passAScore: score },
    });
  }
}

async function loadTurboQueue(jobId: string, settings: TurboSettings) {
  const parsed = await prisma.cv.findMany({
    where: { jobId, parseStatus: "parsed" },
    select: {
      id: true,
      passAScore: true,
      stageStatus: true,
      error: true,
    },
  });
  const ordered = orderByPassA(parsed);
  const cap = settings.passACap > 0 ? settings.passACap : ordered.length;
  const inside = ordered.slice(0, cap);
  const outside = ordered.slice(cap);

  for (const cv of outside) {
    if (cv.stageStatus === "pending" || cv.stageStatus === TIME_BUDGET_STAGE) {
      await prisma.cv.update({
        where: { id: cv.id },
        data: {
          stageStatus: TIME_BUDGET_STAGE,
          error: PASS_A_CAP_ERROR,
        },
      });
    }
  }

  return inside.filter(
    (cv) =>
      cv.stageStatus === "pending" ||
      (cv.stageStatus === TIME_BUDGET_STAGE && isResumableTurboError(cv.error)),
  );
}

async function autoTune(
  jobId: string,
  cvs: Array<{ id: string }>,
  rubric: Rubric,
  settings: TurboSettings,
  deadline: Date,
): Promise<{
  concurrency: number;
  processed: number;
  promptTokens: number;
  completionTokens: number;
}> {
  const per = Math.max(1, Math.floor(cvs.length / AUTO_CONCURRENCY_CANDIDATES.length));
  const samples: ConcurrencySample[] = [];
  let offset = 0;
  let processed = 0;
  let promptTokens = 0;
  let completionTokens = 0;

  for (const concurrency of AUTO_CONCURRENCY_CANDIDATES) {
    const slice = cvs.slice(offset, offset + per);
    offset += per;
    if (slice.length === 0) {
      break;
    }
    const started = Date.now();
    const result = await screenBatch(
      jobId,
      slice,
      concurrency,
      rubric,
      settings,
      deadline,
    );
    samples.push({
      concurrency,
      cvCount: result.processed,
      elapsedMs: Math.max(1, Date.now() - started),
    });
    processed += result.processed;
    promptTokens += result.promptTokens;
    completionTokens += result.completionTokens;
    if (result.hitDeadline) {
      break;
    }
  }

  return {
    concurrency: pickBestConcurrency(samples),
    processed,
    promptTokens,
    completionTokens,
  };
}

async function screenBatch(
  jobId: string,
  cvs: Array<{ id: string }>,
  concurrency: number,
  rubric: Rubric,
  settings: TurboSettings,
  deadline: Date,
  onProgress?: (
    processed: number,
    promptTokens: number,
    completionTokens: number,
  ) => Promise<void>,
): Promise<{
  processed: number;
  promptTokens: number;
  completionTokens: number;
  hitDeadline: boolean;
}> {
  const limit = pLimit(concurrency);
  let processed = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  let hitDeadline = false;

  await Promise.all(
    cvs.map((item) =>
      limit(async () => {
        if (await isCancelled(jobId)) {
          return;
        }
        if (isPastDeadline(new Date(), deadline)) {
          hitDeadline = true;
          await prisma.cv.update({
            where: { id: item.id },
            data: {
              stageStatus: TIME_BUDGET_STAGE,
              error: TIME_BUDGET_ERROR,
            },
          });
          return;
        }

        const result = await turboOne(item.id, rubric, settings);
        if (result) {
          processed += 1;
          promptTokens += result.promptTokens;
          completionTokens += result.completionTokens;
          if (onProgress) {
            await onProgress(processed, promptTokens, completionTokens);
          }
        }
      }),
    ),
  );

  if (hitDeadline) {
    const leftover = await prisma.cv.findMany({
      where: {
        jobId,
        parseStatus: "parsed",
        stageStatus: "pending",
      },
      select: { id: true },
    });
    for (const cv of leftover) {
      await prisma.cv.update({
        where: { id: cv.id },
        data: {
          stageStatus: TIME_BUDGET_STAGE,
          error: TIME_BUDGET_ERROR,
        },
      });
    }
  }

  return { processed, promptTokens, completionTokens, hitDeadline };
}

async function turboOne(
  cvId: string,
  rubric: Rubric,
  settings: TurboSettings,
): Promise<{ promptTokens: number; completionTokens: number } | null> {
  const cv = await prisma.cv.findUnique({ where: { id: cvId } });
  if (!cv || cv.parseStatus !== "parsed") {
    return null;
  }
  if (cv.stageStatus === "scored") {
    return null;
  }
  if (await isCancelled(cv.jobId)) {
    return null;
  }

  try {
    const screened = await turboScreenCv({
      model: settings.bulkModel,
      rubric,
      anonymizedText: cv.anonymizedText,
      truncateChars: settings.truncateChars,
    });
    const damped = dampenTurboResult(screened.result, rubric);
    const score = turboToScoreResult(damped);
    const totalScore = computeTotalScore(score, rubric.weights);
    score.recommendationNarrative = arabicNarrative({
      totalScore,
      strengths: damped.strengths,
      gaps: damped.gaps,
    });
    const contact = parseContact(cv.contactJson);
    const candidate = attachContact(
      turboToCandidate(damped, contact),
      contact,
    );

    await prisma.cv.update({
      where: { id: cv.id },
      data: {
        turboJson: JSON.stringify(damped),
        extractionJson: JSON.stringify(candidate),
        scoreJson: JSON.stringify(score),
        totalScore,
        promptTokens: screened.promptTokens,
        completionTokens: screened.completionTokens,
        stageStatus: "scored",
        error: null,
      },
    });
    return {
      promptTokens: screened.promptTokens,
      completionTokens: screened.completionTokens,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Turbo screening failed";
    await prisma.cv.update({
      where: { id: cv.id },
      data: {
        stageStatus: TIME_BUDGET_STAGE,
        error: `${TURBO_FAIL_PREFIX}${message}`,
      },
    });
    return null;
  }
}

async function maybeEnrich(
  jobId: string,
  rubric: Rubric,
  settings: TurboSettings,
): Promise<void> {
  if (settings.enrichCount <= 0) {
    return;
  }
  const scored = await prisma.cv.findMany({
    where: { jobId, parseStatus: "parsed", stageStatus: "scored" },
    select: { id: true, totalScore: true },
  });
  const top = rankCandidates(scored).slice(0, settings.enrichCount);
  const limit = pLimit(3);
  await Promise.all(
    top.map((cv) =>
      limit(async () => {
        if (await isCancelled(jobId)) {
          return;
        }
        await extractOneCv(cv.id, settings.bulkModel);
        await scoreOneCv(cv.id, rubric, settings.bulkModel);
      }),
    ),
  );
}

async function finishIfRunning(jobId: string): Promise<void> {
  if (await isCancelled(jobId)) {
    return;
  }
  await prisma.job.updateMany({
    where: { id: jobId, status: "running" },
    data: { status: "done" },
  });
}
