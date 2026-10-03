"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { animate, motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { GhostMark } from "@/components/ui/GhostMark";
import { INTRO_DONE_EVENT, INTRO_SEEN_KEY } from "./script";

/**
 * "The Haunting" — the Ghost intro, ≈6s, once per session.
 *  I.   A spark in the dark.            "Every website has visitors you never see."
 *  II.  Smoke rises into the ghost.     "Most of them leave without a word."
 *  III. A website glides beneath it; friction ignites where the scan passes.
 *  IV.  The name writes itself.
 *  V.   A white iris opens from its eye and reveals the site; it becomes the nav logo.
 * Purely presentational: the hero is server-rendered underneath. Any click, key,
 * wheel or touch skips. The pre-paint gate never arms it for reduced motion.
 */

const EASE = [0.22, 1, 0.36, 1] as const;
const INK = "#0A0A0C";
const MARK = 96;

const T = {
  spark: 150,
  line1: 350,
  smoke: 900,
  ghost: 1150,
  line2: 1500,
  eyes: 1750,
  walk: 2200,
  walkMs: 1900,
  line3: 2350,
  line4: 3450,
  name: 4150,
  iris: 5000,
  end: 6000,
};

const LINES = [
  { at: T.line1, text: <>Every website has visitors <em className="serif-accent text-[1.06em] [font-style:italic]">you never see.</em></> },
  { at: T.line2, text: <>Most of them leave <em className="serif-accent text-[1.06em] [font-style:italic]">without a word.</em></> },
  { at: T.line3, text: <>Ghost walks <em className="serif-accent text-[1.06em] [font-style:italic]">the path they took</em> —</> },
  { at: T.line4, text: <>and marks exactly <em className="serif-accent text-[1.06em] [font-style:italic]">where they left.</em></> },
];

// The wireframe website the ghost passes over. Strip x=0 sits at screen centre;
// it travels from +START to -END, so a point at x=p passes under the ghost at a known time.
const STRIP_W = 2200;
const START = 260;
const END = 1900;
const FRICTION = [
  { x: 560, y: 132, label: "PRICE HIDDEN" },
  { x: 1120, y: 196, label: "NO REVIEWS NEAR CTA" },
  { x: 1640, y: 112, label: "DEAD-END BUTTON" },
];
const passTime = (x: number) => T.walk + ((START + x) / (START + END)) * T.walkMs;

// Deterministic smoke wisps (identical server/client markup).
const SMOKE = Array.from({ length: 18 }, (_, i) => ({
  x: Math.sin(i * 1.7) * (14 + (i % 4) * 9),
  drift: Math.cos(i * 2.3) * 26,
  s: 10 + (i % 5) * 6,
  d: (i % 6) * 0.05,
}));

