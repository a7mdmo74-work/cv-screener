"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { SelectField } from "@/components/wizard/select-field";
import {
  inputClassName,
  labelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/wizard/styles";
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
        <label className={labelClassName} htmlFor="title">
          Job title
        </label>
        <input
          id="title"
          className={inputClassName}
          autoComplete="off"
          disabled={pending}
          {...register("title")}
        />
        {errors.title ? (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.title.message}
          </p>
        ) : null}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          id="geographicScope"
          label="Geographic scope"
          options={GEOGRAPHIC_SCOPE_OPTIONS}
          currentValue={geographicScope}
          pending={pending}
          error={errors.geographicScope}
          registration={register("geographicScope")}
        />
        <SelectField
          id="employmentType"
          label="Employment type"
          options={EMPLOYMENT_TYPE_OPTIONS}
          currentValue={employmentType}
          pending={pending}
          error={errors.employmentType}
          registration={register("employmentType")}
        />
        <SelectField
          id="seniorityLevel"
          label="Seniority level"
          options={SENIORITY_LEVEL_OPTIONS}
          currentValue={seniorityLevel}
          pending={pending}
          error={errors.seniorityLevel}
          registration={register("seniorityLevel")}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" disabled={pending} {...register("includeNationalityColumn")} />
        Include nationality column in Excel
      </label>
      <div>
        <label className={labelClassName} htmlFor="description">
          Job description
        </label>
        <textarea
          id="description"
          className={`${inputClassName} min-h-48`}
          disabled={pending}
          {...register("description")}
        />
        {errors.description ? (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.description.message}
          </p>
        ) : null}
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        If another screening job is running, Ollama is busy and questions can
        hang. Use the basic rubric instead — you can edit it on the next step.
      </p>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          className={secondaryButtonClassName}
          type="button"
          onClick={handleSubmit(onSkipAi)}
        >
          Continue with basic rubric
        </button>
        <button className={primaryButtonClassName} disabled={pending} type="submit">
          {pending ? "Generating questions…" : "Generate questions"}
        </button>
      </div>
    </form>
  );
}
