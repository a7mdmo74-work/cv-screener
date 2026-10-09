import { getOllamaHealth } from "@/actions/health";

const toneClasses = {
  green:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  amber:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  red: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
} as const;

export function OllamaStatusFallback() {
  return (
    <span
      role="status"
      className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
    >
      Checking Ollama…
    </span>
  );
}

export async function OllamaStatusBadge() {
  const result = await getOllamaHealth();

  if (!result.ok) {
    return (
      <span
        role="status"
        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses.red}`}
      >
        Ollama error
      </span>
    );
  }

  const { reachable, extractModelPresent, scoreModelPresent, missingModels } =
    result.data;

  if (!reachable) {
    return (
      <span
        role="status"
        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses.red}`}
        title="Ollama is not reachable at the configured host"
      >
        Ollama offline
      </span>
    );
  }

  if (!extractModelPresent || !scoreModelPresent) {
    return (
      <span
        role="status"
        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses.amber}`}
        title={`Missing models: ${missingModels.join(", ")}`}
      >
        Ollama missing models
      </span>
    );
  }

  return (
    <span
      role="status"
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses.green}`}
      title="Ollama is reachable and both configured models are available"
    >
      Ollama ready
    </span>
  );
}
