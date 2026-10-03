import type { FixWorkflowStatus } from "@/lib/db/fix-workflow";
import { FIX_WORKFLOW_STATUSES } from "@/lib/db/fix-workflow";
import { AUDIT_FILTER_TYPES, type AuditType } from "@/lib/plans";

export type AuditsFilterState = {
  search: string;
  status: string;
  auditType: string;
  from: string;
  to: string;
  clientId: string;
};

export type FixesFilterState = {
  siteId: string;
  status: string;
  severity: string;
  category: string;
  from: string;
  to: string;
};

export type SavedFilterPreset<T> = {
  id: string;
  name: string;
  filters: T;
  createdAt: string;
};

export const EMPTY_AUDITS_FILTERS: AuditsFilterState = {
  search: "",
  status: "",
  auditType: "",
  from: "",
  to: "",
  clientId: "",
};

export const EMPTY_FIXES_FILTERS: FixesFilterState = {
  siteId: "",
  status: "",
  severity: "",
  category: "",
  from: "",
  to: "",
};

function readParam(params: URLSearchParams, key: string): string {
  return params.get(key)?.trim() ?? "";
}

export function parseAuditsFilters(
  params: URLSearchParams | Record<string, string | string[] | undefined>
): AuditsFilterState {
  const sp =
    params instanceof URLSearchParams
      ? params
      : new URLSearchParams(
          Object.entries(params).flatMap(([k, v]) =>
            v == null ? [] : [[k, Array.isArray(v) ? v[0] ?? "" : v]]
          )
        );
  return {
    search: readParam(sp, "search"),
    status: readParam(sp, "status"),
    auditType: (() => {
      const v = readParam(sp, "auditType");
      return AUDIT_FILTER_TYPES.includes(v as AuditType) ? v : "";
    })(),
    from: readParam(sp, "from"),
    to: readParam(sp, "to"),
    clientId: readParam(sp, "clientId"),
  };
}

export function serializeAuditsFilters(state: AuditsFilterState): string {
  const params = new URLSearchParams();
  if (state.search) params.set("search", state.search);
  if (state.status) params.set("status", state.status);
  if (state.auditType) params.set("auditType", state.auditType);
  if (state.from) params.set("from", state.from);
  if (state.to) params.set("to", state.to);
  if (state.clientId) params.set("clientId", state.clientId);
  return params.toString();
}

export function parseFixesFilters(
  params: URLSearchParams | Record<string, string | string[] | undefined>
): FixesFilterState {
  const sp =
    params instanceof URLSearchParams
      ? params
      : new URLSearchParams(
          Object.entries(params).flatMap(([k, v]) =>
            v == null ? [] : [[k, Array.isArray(v) ? v[0] ?? "" : v]]
          )
        );
  return {
    siteId: readParam(sp, "siteId"),
    status: readParam(sp, "status"),
    severity: readParam(sp, "severity"),
    category: readParam(sp, "category"),
    from: readParam(sp, "from"),
    to: readParam(sp, "to"),
  };
}

export function serializeFixesFilters(state: FixesFilterState): string {
  const params = new URLSearchParams();
  if (state.siteId) params.set("siteId", state.siteId);
  if (state.status) params.set("status", state.status);
  if (state.severity) params.set("severity", state.severity);
  if (state.category) params.set("category", state.category);
  if (state.from) params.set("from", state.from);
  if (state.to) params.set("to", state.to);
  return params.toString();
}

export function auditsFiltersToQuery(state: AuditsFilterState) {
  return {
    search: state.search || undefined,
    status: state.status || undefined,
    auditType: state.auditType || undefined,
    from: state.from ? new Date(state.from) : undefined,
    to: state.to ? endOfDay(new Date(state.to)) : undefined,
    clientId: state.clientId || undefined,
  };
}

export function fixesFiltersToQuery(state: FixesFilterState) {
  const status = FIX_WORKFLOW_STATUSES.includes(state.status as FixWorkflowStatus)
    ? (state.status as FixWorkflowStatus)
    : undefined;
  return {
    siteId: state.siteId || undefined,
    status,
    severity: state.severity || undefined,
    category: state.category || undefined,
    from: state.from ? new Date(state.from) : undefined,
    to: state.to ? endOfDay(new Date(state.to)) : undefined,
  };
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function storageKey(pageKey: string, userId: string) {
  return `ghost-filters-${userId}-${pageKey}`;
}

export function loadSavedPresets<T>(pageKey: string, userId: string): SavedFilterPreset<T>[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(pageKey, userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedFilterPreset<T>[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePreset<T>(
  pageKey: string,
  userId: string,
  name: string,
  filters: T
): SavedFilterPreset<T> {
  const presets = loadSavedPresets<T>(pageKey, userId).filter(
    (preset) => preset.name.toLowerCase() !== name.trim().toLowerCase()
  );
  const preset: SavedFilterPreset<T> = {
    id: `preset-${Date.now().toString(36)}`,
    name: name.trim(),
    filters,
    createdAt: new Date().toISOString(),
  };
  presets.unshift(preset);
  localStorage.setItem(storageKey(pageKey, userId), JSON.stringify(presets.slice(0, 20)));
  return preset;
}

export function deletePreset(pageKey: string, userId: string, presetId: string) {
  const presets = loadSavedPresets(pageKey, userId).filter((p) => p.id !== presetId);
  localStorage.setItem(storageKey(pageKey, userId), JSON.stringify(presets));
}
