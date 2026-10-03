export function DashboardPageLoading() {
  return <div role="status" aria-label="Loading workspace" className="space-y-6"><span className="sr-only">Loading workspace…</span><div className="ghost-skeleton h-3 w-24" /><div className="ghost-skeleton h-8 w-56" /><div className="ghost-skeleton h-4 w-72 max-w-full" /><div className="grid gap-4 sm:grid-cols-3">{[0,1,2].map(i=><div key={i} className="ghost-skeleton h-32 !rounded-[14px] border border-line" />)}</div><div className="ghost-skeleton h-64 !rounded-[14px] border border-line" /></div>;
}
