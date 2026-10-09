import { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  ALLOWED_EXTENSIONS,
  MIN_EXTRACTED_CHARS,
} from "@/lib/parsing/constants";

export {
  ALLOWED_EXTENSIONS,
  MAX_FILE_BYTES,
  MAX_UPLOAD_FILES,
  MAX_ZIP_BYTES,
  MIN_EXTRACTED_CHARS,
  UPLOAD_BATCH_SIZE,
} from "@/lib/parsing/constants";

export const UPLOAD_ROOT = path.resolve(process.cwd(), "data/uploads");

export function uploadDirForJob(jobId: string): string {
  return path.join(UPLOAD_ROOT, jobId);
}

export async function ensureUploadDir(jobId: string): Promise<string> {
  const directory = uploadDirForJob(jobId);
  await mkdir(directory, { recursive: true });
  return directory;
}

export function fileExtension(fileName: string): string {
  return path.extname(fileName).toLowerCase();
}

export function isAllowedCvFile(fileName: string): boolean {
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(fileExtension(fileName));
}

export function sanitizeFileName(fileName: string): string {
  const base = path.basename(fileName).replace(/[^\w.\- ()+]/g, "_");
  const trimmed = base.slice(0, 180).trim();
  return trimmed.length > 0 ? trimmed : "cv";
}

export function uniqueFileName(fileName: string, index: number): string {
  const safe = sanitizeFileName(fileName);
  const extension = fileExtension(safe);
  const stem = safe.slice(0, Math.max(1, safe.length - extension.length));
  return `${Date.now()}-${index}-${stem}${extension}`;
}

export function isNearlyEmpty(text: string): boolean {
  const meaningful = text.replace(/[^\p{L}\p{N}]+/gu, "");
  return meaningful.length < MIN_EXTRACTED_CHARS;
}
