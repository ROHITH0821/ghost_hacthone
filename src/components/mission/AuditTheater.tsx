"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, animate, motion } from "framer-motion";
import { ArrowDown, ArrowRight, Check, X } from "lucide-react";
import type { GhostReport, MissionStage, MissionState } from "@/lib/types";
import { GhostMark } from "@/components/ui/GhostMark";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { getScoreLabel } from "@/lib/copy";
import { cn } from "@/lib/utils";

/**
 * Audit Theater — the live audit as a full-screen story.
 * Every number, name, journey and outcome comes from the mission state the page
 * already polls (progressLog, previewImageUrl, detectedFlows, customerSnippets,
 * stage/progress) and, at the end, the real report. Nothing here is simulated:
 * a chapter with no data yet says so and waits.
 */

const EASE = [0.22, 1, 0.36, 1] as const;
type Snippet = NonNullable<MissionState["customerSnippets"]>[number];
type Flow = NonNullable<MissionState["detectedFlows"]>[number];

const S = ({ children }: { children: React.ReactNode }) => <span className="serif-accent">{children}</span>;

const CHAPTERS: Array<{ stages: MissionStage[]; label: string; title: React.ReactNode; waiting: string }> = [
  { stages: ["opening", "understanding"], label: "Reading your site", title: <>Ghost is reading <S>your site.</S></>, waiting: "Opening your homepage and following its links…" },
  { stages: ["personas"], label: "Mapping customer paths", title: <>Finding the paths <S>customers take.</S></>, waiting: "Working out how customers are meant to enquire, book or buy…" },
  { stages: ["deploying", "testing"], label: "Shoppers walk your site", title: <>AI shoppers are <S>walking</S> your site.</>, waiting: "Sending a simulated shopper down each path…" },
  { stages: ["leaks"], label: "Marking the friction", title: <>Marking where they <S>hesitate.</S></>, waiting: "Grouping what slowed shoppers down…" },
  { stages: ["generating"], label: "Writing your plan", title: <>Writing <S>your plan.</S></>, waiting: "Scoring the site and drafting fixes…" },
];
const chapterOf = (stage: MissionStage) => Math.max(0, CHAPTERS.findIndex((c) => c.stages.includes(stage)));

