"use server";
import { rm } from "node:fs/promises";
import path from "node:path";
import { requireRole } from "@/lib/auth/server";
import { errorCode } from "@/i18n/errors";

import { revalidatePath } from "next/cache";
import { prisma } from "@/db/client";
import type { ActionResult } from "@/lib/schemas/action";
import { deleteJobsSchema } from "@/lib/schemas/screening";
import { displayJobStatus, type JobStatus } from "@/lib/schemas/job";
import { parseRubric, type Rubric } from "@/lib/schemas/rubric";
import { UPLOAD_ROOT, uploadDirForJob } from "@/lib/parsing/files";

export type JobListItem = {
  id: string;
  title: string;
  status: JobStatus;
  twoPass: boolean;
  createdAt: string;
  cvCount: number;
};

export type JobDetail = {
  id: string;
  title: string;
  description: string;
  status: JobStatus;
  twoPass: boolean;
  createdAt: string;
  rubric: Rubric | null;
  cvCount: number;
};

export async function deleteJobs(
  jobIds: string[],
): Promise<ActionResult<{ deletedIds: string[]; cleanupFailedIds: string[] }>> {
  await requireRole("hr_reviewer");
  const parsed = deleteJobsSchema.safeParse(jobIds);
  if (!parsed.success) {
    return { ok: false, error: errorCode("INVALID_INPUT") };
  }

  try {
    const deletion = await prisma.$transaction(async (tx) => {
      const jobs = await tx.job.findMany({
        where: { id: { in: parsed.data } },
        select: {
          id: true,
          status: true,
          cvs: { select: { id: true } },
        },
      });

      if (jobs.length !== parsed.data.length) {
        return { error: "JOB_NOT_FOUND" as const };
      }
      if (jobs.some((job) => job.status === "queued" || job.status === "running")) {
        return { error: "DELETE_ACTIVE_JOBS" as const };
      }

      const cvIds = jobs.flatMap((job) => job.cvs.map((cv) => cv.id));
      for (let index = 0; index < cvIds.length; index += 500) {
        await tx.workflowTask.deleteMany({
          where: { cvId: { in: cvIds.slice(index, index + 500) } },
        });
      }

      const result = await tx.job.deleteMany({
        where: {
          id: { in: parsed.data },
          status: { notIn: ["queued", "running"] },
        },
      });
      if (result.count !== parsed.data.length) {
        throw new Error("Could not delete all selected screening jobs");
      }

      return { deletedIds: jobs.map((job) => job.id) };
    });

    if (deletion.error) {
      return { ok: false, error: errorCode(deletion.error) };
    }

    const cleanupFailedIds: string[] = [];
    for (const jobId of deletion.deletedIds) {
      const uploadDirectory = path.resolve(uploadDirForJob(jobId));
      if (path.dirname(uploadDirectory) !== UPLOAD_ROOT) {
        throw new Error("Refusing to remove an upload directory outside the upload root");
      }
      try {
        await rm(uploadDirectory, { recursive: true, force: true });
      } catch (error) {
        console.error(`Could not clean uploaded files for deleted job ${jobId}`, error);
        cleanupFailedIds.push(jobId);
      }
    }

    revalidatePath("/[locale]", "page");
    for (const locale of ["en", "ar"]) {
      revalidatePath(`/${locale}/jobs`, "page");
    }

    return { ok: true, data: { deletedIds: deletion.deletedIds, cleanupFailedIds } };
  } catch (error) {
    console.error("Could not delete screening jobs", error);
    return { ok: false, error: errorCode("UNKNOWN") };
  }
}

export async function getJob(id: string): Promise<ActionResult<JobDetail>> {
  await requireRole("viewer");
  try {
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        _count: { select: { cvs: true } },
        cvs: {
          where: { stageStatus: "not_screened_time_budget" },
          select: { id: true },
        },
      },
    });

    if (!job) {
      return { ok: false, error: errorCode("Screening job not found") };
    }

    let rubric: Rubric | null = null;
    if (job.rubricJson) {
      try {
        rubric = parseRubric(JSON.parse(job.rubricJson));
      } catch {
        rubric = null;
      }
    }

    return {
      ok: true,
      data: {
        id: job.id,
        title: job.title,
        description: job.description,
        status: displayJobStatus(job.status, job.cvs.length),
        twoPass: job.twoPass,
        createdAt: job.createdAt.toISOString(),
        rubric,
        cvCount: job._count.cvs,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load this screening job";
    return { ok: false, error: errorCode(message) };
  }
}

export async function listJobs(): Promise<ActionResult<JobListItem[]>> {
  await requireRole("viewer");
  try {
    const jobs = await prisma.job.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        twoPass: true,
        createdAt: true,
        _count: { select: { cvs: true } },
        cvs: {
          where: { stageStatus: "not_screened_time_budget" },
          select: { id: true },
        },
      },
    });

    return {
      ok: true,
      data: jobs.map((job) => ({
        id: job.id,
        title: job.title,
        status: displayJobStatus(job.status, job.cvs.length),
        twoPass: job.twoPass,
        createdAt: job.createdAt.toISOString(),
        cvCount: job._count.cvs,
      })),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load screening jobs";
    return { ok: false, error: errorCode(message) };
  }
}
