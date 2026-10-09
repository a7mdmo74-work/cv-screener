export function Progress({ value, label }: { value: number; label: string }) {
  const score = Math.max(0, Math.min(100, value));
  const color =
    score >= 75
      ? "bg-emerald-500"
      : score >= 50
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score}
      className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
    >
      <div
        className={`h-full rounded-full transition-[width] ${color}`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}
