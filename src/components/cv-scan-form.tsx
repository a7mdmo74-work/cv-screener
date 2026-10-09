"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import {
  cvScanResultSchema,
  type CvScanResult,
} from "@/lib/schemas/cv-scan";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const MAX_FILE_BYTES = 15 * 1024 * 1024;

const recommendationLabels: Record<CvScanResult["recommendation"], string> = {
  strong_yes: "Strong match",
  yes: "Good match",
  maybe: "Review further",
  no: "Low match",
};

const recommendationVariants: Record<
  CvScanResult["recommendation"],
  "success" | "warning" | "danger"
> = {
  strong_yes: "success",
  yes: "success",
  maybe: "warning",
  no: "danger",
};

const scoreLabels = [
  ["overall_score", "Overall fit", "Candidate's overall suitability"],
  ["match_score", "Role match", "Evidence against role requirements"],
  ["ats_score", "ATS readiness", "How clearly systems can read the CV"],
] as const;

export function CvScanForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<CvScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function chooseFile(file: File | null) {
    setSelectedFile(file);
    setError(null);
    setResult(null);
    if (file && file.size > MAX_FILE_BYTES) {
      setError("This file is over 15 MB. Choose a smaller CV to continue.");
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.currentTarget.files?.[0] ?? null);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (!file || !fileInputRef.current) {
      return;
    }
    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileInputRef.current.files = transfer.files;
    chooseFile(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!selectedFile) {
      setError("Choose a CV file before starting the review.");
      return;
    }
    if (selectedFile.size > MAX_FILE_BYTES) {
      setError("This file is over 15 MB. Choose a smaller CV to continue.");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/cv-scan", {
        method: "POST",
        body: formData,
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "The CV could not be scanned.";
        throw new Error(message);
      }

      const parsed = cvScanResultSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("The server returned an invalid CV scan result.");
      }
      setResult(parsed.data);
    } catch (scanError) {
      setError(
        scanError instanceof Error
          ? scanError.message
          : "The CV could not be scanned. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-lg bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200">
                1
              </div>
              <CardTitle>Candidate CV</CardTitle>
              <CardDescription>
                Upload one resume to review against this role.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <label
                htmlFor="cv"
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-5 py-8 text-center transition-colors focus-within:ring-2 focus-within:ring-indigo-500 ${
                  isDragging
                  ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/50"
                  : "border-zinc-300 bg-zinc-50/80 hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/20"
                }`}
              >
                <input
                  ref={fileInputRef}
                  id="cv"
                  name="cv"
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={handleFileChange}
                  required
                  className="sr-only"
                />
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-indigo-100 bg-white text-indigo-700 shadow-sm dark:border-indigo-900 dark:bg-zinc-950 dark:text-indigo-300">
                  <DocumentIcon />
                </span>
                {selectedFile ? (
                  <>
                    <span className="max-w-full truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {selectedFile.name}
                    </span>
                    <span className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {formatFileSize(selectedFile.size)} · Select another file
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      Drop a CV here or{" "}
                      <span className="underline underline-offset-4">
                        browse files
                      </span>
                    </span>
                    <span className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      PDF, DOCX, or TXT · up to 15 MB
                    </span>
                  </>
                )}
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-lg bg-zinc-100 text-sm font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                2
              </div>
              <CardTitle>Role requirements</CardTitle>
              <CardDescription>
                Paste the job description so the review is grounded in your
                hiring criteria.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                id="jobDescription"
                name="jobDescription"
                rows={8}
                maxLength={30_000}
                required
                placeholder="Paste the job description, including responsibilities, must-have skills, and experience..."
                className="block min-h-52 w-full resize-y rounded-lg border border-zinc-200 bg-white px-3.5 py-3 text-sm leading-6 text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Include must-haves and nice-to-haves for more useful results.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-start gap-3">
            <ShieldIcon />
            <p className="text-sm leading-5 text-zinc-600 dark:text-zinc-300">
              Review is processed with your configured local Ollama model.
              Protected personal characteristics are excluded from scoring.
            </p>
          </div>
          <Button
            type="submit"
            disabled={isLoading || (selectedFile !== null && selectedFile.size > MAX_FILE_BYTES)}
            className="w-full shrink-0 sm:w-auto"
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-zinc-500 dark:border-t-zinc-900" />
                Reviewing CV…
              </>
            ) : (
              <>
                Run candidate review
                <ArrowIcon />
              </>
            )}
          </Button>
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            {error}
          </div>
        ) : null}
      </form>

      {isLoading ? (
        <div
          role="status"
          className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
        >
          Reviewing the CV against the role requirements. This can take a
          moment while the local model analyzes the documents.
        </div>
      ) : null}
      {result ? <ScanResults result={result} /> : null}
    </div>
  );
}

function ScanResults({ result }: { result: CvScanResult }) {
  return (
    <section
      aria-labelledby="scan-results-title"
      aria-live="polite"
      className="space-y-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Candidate review
          </p>
          <h2
            id="scan-results-title"
            className="mt-1 text-2xl font-semibold tracking-tight"
          >
            Review summary
          </h2>
        </div>
        <Badge variant={recommendationVariants[result.recommendation]}>
          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
          {recommendationLabels[result.recommendation]}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {scoreLabels.map(([key, label, description]) => (
          <Card key={key}>
            <CardContent className="pt-5 sm:pt-6">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                  {label}
                </p>
                <p className="text-2xl font-semibold tabular-nums">
                  {result[key]}
                  <span className="ml-0.5 text-sm font-normal text-zinc-500">
                    /100
                  </span>
                </p>
              </div>
              <Progress value={result[key]} label={label} />
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                {description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Hiring snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            {result.summary}
          </p>
          {result.years_experience !== null ? (
            <div className="flex items-center gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <Badge variant="secondary">Experience identified</Badge>
              <span className="text-sm font-medium">
                {result.years_experience} years
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <ResultList
          title="Matched skills"
          description="Relevant skills found in the CV"
          items={result.matched_skills}
          variant="success"
          display="chips"
        />
        <ResultList
          title="Missing skills"
          description="Role skills not evidenced in the CV"
          items={result.missing_skills}
          variant="warning"
          display="chips"
        />
        <ResultList
          title="Missing keywords"
          description="Terms to consider adding when accurate"
          items={result.missing_keywords}
          variant="neutral"
          display="chips"
        />
        <ResultList
          title="Strengths"
          description="Evidence-backed positives for this role"
          items={result.strengths}
          variant="success"
        />
        <ResultList
          title="Red flags"
          description="Items that may need follow-up"
          items={result.red_flags}
          variant="danger"
        />
        <ResultList
          title="Formatting issues"
          description="Potential parsing and readability concerns"
          items={result.formatting_issues}
          variant="warning"
        />
        <ResultList
          title="Suggested improvements"
          description="Practical ways to strengthen the application"
          items={result.improvements}
          variant="neutral"
        />
      </div>
    </section>
  );
}

function ResultList({
  title,
  description,
  items,
  variant,
  display = "list",
}: {
  title: string;
  description: string;
  items: string[];
  variant: "success" | "warning" | "danger" | "neutral";
  display?: "list" | "chips";
}) {
  const iconColor = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
    neutral: "bg-zinc-400",
  }[variant];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${iconColor}`} />
          <CardTitle>{title}</CardTitle>
          <Badge variant="secondary" className="ml-auto tabular-nums">
            {items.length}
          </Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          display === "chips" ? (
            <div className="flex flex-wrap gap-2">
              {items.map((item, index) => (
                <Badge
                  key={`${item}-${index}`}
                  variant={
                    variant === "success"
                      ? "success"
                      : variant === "warning"
                        ? "warning"
                        : "outline"
                  }
                  className="whitespace-normal text-left"
                >
                  {item}
                </Badge>
              ))}
            </div>
          ) : (
            <ul className="space-y-2.5 text-sm leading-5 text-zinc-600 dark:text-zinc-300">
              {items.map((item, index) => (
                <li key={`${item}-${index}`} className="flex gap-2.5">
                  <span
                    className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${iconColor}`}
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {variant === "danger"
              ? "No red flags identified."
              : "Nothing to follow up on."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function formatFileSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-6 w-6"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 3.75h6.25L18 8.5v11.75H7a2 2 0 0 1-2-2v-12.5a2 2 0 0 1 2-2Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 4v5h5M9 13h6M9 16.5h6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3.5 19 6v5.7c0 4.3-2.9 7.2-7 8.8-4.1-1.6-7-4.5-7-8.8V6l7-2.5Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}
