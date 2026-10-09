import { ollama } from "@/lib/llm/client";

function runningName(item: { name?: string; model?: string }): string {
  return item.name || item.model || "";
}

export async function unloadOtherModels(keepModel: string): Promise<void> {
  try {
    const running = await ollama.ps();
    for (const item of running.models ?? []) {
      const name = runningName(item);
      if (!name || name === keepModel) {
        continue;
      }
      try {
        await ollama.generate({
          model: name,
          prompt: " ",
          keep_alive: 0,
        });
      } catch {
        // Best effort: a busy model can refuse unload.
      }
    }
  } catch {
    // Ollama may be starting; turbo can still proceed.
  }
}
