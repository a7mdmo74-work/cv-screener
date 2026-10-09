"use server";
import { requireRole } from "@/lib/auth/server";
import { errorCode } from "@/i18n/errors";

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/db/client";
import { anonymizeCvText } from "@/lib/parsing/anonymize";
import { hashFileBytes } from "@/lib/parsing/content-hash";
import { extractContactFields } from "@/lib/parsing/contact";
import { extractCvDocument } from "@/lib/parsing/extract";
import {
  ensureUploadDir,
  isAllowedCvFile,
  isNearlyEmpty,
  MAX_FILE_BYTES,
  MAX_UPLOAD_FILES,
  MAX_ZIP_BYTES,
  uniqueFileName,
} from "@/lib/parsing/files";
import { extractCvsFromZip, isZipFile } from "@/lib/parsing/zip";
import type { ActionResult } from "@/lib/schemas/action";
import { parseStatusSchema, type ParseStatus } from "@/lib/schemas/job";
import {
  uploadJobIdSchema,
  type CvListItem,
  type UploadParseResult,
} from "@/lib/schemas/upload";

function toCvListItem(cv: {
  id: string;
  fileName: string;
  parseStatus: string;
  error: string | null;
}): CvListItem {
  return {
    id: cv.id,
    fileName: cv.fileName,
    parseStatus: parseStatusSchema.parse(cv.parseStatus),
    error: cv.error,
  };
}

export async function listCvs(
  jobId: string,
): Promise<ActionResult<CvListItem[]>> {
  await requireRole("viewer");
  const parsed = uploadJobIdSchema.safeParse({ jobId });
  if (!parsed.success) {
    return { ok: false, error: errorCode("Invalid job") };
  }

  try {
    const job = await prisma.job.findUnique({
      where: { id: parsed.data.jobId },
      select: { id: true },
    });
    if (!job) {
      return { ok: false, error: errorCode("Screening job not found") };
    }

    const cvs = await prisma.cv.findMany({
      where: { jobId: parsed.data.jobId },
      orderBy: { fileName: "asc" },
      select: {
        id: true,
        fileName: true,
        parseStatus: true,
        error: true,
      },
    });

    return { ok: true, data: cvs.map(toCvListItem) };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load uploaded CVs";
    return { ok: false, error: errorCode(message) };
  }
}

