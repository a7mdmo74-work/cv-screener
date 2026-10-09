"use server";

import { prisma } from "@/db/client";
import type { ActionResult } from "@/lib/schemas/action";
import { displayJobStatus, type JobStatus } from "@/lib/schemas/job";
import { parseRubric, type Rubric } from "@/lib/schemas/rubric";

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

export async function getJob(id: string): Promise<ActionResult<JobDetail>> {
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
      return { ok: false, error: "Screening job not found" };
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
    return { ok: false, error: message };
  }
}

export async function listJobs(): Promise<ActionResult<JobListItem[]>> {
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
    return { ok: false, error: message };
  }
}
