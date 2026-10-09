"use client";

import { useTranslations } from "next-intl";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { rerankJob } from "@/actions/screening";
import {
  inputClassName,
  labelClassName,
  primaryButtonClassName,
} from "@/components/wizard/styles";
import {
  SCORE_CRITERIA,
  type RubricWeights,
} from "@/lib/schemas/rubric";
import { rerankSchema, type JobResults, type RerankInput } from "@/lib/schemas/screening";

export function RerankForm({
  jobId,
  weights,
  onResults,
  onError,
}: {
  jobId: string;
  weights: RubricWeights;
  onResults: (results: JobResults) => void;
  onError: (message: string) => void;
}) {
  const t = useTranslations();

  const [pending, startTransition] = useTransition();
  const form = useForm<RerankInput>({
    resolver: zodResolver(rerankSchema),
    defaultValues: { jobId, weights },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((values) => {
        startTransition(async () => {
          const result = await rerankJob(values);
          if (!result.ok) {
            onError(result.error);
            return;
          }
          onResults(result.data);
        });
      })}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SCORE_CRITERIA.map((key) => (
          <label key={key} className="block">
            <span className={labelClassName}>{t(`status.${key}`)}</span>
            <input dir="auto"
              className={inputClassName}
              type="number"
              min={0}
              step={1}
              {...form.register(`weights.${key}`, { valueAsNumber: true })}
            />
          </label>
        ))}
      </div>
      <button className={primaryButtonClassName} disabled={pending} type="submit">
        {pending ? t("results.re_ranking") : t("results.re_rank_with_new_weights")}
      </button>
    </form>
  );
}
