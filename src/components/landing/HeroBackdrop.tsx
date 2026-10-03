"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * "Scan field" — the hero's background.
 * A fine dot grid, visible only toward the edges. One hairline scanning beam
 * sweeps down the hero; a few points flare ember as it passes over them and
 * then fade. Restrained by design: the headline and URL bar stay untouched.
 * Decorative only.
 */

const CYCLE = 9; // seconds per sweep
// Friction points, kept well outside the central content area (x%, y%).
const POINTS: Array<[number, number]> = [
  [12, 22], [86, 18], [8, 58], [91, 52], [17, 84], [82, 80],
];

export function HeroBackdrop() {
  const reduced = useReducedMotion();
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <style>{`
        @property --hb-a { syntax: "<angle>"; inherits: false; initial-value: 0deg; }
        @keyframes hbSpin { to { --hb-a: 360deg; } }
        .hb-sweep {
          position: absolute; inset: -1px; border-radius: 9999px; padding: 1px; pointer-events: none;
          background: conic-gradient(from var(--hb-a), transparent 0deg, transparent 280deg, rgba(255,74,28,0.45) 330deg, rgba(255,194,74,0.5) 348deg, transparent 360deg);
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
          animation: hbSpin 7s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) { .hb-sweep { animation: none; opacity: 0; } }
      `}</style>

      {/* Cool wash behind the content */}
      <div className="absolute left-1/2 top-[42%] h-[640px] w-[min(1200px,130vw)] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(238,241,255,0.9),rgba(238,241,255,0))]" />

      {/* Dot grid — present at the edges, gone behind the content */}
      <div className="absolute inset-0 [background-image:radial-gradient(rgba(10,10,12,0.11)_1px,transparent_1.3px)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_75%_70%_at_50%_45%,transparent_38%,#000_70%,transparent_100%)]" />

      {!reduced && (
        <>
          {/* The scanning beam */}
          <motion.div
            className="absolute inset-x-0 top-0 h-full"
            initial={{ y: "-12%" }}
            animate={{ y: ["-12%", "100%"] }}
            transition={{ duration: CYCLE, repeat: Infinity, ease: "linear" }}
          >
            <div className="absolute inset-x-0 top-0 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_26%,transparent_40%,transparent_60%,#000_74%,#000_88%,transparent)]">
              <div className="h-28 -translate-y-full bg-gradient-to-b from-transparent to-[rgba(238,241,255,0.75)]" />
              <div className="h-px bg-gradient-to-r from-transparent via-[rgba(10,10,12,0.18)] to-transparent" />
            </div>
          </motion.div>

          {/* Friction surfaces where the beam passes */}
          {POINTS.map(([x, y], i) => {
            // The beam travels from -12% to 100% of the height; it reaches y at:
            const t = Math.min(0.97, Math.max(0.02, (y + 12) / 112));
            return (
              <motion.span
                key={i}
                className="absolute h-0 w-0"
                style={{ left: `${x}%`, top: `${y}%` }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0, 1, 0.9, 0] }}
                transition={{ duration: CYCLE, times: [0, t - 0.01, t + 0.01, t + 0.06, Math.min(1, t + 0.2)], repeat: Infinity, ease: "linear" }}
              >
                <span className="absolute -left-8 -top-8 h-16 w-16 rounded-full bg-[radial-gradient(closest-side,rgba(255,74,28,0.35),rgba(255,138,61,0.12)_50%,rgba(255,194,74,0)_100%)]" />
                <span className="absolute -left-[3px] -top-[3px] h-1.5 w-1.5 rounded-full bg-ember" />
              </motion.span>
            );
          })}
        </>
      )}
    </div>
  );
}
