"use client";
import { useUiFormatter } from "@/i18n/format";

import { uiLabel } from "@/i18n/labels";

import { errorText } from "@/i18n/errors";

import { useTranslations, useLocale } from "next-intl";

import { useEffect } from "react";
import { secondaryButtonClassName } from "@/components/wizard/styles";
import { CRITERION_LABELS, type ScoreCriterionKey } from "@/lib/schemas/rubric";
import { recommendationClass, recommendationTextClass } from "@/lib/ui/tiers";
import type { CvDetail } from "@/lib/schemas/screening";
import {
  inferSeniority,
} from "@/lib/screening/candidate-filters";

function criterionLabel(key: string): string {
  return CRITERION_LABELS[key as ScoreCriterionKey] ?? key;
}

export function CvDrawer({
  detail,
  loading,
  error,
  onClose,
}: {
  detail: CvDetail | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const format = useUiFormatter();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {

      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label={t("candidate.close_candidate_details")}
        className="absolute inset-0 bg-overlay"
        type="button"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cv-drawer-title"
        className="relative z-10 flex h-full w-full max-w-xl flex-col overflow-y-auto border-s border-border bg-surface p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="cv-drawer-title" className="text-lg font-semibold">
              {detail?.candidate?.fullName ?? detail?.fileName ?? t("candidate.candidate")}
            </h2>
            {detail ? (
              <p className="mt-1 text-sm text-muted">
                {detail.fileName}
                {detail.totalScore !== null ? (
                  <span className={recommendationTextClass(detail.recommendation)}> · {format.number(detail.totalScore)}</span>
                ) : null}
              </p>
            ) : null}
          </div>
          <button className={secondaryButtonClassName} type="button" onClick={onClose}>{t("candidate.close")}</button>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-muted">{t("candidate.loading_candidate")}</p>
        ) : null}
        {error ? (
          <p className="mt-6 text-sm text-danger">{error ? errorText(t, error) : null}</p>
        ) : null}

        {detail ? (
          <div className="mt-6 space-y-6 text-sm">
            {detail.hasFile ? (
              <a
                href={`/jobs/${detail.jobId}/files/${detail.id}?locale=${locale}`}
                className="inline-flex items-center text-sm font-medium text-foreground underline"
              >{t("candidate.download_original_cv")}</a>
            ) : null}

            {detail.recommendation || detail.suggestedSalary ? (
              <section>
                <h3 className="font-semibold">{t("candidate.recommendation")}</h3>
                <p className={`mt-2 inline-flex rounded-full border px-2.5 py-1 ${detail.recommendation ? recommendationClass(detail.recommendation) : "text-muted"}`}>
                  {uiLabel(t, detail.recommendation)}
                </p>
                <p className="mt-1 text-muted">
                  {detail.suggestedSalary}
                </p>
              </section>
            ) : null}

            {detail.score ? (
              <section>
                <h3 className="font-semibold">{t("candidate.score_notes")}</h3>
                <p className="mt-2 text-foreground">
                  {detail.score.strengths}
                </p>
                <p className="mt-2 text-muted">
                  {detail.score.risksAndGaps}
                </p>
                <p className="mt-2 text-foreground">
                  {detail.score.recommendationNarrative}
                </p>
                {detail.score.dealBreakerHit ? (
                  <p className="mt-2 font-medium text-danger">{t("candidate.deal_breaker_matched")}</p>
                ) : null}
                {detail.score.verificationPoints.length > 0 ? (
                  <ul className="mt-3 list-disc space-y-1 ps-5">
                    {detail.score.verificationPoints.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
                <ul className="mt-3 space-y-2">
                  {detail.score.scores.map((item) => (
                    <li key={item.criterion}>
                      <span className="font-medium">
                        {uiLabel(t, criterionLabel(item.criterion))} <bdi dir="ltr">{format.number(item.score)}/10</bdi>
                      </span>
                      <p className="text-muted">{item.evidence}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {detail.candidate ? (
              <section>
                <h3 className="font-semibold">{t("candidate.extracted_profile")}</h3>
                <dl className="mt-3 grid gap-2">
                  <div>
                    <dt className="text-muted">{t("candidate.phone")}</dt>
                    <dd dir="ltr">{detail.candidate.phone ?? t("candidate.not_specified")}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">{t("candidate.email")}</dt>
                    <dd dir="ltr">{detail.candidate.email ?? t("candidate.not_specified")}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">{t("candidate.nationality")}</dt>
                    <dd>{detail.candidate.nationality ?? t("status.not_stated")}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">{t("candidate.location")}</dt>
                    <dd>{detail.candidate.currentLocation ?? t("candidate.not_specified")}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">{t("candidate.current_title")}</dt>
                    <dd>{detail.candidate.currentTitle ?? t("candidate.not_specified")}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">{t("candidate.seniority")}</dt>
                    <dd>
                      {uiLabel(t, inferSeniority(detail.candidate.currentTitle, detail.candidate.totalYearsExperience))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">{t("candidate.years")}</dt>
                    <dd>{detail.candidate.totalYearsExperience ?? t("candidate.not_specified")}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">{t("candidate.technical_skills")}</dt>
                    <dd>{detail.candidate.technicalSkills.join(", ") || t("candidate.none")}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">{t("candidate.languages")}</dt>
                    <dd>{detail.candidate.languages.join(", ") || t("candidate.none")}</dd>
                  </div>
                </dl>
              </section>
            ) : null}

            <section>
              <h3 className="font-semibold">{t("candidate.original_text")}</h3>
              <pre dir="auto" className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-muted p-3 text-xs text-foreground">
                {detail.rawText || t("candidate.no_extracted_text")}
              </pre>
            </section>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
