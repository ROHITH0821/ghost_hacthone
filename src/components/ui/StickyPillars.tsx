"use client";

import { useRef, useState, useEffect } from "react";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ScrollReveal } from "@/components/ui/BRAVE";

interface Pillar {
  title: string;
  subtitle: string;
}

export function StickyPillars({ pillars }: { pillars: Pillar[] }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (isMobile) {
    return (
      <div className="space-y-0 divide-y divide-border">
        {pillars.map((pillar, i) => (
          <ScrollReveal key={pillar.title} delay={i * 0.08}>
            <div className="grid gap-4 py-12">
              <h2 className="font-heading text-3xl font-bold leading-tight text-ghost-white">
                {pillar.title}
              </h2>
              <p className="text-base leading-relaxed text-muted-light">
                {pillar.subtitle}
              </p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    );
  }

  return <StickyPillarsDesktop pillars={pillars} />;
}

function StickyPillarsDesktop({ pillars }: { pillars: Pillar[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  return (
    <div
      ref={containerRef}
      style={{ height: `${pillars.length * 100}vh` }}
      className="relative"
    >
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        {pillars.map((pillar, i) => (
          <PillarSlide
            key={pillar.title}
            pillar={pillar}
            index={i}
            total={pillars.length}
            scrollYProgress={scrollYProgress}
          />
        ))}
      </div>
    </div>
  );
}

function PillarSlide({
  pillar,
  index,
  total,
  scrollYProgress,
}: {
  pillar: Pillar;
  index: number;
  total: number;
  scrollYProgress: MotionValue<number>;
}) {
  const segment = 1 / total;
  const start = index * segment;
  const end = (index + 1) * segment;
  const peak = start + segment * 0.5;

  const opacity = useTransform(
    scrollYProgress,
    [start, start + segment * 0.12, peak, end - segment * 0.12, end],
    [0, 1, 1, 1, 0]
  );
  const y = useTransform(scrollYProgress, [start, peak, end], [90, 0, -70]);
  const scale = useTransform(
    scrollYProgress,
    [start, peak, end],
    [0.94, 1, 0.97]
  );

  return (
    <motion.div
      style={{ opacity, y, scale }}
      className="absolute inset-0 flex items-center section-pad"
    >
      <div className="mx-auto grid w-full max-w-[1400px] gap-6 md:grid-cols-2 md:gap-20">
        <h2 className="font-heading text-3xl font-bold leading-[1.1] text-ghost-white sm:text-4xl md:text-5xl lg:text-6xl">
          {pillar.title}
        </h2>
        <p className="self-end text-base leading-relaxed text-muted-light md:text-xl">
          {pillar.subtitle}
        </p>
      </div>
    </motion.div>
  );
}
