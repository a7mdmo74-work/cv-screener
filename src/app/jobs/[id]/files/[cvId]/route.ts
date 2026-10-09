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
  _request: Request,
  context: { params: Promise<{ id: string; cvId: string }> },
) {
  await connection();
  const { id, cvId } = await context.params;
  const cv = await prisma.cv.findFirst({
    where: { id: cvId, jobId: id },
    select: { fileName: true, filePath: true },
  });

  if (!cv || !cv.filePath) {
    return new Response("CV file not found", { status: 404 });
  }

  const allowedRoot = path.resolve(uploadDirForJob(id));
  const resolved = path.resolve(cv.filePath);
  if (!resolved.startsWith(`${allowedRoot}${path.sep}`)) {
    return new Response("CV file not found", { status: 404 });
  }

  try {
    const data = await readFile(resolved);
    const extension = fileExtension(cv.fileName);
    return new Response(data, {
      headers: {
        "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(cv.fileName)}"`,
      },
    });
  } catch {
    return new Response("CV file not found", { status: 404 });
  }
}
