"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion, animate } from "framer-motion";
import {
  DollarSign,
  ShieldCheck,
  Smartphone,
  Zap,
  CheckCircle2,
  ArrowRight,
  Sliders,
  Sparkles,
  TrendingUp,
  Volume2,
} from "lucide-react";
import { Eyebrow, MaskLines, Reveal, Serif } from "./motion/Reveal";
import { cn } from "@/lib/utils";
import { useStartScan } from "@/hooks/useStartScan";
import { GhostMark } from "@/components/ui/GhostMark";

const EASE = [0.22, 1, 0.36, 1] as const;

interface LeakItem {
  id: string;
  title: string;
  category: string;
  icon: typeof DollarSign;
  dropOffRate: string;
  dropOffPercent: number;
  scorePenalty: number;
  recoveryMetric: string;
  rawSymptom: string;
  ghostFix: string;
  verbatim: string;
}

const LEAKS: LeakItem[] = [
  {
    id: "pricing-gate",
    title: "The Unanswered Price Gate",
    category: "Pricing & Transparency",
    icon: DollarSign,
    dropOffRate: "42% drop-off",
    dropOffPercent: 42,
    scorePenalty: -18,
    recoveryMetric: "+38% inquiry lift",
    rawSymptom:
      "Core services and flagship offerings display ‘Enquire for price’ without baseline figures or package deliverables.",
    ghostFix:
      "Transparent tiered pricing starting points with clear inclusion lists and custom quote options for bespoke jobs.",
    verbatim: "“I won’t fill out a contact form if I don't even know your ballpark price.”",
  },
  {
    id: "social-proof-void",
    title: "The Missing Proof Anchor",
    category: "Trust & Credibility",
    icon: ShieldCheck,
    dropOffRate: "31% drop-off",
    dropOffPercent: 31,
    scorePenalty: -14,
    recoveryMetric: "+40 Google badges",
    rawSymptom:
      "40+ verified 5-star Google reviews exist off-site, but zero testimonial evidence is placed within 400px of primary CTAs.",
    ghostFix:
      "Contextual customer validation badges and verified project outcome snippets embedded directly beside conversion buttons.",
    verbatim: "“There are no ratings or recent client photos here. How do I know you deliver?”",
  },
  {
    id: "mobile-form-exhaustion",
    title: "Mobile Form Exhaustion",
    category: "UX & Conversion Flow",
    icon: Smartphone,
    dropOffRate: "28% drop-off",
    dropOffPercent: 28,
    scorePenalty: -12,
    recoveryMetric: "1-Tap fast checkout",
    rawSymptom:
      "7 mandatory form fields on mobile screens with sluggish dropdowns and no WhatsApp or single-tap contact alternative.",
    ghostFix:
      "2-step micro-inquiry flow with browser autofill support and a 1-tap WhatsApp consultation launch.",
    verbatim: "“Typing my whole address and timeline on a phone keyboard was too tedious.”",
  },
  {
    id: "vitals-render-stall",
    title: "Silent Render Delay & Shift",
    category: "Core Web Vitals",
    icon: Zap,
    dropOffRate: "19% drop-off",
    dropOffPercent: 19,
    scorePenalty: -8,
    recoveryMetric: "0.7s instant paint",
    rawSymptom:
      "3.9s Largest Contentful Paint (LCP) and jarring cumulative layout shift pushing action buttons during page load.",
    ghostFix:
      "Preloaded modern image formats, reserved layout aspect ratios, and deferred third-party script executions.",
    verbatim: "“The screen froze while loading, and when I tried to tap, the page jumped.”",
  },
];

/** Animated audio equalizer bars indicating live customer voice telemetry.
 *  Scale only — a changing height was resizing the cards and shifting the page. */
