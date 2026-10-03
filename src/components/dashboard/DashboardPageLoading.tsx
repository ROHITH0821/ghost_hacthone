export function DashboardPageLoading() {
  return <div role="status" aria-label="Loading workspace" className="space-y-6"><span className="sr-only">Loading workspace…</span><div className="h-7 w-48 animate-pulse rounded-lg bg-surface-elevated" /><div className="h-4 w-64 max-w-full animate-pulse rounded bg-surface-elevated" /><div className="grid gap-4 sm:grid-cols-3">{[0,1,2].map(i=><div key={i} className="h-32 animate-pulse rounded-xl border border-border/50 bg-surface" />)}</div><div className="h-64 animate-pulse rounded-xl border border-border/50 bg-surface" /></div>;
}
