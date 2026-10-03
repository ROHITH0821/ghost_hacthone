"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/** Desktop-only translucent dot that lags the cursor and swells over controls. */
export function CursorTrail() {
  const [enabled, setEnabled] = useState(false);
  const [hot, setHot] = useState(false);
  const [visible, setVisible] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 260, damping: 28, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 260, damping: 28, mass: 0.6 });

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.dataset.reduceMotion === "true";
    if (!fine || reduced) return;
    setEnabled(true);
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
      const el = e.target as HTMLElement | null;
      setHot(!!el?.closest?.("a, button, input, summary, label, [role='button']"));
    };
    const onLeave = () => setVisible(false);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [x, y]);

  if (!enabled) return null;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[90] h-11 w-11 rounded-full border border-ink/15 bg-spectral/50 mix-blend-multiply"
      style={{ x: sx, y: sy, translateX: "-50%", translateY: "-50%" }}
      animate={{ scale: hot ? 1 : 0.32, opacity: visible ? (hot ? 0.9 : 0.7) : 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    />
  );
}
