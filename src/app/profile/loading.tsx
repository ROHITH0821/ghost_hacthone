// Streams immediately on navigation so the profile route paints while the
// server resolves the session and mission list.
export default function ProfileLoading() {
  return (
    <main className="relative min-h-screen">
      <header className="sticky top-0 z-50 border-b border-line bg-paper/80 backdrop-blur-xl">
        <div className="section-pad mx-auto flex h-16 max-w-[1100px] items-center justify-between md:h-20">
          <div className="h-9 w-32 ghost-skeleton" />
          <div className="h-5 w-40 ghost-skeleton" />
        </div>
      </header>

      <div className="section-pad mx-auto max-w-[1100px] py-10 md:py-14">
        <div className="mb-8 space-y-3">
          <div className="h-4 w-20 ghost-skeleton" />
          <div className="h-10 w-64 ghost-skeleton" />
          <div className="h-4 w-80 ghost-skeleton" />
        </div>

        <div className="mb-10 h-14 ghost-skeleton !rounded-[14px] border border-line" />

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="h-72 ghost-skeleton !rounded-[14px] border border-line" />
          <div className="h-72 ghost-skeleton !rounded-[14px] border border-line" />
        </div>
      </div>
    </main>
  );
}
