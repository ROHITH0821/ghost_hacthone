"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchDashboardJson } from "@/lib/dashboard/fetch-json";
import { DASHBOARD_STALE_MS } from "@/lib/query/query-client";

export function useDashboardQuery<T>(opts: {
  queryKey: readonly unknown[];
  path: string;
  enabled?: boolean;
  refetchInterval?:
    | number
    | false
    | ((query: { state: { data: T | undefined } }) => number | false);
  keepPreviousData?: boolean;
}) {
  return useQuery({
    queryKey: opts.queryKey,
    queryFn: () => fetchDashboardJson<T>(opts.path),
    staleTime: DASHBOARD_STALE_MS,
    enabled: opts.enabled !== false,
    refetchInterval: opts.refetchInterval,
    placeholderData: opts.keepPreviousData ? keepPreviousData : undefined,
  });
}
