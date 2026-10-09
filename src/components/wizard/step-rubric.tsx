"use client";
import { useUiFormatter } from "@/i18n/format";

import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
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
import { labelClassName } from "@/components/wizard/styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  EMPLOYMENT_TYPE_OPTIONS,
  GEOGRAPHIC_SCOPE_OPTIONS,
  SENIORITY_LEVEL_OPTIONS,
} from "@/lib/schemas/job-fields";
import {
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
  const t = useTranslations();

  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <fieldset className="space-y-2">
      <legend className={labelClassName}>{label}</legend>
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2">
          <Input dir="auto"
            className="h-10 bg-background"
            disabled={pending}
            {...register(`${name}.${index}.value`)}
          />
          <Button
            variant="outline"
            className="h-10 gap-1.5"
            disabled={pending || fields.length === 1}
            type="button"
            onClick={() => remove(index)}
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            {t("wizard.remove")}
          </Button>
        </div>
      ))}
      <Button
        variant="ghost"
        className="h-8 gap-1.5 px-2 text-sm text-accent"
        disabled={pending}
        type="button"
        onClick={() => append({ value: "" })}
      >
        <Plus className="size-4" aria-hidden="true" />
        {t("common.add_field", {label})}
      </Button>
    </fieldset>
  );
}

export function StepRubric({
  defaultValues,
  pending,
  submitLabel,
  onBack,
  onSubmit,
}: {
  defaultValues: Rubric;
  pending: boolean;
  submitLabel?: string;
  onBack: () => void;
  onSubmit: (rubric: Rubric) => void;
}) {
  const t = useTranslations();

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
          outputLanguage: defaultValues.outputLanguage,
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
          label={t("wizard.geographic_scope")}
          options={GEOGRAPHIC_SCOPE_OPTIONS}
          currentValue={geographicScope}
          pending={pending}
          error={formState.errors.geographicScope}
          registration={register("geographicScope")}
        />
        <SelectField
          id="employmentType"
          label={t("wizard.employment_type")}
          options={EMPLOYMENT_TYPE_OPTIONS}
          currentValue={employmentType}
          pending={pending}
          error={formState.errors.employmentType}
          registration={register("employmentType")}
        />
        <SelectField
          id="seniorityLevel"
          label={t("wizard.seniority")}
          options={SENIORITY_LEVEL_OPTIONS}
          currentValue={seniorityLevel}
          pending={pending}
          error={formState.errors.seniorityLevel}
          registration={register("seniorityLevel")}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" disabled={pending} {...register("includeNationalityColumn")} />{t("wizard.include_nationality_column_in_excel")}</label>
      <StringListField
        label={t("wizard.must_have")}
        name="mustHave"
        pending={pending}
        control={control}
        register={register}
      />
      <StringListField
        label={t("wizard.nice_to_have")}
        name="niceToHave"
        pending={pending}
        control={control}
        register={register}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClassName} htmlFor="minYearsExperience">{t("wizard.minimum_years_of_experience")}</label>
          <Input dir="auto"
            id="minYearsExperience"
            className="h-10 bg-background"
            type="number"
            min={0}
            step={1}
            disabled={pending}
            {...register("minYearsExperience")}
          />
        </div>
        <div>
          <label className={labelClassName} htmlFor="education">{t("wizard.education")}</label>
          <Input id="education" className="h-10 bg-background" disabled={pending} {...register("education")} />
        </div>
        <div>
          <label className={labelClassName} htmlFor="location">{t("wizard.location")}</label>
          <Input id="location" className="h-10 bg-background" disabled={pending} {...register("location")} />
        </div>
      </div>
      <StringListField
        label={t("wizard.languages")}
        name="languages"
        pending={pending}
        control={control}
        register={register}
      />
      <StringListField
        label={t("wizard.deal_breakers")}
        name="dealBreakers"
        pending={pending}
        control={control}
        register={register}
      />
      <fieldset className="space-y-3 rounded-xl border border-border bg-surface-muted/20 p-4 sm:p-5">
        <legend className="px-1 text-sm font-medium">{t("wizard.salary_bands_optional")}</legend>
        {fields.map((field, index) => (
          <div key={field.id} className="grid gap-2 sm:grid-cols-5">
            <Input dir="auto"
              className="h-10 bg-background"
              type="number"
              placeholder={t("wizard.min_score")}
              disabled={pending}
              {...register(`salaryBands.${index}.minScore`, { valueAsNumber: true })}
            />
            <Input dir="auto"
              className="h-10 bg-background"
              type="number"
              placeholder={t("wizard.max_score")}
              disabled={pending}
              {...register(`salaryBands.${index}.maxScore`, { valueAsNumber: true })}
            />
            <Input dir="auto"
              className="h-10 bg-background"
              type="number"
              placeholder={t("wizard.min_aed")}
              disabled={pending}
              {...register(`salaryBands.${index}.minAED`, { valueAsNumber: true })}
            />
            <Input dir="auto"
              className="h-10 bg-background"
              type="number"
              placeholder={t("wizard.max_aed")}
              disabled={pending}
              {...register(`salaryBands.${index}.maxAED`, { valueAsNumber: true })}
            />
            <Button
              variant="outline"
              className="h-10 gap-1.5"
              type="button"
              disabled={pending}
              onClick={() => remove(index)}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              {t("wizard.remove")}
            </Button>
          </div>
        ))}
        <Button
          variant="ghost"
          className="h-8 gap-1.5 px-2 text-accent"
          type="button"
          disabled={pending}
          onClick={() =>
            append({ minScore: 50, maxScore: 64, minAED: 0, maxAED: 0 })
          }
        >
          <Plus className="size-4" aria-hidden="true" />
          {t("wizard.add_salary_band")}
        </Button>
      </fieldset>
      <fieldset className="space-y-4 rounded-xl border border-border bg-surface-muted/20 p-4 sm:p-5">
        <legend className="px-1 text-sm font-medium">{t("wizard.criterion_weights")}</legend>
        <p
          className={`text-sm font-medium ${
            weightsTotal === 100
              ? "text-success"
              : "text-warning"
          }`}
        >{t("common.checking_weight", {total: weightsTotal})}
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
          <p className="text-sm text-danger">{t("wizard.check_the_weight_values")}</p>
        ) : null}
      </fieldset>
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
          {pending ? t("wizard.saving") : (submitLabel ?? t("wizard.save_screening_job"))}
          <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
        </Button>
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
  const t = useTranslations();
  const format = useUiFormatter();

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <label htmlFor={`weight-${criterion}`}>{t(`status.${criterion}`)}</label>
        <span className="flex items-center gap-2">
          <span dir="ltr">{format.number(value)}</span>
          <label className="flex items-center gap-1 text-xs text-muted">
            <input dir="auto"
              type="checkbox"
              checked={value === 0}
              disabled={pending}
              onChange={(event) => {
                setValue(`weights.${criterion}`, event.target.checked ? 0 : 10, {
                  shouldDirty: true,
                });
              }}
            />{t("wizard.zero")}</label>
        </span>
      </div>
      <input dir="auto"
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
