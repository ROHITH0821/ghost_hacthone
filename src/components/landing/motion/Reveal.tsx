"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { Children, type ReactNode } from "react";
import { EASE_SMOOTH, STAGGER } from "@/lib/motion";
import { cn } from "@/lib/utils";

const VIEWPORT = { once: true, amount: 0.2 } as const;

/** Scroll reveal: 8px rise + blur(6px) → sharp, once at 20% visibility. */
export function Reveal({
  children,
  delay = 0,
  className,
  y = 8,
  ...rest
}: { children: ReactNode; delay?: number; className?: string; y?: number } & Omit<HTMLMotionProps<"div">, "children">) {
  return (
    <motion.div
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={VIEWPORT}
      transition={{ duration: 0.8, ease: EASE_SMOOTH, delay }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Staggers each direct child by 60ms. */
export function RevealGroup({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <div className={className}>
      {Children.map(children, (child, i) => (
        <Reveal delay={delay + i * STAGGER}>{child}</Reveal>
      ))}
    </div>
  );
}

/**
 * Mask-up heading lines. Each line rises out of its own clip box.
 * Pass the heading tag via `as`; lines are rendered as block spans so the
 * accessible name stays one sentence.
 */
export function MaskLines({
  lines,
  as: Tag = "h2",
  className,
  lineClassName,
  delay = 0,
  id,
}: {
  lines: ReactNode[];
  as?: "h1" | "h2" | "h3";
  className?: string;
  lineClassName?: string;
  delay?: number;
  id?: string;
}) {
  // The observer sits on the heading: the lines start clipped inside their
  // masks, so observing them directly would never report them as visible.
  const MotionTag = motion[Tag];
  return (
    <MotionTag id={id} className={className} initial="hidden" whileInView="show" viewport={VIEWPORT}>
      {lines.map((line, i) => (
        <span key={i} className={cn("block overflow-hidden pb-[0.08em] -mb-[0.08em]", lineClassName)}>
          <motion.span
            className="block will-change-transform"
            variants={{
              hidden: { y: "105%", filter: "blur(6px)" },
              show: { y: "0%", filter: "blur(0px)", transition: { duration: 0.9, ease: EASE_SMOOTH, delay: delay + i * 0.08 } },
            }}
          >
            {line}
            {i < lines.length - 1 && " "}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  );
}

/** Serif italic emphasis word. */
export function Serif({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("serif-accent font-normal tracking-[-0.02em]", className)}>{children}</span>;
}

/** Mono eyebrow label. */
export function Eyebrow({ children, className, dot = false }: { children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <p className={cn("mono-label mb-5 flex items-center gap-2.5 text-ash-text", className)}>
      {dot ? <span aria-hidden className="ember-dot !h-1.5 !w-1.5" /> : <span aria-hidden className="h-px w-5 bg-ink/30" />}
      {children}
    </p>
  );
}
