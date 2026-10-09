import { validationText } from "@/i18n/validation";
import { uiLabel } from "@/i18n/labels";

import { useTranslations } from "next-intl";
import type { FieldError, UseFormRegisterReturn } from "react-hook-form";
import { inputClassName, labelClassName } from "@/components/wizard/styles";
import { selectOptions } from "@/lib/schemas/job-fields";

export function SelectField({
  id,
  label,
  options,
  currentValue,
  pending,
  error,
  registration,
  placeholder,
}: {
  id: string;
  label: string;
  options: readonly string[];
  currentValue?: string;
  pending: boolean;
  error?: FieldError;
  registration: UseFormRegisterReturn;
  placeholder?: string;
}) {
  const t = useTranslations();

  const values = selectOptions(options, currentValue);
  const hasEmpty = !currentValue?.trim();

  return (
    <div>
      <label className={labelClassName} htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className={`${inputClassName} leading-5`}
        disabled={pending}
        {...registration}
      >
        {hasEmpty ? (
          <option value="" disabled>
            {placeholder ?? t("wizard.select")}
          </option>
        ) : null}
        {values.map((value) => (
          <option
            key={value}
            value={value}
          >
            {options.includes(value) ? uiLabel(t, value) : value}
          </option>
        ))}
      </select>
      {error?.message ? (
        <p className="mt-1 text-sm text-danger">{validationText(t, error.message)}</p>
      ) : null}
    </div>
  );
}
