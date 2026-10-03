import { QueryClient } from "@tanstack/react-query";

/** In-memory dashboard cache: show instantly on revisit, refresh in background. */
export const DASHBOARD_STALE_MS = 60_000;
export const DASHBOARD_GC_MS = 5 * 60_000;

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DASHBOARD_STALE_MS,
        gcTime: DASHBOARD_GC_MS,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: 1,
      },
    },
  });
}