function since(start: string, ts: string) {
  const s = Math.max(0, Math.round((new Date(ts).getTime() - new Date(start).getTime()) / 1000));
  return `+${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function Elapsed({ start, running }: { start: string; running: boolean }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    if (!running) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [running]);
  if (now === null) return <span className="tabular">--:--</span>;
  const s = Math.max(0, Math.floor((now - new Date(start).getTime()) / 1000));
  return <span className="tabular">{String(Math.floor(s / 60)).padStart(2, "0")}:{String(s % 60).padStart(2, "0")}</span>;
}

function CountUp({ to, className }: { to: number; className?: string }) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const c = animate(from.current, to, { duration: 1.1, ease: EASE, onUpdate: (x) => setV(Math.round(x)) });
    from.current = to;
    return () => c.stop();
  }, [to]);
  return <span className={cn("tabular", className)}>{v}</span>;
}

/** The real homepage snapshot captured during the crawl (same endpoint as before). */
function useSitePreview(mission: MissionState | null) {
  const [url, setUrl] = useState<string | null>(mission?.previewImageUrl ?? null);
  const id = mission?.id;
  const raw = mission?.url ?? "";
  const target = raw.startsWith("http") ? raw : `https://${raw}`;
  const running = mission?.status === "running";
  const fromState = mission?.previewImageUrl;
  useEffect(() => {
    if (fromState) { setUrl(fromState); return; }
    if (!id || !running) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let tries = 0;
    const poll = async () => {
      if (cancelled) return;
      tries += 1;
      try {
        const res = await fetch(`/api/site-preview?missionId=${encodeURIComponent(id)}&url=${encodeURIComponent(target)}`);
        const data = await res.json();
        if (!cancelled && data.imageUrl) { setUrl(data.imageUrl as string); return; }
      } catch { /* transient — retry */ }
      if (!cancelled && tries < 40) timer = setTimeout(poll, 1500);
    };
    timer = setTimeout(poll, 700);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [fromState, id, running, target]);
  return url;
}

const OUTCOME = {
  completed: { label: "Completed", dot: "bg-resolved", text: "text-resolved-text", chip: "bg-[#E4F4EC]" },
  hesitant: { label: "Hesitated", dot: "bg-sev-medium", text: "text-sev-medium-text", chip: "bg-[#FEF3E2]" },
  abandoned: { label: "Left the site", dot: "bg-ember", text: "text-ember-text", chip: "bg-ember-soft" },
} as const;

/* ───────────────────────────────────────────────────────────────────────── */

export function AuditTheater({ mission, report, onReadReport }: { mission: MissionState | null; report?: GhostReport | null; onReadReport?: () => void }) {
  const booting = !mission;
  const running = mission?.status === "running";
  const finished = !!mission && mission.status === "complete" && !!report;
  const compiling = !!mission && mission.status === "complete" && !report;
  const liveIdx = booting ? 0 : compiling || finished ? CHAPTERS.length - 1 : chapterOf(mission.currentStage);
  const stagePct = booting ? 0 : compiling || finished ? 100 : Math.round(mission.stageProgress ?? 0);
  const overall = finished ? 100 : compiling ? 99 : Math.min(99, Math.round(((liveIdx + stagePct / 100) / CHAPTERS.length) * 100));
  const [pinned, setPinned] = useState<number | null>(null);
  const [drawer, setDrawer] = useState(false);
  const viewIdx = pinned ?? liveIdx;
  const log = useMemo(() => mission?.progressLog ?? [], [mission?.progressLog]);
  const flows = mission?.detectedFlows ?? [];
  const journeys = mission?.customerSnippets ?? [];
  const preview = useSitePreview(mission);
  const pagesRead = useMemo(() => {
    for (let i = log.length - 1; i >= 0; i--) {
      const m = /Crawled (\d+) page/.exec(log[i].message);
      if (m) return Number(m[1]);
    }
    return null;
  }, [log]);
  useEffect(() => { if (pinned !== null && pinned >= liveIdx) setPinned(null); }, [liveIdx, pinned]);

  const chapter = CHAPTERS[viewIdx];
  const latest = [...log].reverse().find((l) => chapter.stages.includes(l.stage))?.message;
  const showFinale = finished && pinned === null;

  return (
    <section aria-label="Live audit" className="relative isolate h-[100svh] min-h-[620px] w-full overflow-hidden bg-paper">
      {/* Atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[42%] h-[70vh] w-[110vw] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(238,241,255,1),rgba(238,241,255,0))]" />
        <div className="absolute inset-0 [background-image:linear-gradient(rgba(10,10,12,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(10,10,12,0.035)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,#000_15%,transparent_70%)]" />
      </div>

      {/* Progress line along the very top */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-fog">
        <motion.div className="heat-gradient h-full" animate={{ width: `${overall}%` }} transition={{ duration: 0.9, ease: EASE }} />
      </div>

      {/* Top bar */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-center gap-3 px-[clamp(1rem,4vw,2.5rem)] pt-5">
        <Link href="/" aria-label="Ghost home" className="flex items-center gap-2">
          <GhostMark className="h-7 w-7" />
          <span className="hidden font-heading text-[19px] font-semibold tracking-[-0.04em] sm:inline">Ghost<span className="text-ember">.</span></span>
        </Link>
        <span className="mono-label ml-2 hidden items-center gap-2 rounded-full border border-line bg-paper/80 px-3 py-1.5 text-graphite backdrop-blur sm:inline-flex">
          <span aria-hidden className={running || booting ? "ember-dot !h-1.5 !w-1.5" : "h-1.5 w-1.5 rounded-full bg-resolved"} />
          {booting ? "Starting" : running ? "Live audit" : finished ? "Report ready" : "Finishing"}
        </span>
        {mission && <span className="mono-label truncate text-ash-text">{mission.domain}</span>}
        <div className="ml-auto flex items-center gap-2">
          {mission && <span className="mono-label hidden text-ash-text md:inline">Elapsed <Elapsed start={mission.startedAt} running={!!running} /></span>}
          {mission && (
            <button type="button" onClick={() => setDrawer((d) => !d)} aria-expanded={drawer} aria-controls="theater-log" className="mono-label inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-paper/80 px-3.5 text-[10px] text-ink backdrop-blur hover:bg-mist">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-resolved" /> Behind the scenes <span className="tabular text-ash-text">{log.length}</span>
            </button>
          )}
          {running && <Link href="/dashboard/audits" className="mono-label hidden min-h-10 items-center rounded-full px-3 text-[10px] text-graphite hover:text-ink lg:inline-flex">Leave · it keeps running</Link>}
        </div>
      </header>

      {/* Stage */}
      <div className="absolute inset-x-0 bottom-[min(30vh,230px)] top-[88px] px-[clamp(1rem,4vw,2.5rem)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={booting ? "boot" : showFinale ? "finale" : `c${viewIdx}`}
            initial={{ opacity: 0, scale: 0.985, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.01, filter: "blur(8px)" }}
            transition={{ duration: 0.6, ease: EASE }}
            className="mx-auto flex h-full max-w-[1100px] items-center justify-center"
          >
            {booting ? <BootScene />
              : showFinale && report ? <FinaleScene report={report} onRead={onReadReport} />
              : viewIdx === 0 ? <ReadingScene domain={mission.domain} preview={preview} pagesRead={pagesRead} live={liveIdx === 0 && !!running} />
              : viewIdx === 1 ? <PathsScene domain={mission.domain} flows={flows} waiting={chapter.waiting} />
              : viewIdx === 2 ? <WalkScene flows={flows} journeys={journeys} waiting={chapter.waiting} />
              : viewIdx === 3 ? <FrictionScene journeys={journeys} waiting={chapter.waiting} />
              : <WritingScene pct={liveIdx > 4 ? 100 : liveIdx === 4 ? stagePct : 0} compiling={compiling} waiting={chapter.waiting} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Narration */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-[clamp(1rem,4vw,2.5rem)] pb-[clamp(18px,4vh,40px)]">
        <div className="mx-auto max-w-[1100px] text-center">
          {!showFinale && (
            <>
              <p className="mono-label text-ash-text">{booting ? "Getting ready" : `Chapter ${viewIdx + 1} of ${CHAPTERS.length} · ${chapter.label}${viewIdx === liveIdx && running ? ` · ${stagePct}%` : ""}`}</p>
              <AnimatePresence mode="wait">
                <motion.h1 key={booting ? "boot" : compiling ? "compiling" : viewIdx} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5, ease: EASE }} className="mt-2 font-heading text-[clamp(28px,4vw,52px)] font-[560] leading-[1.04] tracking-[-0.04em] text-ink">
                  {booting ? <>Opening <S>your audit…</S></> : compiling ? <>Putting <S>your report</S> together.</> : chapter.title}
                </motion.h1>
              </AnimatePresence>
              <p aria-live="polite" className="mx-auto mt-3 min-h-[1.6em] max-w-[64ch] text-[15px] text-graphite">
                <AnimatePresence mode="wait">
                  <motion.span key={latest ?? chapter.waiting} initial={{ opacity: 0, clipPath: "inset(0 100% 0 0)" }} animate={{ opacity: 1, clipPath: "inset(0 0% 0 0)" }} exit={{ opacity: 0 }} transition={{ duration: 0.7, ease: EASE }} className="inline-block">
                    {booting ? "Ghost is getting your audit ready." : latest ?? chapter.waiting}
                  </motion.span>
                </AnimatePresence>
              </p>
            </>
          )}
          {!booting && (
            <nav aria-label="Audit chapters" className="mt-5 flex items-center justify-center gap-2">
              {CHAPTERS.map((c, i) => {
                const done = i < liveIdx || finished;
                const live = i === liveIdx && !finished;
                const selected = i === viewIdx && !showFinale;
                return (
                  <button
                    key={c.label}
                    type="button"
                    disabled={!done && !live}
                    onClick={() => setPinned(i === liveIdx && !finished ? null : i)}
                    aria-label={`Chapter ${i + 1}: ${c.label}${done ? " (done)" : live ? " (in progress)" : ""}`}
                    aria-current={selected ? "step" : undefined}
                    className="group grid h-8 place-items-center px-1 disabled:cursor-default"
                  >
                    <span className={cn("block h-1.5 rounded-full transition-all duration-500", selected ? "w-8 bg-ink" : done ? "w-1.5 bg-ink group-hover:w-4" : live ? "w-4 bg-ember" : "w-1.5 bg-line")} />
                  </button>
                );
              })}
              {pinned !== null && (
                <button type="button" onClick={() => setPinned(null)} className="mono-label ml-3 inline-flex min-h-8 items-center gap-1.5 rounded-full border border-line bg-paper px-3 text-[10px] text-ink hover:bg-mist">
                  {finished ? "Back to result" : "Back to live"} <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </nav>
          )}
        </div>
      </div>

      {/* Behind the scenes drawer — the full, real event log */}
      <AnimatePresence>
        {drawer && mission && (
          <motion.aside
            id="theater-log"
            aria-label="Behind the scenes"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.45, ease: EASE }}
            className="absolute bottom-0 right-0 top-0 z-30 flex w-full max-w-[420px] flex-col border-l border-line bg-paper/95 shadow-[var(--shadow-float)] backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <p className="mono-label flex items-center gap-2 text-ink"><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-resolved" />Behind the scenes</p>
              <button type="button" onClick={() => setDrawer(false)} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full hover:bg-mist"><X className="h-4 w-4" /></button>
            </div>
            <p className="px-5 pt-4 text-[13px] text-ash-text">Every event Ghost has reported for this audit, newest first.</p>
            <ol className="mt-2 flex-1 divide-y divide-line overflow-y-auto" data-lenis-prevent>
              {log.length === 0 && <li className="px-5 py-4 text-[14px] text-ash-text">No events yet.</li>}
              {[...log].reverse().map((l) => (
                <motion.li key={`${l.ts}-${l.message}`} layout initial={{ opacity: 0, backgroundColor: "rgba(255,233,225,0.9)" }} animate={{ opacity: 1, backgroundColor: "rgba(255,255,255,0)" }} transition={{ duration: 1.2, ease: EASE }} className="flex gap-4 px-5 py-3">
                  <span className="mono-label w-14 shrink-0 pt-0.5 text-[10px] text-ash-text tabular">{since(mission.startedAt, l.ts)}</span>
                  <span className="text-[14px] leading-relaxed text-ink">{l.message}</span>
                </motion.li>
              ))}
            </ol>
          </motion.aside>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ── Opening: the ghost arrives ───────────────────────────────────────── */
function BootScene() {
  return (
    <div className="relative grid place-items-center">
      {Array.from({ length: 14 }, (_, i) => {
        const a = i * 2.39996;
        const r = 120 + ((i * 47) % 140);
        return (
          <motion.span key={i} aria-hidden className="absolute h-1.5 w-1.5 rounded-full bg-[#C9D0F5]" initial={{ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.7, opacity: 0 }} animate={{ x: 0, y: 0, opacity: [0, 0.9, 0] }} transition={{ duration: 1.4, ease: EASE, delay: (i % 5) * 0.08, repeat: Infinity, repeatDelay: 0.4 }} />
        );
      })}
      <motion.div initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)", y: [0, -8, 0] }} transition={{ duration: 0.8, ease: EASE, y: { duration: 2.4, repeat: Infinity, ease: "easeInOut" } }}>
        <GhostMark className="h-24 w-24" />
      </motion.div>
    </div>
  );
}

/* ── 1 · Reading: real homepage snapshot, real page count ──────────────── */
function ReadingScene({ domain, preview, pagesRead, live }: { domain: string; preview: string | null; pagesRead: number | null; live: boolean }) {
  const dots = Math.min(pagesRead ?? 0, 48);
  return (
    <div className="flex w-full items-center justify-center gap-[clamp(16px,4vw,56px)]">
      <div className="relative w-full max-w-[720px]">
        {/* the narrator, perched on the frame */}
        <motion.div aria-hidden className="absolute -top-11 left-1/2 z-10 -ml-6" animate={{ y: [0, -5, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}>
          <GhostMark className="h-12 w-12" track />
        </motion.div>
        <div className="overflow-hidden rounded-[18px] border border-line bg-paper shadow-[var(--shadow-float)]">
          <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
            <span className="flex gap-1.5">{[0, 1, 2].map((d) => <span key={d} className="h-2 w-2 rounded-full bg-line" />)}</span>
            <span className="mono-label mx-auto truncate rounded-full bg-mist px-3 py-0.5 text-[10px] text-ash-text">{domain}</span>
          </div>
          <div className="relative aspect-[16/10] max-h-[44vh] w-full overflow-hidden bg-mist">
            {preview ? (
              <motion.img src={preview} alt={`Homepage of ${domain}, as Ghost captured it`} initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, ease: EASE }} className="absolute inset-0 h-full w-full object-cover object-top" />
            ) : (
              <div className="absolute inset-0 grid place-items-center">
                <div className="w-[70%] space-y-3">
                  {[90, 70, 80, 55].map((w, i) => <div key={i} className="ghost-skeleton h-4" style={{ width: `${w}%` }} />)}
                  <p className="pt-2 text-center text-[13px] text-ash-text">Waiting for the homepage snapshot…</p>
                </div>
              </div>
            )}
            {live && (
              <motion.div aria-hidden className="pointer-events-none absolute inset-0" initial={{ y: "-30%" }} animate={{ y: ["-30%", "100%"] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}>
                <span className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent via-[rgba(238,241,255,0.6)] to-transparent" />
                <span className="absolute inset-x-0 top-12 h-px bg-gradient-to-r from-transparent via-ember/70 to-transparent" />
              </motion.div>
            )}
          </div>
        </div>
      </div>
      <div className="hidden w-[200px] shrink-0 md:block">
        <p className="mono-label text-ash-text">Pages read</p>
        <p className="mt-1 font-heading text-[64px] font-medium leading-none tracking-[-0.05em] text-ink">{pagesRead !== null ? <CountUp to={pagesRead} /> : "—"}</p>
        <div aria-hidden className="mt-4 grid grid-cols-8 gap-1.5">
          {Array.from({ length: dots }, (_, i) => <motion.span key={i} className="h-2 w-2 rounded-full bg-ink" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3, delay: i * 0.03, ease: EASE }} />)}
        </div>
        <p className="mono-label mt-5 flex items-center gap-2 text-[10px] text-ash-text">
          <span className={cn("h-1.5 w-1.5 rounded-full", preview ? "bg-resolved" : "bg-line")} />Homepage snapshot {preview ? "captured" : "pending"}
        </p>
      </div>
    </div>
  );
}

/* ── 2 · Paths: lines draw from the homepage to each detected flow ─────── */
function PathsScene({ domain, flows, waiting }: { domain: string; flows: Flow[]; waiting: string }) {
  const shown = flows.slice(0, 6);
  const max = Math.max(1, ...shown.map((f) => f.revenue_weight || 0));
  const ys = shown.map((_, i) => (shown.length === 1 ? 50 : 10 + (80 * i) / (shown.length - 1)));
  return (
    <div className="relative h-full max-h-[440px] w-full">
      <svg aria-hidden viewBox="0 0 1000 400" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
        {shown.length === 0 && [20, 50, 80].map((y, i) => (
          <motion.path key={i} d={`M150 200 C 400 200, 450 ${y * 4}, 640 ${y * 4}`} fill="none" stroke="#C9CAC4" strokeWidth={1.2} strokeDasharray="4 8" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0] }} transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }} />
        ))}
        {shown.map((f, i) => (
          <motion.path key={f.id} d={`M150 200 C 420 200, 440 ${ys[i] * 4}, 690 ${ys[i] * 4}`} fill="none" stroke="#0A0A0C" strokeOpacity={0.75} strokeWidth={1 + ((f.revenue_weight || 0) / max) * 3.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: EASE, delay: 0.2 + i * 0.15 }} />
        ))}
      </svg>
      {/* home node */}
      <div className="absolute left-[15%] top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full border border-ink bg-paper shadow-[var(--shadow-soft)]"><GhostMark className="h-8 w-8" /></span>
        <p className="mono-label mt-2 max-w-[140px] truncate text-[10px] text-ash-text">{domain}</p>
      </div>
      {shown.length === 0 ? (
        <p className="absolute right-[6%] top-1/2 max-w-[260px] -translate-y-1/2 text-[15px] text-graphite">{waiting}</p>
      ) : shown.map((f, i) => (
        <motion.div key={f.id} className="absolute left-[69%] w-[min(30%,300px)] -translate-y-1/2" style={{ top: `${ys[i]}%` }} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: EASE, delay: 0.9 + i * 0.15 }}>
          <div className="rounded-[12px] border border-line bg-paper/95 px-3.5 py-2.5 shadow-[var(--shadow-soft)]">
            <p className="truncate text-[14px] font-medium tracking-[-0.01em] text-ink">{f.name}</p>
            <p className="mt-0.5 hidden truncate text-[12px] text-graphite sm:block">{f.goal}</p>
          </div>
        </motion.div>
      ))}
      {flows.length > shown.length && <p className="mono-label absolute bottom-0 right-0 text-[10px] text-ash-text">+{flows.length - shown.length} more paths</p>}
    </div>
  );
}

