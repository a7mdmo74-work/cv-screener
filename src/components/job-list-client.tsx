"use client";
import { jobStatusKeys } from "@/i18n/labels";
import { uiLabel } from "@/i18n/labels";

import { useTranslations, useFormatter } from "next-intl";

import { Link } from "@/i18n/navigation";
import { useMemo, useState } from "react";
import { deleteJobs } from "@/actions/jobs";
import { errorText } from "@/i18n/errors";
import { inputClassName } from "@/components/wizard/styles";
import type { JobListItem } from "@/actions/jobs";
import type { JobStatus } from "@/lib/schemas/job";

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

export function JobListClient({
  jobs,
  canDelete,
}: {
  jobs: JobListItem[];
  canDelete: boolean;
}) {
  const t = useTranslations();
  const format = useFormatter();

  const [selected, setSelected] = useState<string[]>([]);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
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

  async function handleDeleteSelected() {
    if (
      selected.length === 0 ||
      !window.confirm(t("jobs.confirm_delete_jobs", { count: selected.length }))
    ) {
      return;
    }

    setDeletePending(true);
    setDeleteMessage(null);
    try {
      const result = await deleteJobs(selected);
      if (!result.ok) {
        setDeleteMessage(errorText(t, result.error));
        return;
      }
      setSelected((current) =>
        current.filter((id) => !result.data.deletedIds.includes(id)),
      );
      setDeleteMessage(
        result.data.cleanupFailedIds.length > 0
          ? t("jobs.delete_cleanup_warning", {
              count: result.data.cleanupFailedIds.length,
            })
          : t("jobs.jobs_deleted", { count: result.data.deletedIds.length }),
      );
    } catch {
      setDeleteMessage(errorText(t, "UNKNOWN"));
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="w-full sm:max-w-sm">
          <span className="mb-1 block text-xs font-medium text-muted">{t("jobs.search_jobs")}</span>
          <input dir="auto"
            className={inputClassName}
            type="search"
            placeholder={t("jobs.job_title")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("jobs.job_status")}>
          {statusFilters.map((filter) => {
            const active = statusFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                aria-pressed={active}
                className={
                  active
                    ? "rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground"
                    : "rounded-full border border-border-strong px-3 py-1 text-sm font-medium text-foreground hover:bg-surface-muted"
                }
                onClick={() => setStatusFilter(filter.id)}
              >
                {uiLabel(t, filter.label)}
              </button>
            );
          })}
        </div>
      </div>

      {canDelete && selected.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            {t("jobs.selected_jobs", { count: selected.length })}
          </p>
          <button
            type="button"
            disabled={deletePending}
            onClick={handleDeleteSelected}
            className="inline-flex items-center justify-center rounded-lg border border-danger px-4 py-2 text-sm font-medium text-danger hover:bg-danger-bg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deletePending ? t("jobs.deleting_jobs") : t("jobs.delete_selected")}
          </button>
        </div>
      )}
      {deleteMessage && (
        <p role="status" className="rounded-lg border border-border bg-surface p-3 text-sm text-foreground">
          {deleteMessage}
        </p>
      )}

      {visibleJobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-strong bg-surface p-8 text-sm text-muted">{t("jobs.no_jobs_match_this_search")}</div>
      ) : (
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {visibleJobs.map((job) => {
          const checked = selectedSet.has(job.id);
          return (
            <li key={job.id} className="flex items-stretch">
              <label className="flex items-center px-4">
                <span className="sr-only">{t("common.select_item", {name: job.title})}</span>
                <input dir="auto"
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
                className="flex flex-1 flex-col gap-2 px-2 py-4 hover:bg-surface-muted sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-foreground">
                    <bdi>{job.title}</bdi>
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {t("common.cv_count", {count: job.cvCount})}
                    {job.twoPass ? t("jobs.two_pass") : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-foreground">
                    {t(jobStatusKeys[job.status])}
                  </span>
                  <time
                    className="text-muted"
                    dateTime={job.createdAt}
                  >
                    {format.dateTime(new Date(job.createdAt), "standard")}
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
