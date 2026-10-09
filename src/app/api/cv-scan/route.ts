import { NextResponse } from "next/server";
import { readCV, scanCV } from "@/lib/cv-scan";
import { cvScanRequestSchema } from "@/lib/schemas/cv-scan";

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Request must contain multipart form data." },
      { status: 400 },
    );
  }

  const validation = cvScanRequestSchema.safeParse({
    cv: formData.get("cv"),
    jobDescription: formData.get("jobDescription"),
  });
  if (!validation.success) {
    return NextResponse.json(
      {
        error:
          validation.error.issues[0]?.message ??
          "Provide a CV file and job description.",
      },
      { status: 400 },
    );
  }

  let cv: string;
  try {
    cv = await readCV(validation.data.cv);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The uploaded CV could not be read.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const result = await scanCV(cv, validation.data.jobDescription);
    return NextResponse.json(result);
  } catch (error) {
    console.error("CV ATS scan failed:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json(
      { error: `CV scan failed: ${message}` },
      { status: 502 },
    );
  }
}