/* ── 3 · Walking: a shopper walks each real journey, step by step ──────── */
function WalkScene({ flows, journeys, waiting }: { flows: Flow[]; journeys: Snippet[]; waiting: string }) {
  // One lane per path; each lane shows that path's latest real journey.
  const lanes = useMemo(() => {
    const byFlow = new Map<string, Snippet>();
    journeys.forEach((j) => byFlow.set(j.flowId, j));
    const ids = flows.length ? flows.map((f) => f.id) : Array.from(byFlow.keys());
    return ids.slice(0, 5).map((id) => ({ id, name: flows.find((f) => f.id === id)?.name ?? byFlow.get(id)?.flowName ?? "Customer path", journey: byFlow.get(id) }));
  }, [flows, journeys]);
  if (!lanes.length) return <Waiting text={waiting} />;
  return (
    <div className="w-full max-w-[1000px] space-y-3">
      {lanes.map((lane, i) => <Lane key={lane.id + (lane.journey ? lane.journey.steps.length + lane.journey.outcome : "")} name={lane.name} journey={lane.journey} delay={i * 0.25} />)}
      <p className="pt-2 text-center text-[12px] text-ash-text">Simulated shoppers, not real visitors. {journeys.length} journey{journeys.length === 1 ? "" : "s"} walked so far.</p>
    </div>
  );
}

