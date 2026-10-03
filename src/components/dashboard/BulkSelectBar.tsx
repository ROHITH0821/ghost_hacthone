"use client";

import { copy } from "@/lib/copy";

type BulkSelectBarProps = {
  selectedCount: number;
  onClear: () => void;
  actions: Array<{
    label: string;
    onClick: () => void;
    disabled?: boolean;
  }>;
};

export function BulkSelectBar({ selectedCount, onClear, actions }: BulkSelectBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky bottom-20 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet/30 bg-navy/95 px-4 py-3 shadow-lg backdrop-blur-xl md:bottom-4">
      <p className="text-sm text-ghost-white">
        {copy.dashboardBulk.selected(selectedCount)}
      </p>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className="rounded-xl border border-violet/40 bg-violet/10 px-3 py-1.5 text-sm font-medium text-violet disabled:opacity-40"
          >
            {action.label}
          </button>
        ))}
        <button
          type="button"
          onClick={onClear}
          className="rounded-xl border border-border/60 px-3 py-1.5 text-sm text-muted-light hover:text-ghost-white"
        >
          {copy.dashboardBulk.clear}
        </button>
      </div>
    </div>
  );
}
