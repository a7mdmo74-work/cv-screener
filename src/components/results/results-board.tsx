"use client";

import { useEffect, useMemo, useState } from "react";
import {
  inputClassName,
  secondaryButtonClassName,
} from "@/components/wizard/styles";
import {
  CRITERION_LABELS,
  SCORE_CRITERIA,
  type ScoreCriterionKey,
} from "@/lib/schemas/rubric";
import type { RecommendationTier } from "@/lib/schemas/score";
import type { RankedCandidate } from "@/lib/schemas/screening";
import {
  candidateLocation,
  candidateNationality,
  candidateSeniority,
  candidateTitle,
  candidateYears,
  candidatesToCsv,
  collectFilterOptions,
  EMPTY_CANDIDATE_FILTERS,
  facetIsUseful,
  filterCandidates,
  filtersAreActive,
  formatShortlist,
  interviewPreset,
  isInterviewPreset,
  NOT_STATED,
  recommendationLabel,
  type CandidateSort,
  type CandidateViewFilters,
  type FilterChoice,
} from "@/lib/screening/candidate-filters";

const RECOMMENDATION_BADGE: Record<RecommendationTier, string> = {
  "Strong candidate — recommend technical interview":
    "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  "Good — conditional interview":
    "bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  "Average — reserve list":
    "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  "Not suitable at this time":
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

const selectClassName = `${inputClassName} py-1.5`;

function scoreFor(
  scores: RankedCandidate["scores"],
  key: ScoreCriterionKey,
): string {
  const match = scores.find((item) => item.criterion === key);
  return match ? match.score.toFixed(1) : "—";
}

function shortlistKey(jobId: string): string {
  return `cv-screener-shortlist:${jobId}`;
}

function metaLine(row: RankedCandidate): string {
  const years = candidateYears(row);
  return [
    candidateSeniority(row) === NOT_STATED ? null : candidateSeniority(row),
    candidateNationality(row) === NOT_STATED ? null : candidateNationality(row),
    candidateLocation(row) === NOT_STATED ? null : candidateLocation(row),
    years === null ? null : `${years} yrs`,
  ]
    .filter((item): item is string => Boolean(item))
    .join(" · ");
}

function RecommendationBadge({ tier }: { tier: RecommendationTier | null }) {
  if (!tier) {
    return <span className="text-zinc-500">—</span>;
  }
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${RECOMMENDATION_BADGE[tier]}`}
    >
      {recommendationLabel(tier)}
    </span>
  );
}

export function ResultsBoard({
  jobId,
  rows,
  onOpen,
}: {
  jobId: string;
  rows: RankedCandidate[];
  onOpen: (cvId: string) => void;
}) {
  const [filters, setFilters] = useState<CandidateViewFilters>(EMPTY_CANDIDATE_FILTERS);
  const [sort, setSort] = useState<CandidateSort>("rank");
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [shortlistReady, setShortlistReady] = useState(false);
  const [showScores, setShowScores] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(shortlistKey(jobId));
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      setShortlist(
        Array.isArray(parsed)
          ? parsed.filter((item): item is string => typeof item === "string")
          : [],
      );
    } catch {
      setShortlist([]);
    }
    setShortlistReady(true);
  }, [jobId]);

  useEffect(() => {
    if (!shortlistReady) {
      return;
    }
    window.localStorage.setItem(shortlistKey(jobId), JSON.stringify(shortlist));
  }, [jobId, shortlist, shortlistReady]);

  const shortlisted = useMemo(() => new Set(shortlist), [shortlist]);
  const options = useMemo(
    () => collectFilterOptions(rows, filters, shortlisted),
    [rows, filters, shortlisted],
  );
  const visible = useMemo(
    () => filterCandidates(rows, filters, shortlisted, sort),
    [rows, filters, shortlisted, sort],
  );
  const active = filtersAreActive(filters);
  const interviewActive = isInterviewPreset(filters);
  const pickedRows = rows.filter((row) => shortlisted.has(row.id));

  function patch(next: Partial<CandidateViewFilters>) {
    setFilters((current) => ({ ...current, ...next }));
  }

  function clearFilters() {
    setFilters(EMPTY_CANDIDATE_FILTERS);
    setSort("rank");
  }

  function toggleShortlist(id: string) {
    setShortlist((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function copyShortlist() {
    const text = formatShortlist(pickedRows);
    if (text.length === 0) {
      return;
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function downloadView() {
    const csv = candidatesToCsv(visible);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `candidates-${jobId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Find candidates</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Every list below is built from the CVs in this job. Choosing one
              filter updates the others. Nationality is for planning only —
              scores ignore it.
            </p>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Showing {visible.length} of {rows.length}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Quick views">
          <button
            type="button"
            aria-pressed={!active}
            className={chipClass(!active)}
            onClick={clearFilters}
          >
            All scored
          </button>
          <button
            type="button"
            aria-pressed={interviewActive}
            className={chipClass(interviewActive)}
            onClick={() => {
              setFilters(interviewPreset());
              setSort("rank");
            }}
          >
            Ready to interview
          </button>
          <button
            type="button"
            aria-pressed={filters.shortlistOnly}
            className={chipClass(filters.shortlistOnly)}
            onClick={() => patch({ shortlistOnly: !filters.shortlistOnly })}
          >
            My shortlist ({pickedRows.length})
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="sm:col-span-2 lg:col-span-4">
            <span className="mb-1 block text-xs font-medium text-zinc-500">Search</span>
            <input
              className={selectClassName}
              type="search"
              placeholder="Name, title, skill, employer"
              value={filters.query}
              onChange={(event) => patch({ query: event.target.value })}
            />
          </label>
          <FilterSelect
            label="Nationality"
            value={filters.nationality}
            onChange={(nationality) => patch({ nationality })}
            options={options.nationalities}
          />
          <FilterSelect
            label="Seniority"
            value={filters.seniority}
            onChange={(seniority) => patch({ seniority })}
            options={options.seniorities}
          />
          <FilterSelect
            label="Language"
            value={filters.language}
            onChange={(language) => patch({ language })}
            options={options.languages}
          />
          <FilterSelect
            label="Recommendation"
            value={filters.recommendation}
            onChange={(recommendation) => patch({ recommendation })}
            options={options.recommendations}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filters.hideDealBreakers}
              onChange={(event) => patch({ hideDealBreakers: event.target.checked })}
            />
            Hide deal-breakers
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-zinc-500">Sort</span>
            <select
              className={selectClassName}
              value={sort}
              onChange={(event) => setSort(event.target.value as CandidateSort)}
            >
              <option value="rank">Score</option>
              <option value="name">Name</option>
              <option value="years">Years</option>
              <option value="nationality">Nationality</option>
            </select>
          </label>
          <button
            className={secondaryButtonClassName}
            type="button"
            disabled={!active && sort === "rank"}
            onClick={clearFilters}
          >
            Clear filters
          </button>
          <button
            className={secondaryButtonClassName}
            type="button"
            disabled={visible.length === 0}
            onClick={downloadView}
          >
            Download this view
          </button>
          <button
            className={secondaryButtonClassName}
            type="button"
            disabled={pickedRows.length === 0}
            onClick={() => {
              void copyShortlist();
            }}
          >
            {copied ? "Copied" : "Copy shortlist"}
          </button>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showScores}
              onChange={(event) => setShowScores(event.target.checked)}
            />
            Score breakdown
          </label>
        </div>
      </section>

      {!active && rows.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Top 15</h2>
          <ol className="grid gap-3 lg:grid-cols-2">
            {rows.slice(0, 15).map((row, index) => (
              <li key={row.id}>
                <article className="relative h-full rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <button
                    type="button"
                    className="absolute inset-0 z-0 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    aria-label={`Open ${row.name ?? row.fileName}`}
                    onClick={() => onOpen(row.id)}
                  />
                  <div className="pointer-events-none relative flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-zinc-500">#{index + 1}</p>
                      <p className="font-medium">{row.name ?? row.fileName}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {candidateTitle(row) ?? row.fileName}
                      </p>
                      {metaLine(row) ? (
                        <p className="mt-1 text-xs text-zinc-500">{metaLine(row)}</p>
                      ) : null}
                    </div>
                    <p className="text-lg font-semibold">{row.totalScore ?? "—"}</p>
                  </div>
                  <div className="relative z-10 mt-2 flex flex-wrap items-center gap-2">
                    <RecommendationBadge tier={row.recommendation} />
                    <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                      <input
                        type="checkbox"
                        checked={shortlisted.has(row.id)}
                        onChange={() => toggleShortlist(row.id)}
                      />
                      Shortlist
                    </label>
                  </div>
                  {row.dealBreakerHit ? (
                    <p className="pointer-events-none relative mt-2 text-xs font-medium text-red-700 dark:text-red-300">
                      Deal-breaker
                    </p>
                  ) : null}
                  <p className="pointer-events-none relative mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {row.strengths ?? "No summary yet"}
                  </p>
                  {showScores ? (
                    <dl className="pointer-events-none relative mt-3 grid grid-cols-4 gap-1 text-center text-[11px] sm:grid-cols-7">
                      {SCORE_CRITERIA.map((key) => (
                        <div key={key}>
                          <dt className="text-zinc-500">
                            {CRITERION_LABELS[key].split(" ")[0]}
                          </dt>
                          <dd className="font-medium">{scoreFor(row.scores, key)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </article>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold dark:border-zinc-800">
          {active ? "Matching candidates" : "All scored candidates"}
        </div>
        {visible.length === 0 ? (
          <div className="px-4 py-8 text-sm text-zinc-600 dark:text-zinc-400">
            <p>No candidates match these filters.</p>
            <button
              className={`${secondaryButtonClassName} mt-3`}
              type="button"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900">
                <tr>
                  <th className="px-3 py-2">Pick</th>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Nationality</th>
                  <th className="px-3 py-2">Seniority</th>
                  <th className="px-3 py-2">Years</th>
                  <th className="px-3 py-2">Location</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">Recommendation</th>
                  {showScores
                    ? SCORE_CRITERIA.map((key) => (
                        <th key={key} className="px-3 py-2">
                          {CRITERION_LABELS[key]}
                        </th>
                      ))
                    : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {visible.map((row, index) => {
                  const years = candidateYears(row);
                  return (
                    <tr key={row.id}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          aria-label={`Shortlist ${row.name ?? row.fileName}`}
                          checked={shortlisted.has(row.id)}
                          onChange={() => toggleShortlist(row.id)}
                        />
                      </td>
                      <td className="px-3 py-2 text-zinc-500">{index + 1}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="text-left font-medium underline-offset-2 hover:underline"
                          onClick={() => onOpen(row.id)}
                        >
                          {row.name ?? row.fileName}
                        </button>
                        <p className="text-xs text-zinc-500">
                          {candidateTitle(row) ?? row.fileName}
                        </p>
                        {row.dealBreakerHit ? (
                          <p className="text-xs font-medium text-red-700 dark:text-red-300">
                            Deal-breaker
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">{candidateNationality(row)}</td>
                      <td className="px-3 py-2">{candidateSeniority(row)}</td>
                      <td className="px-3 py-2">{years ?? "—"}</td>
                      <td className="px-3 py-2">{candidateLocation(row)}</td>
                      <td className="px-3 py-2">{row.totalScore ?? "—"}</td>
                      <td className="px-3 py-2">
                        <RecommendationBadge tier={row.recommendation} />
                      </td>
                      {showScores
                        ? SCORE_CRITERIA.map((key) => (
                            <td key={key} className="px-3 py-2">
                              {scoreFor(row.scores, key)}
                            </td>
                          ))
                        : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function chipClass(active: boolean): string {
  return active
    ? "rounded-full bg-zinc-900 px-3 py-1 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
    : "rounded-full border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900";
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly FilterChoice[];
  onChange: (value: string) => void;
}) {
  if ((options.length < 2 || !facetIsUseful(options)) && value.length === 0) {
    return null;
  }
  const shown =
    value.length > 0 &&
    !options.some((option) => option.value.toLowerCase() === value.toLowerCase())
      ? [{ value, label: value, count: 0 }, ...options]
      : options;

  return (
    <label>
      <span className="mb-1 block text-xs font-medium text-zinc-500">{label}</span>
      <select
        className={selectClassName}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Any</option>
        {shown.map((option) => (
          <option key={option.value} value={option.value}>
            {option.count > 0 ? `${option.label} (${option.count})` : option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