function AudioWaveform({ isAlert = true }: { isAlert?: boolean }) {
  return (
    <div className="flex h-4 w-5 shrink-0 items-end justify-end gap-[2.5px]" aria-hidden="true">
      {[10, 16, 9, 14, 7].map((h, i) => (
        <motion.span
          key={i}
          className={cn(
            "w-[2px] origin-bottom rounded-full",
            isAlert ? "bg-ember/80" : "bg-resolved/80"
          )}
          style={{ height: h }}
          animate={{
            scaleY: [0.35, 1, 0.45, 0.85, 0.35],
          }}
          transition={{
            duration: 1.1,
            repeat: Infinity,
            delay: i * 0.14,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export function FrictionMatrix() {
  const [isOptimized, setIsOptimized] = useState(false);
  const [activeLeakId, setActiveLeakId] = useState<string | null>(null);
  const [hoveredLeakId, setHoveredLeakId] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const startScan = useStartScan();

  const targetScore = isOptimized ? 94 : 54;
  const [displayScore, setDisplayScore] = useState(targetScore);

  useEffect(() => {
    const controls = animate(displayScore, targetScore, {
      duration: 0.75,
      ease: EASE,
      onUpdate: (latest) => setDisplayScore(Math.round(latest)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetScore]);

  const focusedLeak = LEAKS.find((l) => l.id === (hoveredLeakId || activeLeakId));

  return (
    <section
      id="leaks"
      aria-labelledby="leaks-section-title"
      className="section-pad product-section relative scroll-mt-28 border-t border-line bg-paper py-24 sm:py-32"
    >
      <span id="pricing" className="pointer-events-none absolute -top-28 block opacity-0" aria-hidden />
      <div className="product-container">
        {/* Section Header */}
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Reveal>
              <Eyebrow dot>Conversion Leak Engine · Interactive Diagnostic</Eyebrow>
            </Reveal>
            <MaskLines
              id="leaks-section-title"
              className="display-lg font-heading text-ink"
              lines={[
                "Where websites lose",
                <>
                  customers in <Serif>silence.</Serif>
                </>,
              ]}
            />
          </div>
          <Reveal delay={0.1} className="lg:col-span-5">
            <p className="text-[17px] leading-relaxed text-graphite">
              Google Analytics reports that visitors left. Ghost diagnoses the exact psychological
              and technical friction traps that pushed them away — and models the conversion lift
              when resolved.
            </p>
          </Reveal>
        </div>

        {/* Interactive Mode Simulator Bar */}
        <Reveal delay={0.15} className="mt-12 sm:mt-16">
          <div className="flex flex-col gap-5 rounded-[22px] border border-line/80 bg-mist/50 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-ember" />
                <span className="mono-label text-[11px] font-semibold text-ink">
                  Live Conversion Friction Simulator
                </span>
              </div>
              <p className="mt-1 text-sm text-graphite">
                Toggle between your website’s raw friction state and the Ghost AI sealed optimization.
              </p>
            </div>

            {/* Seamless Liquid Toggle */}
            <div className="relative inline-flex items-center rounded-full border border-line/80 bg-paper p-1 shadow-xs">
              <button
                type="button"
                onClick={() => setIsOptimized(false)}
                className={cn(
                  "relative z-10 mono-label flex items-center gap-2 rounded-full px-5 py-2.5 text-[11px] font-medium transition-colors duration-200",
                  !isOptimized ? "text-paper" : "text-ash-text hover:text-ink"
                )}
              >
                {!isOptimized && (
                  <motion.div
                    layoutId="activeSimulatorIndicator"
                    className="absolute inset-0 rounded-full bg-ink shadow-xs"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span
                  className={cn(
                    "relative z-10 h-2 w-2 rounded-full",
                    !isOptimized
                      ? "bg-ember shadow-[0_0_8px_rgba(240,77,38,0.7)] animate-pulse"
                      : "bg-ash"
                  )}
                />
                <span className="relative z-10">Raw Site (Silent Leaks)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOptimized(true)}
                className={cn(
                  "relative z-10 mono-label flex items-center gap-2 rounded-full px-5 py-2.5 text-[11px] font-medium transition-colors duration-200",
                  isOptimized ? "text-paper" : "text-ash-text hover:text-ink"
                )}
              >
                {isOptimized && (
                  <motion.div
                    layoutId="activeSimulatorIndicator"
                    className="absolute inset-0 rounded-full bg-resolved shadow-xs"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <Sparkles className="relative z-10 h-3.5 w-3.5" />
                <span className="relative z-10">Ghost AI Optimized</span>
              </button>
            </div>
          </div>
        </Reveal>

        {/* Live Simulation Matrix */}
        <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-start">
          {/* Left Column: Interactive Ghost Score Dial Console */}
          <Reveal delay={0.2} className="lg:col-span-4">
            <div className="relative flex flex-col overflow-hidden rounded-[24px] border border-line/80 bg-paper p-6 sm:p-7 shadow-[var(--shadow-soft)] transition-all duration-300">
              {/* Header Telemetry Pill */}
              <div className="flex items-center justify-between border-b border-line/70 pb-4">
                <span className="mono-label text-[10px] text-ash-text uppercase tracking-wider">
                  Ghost Audit Rating
                </span>
                <motion.span
                  key={isOptimized ? "shield-pill" : "alert-pill"}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "mono-label rounded-full px-3 py-1 text-[10px] font-medium border",
                    isOptimized
                      ? "bg-resolved/10 text-resolved-text border-resolved/25"
                      : "bg-ember-soft text-ember-text border-ember/25"
                  )}
                >
                  {isOptimized ? "Shield Protected" : "Friction Alert"}
                </motion.span>
              </div>

              {/* Animated Circular Score Dial with Focused Penalty Feedback */}
              <div className="my-6 flex flex-col items-center justify-center">
                <div className="relative flex h-48 w-48 items-center justify-center">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 140 140">
                    <circle
                      cx="70"
                      cy="70"
                      r="58"
                      className="fill-none stroke-line/50"
                      strokeWidth="9"
                    />
                    <motion.circle
                      cx="70"
                      cy="70"
                      r="58"
                      className={cn(
                        "fill-none transition-colors duration-500",
                        isOptimized ? "stroke-resolved" : "stroke-ember"
                      )}
                      strokeWidth="9"
                      strokeDasharray={2 * Math.PI * 58}
                      strokeLinecap="round"
                      animate={{
                        strokeDashoffset:
                          2 * Math.PI * 58 * (1 - displayScore / 100),
                      }}
                      transition={{ duration: 0.8, ease: EASE }}
                    />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="tabular font-heading text-5xl font-semibold tracking-[-0.04em] text-ink">
                      {displayScore}
                    </span>
                    <span className="mono-label mt-0.5 text-[10px] text-ash-text">
                      out of 100
                    </span>

                    {/* Dynamic Focused Card Penalty Callout */}
                    <AnimatePresence mode="wait">
                      {focusedLeak && !isOptimized ? (
                        <motion.div
                          key={`penalty-${focusedLeak.id}`}
                          initial={{ opacity: 0, y: 4, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="mt-1 inline-flex items-center gap-1 rounded-full bg-ember/10 px-2 py-0.5 text-[9px] font-medium text-ember-text"
                        >
                          <span>{focusedLeak.scorePenalty} pts penalty</span>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="health-status"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="mt-1 text-[10px] font-medium text-ash-text"
                        >
                          {isOptimized ? "Optimal Velocity" : "Active Drag"}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <motion.p
                  key={isOptimized ? "opt-msg" : "raw-msg"}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className={cn(
                    "mt-3 text-center text-sm font-medium",
                    isOptimized ? "text-resolved-text" : "text-ember-text"
                  )}
                >
                  {isOptimized
                    ? "All 4 conversion leaks sealed permanently"
                    : "4 silent conversion leaks degrading conversion rate"}
                </motion.p>
              </div>

              {/* 3 Telemetry Counters with Dynamic Focus Highlight */}
              <div className="space-y-3.5 border-t border-line/70 pt-5">
                <div
                  className={cn(
                    "flex items-center justify-between rounded-lg p-2 text-xs transition-colors",
                    focusedLeak?.id === "pricing-gate" || focusedLeak?.id === "mobile-form-exhaustion"
                      ? "bg-mist/80"
                      : "transparent"
                  )}
                >
                  <span className="text-graphite">Visitor Drop-Off Friction</span>
                  <span
                    className={cn(
                      "font-heading font-medium tabular",
                      isOptimized ? "text-resolved-text" : "text-ember-text"
                    )}
                  >
                    {isOptimized ? "18% (Low)" : "64% (Severe)"}
                  </span>
                </div>

                <div
                  className={cn(
                    "flex items-center justify-between rounded-lg p-2 text-xs transition-colors",
                    focusedLeak?.id === "vitals-render-stall" ? "bg-mist/80" : "transparent"
                  )}
                >
                  <span className="text-graphite">Decision Hesitation Time</span>
                  <span
                    className={cn(
                      "font-heading font-medium tabular",
                      isOptimized ? "text-resolved-text" : "text-ink"
                    )}
                  >
                    {isOptimized ? "0.9 seconds" : "4.8 seconds"}
                  </span>
                </div>

                <div
                  className={cn(
                    "flex items-center justify-between rounded-lg p-2 text-xs transition-colors",
                    focusedLeak?.id === "social-proof-void" || focusedLeak?.id === "pricing-gate"
                      ? "bg-mist/80"
                      : "transparent"
                  )}
                >
                  <span className="text-graphite">Estimated Revenue Retained</span>
                  <span
                    className={cn(
                      "font-heading font-medium tabular",
                      isOptimized ? "text-resolved-text" : "text-ash-text"
                    )}
                  >
                    {isOptimized ? "+₹1,85,000 / mo" : "₹0 (Lost to leaks)"}
                  </span>
                </div>
              </div>

              {/* Subtle Radar Light Sweep when toggling */}
              {!reduced && (
                <motion.div
                  key={`gauge-sweep-${isOptimized}`}
                  initial={{ x: "-100%", opacity: 0 }}
                  animate={{ x: "220%", opacity: [0, 0.4, 0.3, 0] }}
                  transition={{ duration: 0.8, ease: EASE }}
                  className="pointer-events-none absolute inset-y-0 w-28 -skew-x-12 bg-gradient-to-r from-transparent via-ember/20 to-transparent"
                />
              )}
            </div>
          </Reveal>

          {/* Right Column: 4 Interactive Conversion Leak Cards */}
          <Reveal delay={0.25} className="lg:col-span-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {LEAKS.map((leak) => {
                const isSelected = activeLeakId === leak.id;
                const isHovered = hoveredLeakId === leak.id;
                const LeakIcon = leak.icon;

                return (
                  <motion.div
                    key={leak.id}
                    onClick={() => setActiveLeakId(isSelected ? null : leak.id)}
                    onMouseEnter={() => setHoveredLeakId(leak.id)}
                    onMouseLeave={() => setHoveredLeakId(null)}
                    className={cn(
                      "group relative cursor-pointer overflow-hidden rounded-[22px] border p-6 transition-all duration-300",
                      isOptimized
                        ? "border-line/80 bg-paper hover:border-resolved/40 hover:shadow-md"
                        : isHovered || isSelected
                        ? "border-ember/40 bg-paper shadow-md ring-1 ring-ember/20"
                        : "border-line/80 bg-paper hover:border-line-dark hover:shadow-xs"
                    )}
                  >
                    {/* Top Row: Icon + Severity / Sealed Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={cn(
                          "grid h-10 w-10 place-items-center rounded-xl transition-all duration-300",
                          isOptimized
                            ? "bg-resolved/10 text-resolved-text"
                            : "bg-ember-soft text-ember-text group-hover:scale-105"
                        )}
                      >
                        <LeakIcon className="h-5 w-5" />
                      </div>

                      <div className="flex items-center gap-2">
                        <AnimatePresence mode="wait">
                          {isOptimized ? (
                            <motion.span
                              key="sealed-badge"
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ duration: 0.2 }}
                              className="mono-label inline-flex items-center gap-1 rounded-full border border-resolved/25 bg-resolved/10 px-3 py-1 text-[10px] font-medium text-resolved-text"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Sealed · {leak.recoveryMetric}</span>
                            </motion.span>
                          ) : (
                            <motion.span
                              key="raw-badge"
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ duration: 0.2 }}
                              className="mono-label inline-flex items-center gap-1.5 rounded-full border border-line/70 bg-mist px-3 py-1 text-[10px] font-medium text-graphite"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-ember animate-ping" />
                              <span>{leak.dropOffRate}</span>
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Card Title & Category */}
                    <h4 className="mt-4 font-heading text-[17px] font-medium tracking-tight text-ink">
                      {leak.title}
                    </h4>
                    <p className="mono-label mt-0.5 text-[10px] text-ash-text uppercase tracking-wider">
                      {leak.category}
                    </p>

                    {/* Dynamic Drop-off Severity / Resolution Meter */}
                    <div className="mt-3.5 mb-4">
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="mono-label text-[9px] text-ash-text uppercase tracking-wider">
                          {isOptimized ? "Protection Status" : "Conversion Drop Risk"}
                        </span>
                        <span
                          className={cn(
                            "mono-label text-[10px] font-medium tabular",
                            isOptimized ? "text-resolved-text" : "text-ember-text"
                          )}
                        >
                          {isOptimized ? "100% Sealed" : `${leak.dropOffPercent}% Abandonment`}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-mist">
                        <motion.div
                          initial={false}
                          animate={{
                            width: isOptimized ? "100%" : `${leak.dropOffPercent}%`,
                          }}
                          transition={{ duration: 0.65, ease: EASE }}
                          className={cn(
                            "h-full rounded-full transition-colors duration-500",
                            isOptimized
                              ? "bg-gradient-to-r from-emerald-500/70 to-emerald-500"
                              : "bg-gradient-to-r from-ember/60 to-ember"
                          )}
                        />
                      </div>
                    </div>

                    {/* Diagnostic Narrative Body */}
                    <AnimatePresence mode="wait">
                      {!isOptimized ? (
                        <motion.div
                          key="raw-body"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.22 }}
                          className="border-t border-line/60 pt-3"
                        >
                          <p className="text-[13px] leading-relaxed text-graphite">
                            {leak.rawSymptom}
                          </p>

                          {/* Customer Voice Intercept with Animated Audio Waveform */}
                          <div className="mt-3 rounded-xl border border-line/60 bg-mist/60 p-3">
                            <div className="flex items-center justify-between">
                              <span className="mono-label text-[9px] text-ash-text uppercase tracking-wider">
                                Shopper Voice Log
                              </span>
                              <AudioWaveform isAlert />
                            </div>
                            <p className="mt-1 text-xs italic font-serif leading-relaxed text-ember-text">
                              {leak.verbatim}
                            </p>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="fixed-body"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.22 }}
                          className="border-t border-resolved/20 pt-3"
                        >
                          <p className="text-[13px] leading-relaxed text-graphite">
                            {leak.ghostFix}
                          </p>

                          {/* Ghost Fix Sealed Banner */}
                          <div className="mt-3 rounded-xl border border-resolved/25 bg-resolved/5 p-3">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-resolved-text">
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                              <span>Friction trap permanently resolved</span>
                            </div>
                            <p className="mono-label mt-1 text-[10px] text-graphite">
                              Projected impact: <strong className="text-resolved-text">{leak.recoveryMetric}</strong>
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Radar Light Sweep effect on mode toggle */}
                    {!reduced && (
                      <motion.div
                        key={`card-sweep-${isOptimized}-${leak.id}`}
                        initial={{ x: "-100%", opacity: 0 }}
                        animate={{ x: "220%", opacity: [0, 0.45, 0.3, 0] }}
                        transition={{
                          duration: 0.75,
                          ease: EASE,
                          delay: 0.05,
                        }}
                        className="pointer-events-none absolute inset-y-0 w-32 -skew-x-12 bg-gradient-to-r from-transparent via-ember/20 to-transparent"
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Bottom Action Strip */}
            <div className="mt-6 flex flex-col gap-4 rounded-[22px] border border-line/80 bg-mist/50 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-paper shadow-xs">
                  <GhostMark className="h-6 w-6" />
                </span>
                <div>
                  <p className="font-heading text-sm font-medium text-ink">
                    Inspect your website for silent drop-offs
                  </p>
                  <p className="text-xs text-graphite">
                    No scripts or code to install. Ghost audits your site purely from the outside.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={startScan}
                className="group inline-flex min-h-12 shrink-0 items-center justify-center gap-2.5 rounded-full bg-ink px-6 text-sm font-medium text-paper transition-all hover:bg-[#222328] active:scale-[0.98]"
              >
                <span>Run Free Mystery Audit</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
