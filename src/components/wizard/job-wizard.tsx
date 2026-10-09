"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildBasicRubric,
  createJob,
  generateClarifyingQuestions,
  generateRubric,
} from "@/actions/wizard";
import { cloneJobWithCvs } from "@/actions/screening";
import { StepDescription } from "@/components/wizard/step-description";
import { StepQuestions } from "@/components/wizard/step-questions";
import { StepRubric } from "@/components/wizard/step-rubric";
import type { Rubric } from "@/lib/schemas/rubric";
import type {
  ClarifyingAnswers,
  JobDescriptionInput,
} from "@/lib/schemas/wizard";
import { busyOllamaMessage } from "@/lib/wizard/fallback-rubric";

const steps = ["Description", "Questions", "Rubric"] as const;
const stepDescriptions = [
  "Define the role",
  "Clarify priorities",
  "Review criteria",
] as const;

export const DEFAULT_JOB_DETAILS: JobDescriptionInput = {
  title: "",
  description: "",
  geographicScope: "United Arab Emirates",
  employmentType: "Full-time",
  seniorityLevel: "Supervisory",
  includeNationalityColumn: true,
};

export function JobWizard({
  sourceJobId,
  initialDetails,
  initialRubric,
}: {
  sourceJobId?: string;
  initialDetails?: JobDescriptionInput;
  initialRubric?: Rubric;
} = {}) {
  const router = useRouter();
  const cloning = Boolean(sourceJobId);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const requestId = useRef(0);
  const [details, setDetails] = useState<JobDescriptionInput>(
    initialDetails ?? DEFAULT_JOB_DETAILS,
  );
  const [answers, setAnswers] = useState<ClarifyingAnswers>({ answers: [] });
  const [rubric, setRubric] = useState<Rubric | null>(initialRubric ?? null);

  async function run<T>(
    action: () => Promise<{ ok: true; data: T } | { ok: false; error: string }>,
    onSuccess: (data: T) => void,
  ) {
    const token = requestId.current + 1;
    requestId.current = token;
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      const result = await action();
      if (token !== requestId.current) {
        return;
      }
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSuccess(result.data);
    } catch (caught) {
      if (token !== requestId.current) {
        return;
      }
      setError(caught instanceof Error ? caught.message : "Something went wrong");
    } finally {
      if (token === requestId.current) {
        setPending(false);
      }
    }
  }

  function applyRubric(
    data: { rubric: Rubric; usedFallback: boolean },
    skipped = false,
  ) {
    setRubric(data.rubric);
    setStep(2);
    if (skipped) {
      setNotice(
        "Basic rubric from the job description. Review and edit it before saving.",
      );
      return;
    }
    if (data.usedFallback) {
      setNotice(busyOllamaMessage());
    }
  }

  return (
    <div className="space-y-6">
      <ol
        aria-label="Screening setup progress"
        className="grid grid-cols-3 gap-2 border-b border-zinc-200 pb-5 dark:border-zinc-800"
      >
        {steps.map((label, index) => {
          const current = index === step;
          const done = index < step;
          return (
            <li
              key={label}
              aria-current={current ? "step" : undefined}
              className="min-w-0"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    current
                      ? "bg-indigo-700 text-white dark:bg-indigo-400 dark:text-zinc-950"
                      : done
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  {done ? <CheckIcon /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span
                    className={`block truncate text-xs font-semibold sm:text-sm ${
                      current
                        ? "text-zinc-900 dark:text-zinc-50"
                        : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    {label}
                  </span>
                  <span className="hidden text-[11px] text-zinc-500 dark:text-zinc-400 sm:block">
                    {stepDescriptions[index]}
                  </span>
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </div>
      ) : null}

      {notice ? (
        <div
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
        >
          {notice}
        </div>
      ) : null}

      {step === 0 ? (
        <StepDescription
          defaultValues={details}
          pending={pending}
          onSubmit={(values) => {
            setDetails(values);
            void run(
              () => generateClarifyingQuestions(values),
              (data) => {
                setAnswers({
                  answers: data.questions.map((question) => ({
                    question,
                    answer: "",
                  })),
                });
                setStep(1);
              },
            );
          }}
          onSkipAi={(values) => {
            setDetails(values);
            void run(
              () => buildBasicRubric(values),
              (data) => applyRubric(data, true),
            );
          }}
        />
      ) : null}

      {step === 1 ? (
        <StepQuestions
          defaultValues={answers}
          pending={pending}
          onBack={() => {
            setError(null);
            setStep(0);
          }}
          onSubmit={(values) => {
            setAnswers(values);
            void run(
              () =>
                generateRubric({
                  details,
                  answers: values.answers,
                }),
              applyRubric,
            );
          }}
        />
      ) : null}

      {step === 2 && rubric ? (
        <StepRubric
          defaultValues={rubric}
          pending={pending}
          submitLabel={cloning ? "Clone and queue scoring" : "Save screening job"}
          onBack={() => {
            setError(null);
            setStep(1);
          }}
          onSubmit={(nextRubric) => {
            setRubric(nextRubric);
            if (cloning && sourceJobId) {
              void run(
                () =>
                  cloneJobWithCvs({
                    sourceJobId,
                    title: details.title,
                    description: details.description,
                    rubric: nextRubric,
                  }),
                (data) => {
                  router.push(`/jobs/${data.id}`);
                },
              );
              return;
            }
            void run(
              () =>
                createJob({
                  title: details.title,
                  description: details.description,
                  rubric: nextRubric,
                }),
              (data) => {
                router.push(`/jobs/${data.id}`);
              },
            );
          }}
        />
      ) : null}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="h-3.5 w-3.5"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m4 10 4 4 8-8" />
    </svg>
  );
}
