"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { animate, motion } from "framer-motion";
import { GhostMark } from "@/components/ui/GhostMark";
import { INTRO_DONE_EVENT, INTRO_SEEN_KEY } from "./script";

/**
 * "The ghost passes through" — ≈2.3s, once per session.
 *  1. Mist condenses into the hood.      2. The eyes open, one blink.
 *  3. It glides to the nav logo, leaving an afterimage trail.
 *  4. The white screen is its sheet: it lifts away on a wavy hem, revealing the hero.
 * Purely presentational: the hero is server-rendered underneath. Any click, key,
 * wheel or touch skips. The pre-paint gate never arms it for reduced motion.
 */

const EASE = [0.22, 1, 0.36, 1] as const;
const LIFT = [0.76, 0, 0.24, 1] as const;
const MARK = 88;

// Deterministic mist (no Math.random → identical server/client markup).
const MIST = Array.from({ length: 16 }, (_, i) => {
  const a = i * 2.39996; // golden angle
  const r = 150 + ((i * 53) % 170);
  return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.7, s: 4 + (i % 4) * 2, d: (i % 5) * 0.04 };
});

function hemPath(width: number, scallops: number, depth: number) {
  const w = width / scallops;
  let d = `M0 0 H${width} V${depth * 0.35}`;
  for (let i = scallops; i > 0; i--) {
    const x0 = i * w;
    const x1 = (i - 1) * w;
    d += ` Q${x0 - w / 2} ${depth} ${x1} ${depth * 0.35}`;
  }
  return `${d} Z`;
}
const HEM = hemPath(1440, 9, 96);

