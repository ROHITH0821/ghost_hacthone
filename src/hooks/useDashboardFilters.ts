"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  deletePreset,
  loadSavedPresets,
  savePreset,
  type SavedFilterPreset,
} from "@/lib/dashboard/filters";

type UseDashboardFiltersOptions<T extends Record<string, string>> = {
  pageKey: string;
  userId: string;
  empty: T;
  parse: (params: URLSearchParams) => T;
  serialize: (state: T) => string;
};

export function useDashboardFilters<T extends Record<string, string>>({
  pageKey,
  userId,
  empty,
  parse,
  serialize,
}: UseDashboardFiltersOptions<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(() => parse(searchParams), [parse, searchParams]);

  const [presets, setPresets] = useState<SavedFilterPreset<T>[]>([]);
  const [presetName, setPresetName] = useState("");

  useEffect(() => {
    setPresets(loadSavedPresets<T>(pageKey, userId));
  }, [pageKey, userId]);

  const setFilters = useCallback(
    (next: T | ((prev: T) => T)) => {
      const state = typeof next === "function" ? next(filters) : next;
      const qs = serialize(state);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [filters, pathname, router, serialize]
  );

  const updateField = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setFilters({ ...filters, [key]: value });
    },
    [filters, setFilters]
  );

  const clearFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const applyPreset = useCallback(
    (preset: SavedFilterPreset<T>) => {
      setPresetName(preset.name);
      setFilters(preset.filters);
    },
    [setFilters]
  );

  const saveCurrentAsPreset = useCallback(() => {
    const name = presetName.trim();
    if (!name) return null;
    const preset = savePreset(pageKey, userId, name, filters);
    setPresets(loadSavedPresets<T>(pageKey, userId));
    setPresetName(preset.name);
    return preset;
  }, [filters, pageKey, presetName, userId]);

  const removePreset = useCallback(
    (presetId: string) => {
      deletePreset(pageKey, userId, presetId);
      setPresets(loadSavedPresets<T>(pageKey, userId));
    },
    [pageKey, userId]
  );

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((v) => Boolean(v)),
    [filters]
  );

  return {
    filters,
    empty,
    setFilters,
    updateField,
    clearFilters,
    presets,
    presetName,
    setPresetName,
    applyPreset,
    saveCurrentAsPreset,
    removePreset,
    hasActiveFilters,
  };
}
