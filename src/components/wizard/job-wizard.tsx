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
      <ol className="grid grid-cols-3 gap-2 text-sm">
        {steps.map((label, index) => {
          const current = index === step;
          const done = index < step;
          return (
            <li
              key={label}
              className={`rounded-lg border px-3 py-2 text-center ${
                current
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : done
                    ? "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                    : "border-zinc-200 text-zinc-500 dark:border-zinc-800"
              }`}
            >
              <span className="block text-xs uppercase tracking-wide">
                Step {index + 1}
              </span>
              {label}
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
