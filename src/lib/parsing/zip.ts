import path from "node:path";
import AdmZip from "adm-zip";
import { MAX_FILE_BYTES } from "@/lib/parsing/constants";
import { fileExtension, isAllowedCvFile } from "@/lib/parsing/files";

export function isZipFile(fileName: string): boolean {
  return fileExtension(fileName) === ".zip";
}

export type ExtractedZipCv = {
  fileName: string;
  bytes: Buffer;
};

export function extractCvsFromZip(bytes: Buffer): ExtractedZipCv[] {
  const zip = new AdmZip(bytes);
  const extracted: ExtractedZipCv[] = [];

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) {
      continue;
    }

    const rawName = entry.entryName.replaceAll("\\", "/");
    const base = path.posix.basename(rawName);
    if (
      rawName.split("/").includes("..") ||
      rawName.startsWith("/") ||
      rawName.includes("__MACOSX/") ||
      base.startsWith(".") ||
      !isAllowedCvFile(base)
    ) {
      continue;
    }

    const data = entry.getData();
    if (data.length === 0 || data.length > MAX_FILE_BYTES) {
      continue;
    }

    extracted.push({ fileName: base, bytes: data });
  }

  return extracted;
}
