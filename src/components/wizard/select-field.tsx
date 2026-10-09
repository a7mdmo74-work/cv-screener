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
  placeholder = "Select…",
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
  const values = selectOptions(options, currentValue);
  const hasEmpty = !currentValue?.trim();

  return (
    <div>
      <label className={labelClassName} htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className={inputClassName}
        disabled={pending}
        {...registration}
      >
        {hasEmpty ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {values.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      {error?.message ? (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error.message}</p>
      ) : null}
    </div>
  );
}
