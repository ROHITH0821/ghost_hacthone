"use client";

import { FeedbackState } from "@/components/ui/FeedbackState";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { FixStatusRow, FixWorkflowStatus } from "@/lib/db/fix-workflow";
import { FIX_WORKFLOW_STATUSES } from "@/lib/db/fix-workflow";
import { PLAN_IDS } from "@/lib/plans";
import { copy } from "@/lib/copy";
import { useDashboard } from "@/components/dashboard/shell/DashboardContext";
import { BulkSelectBar } from "@/components/dashboard/BulkSelectBar";
import { FilterBar } from "@/components/dashboard/filters/FilterBar";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";
import {
  EMPTY_FIXES_FILTERS,
  parseFixesFilters,
  serializeFixesFilters,
  type FixesFilterState,
} from "@/lib/dashboard/filters";
import { FixColumn, FixColumnTabs } from "./FixColumn";
import { dashboardKeys } from "@/lib/dashboard/query-keys";
import { useDashboardQuery } from "@/hooks/useDashboardQuery";
import { DashboardPageLoading } from "@/components/dashboard/DashboardPageLoading";

type SiteOption = { id: string; domain: string };

export function FixesPageClient() {
  const { user, planSummary } = useDashboard();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mobileStatus, setMobileStatus] = useState<FixWorkflowStatus>("recommended");
  const [actionError, setActionError] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

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
  } = useDashboardFilters<FixesFilterState>({
    pageKey: "fixes",
    userId: user.id,
    empty: EMPTY_FIXES_FILTERS,
    parse: parseFixesFilters,
    serialize: serializeFixesFilters,
  });

  const filterQuery = useMemo(() => serializeFixesFilters(filters), [filters]);

  const { data, isPending, isError, error, refetch } = useDashboardQuery<{
    fixes: FixStatusRow[];
    sites: SiteOption[];
    hasPaidAccess: boolean;
  }>({
    queryKey: dashboardKeys.fixes(filterQuery),
    path: `/api/dashboard/fixes/list${filterQuery ? `?${filterQuery}` : ""}`,
  });

  const [fixes, setFixes] = useState<FixStatusRow[]>([]);
  const sites = useMemo(() => data?.sites ?? [], [data?.sites]);
  const hasPaidAccess = data?.hasPaidAccess ?? false;

  useEffect(() => {
    if (data?.fixes) {
      setFixes(data.fixes);
      setSelected(new Set());
    }
  }, [data?.fixes]);

  const canVerifyRescan =
    planSummary.primaryPlanId === PLAN_IDS.deep999 &&
    planSummary.rescansRemaining > 0 &&
    Boolean(planSummary.rescansExpiresAt && planSummary.rescansExpiresAt > new Date());

  const siteDomainById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of sites) map[s.id] = s.domain;
    for (const f of fixes) {
      if (f.siteDomain) map[f.siteId] = f.siteDomain;
    }
    return map;
  }, [sites, fixes]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const f of fixes) if (f.category) set.add(f.category);
    return Array.from(set).sort();
  }, [fixes]);

  const byStatus = useMemo(() => {
    const map: Record<FixWorkflowStatus, FixStatusRow[]> = {
      recommended: [],
      planned: [],
      implemented: [],
      verified: [],
    };
    for (const fix of fixes) {
      if (map[fix.status]) map[fix.status].push(fix);
    }
    return map;
  }, [fixes]);

  const counts = useMemo(() => {
    const c: Record<FixWorkflowStatus, number> = {
      recommended: 0,
      planned: 0,
      implemented: 0,
      verified: 0,
    };
    for (const fix of fixes) c[fix.status] += 1;
    return c;
  }, [fixes]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Stable identity so memoized FixCards don't all re-render on every change.
  const handleStatusChange = useCallback(
    async (id: string, status: FixWorkflowStatus) => {
      setActionError("");
      try {
      const res = await fetch(`/api/dashboard/fixes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Could not save the fix status");
      setFixes((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
      } catch { setActionError("The fix status could not be saved. Please try again."); }
    },
    []
  );

  if (isPending && !data) return <DashboardPageLoading />;
  if (isError) return <FeedbackState title="Couldn’t load fixes" description="Check your connection and try again. Your saved work has not changed." onRetry={() => void refetch()} />;

  async function bulkStatus(status: FixWorkflowStatus) {
    const fixIds = [...selected];
    if (fixIds.length === 0) return;
    setActionError("");
    setBulkLoading(true);
    try {
      const res = await fetch("/api/dashboard/fixes/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixIds, status }),
      });
      if (!res.ok) throw new Error("Could not save the fix status");
      const data = await res.json();
      const updated = new Map((data.fixes as FixStatusRow[]).map((f) => [f.id, f]));
      setFixes((prev) => prev.map((f) => updated.get(f.id) ?? f));
      setSelected(new Set());
    } catch {
      setActionError("The selected fixes could not be updated. Please try again.");
    } finally {
      setBulkLoading(false);
    }
  }

  if (!hasPaidAccess && fixes.length === 0) {
    return (
      <div className="space-y-6">
      {actionError && <p role="alert" className="text-sm text-danger">{actionError}</p>}
        <header>
          <h2 className="font-heading text-2xl font-semibold text-ghost-white">
            {copy.dashboardShell.pages.fixes}
          </h2>
          <p className="mt-2 text-sm text-muted">{copy.dashboardFixes.subtitle}</p>
        </header>
        <div className="rounded-2xl border border-border/60 bg-midnight/40 p-8 text-center">
          <p className="font-medium text-ghost-white">{copy.dashboardFixes.emptyFreeTitle}</p>
          <p className="mt-2 text-sm text-muted">{copy.dashboardFixes.emptyFreeBody}</p>
          <Link
            href="/dashboard/plan"
            className="mt-6 inline-flex rounded-xl border border-violet/40 bg-violet/10 px-5 py-2.5 text-sm font-medium text-violet"
          >
            {copy.dashboardOverview.nextAction.freeCta}
          </Link>
        </div>
      </div>
    );
  }

  if (fixes.length === 0) {
    return (
      <div className="space-y-6">
      {actionError && <p role="alert" className="text-sm text-danger">{actionError}</p>}
        <header>
          <h2 className="font-heading text-2xl font-semibold text-ghost-white">
            {copy.dashboardShell.pages.fixes}
          </h2>
          <p className="mt-2 text-sm text-muted">{copy.dashboardFixes.subtitle}</p>
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
          <FilterControls
            filters={filters}
            updateField={updateField}
            sites={sites}
            categories={categories}
          />
        </FilterBar>
        <div className="rounded-2xl border border-border/60 bg-midnight/40 p-8 text-center">
          <p className="font-medium text-ghost-white">{copy.dashboardFixes.emptyPaidTitle}</p>
          <p className="mt-2 text-sm text-muted">{copy.dashboardFixes.emptyPaidBody}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {actionError && <p role="alert" className="text-sm text-danger">{actionError}</p>}
      <header>
        <h2 className="font-heading text-2xl font-semibold text-ghost-white">
          {copy.dashboardShell.pages.fixes}
        </h2>
        <p className="mt-2 text-sm text-muted">{copy.dashboardFixes.subtitle}</p>
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
        <FilterControls
          filters={filters}
          updateField={updateField}
          sites={sites}
          categories={categories}
        />
      </FilterBar>

      <FixColumnTabs activeStatus={mobileStatus} onChange={setMobileStatus} counts={counts} />

      <div className="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-4">
        {FIX_WORKFLOW_STATUSES.map((status) => (
          <FixColumn
            key={status}
            title={copy.dashboardFixes.columns[status]}
            fixes={byStatus[status]}
            canVerifyRescan={canVerifyRescan}
            siteDomainById={siteDomainById}
            onStatusChange={handleStatusChange}
            selectedIds={selected}
            onToggleSelect={toggleSelect}
          />
        ))}
      </div>

      <div className="md:hidden">
        <FixColumn
          title={copy.dashboardFixes.columns[mobileStatus]}
          fixes={byStatus[mobileStatus]}
          canVerifyRescan={canVerifyRescan}
          siteDomainById={siteDomainById}
          onStatusChange={handleStatusChange}
          selectedIds={selected}
          onToggleSelect={toggleSelect}
        />
      </div>

      <BulkSelectBar
        selectedCount={selected.size}
        onClear={() => setSelected(new Set())}
        actions={[
          {
            label: copy.dashboardBulk.markPlanned,
            onClick: () => bulkStatus("planned"),
            disabled: bulkLoading || selected.size === 0,
          },
          {
            label: copy.dashboardBulk.markImplemented,
            onClick: () => bulkStatus("implemented"),
            disabled: bulkLoading || selected.size === 0,
          },
        ]}
      />
    </div>
  );
}

function FilterControls({
  filters,
  updateField,
  sites,
  categories,
}: {
  filters: FixesFilterState;
  updateField: <K extends keyof FixesFilterState>(key: K, value: FixesFilterState[K]) => void;
  sites: SiteOption[];
  categories: string[];
}) {
  return (
    <>
      <select
        value={filters.siteId}
        onChange={(e) => updateField("siteId", e.target.value)}
        className="h-10 rounded-xl border border-border/60 bg-midnight/40 px-3 text-sm text-ghost-white outline-none"
      >
        <option value="">{copy.dashboardFixes.filters.all} sites</option>
        {sites.map((s) => (
          <option key={s.id} value={s.id}>
            {s.domain}
          </option>
        ))}
      </select>
      <select
        value={filters.status}
        onChange={(e) => updateField("status", e.target.value)}
        className="h-10 rounded-xl border border-border/60 bg-midnight/40 px-3 text-sm text-ghost-white outline-none"
      >
        <option value="">{copy.dashboardFixes.filters.all} statuses</option>
        {FIX_WORKFLOW_STATUSES.map((s) => (
          <option key={s} value={s}>
            {copy.dashboardFixes.columns[s]}
          </option>
        ))}
      </select>
      <select
        value={filters.severity}
        onChange={(e) => updateField("severity", e.target.value)}
        className="h-10 rounded-xl border border-border/60 bg-midnight/40 px-3 text-sm text-ghost-white outline-none"
      >
        <option value="">{copy.dashboardFixes.filters.all} severities</option>
        {["critical", "high", "medium", "low"].map((s) => (
          <option key={s} value={s}>
            {copy.dashboardFixes.severity[s as keyof typeof copy.dashboardFixes.severity]}
          </option>
        ))}
      </select>
      <select
        value={filters.category}
        onChange={(e) => updateField("category", e.target.value)}
        className="h-10 rounded-xl border border-border/60 bg-midnight/40 px-3 text-sm text-ghost-white outline-none"
      >
        <option value="">{copy.dashboardFixes.filters.all} categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={filters.from}
        onChange={(e) => updateField("from", e.target.value)}
        className="h-10 rounded-xl border border-border/60 bg-midnight/40 px-3 text-sm text-ghost-white outline-none"
        aria-label={copy.dashboardFilters.dateFrom}
      />
      <input
        type="date"
        value={filters.to}
        onChange={(e) => updateField("to", e.target.value)}
        className="h-10 rounded-xl border border-border/60 bg-midnight/40 px-3 text-sm text-ghost-white outline-none"
        aria-label={copy.dashboardFilters.dateTo}
      />
    </>
  );
}
