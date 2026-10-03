"use client";

import { useEffect, useId, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Ghost Score ring with the heat gradient (ember → amber → gold).
 * When `count` is true the arc and number run 0 → value once in view and `ready`.
 */
export function ScoreRing({
  value,
  size = 88,
  stroke = 6,
  count = false,
  ready = true,
  className,
  numberClassName,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  count?: boolean;
  ready?: boolean;
  className?: string;
  numberClassName?: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const id = useId().replace(/:/g, "");
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(count ? 0 : clamped);

  useEffect(() => {
    if (!count) {
      setShown(clamped);
      return;
    }
    if (!inView || !ready) return;
    if (reduced) {
      setShown(clamped);
      return;
    }
    const controls = animate(0, clamped, {
      duration: 1.4,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => controls.stop();
  }, [count, inView, ready, reduced, clamped]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div
      ref={ref}
      className={cn("relative grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `Ghost Score ${clamped} out of 100`}
    >
      <svg aria-hidden viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 h-full w-full -rotate-90">
        <defs>
          <linearGradient id={`heat-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF4A1C" />
            <stop offset="55%" stopColor="#FF8A3D" />
            <stop offset="100%" stopColor="#FFC24A" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-fog)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#heat-${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(shown / 100) * c} ${c}`}
        />
      </svg>
      <span
        aria-hidden
        className={cn("font-heading font-medium tabular-nums tracking-[-0.04em] text-ink", numberClassName)}
        style={{ fontSize: size * 0.34 }}
      >
        {shown}
      </span>
    </div>
  );
}
