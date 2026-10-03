"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * The Ghost hood with two almond eyes, as inline SVG.
 * - `track`: eyes drift up to ~1.2px toward the cursor (fine pointers only).
 * - `blink`: eyes close briefly when this flips to true.
 * - `eyesOpen`: 0 → 1 scales the eyes from a thin line (intro "eye opens").
 */
export function GhostMark({
  className,
  track = false,
  blink = false,
  eyesOpen = 1,
  tone = "ink",
  title,
}: {
  className?: string;
  track?: boolean;
  blink?: boolean;
  eyesOpen?: number;
  tone?: "ink" | "paper";
  title?: string;
}) {
  const eyes = useRef<SVGGElement>(null);
  const root = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!track) return;
    if (typeof window === "undefined") return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    let frame = 0;
    let tx = 0;
    let ty = 0;
    function onMove(event: PointerEvent) {
      const svg = root.current;
      if (!svg) return;
      const box = svg.getBoundingClientRect();
      const dx = event.clientX - (box.left + box.width / 2);
      const dy = event.clientY - (box.top + box.height / 2);
      const len = Math.max(1, Math.hypot(dx, dy));
      const reach = Math.min(1, len / 240);
      tx = (dx / len) * 1.3 * reach;
      ty = (dy / len) * 1.1 * reach;
      if (!frame) frame = requestAnimationFrame(apply);
    }
    function apply() {
      frame = 0;
      eyes.current?.setAttribute("transform", `translate(${tx.toFixed(2)} ${ty.toFixed(2)})`);
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [track]);

  const fill = tone === "ink" ? "var(--color-ink)" : "var(--color-paper)";
  const eye = tone === "ink" ? "var(--color-paper)" : "var(--color-ink)";
  const open = blink ? 0.08 : Math.max(0.06, eyesOpen);

  return (
    <svg
      ref={root}
      viewBox="0 0 40 40"
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path
        d="M4.5 37c4.6-2.3 5.6-7.7 5.6-15.6C10.1 10.6 14.4 3.5 20 3.5s9.9 7.1 9.9 17.9c0 7.9 1 13.3 5.6 15.6Z"
        fill={fill}
      />
      <g ref={eyes} style={{ transition: "transform 380ms cubic-bezier(0.22,1,0.36,1)" }}>
        <g
          style={{
            transform: `scaleY(${open})`,
            transformOrigin: "20px 17.4px",
            transition: blink ? "transform 90ms ease-in" : "transform 260ms cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <path d="M12.9 15.9c2.2-.9 4.3-.2 5.5 2.1-2.6.9-4.4.3-5.5-2.1Z" fill={eye} />
          <path d="M27.1 15.9c-2.2-.9-4.3-.2-5.5 2.1 2.6.9 4.4.3 5.5-2.1Z" fill={eye} />
        </g>
      </g>
    </svg>
  );
}
