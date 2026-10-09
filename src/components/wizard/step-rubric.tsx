"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";
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
  CRITERION_LABELS,
  SCORE_CRITERIA,
  type Rubric,
} from "@/lib/schemas/rubric";
import {
  rubricFormSchema,
  type RubricFormValues,
} from "@/lib/schemas/wizard";

function toList(values: string[]): Array<{ value: string }> {
  return values.length > 0 ? values.map((value) => ({ value })) : [{ value: "" }];
}

export function rubricToFormValues(rubric: Rubric): RubricFormValues {
  return {
    mustHave: toList(rubric.mustHave),
    niceToHave: toList(rubric.niceToHave),
    minYearsExperience:
      rubric.minYearsExperience === null ? "" : String(rubric.minYearsExperience),
    education: rubric.education ?? "",
    languages: toList(rubric.languages),
    location: rubric.location ?? "",
    dealBreakers: toList(rubric.dealBreakers),
    geographicScope: rubric.geographicScope,
    employmentType: rubric.employmentType,
    seniorityLevel: rubric.seniorityLevel,
    includeNationalityColumn: rubric.includeNationalityColumn,
    salaryBands:
      rubric.salaryBands.length > 0
        ? rubric.salaryBands
        : [{ minScore: 80, maxScore: 100, minAED: 0, maxAED: 0 }],
    weights: rubric.weights,
  };
}

function cleanList(items: Array<{ value: string }>): string[] {
  return items.map((item) => item.value.trim()).filter((value) => value.length > 0);
}

function parseYears(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function StringListField({
  label,
  name,
  pending,
  control,
  register,
}: {
  label: string;
  name: "mustHave" | "niceToHave" | "languages" | "dealBreakers";
  pending: boolean;
  control: Control<RubricFormValues>;
  register: UseFormRegister<RubricFormValues>;
}) {
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <fieldset className="space-y-2">
      <legend className={labelClassName}>{label}</legend>
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2">
          <input
            className={inputClassName}
            disabled={pending}
            {...register(`${name}.${index}.value`)}
          />
          <button
            className={secondaryButtonClassName}
            disabled={pending || fields.length === 1}
            type="button"
            onClick={() => remove(index)}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        className="text-sm font-medium text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
        disabled={pending}
        type="button"
        onClick={() => append({ value: "" })}
      >
        Add {label.toLowerCase()}
      </button>
    </fieldset>
  );
}

