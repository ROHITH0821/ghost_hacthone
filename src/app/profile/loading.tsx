// Streams immediately on navigation so the profile route paints while the
// server resolves the session and mission list.
export default function ProfileLoading() {
  return (
    <main className="relative min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border bg-midnight/80 backdrop-blur-xl">
        <div className="section-pad mx-auto flex h-16 max-w-[1100px] items-center justify-between md:h-20">
          <div className="h-9 w-32 animate-pulse rounded-xl bg-surface/40" />
          <div className="h-5 w-40 animate-pulse rounded bg-surface/40" />
        </div>
      </header>

      <div className="section-pad mx-auto max-w-[1100px] py-10 md:py-14">
        <div className="mb-8 space-y-3">
          <div className="h-4 w-20 animate-pulse rounded bg-surface/40" />
          <div className="h-10 w-64 animate-pulse rounded-lg bg-surface/40" />
          <div className="h-4 w-80 animate-pulse rounded bg-surface/40" />
        </div>

        <div className="mb-10 h-14 animate-pulse rounded-2xl border border-border bg-surface/30" />

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="h-72 animate-pulse rounded-2xl border border-border bg-surface/40" />
          <div className="h-72 animate-pulse rounded-2xl border border-border bg-surface/40" />
        </div>
      </div>
    </main>
  );
}
