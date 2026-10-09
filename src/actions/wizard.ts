"use server";

import { revalidatePath } from "next/cache";
import { connection } from "next/server";
import { prisma } from "@/db/client";
import { llmConfig } from "@/lib/llm/config";
import { generateStructured, wizardGenerateOptions } from "@/lib/llm/generate";
import {
  clarifyingQuestionsPrompt,
  rubricPrompt,
} from "@/lib/llm/prompts";
import { TimeoutError } from "@/lib/llm/timeout";
import type { ActionResult } from "@/lib/schemas/action";
import {
  llmRubricSchema,
  mergeJobMetadata,
  parseRubric,
  type Rubric,
} from "@/lib/schemas/rubric";
import {
  clarifyingAnswersSchema,
  createJobInputSchema,
  jobDescriptionSchema,
  type ClarifyingAnswer,
  type CreateJobInput,
  type JobDescriptionInput,
} from "@/lib/schemas/wizard";
import { clarifyingQuestionsSchema } from "@/lib/schemas/wizard";
import {
  busyOllamaMessage,
  fallbackRubricFromJob,
} from "@/lib/wizard/fallback-rubric";

export async function generateClarifyingQuestions(
  input: JobDescriptionInput,
): Promise<ActionResult<{ questions: string[] }>> {
  const parsed = jobDescriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid job details" };
  }

  try {
    await connection();
    const prompt = clarifyingQuestionsPrompt(parsed.data);
    const result = await generateStructured(clarifyingQuestionsSchema, {
      model: llmConfig.extractModel,
      system: prompt.system,
      user: prompt.user,
      ...wizardGenerateOptions,
    });
    return { ok: true, data: { questions: result.questions } };
  } catch (error) {
    const message =
      error instanceof TimeoutError
        ? busyOllamaMessage()
        : error instanceof Error
          ? error.message
          : "Unable to generate clarifying questions";
    return { ok: false, error: message };
  }
}

export async function generateRubric(input: {
  details: JobDescriptionInput;
  answers: ClarifyingAnswer[];
}): Promise<ActionResult<{ rubric: Rubric; usedFallback: boolean }>> {
  const details = jobDescriptionSchema.safeParse(input.details);
  if (!details.success) {
    return { ok: false, error: details.error.issues[0]?.message ?? "Invalid job details" };
  }

  const answers = clarifyingAnswersSchema.safeParse({ answers: input.answers });
  if (!answers.success) {
    return { ok: false, error: "Invalid clarifying answers" };
  }

  try {
    await connection();
    const prompt = rubricPrompt({
      title: details.data.title,
      description: details.data.description,
      geographicScope: details.data.geographicScope,
      employmentType: details.data.employmentType,
      seniorityLevel: details.data.seniorityLevel,
      answers: answers.data.answers,
    });
    const result = await generateStructured(llmRubricSchema, {
      model: llmConfig.extractModel,
      system: prompt.system,
      user: prompt.user,
      ...wizardGenerateOptions,
    });
    return {
      ok: true,
      data: {
        rubric: mergeJobMetadata(result, {
          geographicScope: details.data.geographicScope,
          employmentType: details.data.employmentType,
          seniorityLevel: details.data.seniorityLevel,
          currency: "AED",
          includeNationalityColumn: details.data.includeNationalityColumn,
          salaryBands: [],
        }),
        usedFallback: false,
      },
    };
  } catch (error) {
    if (error instanceof TimeoutError) {
      return {
        ok: true,
        data: {
          rubric: fallbackRubricFromJob(details.data),
          usedFallback: true,
        },
      };
    }
    const message =
      error instanceof Error ? error.message : "Unable to generate a rubric";
    return { ok: false, error: message };
  }
}

export async function buildBasicRubric(
  input: JobDescriptionInput,
): Promise<ActionResult<{ rubric: Rubric; usedFallback: true }>> {
  const parsed = jobDescriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid job details" };
  }

  return {
    ok: true,
    data: { rubric: fallbackRubricFromJob(parsed.data), usedFallback: true },
  };
}

export async function createJob(
  input: CreateJobInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createJobInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid job" };
  }

  try {
    await connection();
    const job = await prisma.job.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        rubricJson: JSON.stringify(parseRubric(parsed.data.rubric)),
        status: "draft",
        twoPass: false,
      },
      select: { id: true },
    });

    revalidatePath("/");
    revalidatePath(`/jobs/${job.id}`);
    return { ok: true, data: { id: job.id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save the screening job";
    return { ok: false, error: message };
  }
}
