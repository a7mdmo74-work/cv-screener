"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { inputClassName, secondaryButtonClassName } from "@/components/wizard/styles";
import type { JobListItem } from "@/actions/jobs";
import type { JobStatus } from "@/lib/schemas/job";

const statusLabel: Record<JobStatus, string> = {
  draft: "Draft",
  queued: "Queued",
  running: "Running",
  done: "Done",
  partial: "Partial",
  cancelled: "Cancelled",
  failed: "Failed",
};

const statusFilters = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "active", label: "In progress" },
  { id: "partial", label: "Partial" },
  { id: "done", label: "Done" },
  { id: "other", label: "Cancelled or failed" },
] as const;

type StatusFilter = (typeof statusFilters)[number]["id"];

function matchesStatus(status: JobStatus, filter: StatusFilter): boolean {
  if (filter === "all") {
    return true;
  }
  if (filter === "draft") {
    return status === "draft";
  }
  if (filter === "active") {
    return status === "queued" || status === "running";
  }
  if (filter === "partial") {
    return status === "partial";
  }
  if (filter === "done") {
    return status === "done";
  }
  return status === "cancelled" || status === "failed";
}

export function JobListClient({ jobs }: { jobs: JobListItem[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const visibleJobs = useMemo(() => {
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => term.length > 0);
    return jobs.filter((job) => {
      if (!matchesStatus(job.status, statusFilter)) {
        return false;
      }
      if (terms.length === 0) {
        return true;
      }
      return terms.every((term) => job.title.toLowerCase().includes(term));
    });
  }, [jobs, query, statusFilter]);
  const exportHref =
    selected.length > 0
      ? `/export/summary/docx?jobIds=${selected.join(",")}`
      : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="w-full sm:max-w-sm">
          <span className="mb-1 block text-xs font-medium text-zinc-500">Search jobs</span>
          <input
            className={inputClassName}
            type="search"
            placeholder="Job title"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Job status">
          {statusFilters.map((filter) => {
            const active = statusFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                aria-pressed={active}
                className={
                  active
                    ? "rounded-full bg-zinc-900 px-3 py-1 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "rounded-full border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                }
                onClick={() => setStatusFilter(filter.id)}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Showing {visibleJobs.length} of {jobs.length}. Select jobs to export a
          unified Word summary.
        </p>
        {exportHref ? (
          <a href={exportHref} className={secondaryButtonClassName}>
            Export unified summary (Word)
          </a>
        ) : (
          <button className={secondaryButtonClassName} disabled type="button">
            Export unified summary (Word)
          </button>
        )}
      </div>
      {visibleJobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
          No jobs match this search.
        </div>
      ) : (
      <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
        {visibleJobs.map((job) => {
          const checked = selectedSet.has(job.id);
          return (
            <li key={job.id} className="flex items-stretch">
              <label className="flex items-center px-4">
                <span className="sr-only">Select {job.title}</span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, job.id]
                        : current.filter((id) => id !== job.id),
                    );
                  }}
                />
              </label>
              <Link
                href={`/jobs/${job.id}`}
                className="flex flex-1 flex-col gap-2 px-2 py-4 hover:bg-zinc-50 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-zinc-900"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {job.title}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {job.cvCount} {job.cvCount === 1 ? "CV" : "CVs"}
                    {job.twoPass ? " · Two-pass" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
                    {statusLabel[job.status]}
                  </span>
                  <time
                    className="text-zinc-500 dark:text-zinc-400"
                    dateTime={job.createdAt}
                  >
                    {job.createdAt.slice(0, 10)}
                  </time>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      )}
    </div>
  );
}
