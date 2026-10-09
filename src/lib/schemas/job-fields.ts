export const GEOGRAPHIC_SCOPE_OPTIONS = [
  "United Arab Emirates",
  "Abu Dhabi and Dubai",
  "Abu Dhabi",
  "Dubai",
  "Sharjah",
  "Ajman",
  "Ras Al Khaimah",
  "Fujairah",
  "Umm Al Quwain",
] as const;

export const EMPLOYMENT_TYPE_OPTIONS = [
  "Full-time",
  "Part-time",
  "Contract",
  "Consultancy",
] as const;

export const SENIORITY_LEVEL_OPTIONS = [
  "Junior",
  "Mid-level",
  "Supervisory",
  "Supervisory and leadership",
  "Executive",
] as const;

export function selectOptions(
  options: readonly string[],
  current?: string | null,
): string[] {
  const value = current?.trim() ?? "";
  if (value.length === 0 || options.includes(value)) {
    return [...options];
  }
  return [value, ...options];
}