function Lane({ name, journey, delay }: { name: string; journey?: Snippet; delay: number }) {
  const [run, setRun] = useState(0);
  if (!journey) {
    return (
      <div className="flex items-center gap-4 rounded-[14px] border border-dashed border-[#D6D7D1] bg-paper/70 px-4 py-3">
        <span className="w-[min(32%,220px)] shrink-0 truncate text-[14px] font-medium text-ink">{name}</span>
        <motion.span aria-hidden animate={{ y: [0, -3, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}><GhostMark className="h-6 w-6 opacity-40" /></motion.span>
        <span className="text-[13px] text-ash-text">Waiting for this shopper…</span>
      </div>
    );
  }
  const o = OUTCOME[journey.outcome];
  const stops = journey.steps.length;
  const step = 0.55;
  const total = stops * step;
  const end = journey.outcome === "completed" ? 100 : (Math.max(0, stops - 1) / Math.max(1, stops)) * 100;
  return (
    <div className="flex items-center gap-4 rounded-[14px] border border-line bg-paper px-4 py-3 shadow-[0_1px_2px_rgba(10,10,12,0.04)]">
      <button type="button" onClick={() => setRun((r) => r + 1)} title="Replay this journey" className="w-[min(32%,220px)] shrink-0 truncate text-left text-[14px] font-medium text-ink hover:underline">{name}</button>
      <div key={run} className="relative flex min-w-0 flex-1 items-center">
        {/* track */}
        <span aria-hidden className="absolute inset-x-3 top-1/2 h-px bg-line" />
        <ol className="relative flex w-full items-center justify-between">
          {journey.steps.map((s, k) => (
            <motion.li key={k} title={s.action} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, delay: delay + k * step }} className="max-w-[24%] truncate rounded-full border border-line bg-mist px-2.5 py-1 text-[11px] text-graphite">{s.page}</motion.li>
          ))}
          <motion.li initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: delay + total, ease: EASE }} className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px]", o.chip, o.text)}>
            {journey.outcome === "completed" ? <span className="inline-flex items-center gap-1"><Check className="h-3 w-3" strokeWidth={3} />Completed</span> : journey.outcome === "hesitant" ? `Hesitated at ${journey.droppedAt}` : `Left at ${journey.droppedAt}`}
          </motion.li>
        </ol>
        {/* the shopper */}
        <motion.span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-full" initial={{ x: "0%" }} animate={{ x: ["0%", `${end * 0.86}%`] }} transition={{ duration: total, delay, ease: "easeInOut" }}>
          <motion.span className="absolute -top-5 left-1" animate={journey.outcome === "abandoned" ? { opacity: [1, 1, 0], y: [0, 0, -10] } : journey.outcome === "hesitant" ? { rotate: [0, -8, 8, -6, 0] } : { y: [0, -3, 0] }} transition={journey.outcome === "abandoned" ? { duration: 0.8, delay: delay + total } : journey.outcome === "hesitant" ? { duration: 0.8, delay: delay + total } : { duration: 0.5, repeat: Math.max(1, stops), delay }}>
            <GhostMark className="h-6 w-6 drop-shadow-[0_4px_8px_rgba(10,10,12,0.18)]" />
          </motion.span>
        </motion.span>
      </div>
    </div>
  );
}

