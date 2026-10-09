import { Ollama } from "ollama";
import { llmConfig } from "@/lib/llm/config";

export const ollama = new Ollama({ host: llmConfig.host });
