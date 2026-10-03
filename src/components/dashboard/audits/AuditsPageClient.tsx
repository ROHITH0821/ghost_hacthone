"use client";

import { FeedbackState } from "@/components/ui/FeedbackState";

import { memo, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { LocalTime } from "@/components/ui/LocalTime";
import { BulkSelectBar } from "@/components/dashboard/BulkSelectBar";
import { FilterBar } from "@/components/dashboard/filters/FilterBar";
import { DebouncedSearchInput } from "@/components/dashboard/filters/DebouncedSearchInput";
import { useDashboard } from "@/components/dashboard/shell/DashboardContext";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";
import type { AuditMissionRow } from "@/lib/db/missions";
import {
  EMPTY_AUDITS_FILTERS,
  parseAuditsFilters,
  serializeAuditsFilters,
  type AuditsFilterState,
} from "@/lib/dashboard/filters";
import { AUDIT_FILTER_TYPES, AUDIT_TYPE_LABELS, auditDepthKind, type AuditType } from "@/lib/plans";
import { copy } from "@/lib/copy";
import { isMarketIntelPending } from "@/lib/competitor-intelligence/intel-pending";
import { dashboardNewAuditHref, dashboardComparisonsHref } from "@/lib/auth/new-audit-href";
import { dashboardKeys } from "@/lib/dashboard/query-keys";
import { useDashboardQuery } from "@/hooks/useDashboardQuery";
import { DashboardPageLoading } from "@/components/dashboard/DashboardPageLoading";

const STATUS_STYLES: Record<string, string> = {
  running: "border-ai-blue/30 bg-ai-blue/10 text-ai-blue",
  complete: "border-neon-green/30 bg-neon-green/10 text-neon-green",
  error: "border-danger/30 bg-danger/10 text-danger",
};

type ClientOption = { id: string; name: string; primaryDomain: string };

const AuditTableRow = memo(function AuditTableRow({
  mission,
  selected,
  onToggle,
}: {
  mission: AuditMissionRow;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  const stage = mission.progress?.currentStage ?? "opening";
  const progress =
    typeof mission.progress?.stageProgress === "number" ? mission.progress.stageProgress : null;
  const auditLabel =
    AUDIT_TYPE_LABELS[(mission.auditType as AuditType) ?? "quick"] ?? mission.auditType;
  const depthTitle =
    copy.auditDepth[auditDepthKind({ auditType: mission.auditType })].title;
  const intelPending =
    mission.status === "complete" &&
    mission.auditType === "deep" &&
    isMarketIntelPending({
      hasIntel: mission.hasIntel,
      intelStatus: mission.intelStatus,
    });
  const statusCls = intelPending
    ? "border-violet/30 bg-violet/10 text-violet"
    : STATUS_STYLES[mission.status] ?? "border-border bg-midnight/70 text-muted";
  const statusLabel = intelPending
    ? copy.dashboardAudits.intelInProgress
    : mission.status;
  const comparisonsHref = dashboardComparisonsHref(
    mission.siteId ?? mission.domain,
  );

  return (
    <tr className="border-b border-border/40">
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(mission.id)}
          className="h-4 w-4 accent-violet"
          aria-label={`Select ${mission.domain}`}
        />
      </td>
      <td className="px-4 py-3 text-sm text-ghost-white/90">
        {mission.domain}
        {mission.clientName && (
          <p className="text-xs text-muted">{mission.clientName}</p>
        )}
      </td>
      <td className="hidden px-4 py-3 text-sm text-muted-light sm:table-cell">{auditLabel}</td>
      <td className="hidden px-4 py-3 text-sm text-muted-light md:table-cell">
        {depthTitle}
      </td>
      <td className="px-4 py-3 text-sm">
        {mission.score != null ? (
          <span className="text-ghost-white">
            {Math.round(mission.score)}
            {mission.scoreDelta != null && mission.scoreDelta !== 0 && (
              <span
                className={`ml-1 text-xs ${mission.scoreDelta > 0 ? "text-neon-green" : "text-danger"}`}
              >
                ({mission.scoreDelta > 0 ? "+" : ""}
                {mission.scoreDelta})
              </span>
            )}
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${statusCls}`}
        >
          {statusLabel}
        </span>
        {mission.status === "running" && progress != null && (
          <div className="mt-2 hidden lg:block">
            <p className="text-xs text-muted">
              {stage} · {progress}%
            </p>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-midnight">
              <div
                className="h-full rounded-full bg-ai-blue transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        {intelPending && (
          <p className="mt-1 hidden text-xs text-violet lg:block">In progress</p>
        )}
      </td>
      <td className="hidden px-4 py-3 text-sm text-muted-light lg:table-cell">
        <LocalTime date={mission.createdAt} />
      </td>
      <td className="px-4 py-3 text-right">
        {mission.status === "complete" && (
          <div className="flex justify-end gap-2">
            <Link
              href={`/results/${mission.id}`}
              className="text-sm text-violet hover:underline"
            >
              Report
            </Link>
            {mission.auditType === "deep" && (
              <Link
                href={comparisonsHref}
                className="text-sm text-violet hover:underline"
              >
                {copy.dashboardAudits.viewComparisons}
              </Link>
            )}
            <a aria-label={`Download report for ${mission.domain}`} href={`/api/reports/${mission.id}/pdf?download=1`} className="text-muted-light">
              <Download className="h-4 w-4" />
            </a>
          </div>
        )}
        {mission.status === "running" && (
          <Link href={`/mission/${mission.id}`} className="text-sm text-violet hover:underline">
            Live
          </Link>
        )}
        {mission.status === "error" && (
          <Link href={dashboardNewAuditHref(mission.url)} className="text-sm text-violet hover:underline">
            Retry
          </Link>
        )}
      </td>
    </tr>
  );
});

export function AuditsPageClient() {
  const { user, isAgencyUser } = useDashboard();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const {
    filters,
    updateField,
    presets,
    presetName,
    setPresetName,
    applyPreset,
    saveCurrentAsPreset,
    removePreset,
    clearFilters,
    hasActiveFilters,
  } = useDashboardFilters<AuditsFilterState>({
    pageKey: "audits",
    userId: user.id,
    empty: EMPTY_AUDITS_FILTERS,
    parse: parseAuditsFilters,
    serialize: serializeAuditsFilters,
  });

  const filterQuery = useMemo(() => serializeAuditsFilters(filters), [filters]);

  const { data, isPending, isError, error, refetch } = useDashboardQuery<{
    audits: AuditMissionRow[];
    clients: ClientOption[];
  }>({
    queryKey: dashboardKeys.audits(filterQuery),
    path: `/api/dashboard/audits${filterQuery ? `?${filterQuery}` : ""}`,
    refetchInterval: (query) => {
      const rows = query.state.data?.audits ?? [];
      const pending = rows.some(
        (m) =>
          m.status === "complete" &&
          m.auditType === "deep" &&
          isMarketIntelPending({
            hasIntel: m.hasIntel,
            intelStatus: m.intelStatus,
          }),
      );
      return pending ? 4000 : false;
    },
  });

  const audits = useMemo(() => data?.audits ?? [], [data?.audits]);
  const clients = data?.clients ?? [];

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectedMissions = useMemo(
    () => audits.filter((m) => selected.has(m.id)),
    [audits, selected]
  );

  const completeSelected = useMemo(
    () => selectedMissions.filter((m) => m.status === "complete"),
    [selectedMissions]
  );

  const openReports = useCallback(() => {
    if (completeSelected.length > 10) {
      alert(copy.dashboardBulk.maxOpen);
      return;
    }
    if (!window.confirm(copy.dashboardBulk.confirmOpen(completeSelected.length))) return;
    for (const m of completeSelected) {
      window.open(`/results/${m.id}`, "_blank", "noopener,noreferrer");
    }
  }, [completeSelected]);

  const downloadPdfs = useCallback(() => {
    for (const m of completeSelected) {
      window.open(`/api/reports/${m.id}/pdf?download=1`, "_blank", "noopener,noreferrer");
    }
  }, [completeSelected]);

  if (isPending && !data) return <DashboardPageLoading />;
  if (isError) return <FeedbackState title="Couldn’t load audits" description="Check your connection and try again. Your saved work has not changed." onRetry={() => void refetch()} />;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-heading text-2xl font-semibold text-ghost-white">
          {copy.dashboardShell.pages.audits}
        </h2>
        <p className="mt-2 text-sm text-muted">{copy.dashboardAudits.subtitle}</p>
      </header>

      <FilterBar
        presets={presets}
        presetName={presetName}
        onPresetNameChange={setPresetName}
        onSavePreset={saveCurrentAsPreset}
        onApplyPreset={applyPreset}
        onRemovePreset={removePreset}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
      >
        <DebouncedSearchInput
          value={filters.search}
          onCommit={(next) => updateField("search", next)}
          placeholder={copy.dashboardAudits.filters.search}
          className="h-10 rounded-xl border border-border/60 bg-midnight/40 px-4 text-sm text-ghost-white outline-none focus:border-violet/40 sm:min-w-[200px]"
        />
        <select
          aria-label="Audit status"
          value={filters.status}
          onChange={(e) => updateField("status", e.target.value)}
          className="h-10 rounded-xl border border-border/60 bg-midnight/40 px-4 text-sm text-ghost-white outline-none"
        >
          <option value="">{copy.dashboardAudits.filters.all} statuses</option>
          <option value="queued">{copy.dashboardAudits.filters.queued}</option>
          <option value="running">Running</option>
          <option value="complete">Complete</option>
          <option value="error">Failed</option>
        </select>
        <select
          aria-label="Audit type"
          value={filters.auditType}
          onChange={(e) => updateField("auditType", e.target.value)}
          className="h-10 rounded-xl border border-border/60 bg-midnight/40 px-4 text-sm text-ghost-white outline-none"
        >
          <option value="">{copy.dashboardAudits.filters.all} types</option>
          {AUDIT_FILTER_TYPES.map((type) => (
            <option key={type} value={type}>
              {AUDIT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={filters.from}
          onChange={(e) => updateField("from", e.target.value)}
          className="h-10 rounded-xl border border-border/60 bg-midnight/40 px-4 text-sm text-ghost-white outline-none"
          aria-label={copy.dashboardFilters.dateFrom}
        />
        <input
          type="date"
          value={filters.to}
          onChange={(e) => updateField("to", e.target.value)}
          className="h-10 rounded-xl border border-border/60 bg-midnight/40 px-4 text-sm text-ghost-white outline-none"
          aria-label={copy.dashboardFilters.dateTo}
        />
        {isAgencyUser && clients.length > 0 && (
          <select
            aria-label="Client"
            value={filters.clientId}
            onChange={(e) => updateField("clientId", e.target.value)}
            className="h-10 rounded-xl border border-border/60 bg-midnight/40 px-4 text-sm text-ghost-white outline-none"
          >
            <option value="">{copy.dashboardFilters.client}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </FilterBar>

      {audits.length === 0 ? (
        <p className="text-sm text-muted">{copy.dashboardAudits.empty}</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-border/60 md:block">
            <table className="w-full min-w-[720px] text-left">
              <thead className="border-b border-border/60 bg-midnight/40 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 w-10" />
                  <th className="px-4 py-3">{copy.dashboardAudits.columns.site}</th>
                  <th className="hidden px-4 py-3 sm:table-cell">{copy.dashboardAudits.columns.type}</th>
                  <th className="hidden px-4 py-3 md:table-cell">{copy.dashboardAudits.columns.depth}</th>
                  <th className="px-4 py-3">{copy.dashboardAudits.columns.score}</th>
                  <th className="px-4 py-3">{copy.dashboardAudits.columns.status}</th>
                  <th className="hidden px-4 py-3 lg:table-cell">{copy.dashboardAudits.columns.started}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {audits.map((m) => (
                  <AuditTableRow
                    key={m.id}
                    mission={m}
                    selected={selected.has(m.id)}
                    onToggle={toggleSelect}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {audits.map((m) => (
              <div
                key={m.id}
                className="rounded-2xl border border-border/60 bg-midnight/40 p-4"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${m.domain}`}
                    checked={selected.has(m.id)}
                    onChange={() => toggleSelect(m.id)}
                    className="mt-1 h-4 w-4 accent-violet"
                  />
                  <div>
                    <p className="font-medium text-ghost-white">{m.domain}</p>
                    <p className="mt-1 text-xs text-muted">
                      {AUDIT_TYPE_LABELS[(m.auditType as AuditType) ?? "quick"]} ·{" "}
                      {m.status === "complete" &&
                      m.auditType === "deep" &&
                      isMarketIntelPending({
                        hasIntel: m.hasIntel,
                        intelStatus: m.intelStatus,
                      })
                        ? copy.dashboardAudits.intelInProgress
                        : m.status}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      {m.score != null && <span className="text-sm text-muted-light">Score <strong className="text-ghost-white">{Math.round(m.score)}/100</strong></span>}
                      <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-violet" href={m.status === "complete" ? `/results/${m.id}` : m.status === "error" ? dashboardNewAuditHref(m.url) : `/mission/${m.id}`}>
                        {m.status === "complete" ? "View report →" : m.status === "error" ? "Retry audit →" : "View progress →"}
                      </Link>
                    </div>
                    {m.status === "complete" && m.auditType === "deep" && (
                      <Link
                        href={dashboardComparisonsHref(m.siteId ?? m.domain)}
                        className="mt-2 inline-block text-sm text-violet hover:underline"
                      >
                        {copy.dashboardAudits.viewComparisons}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <BulkSelectBar
        selectedCount={selected.size}
        onClear={() => setSelected(new Set())}
        actions={[
          {
            label: copy.dashboardBulk.openReports,
            onClick: openReports,
            disabled: completeSelected.length === 0,
          },
          {
            label: copy.dashboardBulk.downloadPdfs,
            onClick: downloadPdfs,
            disabled: completeSelected.length === 0,
          },
        ]}
      />
    </div>
  );
}
