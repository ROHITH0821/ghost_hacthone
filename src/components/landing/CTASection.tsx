"use client";
import { useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GhostMark } from "@/components/ui/GhostMark";
import { useStartScan } from "@/hooks/useStartScan";
import { Eyebrow, MaskLines, Reveal, Serif } from "./motion/Reveal";

/** Desktop magnetic pull toward the cursor; inert on touch and reduced motion. */
function Magnetic({ children, onHover }: { children: React.ReactNode; onHover: (on: boolean) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 300, damping: 30 });
  const y = useSpring(useMotionValue(0), { stiffness: 300, damping: 30 });
  return (
    <motion.div
      ref={ref}
      style={{ x, y }}
      className="inline-block p-3 -m-3"
      onPointerMove={(e) => {
        if (reduced || e.pointerType !== "mouse" || !ref.current) return;
        const b = ref.current.getBoundingClientRect();
        x.set((e.clientX - (b.left + b.width / 2)) * 0.25);
        y.set((e.clientY - (b.top + b.height / 2)) * 0.35);
      }}
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => { x.set(0); y.set(0); onHover(false); }}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
    >
      {children}
    </motion.div>
  );
}

export function CTASection() {
  const start=useStartScan();
  const [hover, setHover] = useState(false);
  const [blink, setBlink] = useState(false);
  const onHover = (on: boolean) => {
    setHover(on);
    if (on) { setBlink(true); window.setTimeout(() => setBlink(false), 170); }
  };
  return (
    <section className="section-pad relative overflow-hidden pb-0 pt-[clamp(96px,12vw,176px)]">
      <div className="product-container relative">
        <Reveal><Eyebrow dot>Make your next improvement count</Eyebrow></Reveal>
        <MaskLines
          className="font-heading text-[clamp(44px,8vw,128px)] font-[560] leading-[0.95] tracking-[-0.05em] text-ink"
          lines={["Your website.", <>A <Serif>fresh perspective.</Serif></>]}
        />
        <Reveal delay={0.15} className="mt-10 flex flex-col gap-6 pb-40 sm:flex-row sm:items-center sm:justify-between md:pb-56">
          <p className="max-w-[36ch] text-[17px] leading-relaxed text-graphite">Start with one URL and a clear goal.</p>
          <Magnetic onHover={onHover}>
            <Button onClick={start} size="lg" className="h-16 px-9 text-[17px]">Request early access <ArrowRight className="h-5 w-5" /></Button>
          </Magnetic>
        </Reveal>
      </div>
      {/* The ghost peeks up from the bottom edge. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/2 -ml-[90px] md:left-[18%] md:-ml-[120px]"
        initial={{ y: "70%" }}
        whileInView={{ y: "46%" }}
        viewport={{ once: true, amount: 0.15 }}
        animate={hover ? { y: "38%" } : undefined}
        transition={{ type: "spring", stiffness: 160, damping: 22 }}
      >
        <GhostMark className="h-[180px] w-[180px] md:h-[240px] md:w-[240px]" blink={blink} track />
      </motion.div>
    </section>
  );
}