export function IntroGhost() {
  const [gone, setGone] = useState(false);
  const [eyes, setEyes] = useState(0.06);
  const [blink, setBlink] = useState(false);
  const [phase, setPhase] = useState<"idle" | "condense" | "fly">("idle");
  const root = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const echoes = useRef<Array<HTMLDivElement | null>>([]);
  const timers = useRef<number[]>([]);
  const handedOff = useRef(false);
  const finished = useRef(false);

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
        animate(root.current, { opacity: 0 }, { duration: 0.25, ease: EASE });
        window.setTimeout(() => setGone(true), 260);
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

    at(20, () => setPhase("condense"));
    at(720, () => setEyes(1));
    at(1040, () => setBlink(true));
    at(1150, () => setBlink(false));

    // 3 · glide to the nav logo with an afterimage trail.
    at(1180, () => {
      setPhase("fly");
      const g = ghost.current;
      const target = document.querySelector("[data-nav-mark]")?.getBoundingClientRect();
      if (!g) return;
      const from = g.getBoundingClientRect();
      const visible = target && target.width > 0 && target.top >= 0;
      const dx = visible ? target.left + target.width / 2 - (from.left + from.width / 2) : 0;
      const dy = visible ? target.top + target.height / 2 - (from.top + from.height / 2) : -window.innerHeight * 0.6;
      const scale = visible ? target.width / MARK : 0.4;
      const path = { x: [0, dx * 0.35, dx], y: [0, dy * 0.15 - 40, dy], scale: [1, 0.85, scale] };
      animate(g, path, { duration: 0.6, ease: EASE, times: [0, 0.45, 1] });
      animate(g, { opacity: visible ? [1, 1, 0] : [1, 0] }, { duration: 0.75, times: visible ? [0, 0.8, 1] : [0, 1], ease: "linear" });
      echoes.current.forEach((e, i) => {
        if (!e) return;
        const delay = 0.05 * (i + 1);
        animate(e, path, { duration: 0.6, ease: EASE, times: [0, 0.45, 1], delay });
        animate(e, { opacity: [0.22 - i * 0.06, 0] }, { duration: 0.6, delay, ease: "easeOut" });
      });
    });

    // 4 · the sheet lifts on its wavy hem; the hero rises underneath.
    at(1360, () => {
      if (sheet.current) animate(sheet.current, { y: "-112%" }, { duration: 0.8, ease: LIFT });
    });
    at(1460, handOff);
    at(2200, () => finish(false));

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
  }, [finish, handOff]);

  if (gone) return null;
  const condense = phase !== "idle";

  return (
    <div ref={root} className="intro-root fixed inset-0 z-[100]" onPointerDown={() => finish(true)}>
      {/* The ghost's sheet: covers the page, then lifts away. */}
      <div ref={sheet} aria-hidden className="absolute inset-x-0 top-0 h-[100svh] will-change-transform">
        <div className="absolute inset-0 bg-[#FAFAFD]" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_45%,rgba(238,241,255,0.95),rgba(250,250,253,0))]" />
        <svg viewBox="0 0 1440 96" preserveAspectRatio="none" className="absolute left-0 top-full h-[clamp(48px,7vw,96px)] w-full drop-shadow-[0_14px_18px_rgba(10,10,12,0.07)]">
          <path d={HEM} fill="#FAFAFD" />
          <path d={HEM.replace(/^M0 0 H1440 /, "M1440 0 ").replace(/ Z$/, "")} fill="none" stroke="rgba(10,10,12,0.08)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>

      <div aria-hidden className="absolute left-1/2 top-1/2" style={{ marginLeft: -MARK / 2, marginTop: -MARK / 2 - 12 }}>
        {/* 1 · mist condensing */}
        {MIST.map((m, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-[#C9D0F5]"
            style={{ width: m.s, height: m.s, left: MARK / 2 - m.s / 2, top: MARK / 2 - m.s / 2 }}
            initial={{ x: m.x, y: m.y, opacity: 0, scale: 1 }}
            animate={condense ? { x: [m.x, m.x * 0.5, 0], y: [m.y, m.y * 0.5, 0], opacity: [0, 0.85, 0], scale: [1, 1, 0.2] } : undefined}
            transition={{ duration: 0.75, ease: EASE, delay: m.d }}
          />
        ))}
        {/* soft halo where it forms */}
        <motion.span
          className="absolute rounded-full"
          style={{ width: 260, height: 260, left: MARK / 2 - 130, top: MARK / 2 - 130, background: "radial-gradient(closest-side, rgba(238,241,255,1), rgba(238,241,255,0))" }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={condense ? { opacity: phase === "fly" ? 0 : 1, scale: 1 } : undefined}
          transition={{ duration: 0.6, ease: EASE }}
        />
        {/* 3 · afterimage trail */}
        {[0, 1, 2].map((i) => (
          <div key={i} ref={(el) => { echoes.current[i] = el; }} className="absolute left-0 top-0 opacity-0" style={{ width: MARK, height: MARK }}>
            <GhostMark className="h-full w-full" eyesOpen={1} />
          </div>
        ))}
        {/* 2 · the ghost */}
        <div ref={ghost} className="absolute left-0 top-0" style={{ width: MARK, height: MARK }}>
          <motion.div
            className="h-full w-full"
            initial={{ opacity: 0, scale: 0.82, filter: "blur(12px)", y: 10 }}
            animate={condense ? { opacity: 1, scale: 1, filter: "blur(0px)", y: [10, 0, -4, 0] } : undefined}
            transition={{ duration: 0.65, ease: EASE, delay: 0.25, y: { duration: 1.2, ease: "easeInOut", delay: 0.25 } }}
          >
            <GhostMark className="h-full w-full" eyesOpen={eyes} blink={blink} />
          </motion.div>
          {/* ember glint in the eye-line as it wakes */}
          <motion.span
            className="absolute left-1/2 top-[43%] h-px w-14 -translate-x-1/2 bg-gradient-to-r from-transparent via-ember to-transparent"
            initial={{ opacity: 0, scaleX: 0.2 }}
            animate={eyes > 0.5 ? { opacity: [0, 1, 0], scaleX: [0.2, 1.6, 2] } : undefined}
            transition={{ duration: 0.5, ease: EASE }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); finish(true); }}
        onPointerDown={(e) => e.stopPropagation()}
        className="mono-label absolute bottom-6 right-6 min-h-11 rounded-full border border-line bg-paper/80 px-4 text-[11px] text-graphite backdrop-blur transition-colors hover:text-ink"
      >
        Skip intro
      </button>
    </div>
  );
}
