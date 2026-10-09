import { llmConfig } from "@/lib/llm/config";
import { withTimeout } from "@/lib/llm/timeout";

export type OllamaHealth = {
  reachable: boolean;
  extractModel: string;
  scoreModel: string;
  extractModelPresent: boolean;
  scoreModelPresent: boolean;
  missingModels: string[];
};

function modelNames(models: Array<{ name?: string; model?: string }>): Set<string> {
  const names = new Set<string>();
  for (const model of models) {
    if (model.name) {
      names.add(model.name);
    }
    if (model.model) {
      names.add(model.model);
    }
  }
  return names;
}

type ListedModels = { models: Array<{ name?: string; model?: string }> };

async function listModels(): Promise<ListedModels> {
  const response = await fetch(`${llmConfig.host.replace(/\/$/, "")}/api/tags`, {
    cache: "no-store",
    signal: AbortSignal.timeout(2500),
  });
  if (!response.ok) {
    throw new Error(`Ollama health check failed (${response.status})`);
  }
  return (await response.json()) as ListedModels;
}

export async function checkOllamaHealth(): Promise<OllamaHealth> {
  const extractModel = llmConfig.extractModel;
  const scoreModel = llmConfig.scoreModel;

  try {
    const listed = await withTimeout(
      listModels(),
      3000,
      "Ollama health check timed out",
    );
    const names = modelNames(listed.models);
    const extractModelPresent = names.has(extractModel);
    const scoreModelPresent = names.has(scoreModel);
    const missingModels = [
      ...(extractModelPresent ? [] : [extractModel]),
      ...(scoreModelPresent || scoreModel === extractModel ? [] : [scoreModel]),
    ];

    return {
      reachable: true,
      extractModel,
      scoreModel,
      extractModelPresent,
      scoreModelPresent,
      missingModels,
    };
  } catch {
    return {
      reachable: false,
      extractModel,
      scoreModel,
      extractModelPresent: false,
      scoreModelPresent: false,
      missingModels: [extractModel, scoreModel],
    };
  }
}
