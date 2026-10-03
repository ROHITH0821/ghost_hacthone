"use client";

import type { QueryClient } from "@tanstack/react-query";
import { dashboardKeys } from "@/lib/dashboard/query-keys";
import { fetchDashboardJson } from "@/lib/dashboard/fetch-json";

const PREFETCH: Record<
  string,
  { key: readonly unknown[]; path: string }
> = {
  "/dashboard/overview": {
    key: dashboardKeys.overview(),
    path: "/api/dashboard/overview",
  },
  "/dashboard/sites": {
    key: dashboardKeys.sites(),
    path: "/api/dashboard/sites/list",
  },
  "/dashboard/audits": {
    key: dashboardKeys.audits(""),
    path: "/api/dashboard/audits",
  },
  "/dashboard/fixes": {
    key: dashboardKeys.fixes(""),
    path: "/api/dashboard/fixes/list",
  },
  "/dashboard/plan": {
    key: dashboardKeys.plan(),
    path: "/api/dashboard/plan",
  },
  "/dashboard/comparisons": {
    key: dashboardKeys.comparisons(),
    path: "/api/dashboard/comparisons/bootstrap",
  },
  "/dashboard/clients": {
    key: dashboardKeys.clients(),
    path: "/api/dashboard/clients/list",
  },
  "/dashboard/branding": {
    key: dashboardKeys.branding(),
    path: "/api/dashboard/branding/bootstrap",
  },
};

/** Warm React Query cache on nav hover so the next tab paint is instant. */
export function prefetchDashboardTab(client: QueryClient, href: string) {
  const entry = PREFETCH[href];
  if (!entry) return;
  void client.prefetchQuery({
    queryKey: entry.key,
    queryFn: () => fetchDashboardJson(entry.path),
  });
}
