import { prisma } from "@/db/client";
import { processJob } from "@/lib/screening/pipeline";

const POLL_MS = 2_000;

class JobCancelledError extends Error {
  constructor(jobId: string) {
    super(`job cancelled ${jobId}`);
    this.name = "JobCancelledError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function untilCancelled(jobId: string): Promise<never> {
  for (;;) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { status: true },
    });
    if (!job || job.status === "cancelled") {
      throw new JobCancelledError(jobId);
    }
    await sleep(500);
  }
}

async function claimNextJobId(): Promise<string | null> {
  const running = await prisma.job.findFirst({
    where: { status: "running" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (running) {
    return running.id;
  }

  const queued = await prisma.job.findFirst({
    where: { status: "queued" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return queued?.id ?? null;
}

async function runOnce(): Promise<void> {
  const jobId = await claimNextJobId();
  if (!jobId) {
    return;
  }

  console.log(`[worker] processing ${jobId}`);
  try {
    await Promise.race([processJob(jobId), untilCancelled(jobId)]);
    console.log(`[worker] finished ${jobId}`);
  } catch (error) {
    if (error instanceof JobCancelledError) {
      console.log(`[worker] abandoned cancelled job ${jobId}`);
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[worker] failed ${jobId}: ${message}`);
    await prisma.job.updateMany({
      where: { id: jobId, status: { in: ["queued", "running"] } },
      data: { status: "failed" },
    });
  }
}

async function main(): Promise<void> {
  console.log("[worker] watching for queued screening jobs");
  for (;;) {
    try {
      await runOnce();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[worker] loop error: ${message}`);
    }
    await sleep(POLL_MS);
  }
}

void main();
