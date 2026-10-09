"use client";
import { useUiFormatter } from "@/i18n/format";

import { uiLabel, type Translator } from "@/i18n/labels";

import { useTranslations, useLocale } from "next-intl";
import { ChevronDown } from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import {
  inputClassName,
  secondaryButtonClassName,
} from "@/components/wizard/styles";
import {
  SCORE_CRITERIA,
  type ScoreCriterionKey,
} from "@/lib/schemas/rubric";
import { recommendationClass, recommendationTextClass } from "@/lib/ui/tiers";
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

function metaLine(row: RankedCandidate, t: Translator): string {
  const years = candidateYears(row);
  return [
    candidateSeniority(row) === NOT_STATED ? null : uiLabel(t, candidateSeniority(row)),
    candidateNationality(row) === NOT_STATED ? null : candidateNationality(row),
    candidateLocation(row) === NOT_STATED ? null : candidateLocation(row),
    years === null ? null : t("common.years", {count: years}),
  ]
    .filter((item): item is string => Boolean(item))
    .join(" · ");
}

function RecommendationBadge({ tier }: { tier: RecommendationTier | null }) {
  const t = useTranslations();
  if (!tier) {
    return <span className="text-muted">—</span>;
  }
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${recommendationClass(tier)}`}
    >
      {uiLabel(t, recommendationLabel(tier))}
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
  const t = useTranslations();
  const format = useUiFormatter();

  const locale = useLocale();
  const [filters, setFilters] = useState<CandidateViewFilters>(EMPTY_CANDIDATE_FILTERS);
  const [sort, setSort] = useState<CandidateSort>("rank");
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [shortlistReady, setShortlistReady] = useState(false);
  const [showScores, setShowScores] = useState(false);
  const [copied, setCopied] = useState(false);
  const [candidateTableOpen, setCandidateTableOpen] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
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
    }, 0);
    return () => window.clearTimeout(timer);
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
    const text = formatShortlist(pickedRows, locale);
    if (text.length === 0) {
      return;
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function downloadView() {
    const csv = candidatesToCsv(visible, locale);
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
      <section className="rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">{t("results.find_candidates")}</h2>
            <p className="mt-1 text-sm text-muted">{t("results.every_list_below_is_built_from_the_cvs_in_this_job_choosing_one_filter_updates_the_others_")}</p>
          </div>
          <p className="text-sm text-muted">{t("common.showing", {shown: visible.length, total: rows.length})}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={t("results.quick_views")}>
          <button
            type="button"
            aria-pressed={!active}
            className={chipClass(!active)}
            onClick={clearFilters}
          >{t("results.all_scored")}</button>
          <button
            type="button"
            aria-pressed={interviewActive}
            className={chipClass(interviewActive)}
            onClick={() => {
              setFilters(interviewPreset());
              setSort("rank");
            }}
          >{t("results.ready_to_interview")}</button>
          <button
            type="button"
            aria-pressed={filters.shortlistOnly}
            className={chipClass(filters.shortlistOnly)}
            onClick={() => patch({ shortlistOnly: !filters.shortlistOnly })}
          >{t("results.shortlist_count", {count: pickedRows.length})}
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="sm:col-span-2 lg:col-span-4">
            <span className="mb-1 block text-xs font-medium text-muted">{t("results.search")}</span>
            <input dir="auto"
              className={selectClassName}
              type="search"
              placeholder={t("results.name_title_skill_employer")}
              value={filters.query}
              onChange={(event) => patch({ query: event.target.value })}
            />
          </label>
          <FilterSelect
            label={t("results.nationality")}
            value={filters.nationality}
            onChange={(nationality) => patch({ nationality })}
            options={options.nationalities}
          />
          <FilterSelect
            translateOptions
            label={t("results.seniority")}
            value={filters.seniority}
            onChange={(seniority) => patch({ seniority })}
            options={options.seniorities}
          />
          <FilterSelect
            label={t("results.language")}
            value={filters.language}
            onChange={(language) => patch({ language })}
            options={options.languages}
          />
          <FilterSelect
            translateOptions
            label={t("results.recommendation")}
            value={filters.recommendation}
            onChange={(recommendation) => patch({ recommendation })}
            options={options.recommendations}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input dir="auto"
              type="checkbox"
              checked={filters.hideDealBreakers}
              onChange={(event) => patch({ hideDealBreakers: event.target.checked })}
            />{t("results.hide_deal_breakers")}</label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted">{t("results.sort")}</span>
            <select
              className={selectClassName}
              value={sort}
              onChange={(event) => setSort(event.target.value as CandidateSort)}
            >
              <option value="rank">{t("results.score")}</option>
              <option value="name">{t("results.name")}</option>
              <option value="years">{t("results.years")}</option>
              <option value="nationality">{t("results.nationality")}</option>
            </select>
          </label>
          <button
            className={secondaryButtonClassName}
            type="button"
            disabled={!active && sort === "rank"}
            onClick={clearFilters}
          >{t("results.clear_filters")}</button>
          <button
            className={secondaryButtonClassName}
            type="button"
            disabled={visible.length === 0}
            onClick={downloadView}
          >{t("results.download_this_view")}</button>
          <button
            className={secondaryButtonClassName}
            type="button"
            disabled={pickedRows.length === 0}
            onClick={() => {
              void copyShortlist();
            }}
          >
            {copied ? t("results.copied") : t("results.copy_shortlist")}
          </button>
          <label className="flex items-center gap-2 text-sm">
            <input dir="auto"
              type="checkbox"
              checked={showScores}
              onChange={(event) => setShowScores(event.target.checked)}
            />{t("results.score_breakdown")}</label>
        </div>
      </section>

      {!active && rows.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">{t("results.top_15")}</h2>
          <ol className="grid gap-3 lg:grid-cols-2">
            {rows.slice(0, 15).map((row, index) => (
              <li key={row.id}>
                <article className="relative h-full rounded-xl border border-border bg-surface p-4">
                  <button
                    type="button"
                    className="absolute inset-0 z-0 rounded-xl hover:bg-surface-muted"
                    aria-label={t("common.select_item", {name: row.name ?? row.fileName})}
                    onClick={() => onOpen(row.id)}
                  />
                  <div className="pointer-events-none relative flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted">#{index + 1}</p>
                      <p className="font-medium"><bdi>{row.name ?? row.fileName}</bdi></p>
                      <p className="mt-1 text-xs text-muted">
                        {candidateTitle(row) ?? row.fileName}
                      </p>
                      {metaLine(row, t) ? (
                        <p className="mt-1 text-xs text-muted">{metaLine(row, t)}</p>
                      ) : null}
                    </div>
                    <p className={`text-lg font-semibold ${recommendationTextClass(row.recommendation)}`}>{row.totalScore == null ? "—" : format.number(row.totalScore)}</p>
                  </div>
                  <div className="relative z-10 mt-2 flex flex-wrap items-center gap-2">
                    <RecommendationBadge tier={row.recommendation} />
                    <label className="flex items-center gap-1.5 text-xs text-muted">
                      <input dir="auto"
                        type="checkbox"
                        checked={shortlisted.has(row.id)}
                        onChange={() => toggleShortlist(row.id)}
                      />{t("results.shortlist")}</label>
                  </div>
                  {row.dealBreakerHit ? (
                    <p className="pointer-events-none relative mt-2 text-xs font-medium text-danger">{t("results.deal_breaker")}</p>
                  ) : null}
                  <p className="pointer-events-none relative mt-2 line-clamp-2 text-sm text-muted">
                    {row.strengths ?? t("results.no_summary_yet")}
                  </p>
                  {showScores ? (
                    <dl className="pointer-events-none relative mt-3 grid grid-cols-4 gap-1 text-center text-[11px] sm:grid-cols-7">
                      {SCORE_CRITERIA.map((key) => (
                        <div key={key}>
                          <dt className="text-muted">
                            {t(`status.${key}`)}
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

      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        <h2>
          <button
            type="button"
            aria-expanded={candidateTableOpen}
            aria-controls="candidate-results-table"
            onClick={() => setCandidateTableOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start text-sm font-semibold hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span>{active ? t("results.matching_candidates") : t("results.all_scored_candidates")}</span>
            <ChevronDown
              className={`size-4 shrink-0 text-muted transition-transform ${candidateTableOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
        </h2>
        {candidateTableOpen ? (
          <div id="candidate-results-table" className="border-t border-border">
            {visible.length === 0 ? (
              <div className="px-4 py-8 text-sm text-muted">
                <p>{t("results.no_candidates_match_these_filters")}</p>
                <button
                  className={`${secondaryButtonClassName} mt-3`}
                  type="button"
                  onClick={clearFilters}
                >{t("results.clear_filters")}</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-start text-sm">
              <thead className="sticky top-0 bg-table-header text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2">{t("results.pick")}</th>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">{t("results.name")}</th>
                  <th className="px-3 py-2">{t("results.nationality")}</th>
                  <th className="px-3 py-2">{t("results.seniority")}</th>
                  <th className="px-3 py-2">{t("results.years")}</th>
                  <th className="px-3 py-2">{t("results.location")}</th>
                  <th className="px-3 py-2">{t("results.score")}</th>
                  <th className="px-3 py-2">{t("results.recommendation")}</th>
                  {showScores
                    ? SCORE_CRITERIA.map((key) => (
                        <th key={key} className="px-3 py-2">
                          {t(`status.${key}`)}
                        </th>
                      ))
                    : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-border ">
                {visible.map((row, index) => {
                  const years = candidateYears(row);
                  return (
                    <tr key={row.id} className="hover:bg-table-row-hover">
                      <td className="px-3 py-2">
                        <input dir="auto"
                          type="checkbox"
                          aria-label={t("results.shortlist_candidate", { name: row.name ?? row.fileName })}
                          checked={shortlisted.has(row.id)}
                          onChange={() => toggleShortlist(row.id)}
                        />
                      </td>
                      <td className="px-3 py-2 text-muted">{index + 1}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="text-start font-medium underline-offset-2 hover:underline"
                          onClick={() => onOpen(row.id)}
                        >
                          <bdi>{row.name ?? row.fileName}</bdi>
                        </button>
                        <p className="text-xs text-muted">
                          {candidateTitle(row) ?? row.fileName}
                        </p>
                        {row.dealBreakerHit ? (
                          <p className="text-xs font-medium text-danger">{t("results.deal_breaker")}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">{candidateNationality(row) === NOT_STATED ? t("status.not_stated") : candidateNationality(row)}</td>
                      <td className="px-3 py-2">{uiLabel(t, candidateSeniority(row))}</td>
                      <td className="px-3 py-2">{years ?? "—"}</td>
                      <td className="px-3 py-2">{candidateLocation(row) === NOT_STATED ? t("status.not_stated") : candidateLocation(row)}</td>
                      <td className={`px-3 py-2 font-medium ${recommendationTextClass(row.recommendation)}`}>{row.totalScore == null ? "—" : format.number(row.totalScore)}</td>
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
          </div>
        ) : null}
      </section>
    </div>
  );
}

function chipClass(active: boolean): string {
  return active
    ? "rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground"
    : "rounded-full border border-border-strong px-3 py-1 text-sm font-medium text-foreground hover:bg-surface-muted";
}

function FilterSelect({
  label,
  translateOptions = false,
  value,
  options,
  onChange,
}: {
  label: string;
  translateOptions?: boolean;
  value: string;
  options: readonly FilterChoice[];
  onChange: (value: string) => void;
}) {
  const t = useTranslations();

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
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <select
        className={selectClassName}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{t("results.any")}</option>
        {shown.map((option) => (
          <option key={option.value} value={option.value}>
            {option.count > 0 ? `${translateOptions || option.value === NOT_STATED ? uiLabel(t, option.label) : option.label} (${option.count})` : translateOptions || option.value === NOT_STATED ? uiLabel(t, option.label) : option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
