"use client";

import { useRef, useState } from "react";
import type { FixStatusRow, FixWorkflowStatus } from "@/lib/db/fix-workflow";
import { copy } from "@/lib/copy";
import { FixCard } from "./FixCard";

/**
 * Cards rendered per column before "Show more". A busy agency workspace can
 * hold hundreds of fixes per column; mounting them all is the single biggest
 * cost of this page, and only the first screenful is ever visible.
 */
const INITIAL_VISIBLE = 25;

export function FixColumn({
  title,
  fixes,
  canVerifyRescan,
  siteDomainById,
  onStatusChange,
  selectedIds,
  onToggleSelect,
}: {
  title: string;
  fixes: FixStatusRow[];
  canVerifyRescan: boolean;
  siteDomainById: Record<string, string>;
  onStatusChange: (id: string, status: FixWorkflowStatus) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}) {
  const [visible, setVisible] = useState(INITIAL_VISIBLE);

  // A new filter/status set means a fresh list — start from the top again.
  const listKey = fixes.length;
  const lastKey = useRef(listKey);
  if (lastKey.current !== listKey) {
    lastKey.current = listKey;
    if (visible !== INITIAL_VISIBLE) setVisible(INITIAL_VISIBLE);
  }

  const shown = fixes.length > visible ? fixes.slice(0, visible) : fixes;
  const remaining = fixes.length - shown.length;

  return (
    <section className="flex min-h-[200px] flex-col rounded-2xl border border-border/60 bg-surface/30">
      <header className="border-b border-border/40 px-4 py-3">
        <h3 className="font-heading text-sm font-semibold text-ghost-white">{title}</h3>
        <p className="text-xs text-muted">{fixes.length} fix{fixes.length === 1 ? "" : "es"}</p>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {fixes.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted">No fixes in this stage yet.</p>
        ) : (
          <>
            {shown.map((fix) => (
              <FixCard
                key={fix.id}
                fix={fix}
                canVerifyRescan={canVerifyRescan}
                siteDomain={siteDomainById[fix.siteId]}
                onStatusChange={onStatusChange}
                selected={selectedIds?.has(fix.id) ?? false}
                onToggleSelect={onToggleSelect}
              />
            ))}
            {remaining > 0 && (
              <button
                type="button"
                onClick={() => setVisible((v) => v + INITIAL_VISIBLE)}
                className="w-full rounded-lg border border-border/60 px-3 py-2 text-xs text-muted-light transition-colors hover:text-ghost-white"
              >
                {copy.dashboardFixes.actions.showMore(remaining)}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export function FixColumnTabs({
  activeStatus,
  onChange,
  counts,
}: {
  activeStatus: FixWorkflowStatus;
  onChange: (status: FixWorkflowStatus) => void;
  counts: Record<FixWorkflowStatus, number>;
}) {
  const statuses = ["recommended", "planned", "implemented", "verified"] as FixWorkflowStatus[];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none md:hidden">
      {statuses.map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => onChange(status)}
          aria-pressed={activeStatus === status}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            activeStatus === status
              ? "border-violet/50 bg-violet/10 text-violet"
              : "border-border/60 text-muted-light"
          }`}
        >
          {copy.dashboardFixes.columns[status]} ({counts[status]})
        </button>
      ))}
    </div>
  );
}
