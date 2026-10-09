import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { fileExtension } from "@/lib/parsing/files";

export type ExtractedCvDocument = {
  rawText: string;
  pages: string[];
};

export async function extractCvDocument(
  fileName: string,
  data: Buffer,
): Promise<ExtractedCvDocument> {
  const extension = fileExtension(fileName);

  if (extension === ".pdf") {
    const parser = new PDFParse({ data: new Uint8Array(data) });
    try {
      const result = await parser.getText();
      const pages = [...result.pages]
        .sort((left, right) => left.num - right.num)
        .map((page) => page.text.trim())
        .filter((page) => page.length > 0);
      const rawText = (pages.join("\n\n") || result.text).trim();
      return { rawText, pages };
    } finally {
      await parser.destroy();
    }
  }

  if (extension === ".docx") {
    const result = await mammoth.extractRawText({ buffer: data });
    return { rawText: result.value.trim(), pages: [] };
  }

  throw new Error("Only PDF and DOCX files are supported");
}
