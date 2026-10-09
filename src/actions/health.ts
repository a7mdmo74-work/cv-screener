"use server";

import { connection } from "next/server";
import { checkOllamaHealth, type OllamaHealth } from "@/lib/llm/health";
import type { ActionResult } from "@/lib/schemas/action";

export async function getOllamaHealth(): Promise<ActionResult<OllamaHealth>> {
  try {
    await connection();
    const data = await checkOllamaHealth();
    return { ok: true, data };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to check Ollama health";
    return { ok: false, error: message };
  }
}