export function StepRubric({
  defaultValues,
  pending,
  submitLabel = "Save screening job",
  onBack,
  onSubmit,
}: {
  defaultValues: Rubric;
  pending: boolean;
  submitLabel?: string;
  onBack: () => void;
  onSubmit: (rubric: Rubric) => void;
}) {
  const { control, register, handleSubmit, formState, setValue } =
    useForm<RubricFormValues>({
      resolver: zodResolver(rubricFormSchema),
      defaultValues: rubricToFormValues(defaultValues),
    });

  const weights = useWatch({ control, name: "weights" });
  const geographicScope = useWatch({ control, name: "geographicScope" });
  const employmentType = useWatch({ control, name: "employmentType" });
  const seniorityLevel = useWatch({ control, name: "seniorityLevel" });
  const weightsTotal = SCORE_CRITERIA.reduce(
    (sum, key) => sum + (weights?.[key] ?? 0),
    0,
  );
  const { fields, append, remove } = useFieldArray({ control, name: "salaryBands" });

  return (
    <form
      className="space-y-6"
      onSubmit={handleSubmit((values) => {
        onSubmit({
          mustHave: cleanList(values.mustHave),
          niceToHave: cleanList(values.niceToHave),
          minYearsExperience: parseYears(values.minYearsExperience),
          education: values.education.trim() || null,
          languages: cleanList(values.languages),
          location: values.location.trim() || null,
          dealBreakers: cleanList(values.dealBreakers),
          geographicScope: values.geographicScope.trim(),
          employmentType: values.employmentType.trim(),
          seniorityLevel: values.seniorityLevel.trim(),
          currency: "AED",
          includeNationalityColumn: values.includeNationalityColumn,
          salaryBands: values.salaryBands.filter(
            (band) => band.minAED > 0 || band.maxAED > 0,
          ),
          weights: values.weights,
        });
      })}
      noValidate
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          id="geographicScope"
          label="Geographic scope"
          options={GEOGRAPHIC_SCOPE_OPTIONS}
          currentValue={geographicScope}
          pending={pending}
          error={formState.errors.geographicScope}
          registration={register("geographicScope")}
        />
        <SelectField
          id="employmentType"
          label="Employment type"
          options={EMPLOYMENT_TYPE_OPTIONS}
          currentValue={employmentType}
          pending={pending}
          error={formState.errors.employmentType}
          registration={register("employmentType")}
        />
        <SelectField
          id="seniorityLevel"
          label="Seniority"
          options={SENIORITY_LEVEL_OPTIONS}
          currentValue={seniorityLevel}
          pending={pending}
          error={formState.errors.seniorityLevel}
          registration={register("seniorityLevel")}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" disabled={pending} {...register("includeNationalityColumn")} />
        Include nationality column in Excel
      </label>
      <StringListField
        label="Must have"
        name="mustHave"
        pending={pending}
        control={control}
        register={register}
      />
      <StringListField
        label="Nice to have"
        name="niceToHave"
        pending={pending}
        control={control}
        register={register}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClassName} htmlFor="minYearsExperience">
            Minimum years of experience
          </label>
          <input
            id="minYearsExperience"
            className={inputClassName}
            type="number"
            min={0}
            step={1}
            disabled={pending}
            {...register("minYearsExperience")}
          />
        </div>
        <div>
          <label className={labelClassName} htmlFor="education">
            Education
          </label>
          <input id="education" className={inputClassName} disabled={pending} {...register("education")} />
        </div>
        <div>
          <label className={labelClassName} htmlFor="location">
            Location
          </label>
          <input id="location" className={inputClassName} disabled={pending} {...register("location")} />
        </div>
      </div>
      <StringListField
        label="Languages"
        name="languages"
        pending={pending}
        control={control}
        register={register}
      />
      <StringListField
        label="Deal-breakers"
        name="dealBreakers"
        pending={pending}
        control={control}
        register={register}
      />
      <fieldset className="space-y-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-1 text-sm font-medium">Salary bands (optional)</legend>
        {fields.map((field, index) => (
          <div key={field.id} className="grid gap-2 sm:grid-cols-5">
            <input
              className={inputClassName}
              type="number"
              placeholder="Min score"
              disabled={pending}
              {...register(`salaryBands.${index}.minScore`, { valueAsNumber: true })}
            />
            <input
              className={inputClassName}
              type="number"
              placeholder="Max score"
              disabled={pending}
              {...register(`salaryBands.${index}.maxScore`, { valueAsNumber: true })}
            />
            <input
              className={inputClassName}
              type="number"
              placeholder="Min AED"
              disabled={pending}
              {...register(`salaryBands.${index}.minAED`, { valueAsNumber: true })}
            />
            <input
              className={inputClassName}
              type="number"
              placeholder="Max AED"
              disabled={pending}
              {...register(`salaryBands.${index}.maxAED`, { valueAsNumber: true })}
            />
            <button
              className={secondaryButtonClassName}
              type="button"
              disabled={pending}
              onClick={() => remove(index)}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          className="text-sm font-medium"
          type="button"
          disabled={pending}
          onClick={() =>
            append({ minScore: 50, maxScore: 64, minAED: 0, maxAED: 0 })
          }
        >
          Add salary band
        </button>
      </fieldset>
      <fieldset className="space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-1 text-sm font-medium">Criterion weights</legend>
        <p
          className={`text-sm font-medium ${
            weightsTotal === 100
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-amber-700 dark:text-amber-300"
          }`}
        >
          Weights total: {weightsTotal}
          {weightsTotal === 100 ? "" : " (aim for 100)"}
        </p>
        {SCORE_CRITERIA.map((key) => (
          <WeightSlider
            key={key}
            criterion={key}
            pending={pending}
            value={weights?.[key] ?? 0}
            register={register}
            setValue={setValue}
          />
        ))}
        {formState.errors.weights ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            Check the weight values.
          </p>
        ) : null}
      </fieldset>
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
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function WeightSlider({
  criterion,
  pending,
  value,
  register,
  setValue,
}: {
  criterion: (typeof SCORE_CRITERIA)[number];
  pending: boolean;
  value: number;
  register: UseFormRegister<RubricFormValues>;
  setValue: UseFormSetValue<RubricFormValues>;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <label htmlFor={`weight-${criterion}`}>{CRITERION_LABELS[criterion]}</label>
        <span className="flex items-center gap-2">
          <span>{value}</span>
          <label className="flex items-center gap-1 text-xs text-zinc-500">
            <input
              type="checkbox"
              checked={value === 0}
              disabled={pending}
              onChange={(event) => {
                setValue(`weights.${criterion}`, event.target.checked ? 0 : 10, {
                  shouldDirty: true,
                });
              }}
            />
            Zero
          </label>
        </span>
      </div>
      <input
        id={`weight-${criterion}`}
        className="w-full"
        type="range"
        min={0}
        max={100}
        step={1}
        disabled={pending || value === 0}
        {...register(`weights.${criterion}`, { valueAsNumber: true })}
      />
    </div>
  );
}
