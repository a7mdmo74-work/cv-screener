"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import {
  clarifyingAnswersSchema,
  type ClarifyingAnswers,
} from "@/lib/schemas/wizard";
import {
  labelClassName,
} from "@/components/wizard/styles";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
  const t = useTranslations();

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
      <p className="text-sm text-muted">{t("wizard.answer_the_questions_that_matter_leave_any_question_blank_to_skip_it")}</p>
      {fields.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-strong bg-surface-muted/40 p-5 text-sm leading-6 text-muted-foreground">{t("wizard.no_clarifying_questions_were_needed_continue_to_generate_the_rubric")}</p>
      ) : (
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <label className={labelClassName} htmlFor={`answer-${index}`}>
                {field.question}
              </label>
              <Textarea dir="auto"
                id={`answer-${index}`}
                className="min-h-24 resize-y bg-background leading-6"
                disabled={pending}
                {...register(`answers.${index}.answer`)}
              />
              <Button
                className="mt-2 h-auto px-0 py-1 text-xs text-muted-foreground"
                variant="ghost"
                disabled={pending}
                type="button"
                onClick={() => setValue(`answers.${index}.answer`, "")}
              >{t("wizard.skip_this_question")}</Button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button
          variant="outline"
          className="h-10 gap-2"
          disabled={pending}
          type="button"
          onClick={onBack}
        >
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
          {t("wizard.back")}
        </Button>
        <Button
          className="h-10 gap-2 bg-accent text-accent-foreground hover:bg-accent-hover"
          disabled={pending}
          type="submit"
        >
          {pending ? t("wizard.building_rubric") : t("wizard.generate_rubric")}
          <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
        </Button>
      </div>
    </form>
  );
}
