import { z } from "zod";
import { parseStatusSchema } from "@/lib/schemas/job";

export const uploadJobIdSchema = z.object({
  jobId: z.string().min(1),
});

export const startScreeningSchema = z.object({
  jobId: z.string().min(1),
  twoPass: z.boolean(),
  turboMode: z.boolean(),
  timeBudgetMin: z.number().int().min(5).max(240),
  passACap: z.number().int().min(0),
  concurrency: z.enum(["auto", "2", "3", "4", "6"]),
  enrichCount: z.number().int().min(0).max(40),
  bulkModel: z.string().min(1),
});

export const cvListItemSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  parseStatus: parseStatusSchema,
  error: z.string().nullable(),
});

export type StartScreeningInput = z.infer<typeof startScreeningSchema>;
export type CvListItem = z.infer<typeof cvListItemSchema>;
export type UploadParseResult = {
  cvs: CvListItem[];
  skipped: number;
};