/* ── 4 · Friction: real tallies and where shoppers stopped ─────────────── */
function FrictionScene({ journeys, waiting }: { journeys: Snippet[]; waiting: string }) {
  if (!journeys.length) return <Waiting text={waiting} />;
  const tally = { completed: 0, hesitant: 0, abandoned: 0 } as Record<keyof typeof OUTCOME, number>;
  const drops = new Map<string, number>();
  journeys.forEach((j) => {
    tally[j.outcome] += 1;
    if (j.outcome !== "completed" && j.droppedAt) drops.set(j.droppedAt, (drops.get(j.droppedAt) ?? 0) + 1);
  });
  const spots = [...drops.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const top = spots[0]?.[1] ?? 1;
  return (
    <div className="grid w-full max-w-[1000px] items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div className="grid grid-cols-3 gap-3 md:grid-cols-1">
        {(Object.keys(OUTCOME) as Array<keyof typeof OUTCOME>).map((k, i) => (
          <motion.div key={k} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: EASE, delay: i * 0.1 }} className="rounded-[14px] border border-line bg-paper px-4 py-3">
            <p className="mono-label flex items-center gap-1.5 text-[10px] text-ash-text"><span className={cn("h-1.5 w-1.5 rounded-full", OUTCOME[k].dot)} />{OUTCOME[k].label}</p>
            <p className="mt-1 font-heading text-[40px] font-medium leading-none tracking-[-0.05em] text-ink"><CountUp to={tally[k]} /></p>
          </motion.div>
        ))}
      </div>
      <div className="relative flex min-h-[260px] flex-wrap content-center items-center justify-center gap-x-6 gap-y-8">
        {spots.length === 0 && <p className="text-[15px] text-graphite">Every shopper completed their path so far.</p>}
        {spots.map(([where, n], i) => {
          const size = 70 + (n / top) * 90;
          return (
            <motion.div key={where} className="relative grid place-items-center text-center" style={{ width: size, height: size }} initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, ease: EASE, delay: 0.3 + i * 0.12 }}>
              <motion.span aria-hidden className="absolute inset-0 rounded-full" style={{ background: "var(--heat-radial)" }} animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }} />
              <span className="relative z-10 px-2">
                <span className="block font-heading text-[22px] font-medium leading-none text-ink tabular">{n}</span>
                <span className="mt-1 block max-w-[150px] text-[12px] font-medium leading-tight text-ink">{where}</span>
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ── 5 · Writing: a report sheet assembles at the real progress ────────── */
function WritingScene({ pct, compiling, waiting }: { pct: number; compiling: boolean; waiting: string }) {
  if (pct === 0 && !compiling) return <Waiting text={waiting} />;
  const lines = 9;
  const shown = Math.max(1, Math.round((pct / 100) * lines));
  return (
    <div className="flex items-center gap-[clamp(16px,4vw,48px)]">
      <motion.div aria-hidden animate={{ y: [0, -6, 0], rotate: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="hidden sm:block">
        <GhostMark className="h-16 w-16" />
      </motion.div>
      <div className="w-[min(78vw,440px)] rounded-[16px] border border-line bg-paper p-6 shadow-[var(--shadow-float)]">
        <div className="flex items-center justify-between">
          <span className="mono-label text-ash-text">Ghost report · draft</span>
          <span className="mono-label text-ink tabular">{pct}%</span>
        </div>
        <div className="mt-5 flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-[5px] border-fog font-heading text-lg text-ash">?</span>
          <div className="flex-1 space-y-2">
            <span className="block h-2.5 w-[70%] rounded-full bg-ink/80" />
            <span className="block h-2 w-[50%] rounded-full bg-fog" />
          </div>
        </div>
        <div className="mt-6 space-y-2.5">
          {Array.from({ length: lines }, (_, i) => (
            <motion.span key={i} className={cn("block h-2 rounded-full", i % 4 === 0 ? "bg-ember/70" : "bg-fog")} style={{ width: `${55 + ((i * 37) % 40)}%`, transformOrigin: "left" }} initial={false} animate={{ scaleX: i < shown ? 1 : 0, opacity: i < shown ? 1 : 0 }} transition={{ duration: 0.6, ease: EASE, delay: i < shown ? (i % 3) * 0.08 : 0 }} />
          ))}
        </div>
        <p className="mt-6 text-[13px] text-graphite">{compiling ? "Saving your report…" : "Turning the journeys into a score, prioritised findings and fixes."}</p>
      </div>
    </div>
  );
}

/* ── Finale: the real Ghost Score ──────────────────────────────────────── */
function FinaleScene({ report, onRead }: { report: GhostReport; onRead?: () => void }) {
  const findings = report.leaks?.length ?? 0;
  return (
    <div className="flex flex-col items-center text-center">
      <motion.span aria-hidden className="absolute h-[420px] w-[420px] rounded-full" style={{ background: "var(--heat-radial)" }} initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 0.35 }} transition={{ duration: 1.6, ease: EASE }} />
      <div className="relative">
        <ScoreRing value={report.score} size={180} stroke={10} count label={`Ghost Score ${Math.round(report.score)} out of 100: ${getScoreLabel(report.score)}`} />
      </div>
      <p className="mono-label relative mt-5 text-ash-text">Ghost Score · {getScoreLabel(report.score)}</p>
      <h1 className="relative mt-3 font-heading text-[clamp(30px,4.4vw,56px)] font-[560] leading-[1.04] tracking-[-0.04em] text-ink">Your report <S>is ready.</S></h1>
      <p className="relative mt-3 text-[15px] text-graphite">{findings} finding{findings === 1 ? "" : "s"} to review for {report.domain}.</p>
      <div className="relative mt-7 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={onRead} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-7 text-[15px] font-medium text-paper transition-[background-color,transform] hover:bg-[#24252A] active:scale-[0.98]">Read your report <ArrowDown className="h-4 w-4" /></button>
        <Link href="/dashboard/overview" className="inline-flex min-h-12 items-center rounded-full border border-line bg-paper px-6 text-[15px] font-medium text-ink hover:bg-mist">Go to dashboard</Link>
      </div>
    </div>
  );
}

function Waiting({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <span className="relative grid h-20 w-20 place-items-center overflow-hidden rounded-full border border-line bg-paper shadow-[var(--shadow-soft)]">
        <motion.span animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}><GhostMark className="h-10 w-10" /></motion.span>
        <span aria-hidden className="ghost-scan-beam absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ember to-transparent" />
      </span>
      <p className="max-w-[40ch] text-[15px] text-graphite">{text}</p>
    </div>
  );
}
