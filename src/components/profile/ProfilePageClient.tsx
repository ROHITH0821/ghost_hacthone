"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Download, FileText, Settings2, Shield, SlidersHorizontal } from "lucide-react";
import { GhostLogo } from "@/components/ui/GhostLogo";
import { LocalTime } from "@/components/ui/LocalTime";
import { TextLink } from "@/components/ui/BRAVE";
import type { RecentMissionRow } from "@/lib/db/missions";
import { copy } from "@/lib/copy";
import { useAuth } from "@/components/auth/AuthProvider";

type Tab = "overview" | "recents" | "settings";

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  running: { label: "Running", cls: "border-ai-blue/30 bg-ai-blue/10 text-ai-blue" },
  complete: {
    label: "Complete",
    cls: "border-neon-green/30 bg-neon-green/10 text-neon-green",
  },
  error: { label: "Error", cls: "border-danger/30 bg-danger/10 text-danger" },
};

function domainLabel(input: string) {
  return input.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider ${className ?? ""}`}
    >
      {children}
    </span>
  );
}

function Card({
  title,
  icon,
  children,
  right,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    // min-w-0 lets the card shrink inside its grid track (grid items default
    // to min-width:auto), so unbreakable content like long URLs truncates
    // instead of blowing the layout out horizontally.
    <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface/40 p-6 backdrop-blur-sm">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-midnight/80 text-ghost-white/70">
            {icon}
          </div>
          <div>
            <p className="font-heading text-lg font-semibold text-ghost-white">{title}</p>
          </div>
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-6 rounded-2xl border border-border/60 bg-midnight/40 p-4">
      <div>
        <p className="text-sm font-medium text-ghost-white/90">{label}</p>
        <p className="mt-1 text-xs text-muted">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative h-7 w-12 rounded-full border transition-colors ${
          value ? "border-violet/40 bg-violet/35" : "border-border bg-midnight/80"
        }`}
        aria-pressed={value}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-ghost-white shadow transition-transform ${
            value ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export function ProfilePageClient({
  user,
  recent,
}: {
  user: { id: string; email: string; createdAt: string | Date };
  recent: RecentMissionRow[];
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [showCompletedOnly, setShowCompletedOnly] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [compactLists, setCompactLists] = useState(false);
  const router = useRouter();
  const { logout } = useAuth();

  const filtered = useMemo(() => {
    if (!showCompletedOnly) return recent;
    return recent.filter((m) => m.status === "complete");
  }, [recent, showCompletedOnly]);

  const counts = useMemo(() => {
    const base = { running: 0, complete: 0, error: 0 };
    for (const m of recent) {
      if (m.status in base) base[m.status as keyof typeof base] += 1;
    }
    return base;
  }, [recent]);

  const headline = user.email.split("@")[0] || "Agent";

  return (
    <main className="relative min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border bg-midnight/80 backdrop-blur-xl">
        <div className="section-pad mx-auto flex h-16 max-w-[1100px] items-center justify-between md:h-20">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-xl border border-border bg-surface/40 px-3 py-2 text-sm text-ghost-white/80 transition-colors hover:text-ghost-white"
            >
              {copy.nav.dashboard}
            </button>
            <GhostLogo size="sm" className="hidden sm:block" />
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden max-w-[280px] truncate text-sm text-muted-light sm:block">
              {user.email}
            </span>
            <button
              type="button"
              onClick={async () => {
                await logout();
                router.push("/");
              }}
              className="text-sm text-ghost-white/60 transition-colors hover:text-ghost-white"
            >
              {copy.nav.signOut}
            </button>
          </div>
        </div>
      </header>

      <div className="section-pad mx-auto max-w-[1100px] py-10 md:py-14">
        <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="label-caps text-muted">{copy.nav.profile}</p>
            <h1 className="mt-3 break-words font-heading text-2xl font-bold text-ghost-white sm:text-3xl md:text-4xl">
              {headline}
              <span className="text-ghost-white/50">.ghost</span>
            </h1>
            <p className="mt-3 text-sm text-muted-light">
              Signed in as <span className="text-ghost-white/80">{user.email}</span>. Joined{" "}
              <LocalTime date={user.createdAt} />.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Pill className={STATUS_STYLES.complete.cls}>{counts.complete} complete</Pill>
            <Pill className={STATUS_STYLES.running.cls}>{counts.running} running</Pill>
            <Pill className={STATUS_STYLES.error.cls}>{counts.error} errors</Pill>
          </div>
        </div>

        <div className="mb-10 flex flex-wrap gap-2 rounded-2xl border border-border bg-surface/30 p-2">
          {(
            [
              { id: "overview", label: "Overview", icon: <Shield className="h-4 w-4" /> },
              { id: "recents", label: "Recents", icon: <Clock className="h-4 w-4" /> },
              { id: "settings", label: "Settings", icon: <Settings2 className="h-4 w-4" /> },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition-colors ${
                tab === item.id
                  ? "bg-midnight text-ghost-white"
                  : "text-ghost-white/60 hover:text-ghost-white"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Card
              title="Recent missions"
              icon={<Clock className="h-5 w-5" />}
              right={
                <TextLink onClick={() => setTab("recents")} className="!text-xs">
                  View all
                </TextLink>
              }
            >
              {recent.length === 0 ? (
                <p className="text-sm text-muted">No missions yet. Summon Ghost from the home page.</p>
              ) : (
                <div className="space-y-3">
                  {recent.slice(0, 5).map((m) => (
                    <MissionRow key={m.id} mission={m} compact={compactLists} />
                  ))}
                </div>
              )}
            </Card>

            <Card title="Quick settings" icon={<SlidersHorizontal className="h-5 w-5" />}>
              <div className="space-y-3">
                <Toggle
                  label="Only show completed"
                  description="Hide running and failed missions from your list."
                  value={showCompletedOnly}
                  onChange={setShowCompletedOnly}
                />
                <Toggle
                  label="Compact lists"
                  description="Tighter rows for faster scanning."
                  value={compactLists}
                  onChange={setCompactLists}
                />
                <Toggle
                  label="Reduce motion"
                  description="Use fewer animations (kept local to this page)."
                  value={reduceMotion}
                  onChange={setReduceMotion}
                />
              </div>
              <p className="mt-4 text-xs text-muted">
                Settings are local UI preferences. If you want these to sync across devices, tell me
                and I’ll persist them in Supabase.
              </p>
            </Card>
          </div>
        )}

        {tab === "recents" && (
          <div className="grid gap-6">
            <Card title="Recents" icon={<Clock className="h-5 w-5" />}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted">
                  {filtered.length} mission{filtered.length === 1 ? "" : "s"}
                </p>
                <label className="flex items-center gap-2 text-sm text-ghost-white/70">
                  <input
                    type="checkbox"
                    checked={showCompletedOnly}
                    onChange={(e) => setShowCompletedOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-border bg-midnight accent-violet"
                  />
                  Only completed
                </label>
              </div>
              {filtered.length === 0 ? (
                <p className="text-sm text-muted">Nothing to show yet.</p>
              ) : (
                <div className={compactLists ? "space-y-2" : "space-y-3"}>
                  {filtered.map((m) => (
                    <MissionRow key={m.id} mission={m} compact={compactLists} />
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {tab === "settings" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Account" icon={<Shield className="h-5 w-5" />}>
              <div className="space-y-4">
                <div className="rounded-2xl border border-border/60 bg-midnight/40 p-4">
                  <p className="label-caps text-muted">Email</p>
                  <p className="mt-2 text-sm text-ghost-white/90">{user.email}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-midnight/40 p-4">
                  <p className="label-caps text-muted">Member since</p>
                  <p className="mt-2 text-sm text-ghost-white/90"><LocalTime date={user.createdAt} /></p>
                </div>
                <p className="text-xs text-muted">
                  Tip: If you change your email, you’ll sign in again with a new code.
                </p>
              </div>
            </Card>

            <Card title="Exports" icon={<FileText className="h-5 w-5" />}>
              <div className="space-y-3 text-sm text-muted-light">
                <p>
                  Download any completed mission as a PDF from its mission page. We keep PDF
                  generation server-side so the UI stays fast.
                </p>
                <div className="rounded-2xl border border-border/60 bg-midnight/40 p-4">
                  <p className="text-ghost-white/80">Suggested workflow</p>
                  <ol className="mt-2 list-inside list-decimal space-y-1 text-xs text-muted">
                    <li>Run a mission.</li>
                    <li>Open the report inline on the mission page.</li>
                    <li>Export the PDF for clients or teammates.</li>
                  </ol>
                </div>
              </div>
            </Card>
          </div>
        )}

        {reduceMotion && (
          <p className="mt-10 text-xs text-muted">
            Reduce motion is enabled. If you want it to apply across the entire site, I can wire it
            into a global preference and apply it to the Framer Motion components.
          </p>
        )}
      </div>
    </main>
  );
}

function MissionRow({ mission, compact }: { mission: RecentMissionRow; compact: boolean }) {
  const style = STATUS_STYLES[mission.status] ?? {
    label: mission.status,
    cls: "border-border bg-midnight/70 text-ghost-white/70",
  };

  const stage = mission.progress?.currentStage ?? "opening";
  const progress =
    typeof mission.progress?.stageProgress === "number" ? mission.progress.stageProgress : null;

  return (
    <div
      className={`flex flex-col justify-between gap-4 rounded-2xl border border-border/60 bg-midnight/40 ${
        compact ? "p-3" : "p-4"
      } md:flex-row md:items-center`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Pill className={style.cls}>{style.label}</Pill>
          <p className="truncate text-sm font-medium text-ghost-white/90">
            {domainLabel(mission.domain)}
          </p>
        </div>

        <p className="mt-2 truncate text-xs text-muted">{mission.url}</p>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-light">
          <span>Started <LocalTime date={mission.createdAt} /></span>
          {progress !== null && mission.status === "running" && (
            <span>
              Stage {stage} • {progress}%
            </span>
          )}
          {mission.status === "error" && mission.progress?.error && (
            <span className="text-danger/80">{mission.progress.error}</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-3">
        {mission.status === "complete" && (
          <>
            <Link
              href={`/results/${mission.id}`}
              className="rounded-xl border border-border bg-surface/40 px-4 py-2 text-sm font-medium text-ghost-white/80 transition-colors hover:text-ghost-white"
            >
              View report
            </Link>
            {/* Served from storage when available, generated on demand otherwise. */}
            <a
              href={`/api/reports/${mission.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-violet px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-dim"
            >
              View PDF
            </a>
            <a
              href={`/api/reports/${mission.id}/pdf?download=1`}
              className="flex items-center gap-1.5 rounded-xl border border-violet/40 bg-violet/10 px-4 py-2 text-sm font-medium text-violet transition-colors hover:bg-violet/20"
              title="Download PDF"
            >
              <Download className="h-4 w-4" />
              Download
            </a>
          </>
        )}
        {mission.status === "running" && (
          <Link
            href={`/mission/${mission.id}`}
            className="rounded-xl border border-border bg-surface/40 px-4 py-2 text-sm font-medium text-ghost-white/80 transition-colors hover:text-ghost-white"
          >
            View progress
          </Link>
        )}
      </div>
    </div>
  );
}