function Wireframe() {
  const stroke = "rgba(255,255,255,0.22)";
  const faint = "rgba(255,255,255,0.12)";
  // Three "pages" laid side by side: home, pricing, booking.
  const pages = [0, 740, 1480];
  return (
    <svg width={STRIP_W} height={300} viewBox={`0 0 ${STRIP_W} 300`} fill="none" aria-hidden>
      {pages.map((x0, i) => (
        <g key={i} transform={`translate(${x0} 0)`} strokeWidth="1">
          <rect x="0.5" y="0.5" width="680" height="299" rx="14" stroke={stroke} />
          <line x1="0" y1="34" x2="680" y2="34" stroke={faint} />
          {[18, 32, 46].map((cx) => <circle key={cx} cx={cx} cy="17" r="3.5" stroke={faint} />)}
          <rect x="250" y="10" width="180" height="14" rx="7" stroke={faint} />
          <rect x="28" y="52" width="60" height="10" rx="3" stroke={stroke} />
          {[430, 480, 530].map((lx) => <line key={lx} x1={lx} y1="57" x2={lx + 36} y2="57" stroke={faint} />)}
          <rect x="586" y="48" width="70" height="18" rx="9" stroke={stroke} />
          {i === 0 && (
            <>
              <rect x="28" y="88" width="290" height="20" rx="4" stroke={stroke} />
              <rect x="28" y="116" width="220" height="20" rx="4" stroke={stroke} />
              <line x1="28" y1="152" x2="300" y2="152" stroke={faint} />
              <line x1="28" y1="164" x2="270" y2="164" stroke={faint} />
              <rect x="28" y="184" width="104" height="28" rx="14" stroke={stroke} />
              <rect x="360" y="84" width="292" height="150" rx="10" stroke={stroke} />
              <line x1="360" y1="234" x2="652" y2="84" stroke={faint} />
              <rect x="28" y="240" width="624" height="40" rx="8" stroke={faint} />
            </>
          )}
          {i === 1 && (
            <>
              <rect x="28" y="84" width="240" height="18" rx="4" stroke={stroke} />
              {[28, 246, 464].map((cx) => (
                <g key={cx}>
                  <rect x={cx} y="120" width="190" height="150" rx="10" stroke={stroke} />
                  <rect x={cx + 18} y="140" width="70" height="14" rx="3" stroke={faint} />
                  <line x1={cx + 18} y1="180" x2={cx + 160} y2="180" stroke={faint} />
                  <line x1={cx + 18} y1="196" x2={cx + 140} y2="196" stroke={faint} />
                  <rect x={cx + 18} y="226" width="90" height="22" rx="11" stroke={faint} />
                </g>
              ))}
            </>
          )}
          {i === 2 && (
            <>
              <rect x="28" y="84" width="300" height="20" rx="4" stroke={stroke} />
              <line x1="28" y1="122" x2="320" y2="122" stroke={faint} />
              <rect x="28" y="144" width="300" height="34" rx="8" stroke={faint} />
              <rect x="28" y="190" width="300" height="34" rx="8" stroke={faint} />
              <rect x="28" y="240" width="140" height="32" rx="16" stroke={stroke} />
              <rect x="372" y="84" width="280" height="190" rx="10" stroke={stroke} />
            </>
          )}
        </g>
      ))}
    </svg>
  );
}