export async function uploadAndParseCvs(
  formData: FormData,
): Promise<ActionResult<UploadParseResult>> {
  await requireRole("hr_reviewer");
  const parsed = uploadJobIdSchema.safeParse({
    jobId: formData.get("jobId"),
  });
  if (!parsed.success) {
    return { ok: false, error: errorCode("Invalid job") };
  }

  const jobId = parsed.data.jobId;
  const files = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (files.length === 0) {
    return { ok: false, error: errorCode("Choose at least one PDF, DOCX, or ZIP file") };
  }

  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, status: true, _count: { select: { cvs: true } } },
    });

    if (!job) {
      return { ok: false, error: errorCode("Screening job not found") };
    }

    if (job.status !== "draft") {
      return { ok: false, error: errorCode("CVs can only be added while the job is a draft") };
    }

    const remaining = MAX_UPLOAD_FILES - job._count.cvs;
    if (remaining <= 0) {
      return {
        ok: false,
        error: "UPLOAD_LIMIT", errorParams: { max: MAX_UPLOAD_FILES },
      };
    }

    const directory = await ensureUploadDir(jobId);
    const created: CvListItem[] = [];
    const incoming: Array<
      | { fileName: string; bytes: Buffer }
      | { fileName: string; error: string }
    > = [];

    for (const file of files) {
      const originalName = file.name || "cv";
      const zip =
        isZipFile(originalName) ||
        file.type === "application/zip" ||
        file.type === "application/x-zip-compressed";

      if (zip) {
        if (file.size > MAX_ZIP_BYTES) {
          incoming.push({
            fileName: originalName,
            error: "ZIP files can be up to 500 MB",
          });
          continue;
        }

        const bytes = Buffer.from(await file.arrayBuffer());
        try {
          const extracted = extractCvsFromZip(bytes);
          if (extracted.length === 0) {
            incoming.push({
              fileName: originalName,
              error: "ZIP did not contain any PDF or DOCX CVs",
            });
            continue;
          }
          incoming.push(...extracted);
        } catch {
          incoming.push({
            fileName: originalName,
            error: "Could not read this ZIP file",
          });
        }
        continue;
      }

      if (!isAllowedCvFile(originalName)) {
        incoming.push({
          fileName: originalName,
          error: "Only PDF, DOCX, and ZIP files are supported",
        });
        continue;
      }

      if (file.size > MAX_FILE_BYTES) {
        incoming.push({
          fileName: originalName,
          error: "File is larger than 15 MB",
        });
        continue;
      }

      incoming.push({
        fileName: originalName,
        bytes: Buffer.from(await file.arrayBuffer()),
      });
    }

    const accepted = incoming.slice(0, remaining);
    const skipped = incoming.length - accepted.length;

    for (const [index, item] of accepted.entries()) {
      if ("error" in item) {
        created.push(
          await persistCv({
            jobId,
            fileName: item.fileName,
            filePath: "",
            parseStatus: "error",
            error: item.error,
          }),
        );
        continue;
      }

      const storedName = uniqueFileName(item.fileName, index);
      const filePath = path.join(directory, storedName);
      await writeFile(filePath, item.bytes);
      const contentHash = hashFileBytes(item.bytes);

      const cached = await prisma.cv.findFirst({
        where: { contentHash, parseStatus: "parsed" },
        select: {
          rawText: true,
          pagesJson: true,
          anonymizedText: true,
          contactJson: true,
        },
      });

      try {
        if (cached) {
          created.push(
            await persistCv({
              jobId,
              fileName: item.fileName,
              filePath,
              contentHash,
              rawText: cached.rawText,
              pages: JSON.parse(cached.pagesJson) as string[],
              anonymizedText: cached.anonymizedText,
              contactJson: cached.contactJson,
              parseStatus: "parsed",
            }),
          );
          continue;
        }

        const document = await extractCvDocument(item.fileName, item.bytes);
        if (isNearlyEmpty(document.rawText)) {
          created.push(
            await persistCv({
              jobId,
              fileName: item.fileName,
              filePath,
              contentHash,
              rawText: document.rawText,
              pages: document.pages,
              parseStatus: "needs_ocr",
              error: "Extracted text was nearly empty; this CV needs OCR",
            }),
          );
          continue;
        }

        const contact = extractContactFields(document.rawText, item.fileName);
        created.push(
          await persistCv({
            jobId,
            fileName: item.fileName,
            filePath,
            contentHash,
            rawText: document.rawText,
            pages: document.pages,
            anonymizedText: anonymizeCvText(document.rawText),
            contactJson: JSON.stringify(contact),
            parseStatus: "parsed",
          }),
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to parse this file";
        created.push(
          await persistCv({
            jobId,
            fileName: item.fileName,
            filePath,
            parseStatus: "error",
            error: message,
          }),
        );
      }
    }

    revalidatePath("/[locale]/jobs/[id]", "page");
    revalidatePath("/[locale]/jobs/[id]/upload", "page");
    return { ok: true, data: { cvs: created, skipped } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to upload CVs";
    return { ok: false, error: errorCode(message) };
  }
}

async function persistCv(input: {
  jobId: string;
  fileName: string;
  filePath: string;
  contentHash?: string;
  rawText?: string;
  pages?: string[];
  anonymizedText?: string;
  contactJson?: string;
  parseStatus: ParseStatus;
  error?: string;
}): Promise<CvListItem> {
  const cv = await prisma.cv.create({
    data: {
      jobId: input.jobId,
      fileName: input.fileName,
      filePath: input.filePath,
      contentHash: input.contentHash,
      rawText: input.rawText ?? "",
      pagesJson: JSON.stringify(input.pages ?? []),
      anonymizedText: input.anonymizedText ?? "",
      contactJson: input.contactJson ?? "{}",
      parseStatus: input.parseStatus,
      error: input.error,
    },
    select: {
      id: true,
      fileName: true,
      parseStatus: true,
      error: true,
    },
  });

  return toCvListItem(cv);
}
