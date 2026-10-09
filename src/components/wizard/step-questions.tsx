"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import {
  clarifyingAnswersSchema,
  type ClarifyingAnswers,
} from "@/lib/schemas/wizard";
import {
  inputClassName,
  labelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/wizard/styles";

export function StepQuestions({
  defaultValues,
  pending,
  onBack,
  onSubmit,
}: {
  defaultValues: ClarifyingAnswers;
  pending: boolean;
  onBack: () => void;
  onSubmit: (values: ClarifyingAnswers) => void;
}) {
  const { control, register, handleSubmit, setValue } = useForm<ClarifyingAnswers>({
    resolver: zodResolver(clarifyingAnswersSchema),
    defaultValues,
  });

  const { fields } = useFieldArray({
    control,
    name: "answers",
  });

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Answer the questions that matter. Leave any question blank to skip it.
      </p>
      {fields.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          No clarifying questions were needed. Continue to generate the rubric.
        </p>
      ) : (
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id}>
              <label className={labelClassName} htmlFor={`answer-${index}`}>
                {field.question}
              </label>
              <textarea
                id={`answer-${index}`}
                className={`${inputClassName} min-h-24`}
                disabled={pending}
                {...register(`answers.${index}.answer`)}
              />
              <button
                className="mt-2 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                disabled={pending}
                type="button"
                onClick={() => setValue(`answers.${index}.answer`, "")}
              >
                Skip this question
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button
          className={secondaryButtonClassName}
          disabled={pending}
          type="button"
          onClick={onBack}
        >
          Back
        </button>
        <button className={primaryButtonClassName} disabled={pending} type="submit">
          {pending ? "Building rubric…" : "Generate rubric"}
        </button>
      </div>
    </form>
  );
}