export function IntroGhost() {
  const [gone, setGone] = useState(false);
  const [act, setAct] = useState(0);
  const [line, setLine] = useState(-1);
  const [eyes, setEyes] = useState(0.06);
  const [lit, setLit] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const handedOff = useRef(false);
  const finished = useRef(false);

  // Iris: a hole in the dark that opens from the ghost's eye.
  const irisR = useMotionValue(0);
  const irisX = useMotionValue(50);
  const irisY = useMotionValue(50);
  const mask = useMotionTemplate`radial-gradient(circle ${irisR}px at ${irisX}% ${irisY}%, transparent 98%, #000 100%)`;

  const handOff = useCallback(() => {
    if (handedOff.current) return;
    handedOff.current = true;
    const html = document.documentElement;
    html.setAttribute("data-intro", "prep");
    void html.offsetHeight; // commit the tucked-away state before releasing it
    html.setAttribute("data-intro", "done");
    window.dispatchEvent(new Event(INTRO_DONE_EVENT));
  }, []);

  const finish = useCallback(
    (skipped: boolean) => {
      if (finished.current) return;
      finished.current = true;
      timers.current.forEach((t) => window.clearTimeout(t));
      handOff();
      if (skipped && root.current) {
        animate(root.current, { opacity: 0 }, { duration: 0.3, ease: EASE });
        window.setTimeout(() => setGone(true), 320);
      } else {
        setGone(true);
      }
    },
    [handOff],
  );

  useEffect(() => {
    if (document.documentElement.dataset.intro !== "play") {
      setGone(true);
      return;
    }
    try { sessionStorage.setItem(INTRO_SEEN_KEY, "1"); } catch { /* optional */ }
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));

    // I · spark   II · smoke + ghost
    at(T.spark, () => setAct(1));
    LINES.forEach((l, i) => at(l.at, () => setLine(i)));
    at(T.smoke, () => setAct(2));
    at(T.eyes, () => setEyes(1));

    // III · the walk: the website glides under the ghost; friction ignites as it passes.
    at(T.walk, () => {
      setAct(3);
      if (strip.current) {
        animate(strip.current, { x: [START, -END] }, { duration: T.walkMs / 1000, ease: "linear" });
        animate(strip.current, { opacity: [0, 1, 1, 0] }, { duration: (T.walkMs + 500) / 1000, times: [0, 0.12, 0.82, 1] });
      }
    });
    FRICTION.forEach((f, i) => at(passTime(f.x), () => setLit(i + 1)));

    // IV · the name
    at(T.name, () => {
      setAct(4);
      setLine(-1);
      if (ghost.current) animate(ghost.current, { y: -70, scale: 0.9 }, { duration: 0.7, ease: EASE });
    });

    // V · the iris opens from its eye; the ghost becomes the nav logo.
    at(T.iris, () => {
      setAct(5);
      const g = ghost.current;
      const box = g?.getBoundingClientRect();
      if (box) {
        irisX.set(((box.left + box.width / 2) / window.innerWidth) * 100);
        irisY.set(((box.top + box.height * 0.44) / window.innerHeight) * 100);
      }
      animate(irisR, Math.hypot(window.innerWidth, window.innerHeight) * 1.1, { duration: 0.95, ease: [0.7, 0, 0.2, 1] });
      const target = document.querySelector("[data-nav-mark]")?.getBoundingClientRect();
      if (g && box && target && target.width > 0) {
        animate(g, {
          x: target.left + target.width / 2 - (box.left + box.width / 2),
          y: -70 + (target.top + target.height / 2 - (box.top + box.height / 2)),
          scale: (target.width / MARK) * 0.9,
        }, { duration: 0.85, ease: EASE, delay: 0.1 });
        animate(g, { opacity: [1, 1, 0] }, { duration: 1, times: [0, 0.85, 1] });
      }
    });
    at(T.iris + 180, handOff);
    at(T.end, () => finish(false));

    const skip = () => finish(true);
    const onKey = (e: KeyboardEvent) => { if (e.key !== "Tab") skip(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", skip, { passive: true });
    window.addEventListener("touchstart", skip, { passive: true });
    const list = timers.current;
    return () => {
      list.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", skip);
      window.removeEventListener("touchstart", skip);
    };
  }, [finish, handOff, irisR, irisX, irisY]);

  if (gone) return null;

  return (
    <div
      ref={root}
      className="intro-root fixed inset-0 z-[100] overflow-hidden"
      // Failsafe sized to this intro (the shared CSS rule only supplies the keyframes).
      style={{ animationDelay: `${T.end + 1500}ms` }}
      onPointerDown={() => finish(true)}
    >
      {/* The dark: everything happens here until the iris opens. */}
      <motion.div
        aria-hidden
        className="absolute inset-0"
        // The mask exists only while the iris opens: a full-screen masked layer
        // with animated children can drop a frame in Chromium during earlier acts.
        style={act >= 5 ? { background: INK, maskImage: mask, WebkitMaskImage: mask } : { background: INK }}
      >
        {/* faint night grain + vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_45%,rgba(40,42,56,0.55),rgba(10,10,12,0)_70%)]" />
        <motion.div
          className="absolute left-1/2 top-[46%] h-[60vh] w-[60vh] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: "radial-gradient(closest-side, rgba(255,74,28,0.22), rgba(255,138,61,0.08) 45%, rgba(10,10,12,0) 100%)" }}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={act >= 1 ? { opacity: act >= 3 ? 0.35 : [0, 1, 0.75, 1], scale: 1 } : undefined}
          transition={{ duration: 1.4, ease: EASE }}
        />

        {/* III · the website the ghost walks */}
        <div className="absolute left-1/2 top-[56%] h-[300px] -translate-y-1/2 [transform-origin:center]" style={{ width: STRIP_W }}>
          <div ref={strip} className="absolute left-0 top-0 opacity-0 will-change-transform" style={{ width: STRIP_W }}>
            <Wireframe />
            {FRICTION.map((f, i) => (
              <span key={f.label} className="absolute" style={{ left: f.x, top: f.y }}>
                <motion.span
                  className="absolute -left-12 -top-12 h-24 w-24 rounded-full"
                  style={{ background: "radial-gradient(closest-side, rgba(255,74,28,0.75), rgba(255,138,61,0.3) 45%, rgba(255,194,74,0) 100%)" }}
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={lit > i ? { opacity: [0, 1, 0.8], scale: [0.3, 1.2, 1] } : undefined}
                  transition={{ duration: 0.7, ease: EASE }}
                />
                <motion.span className="ember-dot absolute -left-1 -top-1" initial={{ scale: 0 }} animate={lit > i ? { scale: 1 } : undefined} transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }} />
                <motion.span
                  className="mono-label absolute left-4 top-[-8px] whitespace-nowrap rounded-full border border-[#FF4A1C]/50 bg-[#1A0F0C] px-2 py-0.5 text-[10px] text-[#FFB59C]"
                  initial={{ clipPath: "inset(0 100% 0 0)" }}
                  animate={lit > i ? { clipPath: "inset(0 0% 0 0)" } : undefined}
                  transition={{ duration: 0.45, ease: "linear", delay: 0.12 }}
                >
                  {f.label}
                </motion.span>
              </span>
            ))}
          </div>
        </div>

        {/* IV · the name */}
        <div className="absolute left-1/2 top-[50%] -translate-x-1/2 text-center">
          <p className="flex justify-center font-heading text-[clamp(56px,9vw,120px)] font-semibold leading-none tracking-[-0.05em] text-white">
            {"Ghost".split("").map((ch, i) => (
              <span key={i} className="inline-block overflow-hidden pb-[0.08em]">
                <motion.span className="inline-block" initial={{ y: "110%" }} animate={act >= 4 ? { y: "0%" } : undefined} transition={{ duration: 0.6, ease: EASE, delay: i * 0.06 }}>{ch}</motion.span>
              </span>
            ))}
            <motion.span className="text-[#FF4A1C]" initial={{ opacity: 0, scale: 0 }} animate={act >= 4 ? { opacity: 1, scale: 1 } : undefined} transition={{ duration: 0.4, delay: 0.42, ease: [0.34, 1.56, 0.64, 1] }}>.</motion.span>
          </p>
          <motion.p className="mono-label mt-4 text-[#9A9CA3]" initial={{ opacity: 0, y: 6 }} animate={act >= 4 ? { opacity: 1, y: 0 } : undefined} transition={{ duration: 0.5, delay: 0.55, ease: EASE }}>
            AI website audits
          </motion.p>
        </div>

        {/* Narration */}
        <div className="absolute inset-x-0 bottom-[12vh] px-6 text-center">
          {LINES.map((l, i) => (
            <motion.p
              key={i}
              className="absolute inset-x-0 mx-auto max-w-[24ch] font-heading text-[clamp(22px,3vw,36px)] font-medium leading-tight tracking-[-0.03em] text-white sm:max-w-none"
              initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
              animate={line === i ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: line > i ? -10 : 12, filter: "blur(8px)" }}
              transition={{ duration: 0.55, ease: EASE }}
            >
              {l.text}
            </motion.p>
          ))}
        </div>
      </motion.div>

      {/* The ghost — above the iris so it can fly to the nav as the site appears. */}
      <div aria-hidden className="absolute left-1/2 top-[38%]" style={{ marginLeft: -MARK / 2, marginTop: -MARK / 2 }}>
        <div ref={ghost} style={{ width: MARK, height: MARK }} className="relative">
          {/* I · the spark */}
          <motion.span
            className="absolute left-1/2 top-[86%] -ml-1 -mt-1 h-2 w-2 rounded-full bg-[#FF4A1C] shadow-[0_0_18px_6px_rgba(255,74,28,0.6)]"
            initial={{ opacity: 0, scale: 0 }}
            animate={act >= 1 ? { opacity: act >= 2 ? [1, 0] : [0, 1, 0.5, 1, 0.7, 1], scale: act >= 2 ? [1, 0.2] : [0, 1.3, 0.9, 1.15, 1] } : undefined}
            transition={{ duration: act >= 2 ? 0.6 : 0.9, ease: "easeOut" }}
          />
          {/* II · smoke rising into a hood */}
          {SMOKE.map((m, i) => (
            <motion.span
              key={i}
              className="absolute left-1/2 top-[80%] rounded-full bg-white/80 blur-[6px]"
              style={{ width: m.s, height: m.s, marginLeft: -m.s / 2, marginTop: -m.s / 2 }}
              initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
              animate={act >= 2 ? { opacity: [0, 0.7, 0], x: [m.drift * 0.3, m.drift, m.x], y: [0, -40, -60], scale: [0.4, 1.4, 0.6] } : undefined}
              transition={{ duration: 1.1, ease: EASE, delay: m.d }}
            />
          ))}
          <motion.div
            className="relative h-full w-full"
            initial={{ opacity: 0, y: 26, scale: 0.7, filter: "blur(14px)" }}
            animate={act >= 2 ? { opacity: 1, y: [26, 0, -6, 0], scale: 1, filter: "blur(0px)" } : undefined}
            transition={{ duration: 0.9, ease: EASE, delay: 0.25, y: { duration: 2.6, ease: "easeInOut", delay: 0.25 } }}
          >
            {/* White in the dark; turns ink as the iris reveals the white site. */}
            <motion.div className="absolute inset-0" animate={{ opacity: act >= 5 ? 0 : 1 }} transition={{ duration: 0.4 }}>
              <GhostMark className="h-full w-full drop-shadow-[0_0_28px_rgba(238,241,255,0.35)]" tone="paper" eyesOpen={eyes} />
            </motion.div>
            <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: act >= 5 ? 1 : 0 }} transition={{ duration: 0.4 }}>
              <GhostMark className="h-full w-full" tone="ink" eyesOpen={eyes} />
            </motion.div>
          </motion.div>
          {/* eye glint as it wakes */}
          <motion.span
            className="absolute left-1/2 top-[43%] h-px w-16 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#FF4A1C] to-transparent"
            initial={{ opacity: 0, scaleX: 0.2 }}
            animate={eyes > 0.5 ? { opacity: [0, 1, 0], scaleX: [0.2, 1.8, 2.2] } : undefined}
            transition={{ duration: 0.6, ease: EASE }}
          />
          {/* III · the scanning cone it casts onto the page */}
          <motion.span
            className="pointer-events-none absolute left-1/2 top-[70%] h-[36vh] w-[240px] -translate-x-1/2 origin-top"
            style={{ background: "linear-gradient(to bottom, rgba(255,138,61,0.28), rgba(255,74,28,0.06) 70%, transparent)", clipPath: "polygon(42% 0, 58% 0, 100% 100%, 0 100%)" }}
            initial={{ opacity: 0, scaleY: 0 }}
            animate={act === 3 ? { opacity: [0, 1, 1], scaleY: 1 } : { opacity: 0, scaleY: act > 3 ? 1 : 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); finish(true); }}
        onPointerDown={(e) => e.stopPropagation()}
        className="mono-label absolute bottom-6 right-6 z-10 min-h-11 rounded-full border border-white/20 bg-white/5 px-4 text-[11px] text-white/80 backdrop-blur transition-colors hover:bg-white/10 hover:text-white"
      >
        Skip intro
      </button>
    </div>
  );
}
