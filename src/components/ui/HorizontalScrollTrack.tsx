"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
} from "framer-motion";

export function HorizontalScrollTrack<T>({
  items,
  renderItem,
  sectionHeight,
  header,
  stickyTop = "top-20",
}: {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  sectionHeight?: string;
  header?: ReactNode;
  stickyTop?: string;
}) {
  const targetRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [travel, setTravel] = useState(0);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    const measure = () => {
      const viewport = viewportRef.current;
      const track = trackRef.current;
      if (!viewport || !track) return;
      setTravel(Math.max(0, track.scrollWidth - viewport.clientWidth));
    };

    measure();
    const observer = new ResizeObserver(measure);
    if (viewportRef.current) observer.observe(viewportRef.current);
    if (trackRef.current) observer.observe(trackRef.current);
    return () => observer.disconnect();
  }, [items.length]);

  const xRaw = useTransform(
    scrollYProgress,
    [0, 1],
    [0, -travel]
  );
  const x = useSpring(xRaw, { stiffness: 100, damping: 26, mass: 0.8 });
  const height = sectionHeight ?? `${Math.max(220, items.length * 55)}vh`;

  return (
    <div ref={targetRef} style={{ height }} className="relative">
      <div
        className={`sticky ${stickyTop} flex h-[calc(100vh-5rem)] flex-col justify-center overflow-hidden`}
      >
        {header && (
          <div className="section-pad mb-6 shrink-0 md:mb-10">{header}</div>
        )}

        <div ref={viewportRef} className="relative flex flex-1 items-center overflow-hidden">
          {/* Left fade */}
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-midnight via-midnight/80 to-transparent md:w-24" />
          {/* Right fade */}
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-midnight via-midnight/80 to-transparent md:w-24" />

          <motion.div
            ref={trackRef}
            style={{ x }}
            className="flex gap-5 px-6 md:gap-6 md:px-8 lg:px-12"
          >
            {items.map((item, i) => renderItem(item, i))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
