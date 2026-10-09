import { describe, expect, it } from "vitest";
import AdmZip from "adm-zip";
import { extractCvsFromZip, isZipFile } from "@/lib/parsing/zip";

describe("extractCvsFromZip", () => {
  it("extracts multiple PDF CVs from a single ZIP archive", () => {
    const zip = new AdmZip();
    zip.addFile("applications/alice.pdf", Buffer.from("%PDF-1.4 alice"));
    zip.addFile("applications/bob.pdf", Buffer.from("%PDF-1.4 bob"));
    zip.addFile("carol.pdf", Buffer.from("%PDF-1.4 carol"));

    const extracted = extractCvsFromZip(zip.toBuffer());

    expect(extracted.map((item) => item.fileName).sort()).toEqual([
      "alice.pdf",
      "bob.pdf",
      "carol.pdf",
    ]);
    expect(extracted.map((item) => item.bytes.toString())).toEqual([
      "%PDF-1.4 alice",
      "%PDF-1.4 bob",
      "%PDF-1.4 carol",
    ]);
  });

  it("pulls PDF and DOCX files out of nested folders", () => {
    const zip = new AdmZip();
    zip.addFile("cv1.pdf", Buffer.from("%PDF-1.4"));
    zip.addFile("nested/cv2.docx", Buffer.from("docx"));
    zip.addFile("__MACOSX/._cv.pdf", Buffer.from("skip"));
    zip.addFile("readme.txt", Buffer.from("skip"));

    const extracted = extractCvsFromZip(zip.toBuffer());
    expect(isZipFile("cvs.zip")).toBe(true);
    expect(extracted.map((item) => item.fileName).sort()).toEqual([
      "cv1.pdf",
      "cv2.docx",
    ]);
  });

  it("skips empty files and keeps names that contain dots", () => {
    const zip = new AdmZip();
    zip.addFile("empty.pdf", Buffer.alloc(0));
    zip.addFile("foo..bar.pdf", Buffer.from("%PDF-1.4"));
    zip.addFile("ok.pdf", Buffer.from("%PDF-1.4"));

    const extracted = extractCvsFromZip(zip.toBuffer());
    expect(extracted.map((item) => item.fileName).sort()).toEqual([
      "foo..bar.pdf",
      "ok.pdf",
    ]);
  });
});
