"use client";

import { useEffect } from "react";
import { secondaryButtonClassName } from "@/components/wizard/styles";
import { CRITERION_LABELS, type ScoreCriterionKey } from "@/lib/schemas/rubric";
import type { CvDetail } from "@/lib/schemas/screening";
import {
  displayNationality,
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
        aria-label="Close candidate details"
        className="absolute inset-0 bg-zinc-950/40"
        type="button"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cv-drawer-title"
        className="relative z-10 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="cv-drawer-title" className="text-lg font-semibold">
              {detail?.candidate?.fullName ?? detail?.fileName ?? "Candidate"}
            </h2>
            {detail ? (
              <p className="mt-1 text-sm text-zinc-500">
                {detail.fileName}
                {detail.totalScore !== null ? ` · ${detail.totalScore}` : ""}
              </p>
            ) : null}
          </div>
          <button className={secondaryButtonClassName} type="button" onClick={onClose}>
            Close
          </button>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-zinc-500">Loading candidate…</p>
        ) : null}
        {error ? (
          <p className="mt-6 text-sm text-red-700 dark:text-red-300">{error}</p>
        ) : null}

        {detail ? (
          <div className="mt-6 space-y-6 text-sm">
            {detail.hasFile ? (
              <a
                href={`/jobs/${detail.jobId}/files/${detail.id}`}
                className="inline-flex items-center text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
              >
                Download original CV
              </a>
            ) : null}

            {detail.recommendation || detail.suggestedSalary ? (
              <section>
                <h3 className="font-semibold">Recommendation</h3>
                <p className="mt-2 text-zinc-700 dark:text-zinc-300">
                  {detail.recommendation ?? "—"}
                </p>
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                  {detail.suggestedSalary}
                </p>
              </section>
            ) : null}

            {detail.score ? (
              <section>
                <h3 className="font-semibold">Score notes</h3>
                <p className="mt-2 text-zinc-700 dark:text-zinc-300">
                  {detail.score.strengths}
                </p>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                  {detail.score.risksAndGaps}
                </p>
                <p className="mt-2 text-zinc-700 dark:text-zinc-300">
                  {detail.score.recommendationNarrative}
                </p>
                {detail.score.dealBreakerHit ? (
                  <p className="mt-2 font-medium text-red-700 dark:text-red-300">
                    Deal-breaker matched
                  </p>
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
                        {criterionLabel(item.criterion)} {item.score}/10
                      </span>
                      <p className="text-zinc-600 dark:text-zinc-400">{item.evidence}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {detail.candidate ? (
              <section>
                <h3 className="font-semibold">Extracted profile</h3>
                <dl className="mt-3 grid gap-2">
                  <div>
                    <dt className="text-zinc-500">Phone</dt>
                    <dd>{detail.candidate.phone ?? "Not specified"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Email</dt>
                    <dd>{detail.candidate.email ?? "Not specified"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Nationality</dt>
                    <dd>{displayNationality(detail.candidate.nationality)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Location</dt>
                    <dd>{detail.candidate.currentLocation ?? "Not specified"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Current title</dt>
                    <dd>{detail.candidate.currentTitle ?? "Not specified"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Seniority</dt>
                    <dd>
                      {inferSeniority(
                        detail.candidate.currentTitle,
                        detail.candidate.totalYearsExperience,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Years</dt>
                    <dd>{detail.candidate.totalYearsExperience ?? "Not specified"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Technical skills</dt>
                    <dd>{detail.candidate.technicalSkills.join(", ") || "None"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Languages</dt>
                    <dd>{detail.candidate.languages.join(", ") || "None"}</dd>
                  </div>
                </dl>
              </section>
            ) : null}

            <section>
              <h3 className="font-semibold">Original text</h3>
              <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                {detail.rawText || "No extracted text"}
              </pre>
            </section>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
