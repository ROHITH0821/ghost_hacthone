"use client";

import { useId, useState } from "react";
import { BookmarkPlus, SlidersHorizontal, X } from "lucide-react";
import { copy } from "@/lib/copy";
import type { SavedFilterPreset } from "@/lib/dashboard/filters";

type FilterBarProps<T extends Record<string, string>> = {
  children: React.ReactNode;
  presets: SavedFilterPreset<T>[];
  presetName: string;
  onPresetNameChange: (name: string) => void;
  onSavePreset: () => void;
  onApplyPreset: (preset: SavedFilterPreset<T>) => void;
  onRemovePreset: (presetId: string) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
};

export function FilterBar<T extends Record<string, string>>({
  children,
  presets,
  presetName,
  onPresetNameChange,
  onSavePreset,
  onApplyPreset,
  onRemovePreset,
  onClear,
  hasActiveFilters,
}: FilterBarProps<T>) {
  const [expanded, setExpanded] = useState(false);
  const controlsId = useId();
  return (
    <div className="space-y-3">
      <button type="button" aria-expanded={expanded} aria-controls={controlsId} onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-3 text-sm text-muted-light sm:hidden">
        <span className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" />Search & filters{hasActiveFilters ? " · Active" : ""}</span>
        <span>{expanded ? "Hide" : "Show"}</span>
      </button>
      <div id={controlsId} className={`${expanded ? "block" : "hidden"} space-y-3 sm:block`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        {children}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            aria-label="Saved filter name"
            value={presetName}
            onChange={(e) => onPresetNameChange(e.target.value)}
            placeholder={copy.dashboardFilters.presetNamePlaceholder}
            className="h-10 min-w-[140px] rounded-xl border border-border/60 bg-midnight/40 px-3 text-sm text-ghost-white outline-none focus:border-violet/40"
          />
          <button
            type="button"
            onClick={onSavePreset}
            disabled={!presetName.trim()}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-violet/40 bg-violet/10 px-3 text-sm font-medium text-violet disabled:opacity-40"
          >
            <BookmarkPlus className="h-4 w-4" />
            {copy.dashboardFilters.savePreset}
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border/60 px-3 text-sm text-muted-light hover:text-ghost-white"
            >
              <X className="h-4 w-4" />
              {copy.dashboardFilters.clear}
            </button>
          )}
        </div>
      </div>
      {presets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <span key={preset.id} className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => onApplyPreset(preset)}
                className="rounded-full border border-border/60 bg-midnight/40 px-3 py-1 text-xs text-ghost-white/80 hover:border-violet/40 hover:text-violet"
              >
                {preset.name}
              </button>
              <button
                type="button"
                onClick={() => onRemovePreset(preset.id)}
                className="rounded-full p-0.5 text-muted hover:text-danger"
                aria-label={`Remove ${preset.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
