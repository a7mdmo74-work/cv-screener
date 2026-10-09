"use client";
import { errorText } from "@/i18n/errors";
import { uiLabel } from "@/i18n/labels";

import { useTranslations } from "next-intl";
import { CircleAlert, CircleCheck } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Rubric } from "@/lib/schemas/rubric";
import type {
  ClarifyingAnswers,
  JobDescriptionInput,
} from "@/lib/schemas/wizard";

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
  const t = useTranslations();

  const steps = [
    t("wizard.description"),
    t("wizard.questions"),
    t("wizard.rubric"),
  ];
  const stepDescriptions = [
    t("wizard.define_the_role"),
    t("wizard.clarify_priorities"),
    t("wizard.review_criteria"),
  ];
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
      setError(caught instanceof Error ? caught.message : t("wizard.something_went_wrong"));
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
        t("wizard.basic_rubric_from_the_job_description_review_and_edit_it_before_saving"),
      );
      return;
    }
    if (data.usedFallback) {
      setNotice(t("errors.OLLAMA_BUSY"));
    }
  }

  return (
    <div className="space-y-6">
      <ol
        aria-label={t("wizard.screening_setup_progress")}
        className="grid grid-cols-3 gap-2"
      >
        {steps.map((label, index) => {
          const current = index === step;
          const done = index < step;
          return (
            <li
              key={uiLabel(t, label)}
              aria-current={current ? "step" : undefined}
              className={`min-w-0 rounded-xl border p-3 transition-colors sm:p-4 ${
                current
                  ? "border-accent bg-surface-muted"
                  : "border-transparent bg-surface-muted/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    current
                      ? "bg-accent text-accent-foreground"
                      : done
                        ? "bg-success-bg text-success"
                        : "bg-surface-muted text-muted"
                  }`}
                >
                  {done ? <CheckIcon /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span
                    className={`block truncate text-xs font-semibold sm:text-sm ${
                      current
                        ? "text-foreground"
                        : "text-muted"
                    }`}
                  >
                    {uiLabel(t, label)}
                  </span>
                  <span className="mt-0.5 hidden text-[11px] text-muted sm:block">
                    {uiLabel(t, stepDescriptions[index])}
                  </span>
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      {error ? (
        <Alert variant="destructive" className="border-danger bg-danger-bg text-danger">
          <CircleAlert className="size-4" aria-hidden="true" />
          <AlertDescription className="text-current">{error ? errorText(t, error) : null}</AlertDescription>
        </Alert>
      ) : null}

      {notice ? (
        <Alert role="status" className="border-warning bg-warning-bg text-warning">
          <CircleCheck className="size-4" aria-hidden="true" />
          <AlertDescription className="text-current">{notice}</AlertDescription>
        </Alert>
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
          submitLabel={cloning ? t("wizard.clone_and_queue_scoring") : t("wizard.save_screening_job")}
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
