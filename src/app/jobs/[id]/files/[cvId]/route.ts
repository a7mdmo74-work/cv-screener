import { routeAccess } from "@/lib/auth/server";
import { requestLocale } from "@/i18n/request-locale";
import { getTranslations } from "next-intl/server";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { connection } from "next/server";
import { prisma } from "@/db/client";
import { fileExtension, uploadDirForJob } from "@/lib/parsing/files";

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; cvId: string }> },
) {
  const denied = await routeAccess(request, "viewer");
  if (denied) return denied;

  await connection();
  const locale = await requestLocale(request);
  const t = await getTranslations({locale,namespace:"errors"});
  const { id, cvId } = await context.params;
  const cv = await prisma.cv.findFirst({
    where: { id: cvId, jobId: id },
    select: { fileName: true, filePath: true },
  });

  if (!cv || !cv.filePath) {
    return new Response(t("FILE_NOT_FOUND"), { status: 404 });
  }

  const allowedRoot = path.resolve(uploadDirForJob(id));
  const resolved = path.resolve(cv.filePath);
  if (!resolved.startsWith(`${allowedRoot}${path.sep}`)) {
    return new Response(t("FILE_NOT_FOUND"), { status: 404 });
  }

  try {
    const data = await readFile(resolved);
    const extension = fileExtension(cv.fileName);
    return new Response(data, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(cv.fileName)}"`,
      },
    });
  } catch {
    return new Response(t("FILE_NOT_FOUND"), { status: 404 });
  }
}
