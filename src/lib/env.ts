import "dotenv/config";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  OLLAMA_HOST: z.string().url(),
  OLLAMA_EXTRACT_MODEL: z.string().min(1),
  OLLAMA_SCORE_MODEL: z.string().min(1),
  OLLAMA_BULK_MODEL: z.string().min(1).optional(),
  SCREENING_CONCURRENCY: z.coerce.number().int().positive().default(2),
  TIME_BUDGET_MIN: z.coerce.number().int().positive().default(30),
  TURBO_TRUNCATE_CHARS: z.coerce.number().int().positive().default(2000),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    OLLAMA_HOST: process.env.OLLAMA_HOST,
    OLLAMA_EXTRACT_MODEL: process.env.OLLAMA_EXTRACT_MODEL,
    OLLAMA_SCORE_MODEL: process.env.OLLAMA_SCORE_MODEL,
    OLLAMA_BULK_MODEL: process.env.OLLAMA_BULK_MODEL,
    SCREENING_CONCURRENCY: process.env.SCREENING_CONCURRENCY,
    TIME_BUDGET_MIN: process.env.TIME_BUDGET_MIN,
    TURBO_TRUNCATE_CHARS: process.env.TURBO_TRUNCATE_CHARS,
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment variables: ${details}`);
  }

  return parsed.data;
}

export const env = loadEnv();

export function resolveSqlitePath(databaseUrl: string): string {
  const filePath = databaseUrl.replace(/^file:/, "");
  return path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);
}

export function ensureSqliteDirectory(databaseUrl: string): string {
  const sqlitePath = resolveSqlitePath(databaseUrl);
  const directory = path.dirname(sqlitePath);
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }
  return sqlitePath;
}
