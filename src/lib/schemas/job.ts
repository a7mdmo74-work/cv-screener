import { z } from "zod";

export const jobStatusSchema = z.enum([
  "draft",
  "queued",
  "running",
  "done",
  "partial",
  "cancelled",
  "failed",
]);

const storedJobStatusSchema = z.enum([
  "draft",
  "queued",
  "running",
  "done",
  "cancelled",
  "failed",
]);

export function displayJobStatus(status: string, notScreened = 0): JobStatus {
  const parsed = storedJobStatusSchema.parse(status);
  if (parsed === "done" && notScreened > 0) {
    return "partial";
  }
  return parsed;
}

export const parseStatusSchema = z.enum([
  "pending",
  "parsed",
  "needs_ocr",
  "error",
]);

export const stageStatusSchema = z.enum([
  "pending",
  "extracted",
  "scored",
  "failed",
  "not_screened_time_budget",
]);

export type JobStatus = z.infer<typeof jobStatusSchema>;
export type ParseStatus = z.infer<typeof parseStatusSchema>;
export type StageStatus = z.infer<typeof stageStatusSchema>;
