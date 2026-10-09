"use client";
import { validationText } from "@/i18n/validation";

import { useTranslations } from "next-intl";
import { ArrowRight, Sparkles } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { SelectField } from "@/components/wizard/select-field";
import { inputClassName, labelClassName } from "@/components/wizard/styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  EMPLOYMENT_TYPE_OPTIONS,
  GEOGRAPHIC_SCOPE_OPTIONS,
  SENIORITY_LEVEL_OPTIONS,
} from "@/lib/schemas/job-fields";
import {
  jobDescriptionSchema,
  type JobDescriptionInput,
} from "@/lib/schemas/wizard";

export function StepDescription({
  defaultValues,
  pending,
  onSubmit,
  onSkipAi,
}: {
  defaultValues: JobDescriptionInput;
  pending: boolean;
  onSubmit: (values: JobDescriptionInput) => void;
  onSkipAi: (values: JobDescriptionInput) => void;
}) {
  const t = useTranslations();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<JobDescriptionInput>({
    resolver: zodResolver(jobDescriptionSchema),
    defaultValues,
  });
  const geographicScope = useWatch({ control, name: "geographicScope" });
  const employmentType = useWatch({ control, name: "employmentType" });
  const seniorityLevel = useWatch({ control, name: "seniorityLevel" });

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label className={labelClassName} htmlFor="title">{t("wizard.job_title")}</label>
        <Input dir="auto"
          id="title"
          className="mt-1.5 h-10 bg-background"
          autoComplete="off"
          aria-invalid={Boolean(errors.title)}
          disabled={pending}
          {...register("title")}
        />
        {errors.title ? (
          <p className="mt-1 text-sm text-danger">
            {validationText(t, errors.title.message)}
          </p>
        ) : null}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          id="geographicScope"
          label={t("wizard.geographic_scope")}
          options={GEOGRAPHIC_SCOPE_OPTIONS}
          currentValue={geographicScope}
          pending={pending}
          error={errors.geographicScope}
          registration={register("geographicScope")}
        />
        <SelectField
          id="employmentType"
          label={t("wizard.employment_type")}
          options={EMPLOYMENT_TYPE_OPTIONS}
          currentValue={employmentType}
          pending={pending}
          error={errors.employmentType}
          registration={register("employmentType")}
        />
        <SelectField
          id="seniorityLevel"
          label={t("wizard.seniority_level")}
          options={SENIORITY_LEVEL_OPTIONS}
          currentValue={seniorityLevel}
          pending={pending}
          error={errors.seniorityLevel}
          registration={register("seniorityLevel")}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" disabled={pending} {...register("includeNationalityColumn")} />{t("wizard.include_nationality_column_in_excel")}</label>
      <label className={labelClassName} htmlFor="outputLanguage">{t("common.language_option")}</label>
      <select id="outputLanguage" className={inputClassName} disabled={pending} {...register("outputLanguage")}>
        <option value="en">{t("common.english")}</option>
        <option value="ar">{t("common.arabic")}</option>
      </select>
      <div>
        <label className={labelClassName} htmlFor="description">{t("wizard.job_description")}</label>
        <Textarea dir="auto"
          id="description"
          className="mt-1.5 min-h-48 resize-y bg-background leading-6"
          aria-invalid={Boolean(errors.description)}
          disabled={pending}
          {...register("description")}
        />
        {errors.description ? (
          <p className="mt-1 text-sm text-danger">
            {validationText(t, errors.description.message)}
          </p>
        ) : null}
      </div>
      <div className="rounded-xl border border-warning bg-warning-bg p-3.5 text-sm leading-6 text-warning">
        {t("wizard.if_another_screening_job_is_running_ollama_is_busy_and_questions_can_hang_use_the_basic_ru")}
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          size="lg"
          className="h-10"
          type="button"
          onClick={handleSubmit(onSkipAi)}
        >
          {t("wizard.continue_with_basic_rubric")}
        </Button>
        <Button
          size="lg"
          className="h-10 gap-2 bg-accent px-4 text-accent-foreground hover:bg-accent-hover"
          disabled={pending}
          type="submit"
        >
          <Sparkles className="size-4" aria-hidden="true" />
          {pending ? t("wizard.generating_questions") : t("wizard.generate_questions")}
          <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
        </Button>
      </div>
    </form>
  );
}
