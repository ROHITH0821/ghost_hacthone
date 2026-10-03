"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface LeakVisualizationProps {
  fixesOn: boolean;
  introFinished: boolean;
  isReducedMotion?: boolean;
}

interface PathSample {
  x: number;
  y: number;
  nx: number;
  ny: number;
  angle: number;
}

interface Particle {
  progress: number;
  speed: number;
  size: number;
  opacity: number;
  laneOffset: number;
  wobbleSpeed: number;
  wobblePhase: number;
  leaked: boolean;
  leakX: number;
  leakY: number;
  leakVx: number;
  leakVy: number;
  tint: number;
}

const STATIONS = [
  { id: "HOME", t: 0.12, label: "HOME" },
  { id: "SERVICES", t: 0.36, label: "SERVICES", fixTag: "Clearer service guide", crackSize: "small", leakRate: 0.15, sev: "−15% LEAK" },
  { id: "PRICING", t: 0.62, label: "PRICING", fixTag: "Starting price added", crackSize: "large", leakRate: 0.35, sev: "−35% LEAK · HIGH" },
  { id: "BOOK", t: 0.84, label: "BOOK", fixTag: "Reviews beside CTA", crackSize: "medium", leakRate: 0.20, sev: "−20% LEAK · MED" },
] as const;

const QUOTES = [
  { stationId: "SERVICES", text: "Which one is actually for me?", persona: "First-timer" },
  { stationId: "PRICING", text: "Contact for details? I’ll check elsewhere.", persona: "Budget buyer" },
  { stationId: "BOOK", text: "No reviews here… not sure.", persona: "Skeptic" },
];

export function LeakVisualization({ fixesOn, introFinished, isReducedMotion }: LeakVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [dimensions, setDimensions] = useState({ w: 1200, h: 360 });
  const [isMobile, setIsMobile] = useState(false);
  const [activeQuote, setActiveQuote] = useState<{ text: string; persona: string; stationIndex: number; key: number } | null>(null);

  // Resize observation
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const mobile = window.innerWidth < 900;
      setIsMobile(mobile);
      setDimensions({
        w: Math.max(rect.width, 320),
        h: mobile ? 520 : Math.max(rect.height, 300),
      });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Quotes trigger every ~3.2s when fixes are OFF
  useEffect(() => {
    if (fixesOn || isReducedMotion) {
      setActiveQuote(null);
      return;
    }

    let quoteIdx = 0;
    const interval = setInterval(() => {
      const q = QUOTES[quoteIdx % QUOTES.length];
      const stationIdx = q.stationId === "SERVICES" ? 1 : q.stationId === "PRICING" ? 2 : 3;
      setActiveQuote({
        text: q.text,
        persona: q.persona,
        stationIndex: stationIdx,
        key: Date.now(),
      });
      quoteIdx++;
    }, 3200);

    return () => clearInterval(interval);
  }, [fixesOn, isReducedMotion]);

  // Compute SVG Path string based on dimensions
  const pathD = useMemo(() => {
    const { w, h } = dimensions;
    if (isMobile) {
      // Mobile: Vertical journey (pipe runs top -> bottom, stations stacked, particles flow downward)
      const cx = w * 0.5;
      const dx = Math.min(22, w * 0.06);
      return `M ${cx} 15 C ${cx - dx} ${h * 0.28}, ${cx + dx} ${h * 0.58}, ${cx} ${h - 25}`;
    } else {
      // Desktop: Horizontal gentle S-curve across the full width
      const cy = h * 0.52;
      const dy = Math.min(24, h * 0.08);
      return `M 0 ${cy} C ${w * 0.24} ${cy - dy}, ${w * 0.44} ${cy - dy}, ${w * 0.56} ${cy + dy * 0.8} S ${w * 0.82} ${cy + dy * 0.2}, ${w} ${cy}`;
    }
  }, [dimensions, isMobile]);

  // Precompute path samples using an offscreen SVG path
  const samples = useMemo<PathSample[]>(() => {
    if (typeof document === "undefined") return [];
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathD);
    const totalLength = path.getTotalLength() || 1;
    const count = 500;
    const arr: PathSample[] = [];

    for (let i = 0; i <= count; i++) {
      const l = (i / count) * totalLength;
      const pt = path.getPointAtLength(l);
      const ptNext = path.getPointAtLength(Math.min(totalLength, l + 1));
      const dx = ptNext.x - pt.x;
      const dy = ptNext.y - pt.y;
      const len = Math.hypot(dx, dy) || 1;
      arr.push({
        x: pt.x,
        y: pt.y,
        nx: -dy / len,
        ny: dx / len,
        angle: Math.atan2(dy, dx),
      });
    }
    return arr;
  }, [pathD]);

  // Path point helper
  const getPointAtT = React.useCallback((t: number): PathSample => {
    if (!samples.length) return { x: 0, y: 0, nx: 0, ny: 1, angle: 0 };
    const idx = Math.min(samples.length - 1, Math.max(0, Math.floor(t * (samples.length - 1))));
    return samples[idx];
  }, [samples]);

  // State ref for canvas loop to avoid per-frame React updates
  const canvasState = useRef({
    particles: [] as Particle[],
    fixesOn: false,
    isVisible: true,
  });

  canvasState.current.fixesOn = fixesOn;

  // IntersectionObserver & Visibility API for pausing
  useEffect(() => {
    const handleVis = () => {
      canvasState.current.isVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVis);

    const observer = new IntersectionObserver(([entry]) => {
      canvasState.current.isVisible = entry.isIntersecting && !document.hidden;
    });
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      document.removeEventListener("visibilitychange", handleVis);
      observer.disconnect();
    };
  }, []);

  // Main Canvas Particle Loop
  useEffect(() => {
    if (isReducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas || !samples.length) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const maxParticles = isMobile ? 60 : 120;

    const spawnParticle = (startNearZero = true): Particle => ({
      progress: startNearZero ? Math.random() * -0.05 : Math.random(),
      speed: (isMobile ? 0.0003 : 0.00035) + Math.random() * 0.00015,
      size: 2.5 + Math.random() * 1.0,
      opacity: 0.55 + Math.random() * 0.3,
      laneOffset: (Math.random() - 0.5) * (isMobile ? 24 : 32),
      wobbleSpeed: 0.002 + Math.random() * 0.002,
      wobblePhase: Math.random() * Math.PI * 2,
      leaked: false,
      leakX: 0,
      leakY: 0,
      leakVx: 0,
      leakVy: 0,
      tint: 0,
    });

    // Populate initial particles
    if (canvasState.current.particles.length === 0) {
      const arr: Particle[] = [];
      for (let i = 0; i < maxParticles; i++) {
        arr.push(spawnParticle(false));
      }
      canvasState.current.particles = arr;
    }

    const crackTs = [0.36, 0.62, 0.84];
    const leakRates = [0.15, 0.35, 0.20];

    const render = (time: number) => {
      animId = requestAnimationFrame(render);
      if (!canvasState.current.isVisible) return;

      const dt = Math.min(time - lastTime, 40);
      lastTime = time;

      const { w, h } = dimensions;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const fixes = canvasState.current.fixesOn;
      const currentParticles = canvasState.current.particles;
      const nextParticles: Particle[] = [];

      for (let i = 0; i < currentParticles.length; i++) {
        const p = currentParticles[i];

        if (!p.leaked) {
          p.progress += p.speed * dt;

          if (p.progress >= 1) {
            nextParticles.push(spawnParticle(true));
            continue;
          }

          // Check leaks at crack stations when fixes are OFF
          if (!fixes && p.progress > 0) {
            for (let c = 0; c < 3; c++) {
              if (Math.abs(p.progress - crackTs[c]) < 0.007 && Math.random() < leakRates[c] * 0.28) {
                p.leaked = true;
                const sample = getPointAtT(p.progress);
                p.leakX = sample.x + sample.nx * p.laneOffset;
                p.leakY = sample.y + sample.ny * p.laneOffset;
                if (isMobile) {
                  // Leaks drift sideways on mobile
                  p.leakVx = (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 1.5);
                  p.leakVy = 0.5 + Math.random() * 0.5;
                } else {
                  // Leaks drift downward with gravity on desktop
                  p.leakVx = (Math.random() - 0.5) * 0.6;
                  p.leakVy = 1.0 + Math.random() * 1.5;
                }
                break;
              }
            }
          }
        }

        if (p.leaked) {
          p.leakVx *= 0.98;
          if (isMobile) {
            p.leakVy += 0.02;
          } else {
            p.leakVy += 0.06; // gravity
          }
          p.leakX += p.leakVx;
          p.leakY += p.leakVy;
          p.tint = Math.min(1, p.tint + 0.03);
          p.opacity *= 0.96;

          if (p.opacity < 0.05) {
            nextParticles.push(spawnParticle(true));
            continue;
          }

          // Interpolate from ink (#0A0A0C) to ember (#FF4A1C)
          const r = Math.round(10 + (255 - 10) * p.tint);
          const g = Math.round(10 + (74 - 10) * p.tint);
          const b = Math.round(12 + (28 - 12) * p.tint);

          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.opacity.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(p.leakX, p.leakY, p.size, 0, Math.PI * 2);
          ctx.fill();
          nextParticles.push(p);
        } else if (p.progress >= 0) {
          const sample = getPointAtT(p.progress);
          const wobble = Math.sin(time * p.wobbleSpeed + p.wobblePhase) * 3;
          const x = sample.x + sample.nx * (p.laneOffset + wobble);
          const y = sample.y + sample.ny * (p.laneOffset + wobble);

          ctx.fillStyle = `rgba(10, 10, 12, ${p.opacity.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(x, y, p.size, 0, Math.PI * 2);
          ctx.fill();
          nextParticles.push(p);
        } else {
          nextParticles.push(p);
        }
      }

      // If fixes ON, spawn slightly more particles at the end to make stream visibly thicker
      if (fixes && nextParticles.length < maxParticles * 1.35) {
        if (Math.random() < 0.15) {
          const extra = spawnParticle(false);
          extra.progress = 0.75 + Math.random() * 0.2;
          nextParticles.push(extra);
        }
      }

      canvasState.current.particles = nextParticles;
      ctx.restore();
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [dimensions, samples, isReducedMotion, isMobile, getPointAtT]);

  // Reduced motion static fallback
  if (isReducedMotion) {
    return (
      <div className="w-full h-full flex flex-col md:flex-row items-center justify-center gap-6 p-6">
        <div className="w-full max-w-sm p-4 rounded-xl border border-line bg-white shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[11px] text-ember-text font-semibold uppercase">Fixes Off · Leaking</span>
            <span className="font-mono text-[11px] bg-ember-soft text-ember-text px-2 py-0.5 rounded-full">Low Conversion</span>
          </div>
          <p className="text-sm text-graphite font-serif italic mb-2">“Contact for details? I’ll check elsewhere.”</p>
          <div className="text-[12px] font-mono text-ash">−35% Friction at Pricing</div>
        </div>
        <div className="w-full max-w-sm p-4 rounded-xl border border-line bg-white shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[11px] text-resolved font-semibold uppercase">Fixes On · Stitched</span>
            <span className="font-mono text-[11px] bg-emerald-50 text-resolved px-2 py-0.5 rounded-full">High Conversion</span>
          </div>
          <p className="text-sm text-ink mb-2 font-medium">Starting price added · Reviews beside CTA</p>
          <div className="text-[12px] font-mono text-resolved">Friction Resolved · High End Stream</div>
        </div>
      </div>
    );
  }

  const pipeHalf = isMobile ? 18 : 22;

  return (
    <div ref={containerRef} className="relative w-full h-full select-none overflow-hidden" aria-hidden="true">
      {/* ── 1. Dotted Background Grid fading at edges ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-45"
        style={{
          backgroundImage: `radial-gradient(circle, #D8D8D3 1px, transparent 1px)`,
          backgroundSize: "22px 22px",
          maskImage: isMobile
            ? "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)"
            : "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
          WebkitMaskImage: isMobile
            ? "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)"
            : "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
        }}
      />

      {/* ── 2. SVG Pipe Hairlines (~44px tall pipe) ── */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        <defs>
          <linearGradient id="pipeFade" x1={isMobile ? "0%" : "0%"} y1={isMobile ? "0%" : "0%"} x2={isMobile ? "0%" : "100%"} y2={isMobile ? "100%" : "0%"}>
            <stop offset="0%" stopColor="#0A0A0C" stopOpacity="0" />
            <stop offset="8%" stopColor="#0A0A0C" stopOpacity="0.22" />
            <stop offset="92%" stopColor="#0A0A0C" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#0A0A0C" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Draw upper and lower hairlines */}
        {samples.length > 0 && (
          <>
            <path
              d={samples.reduce((acc, s, idx) => {
                const px = s.x + s.nx * -pipeHalf;
                const py = s.y + s.ny * -pipeHalf;
                return idx === 0 ? `M ${px} ${py}` : `${acc} L ${px} ${py}`;
              }, "")}
              fill="none"
              stroke="url(#pipeFade)"
              strokeWidth="1.2"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={samples.reduce((acc, s, idx) => {
                const px = s.x + s.nx * pipeHalf;
                const py = s.y + s.ny * pipeHalf;
                return idx === 0 ? `M ${px} ${py}` : `${acc} L ${px} ${py}`;
              }, "")}
              fill="none"
              stroke="url(#pipeFade)"
              strokeWidth="1.2"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
      </svg>

      {/* ── 3. Canvas Particle Layer ── */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />

      {/* ── 4. Stations along the path ── */}
      <div className="absolute inset-0 pointer-events-none z-20">
        {STATIONS.map((st, idx) => {
          const pt = getPointAtT(st.t);
          if (!pt || pt.x === 0) return null;

          // Position card: on desktop directly above top hairline, on mobile centered on station
          const cardX = isMobile ? pt.x : pt.x;
          const cardY = isMobile ? pt.y : pt.y - 22 - 48 - 6;

          return (
            <div
              key={st.id}
              className="absolute transition-transform duration-500"
              style={{
                left: `${cardX}px`,
                top: `${cardY}px`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {/* Mono Label ABOVE card */}
              <div className="text-center mb-1">
                <span className="font-mono text-[9px] sm:text-[10px] tracking-[0.06em] uppercase text-graphite font-semibold bg-white/80 px-1.5 py-0.5 rounded shadow-2xs">
                  {st.label}
                </span>
              </div>

              {/* Hairline Page Card (140×96px on desktop, slightly more compact 120×80px on small mobile) */}
              <div className="w-[124px] sm:w-[140px] h-[82px] sm:h-[96px] bg-white rounded-[12px] border border-line shadow-[0_2px_8px_rgba(10,10,12,0.04)] overflow-hidden flex flex-col transition-shadow duration-300">
                {/* Mini browser top bar */}
                <div className="h-3.5 sm:h-4 border-b border-[#EEEFEB] bg-mist/60 px-2 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#D0D1CA]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#D0D1CA]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#D0D1CA]" />
                  <div className="mx-auto w-10 sm:w-12 h-1.5 rounded-full bg-line/80" />
                </div>

                {/* Tiny Wireframe Content Inside */}
                <div className="flex-1 p-1.5 sm:p-2 flex flex-col justify-between">
                  {st.id === "HOME" && (
                    <>
                      <div className="space-y-1">
                        <div className="w-10 sm:w-12 h-1.5 sm:h-2 rounded bg-ink/75" />
                        <div className="w-14 sm:w-16 h-1 rounded bg-ash/40" />
                      </div>
                      <div className="w-6 sm:w-7 h-1.5 sm:h-2 rounded-full bg-ink" />
                      <div className="grid grid-cols-3 gap-1 pt-1 border-t border-[#F0F0EC]">
                        <div className="h-3 sm:h-4 rounded bg-fog" />
                        <div className="h-3 sm:h-4 rounded bg-fog" />
                        <div className="h-3 sm:h-4 rounded bg-fog" />
                      </div>
                    </>
                  )}

                  {st.id === "SERVICES" && (
                    <>
                      <div className="space-y-0.5">
                        <div className="w-12 sm:w-14 h-1.5 rounded bg-ink/75" />
                        <div className="w-16 sm:w-20 h-1 rounded bg-ash/40" />
                      </div>
                      <div className="grid grid-cols-2 gap-1 sm:gap-1.5 my-auto">
                        <div className="h-5 sm:h-7 rounded border border-line/80 bg-fog/40 p-0.5 sm:p-1 flex flex-col justify-between">
                          <div className="w-1.5 h-1.5 rounded-full bg-line" />
                          <div className="w-6 h-1 rounded bg-ash/40" />
                        </div>
                        <div className="h-5 sm:h-7 rounded border border-line/80 bg-fog/40 p-0.5 sm:p-1 flex flex-col justify-between">
                          <div className="w-1.5 h-1.5 rounded-full bg-line" />
                          <div className="w-6 h-1 rounded bg-ash/40" />
                        </div>
                      </div>
                    </>
                  )}

                  {st.id === "PRICING" && (
                    <>
                      <div className="w-8 sm:w-10 h-1.5 rounded bg-ink/75" />
                      <div className="grid grid-cols-3 gap-0.5 sm:gap-1 my-auto">
                        <div className="h-6 sm:h-8 rounded border border-line/70 bg-fog/30 p-0.5 flex flex-col justify-between items-center">
                          <div className="w-3 h-1 rounded bg-ink/60" />
                          <div className="w-2.5 h-1 rounded bg-line" />
                          <div className="w-4 h-1 rounded bg-ash/40" />
                        </div>
                        <div className="h-7 sm:h-9 rounded border border-ink/40 bg-white p-0.5 shadow-2xs flex flex-col justify-between items-center -mt-0.5">
                          <div className="w-3 h-1 rounded bg-ink" />
                          <div className="w-2.5 h-1 rounded bg-line" />
                          <div className="w-4 h-1.5 rounded bg-ink" />
                        </div>
                        <div className="h-6 sm:h-8 rounded border border-line/70 bg-fog/30 p-0.5 flex flex-col justify-between items-center">
                          <div className="w-3 h-1 rounded bg-ink/60" />
                          <div className="w-2.5 h-1 rounded bg-line" />
                          <div className="w-4 h-1 rounded bg-ash/40" />
                        </div>
                      </div>
                    </>
                  )}

                  {st.id === "BOOK" && (
                    <>
                      <div className="w-10 sm:w-12 h-1.5 rounded bg-ink/75" />
                      <div className="flex gap-1.5 sm:gap-2 my-auto items-center">
                        <div className="grid grid-cols-3 gap-0.5 p-0.5 sm:p-1 rounded bg-fog/70">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-2xs bg-line" />
                          ))}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="w-full h-1 sm:h-1.5 rounded bg-line/80" />
                          <div className="w-3/4 h-1 sm:h-1.5 rounded bg-line/80" />
                          <div className="w-5 sm:w-6 h-1.5 sm:h-2 rounded-full bg-ink" />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Fix Tag (when Fixes ON) */}
              {"fixTag" in st && fixesOn && (
                <div
                  className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white border border-resolved/30 text-resolved font-mono text-[9px] sm:text-[10px] font-medium px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1 animate-fadeIn"
                  style={{ animationDelay: `${idx * 150}ms` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-resolved" />
                  {st.fixTag}
                </div>
              )}
            </div>
          );
        })}

        {/* ── 5. Cracks, Halos, Stitches on the Pipe ── */}
        {STATIONS.filter((s) => "crackSize" in s).map((st, i) => {
          const pt = getPointAtT(st.t);
          if (!pt) return null;

          const crackX = isMobile ? pt.x + (i % 2 === 0 ? -pipeHalf - 12 : pipeHalf + 12) : pt.x + pt.nx * 22;
          const crackY = isMobile ? pt.y : pt.y + pt.ny * 22;

          return (
            <div
              key={`crack-${st.id}`}
              className="absolute"
              style={{
                left: `${crackX}px`,
                top: `${crackY}px`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {!fixesOn ? (
                /* Cracks when OFF */
                <div className="relative flex flex-col items-center">
                  <div className="absolute -inset-2.5 rounded-full bg-ember/25 blur-xs animate-ping" />
                  <div className="absolute -inset-1.5 rounded-full bg-ember/35 blur-2xs animate-pulse" />

                  <svg
                    viewBox="0 0 24 16"
                    className={cn(
                      "relative text-ember fill-none stroke-current drop-shadow-[0_0_6px_rgba(255,74,28,0.7)]",
                      st.crackSize === "large" ? "w-6 h-4" : st.crackSize === "medium" ? "w-5 h-3.5" : "w-4 h-3"
                    )}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M 2 1 L 7 11 L 12 4 L 17 14 L 22 2" />
                  </svg>

                  <div className="mt-1.5 whitespace-nowrap font-mono text-[9px] sm:text-[10px] font-bold text-ember-text bg-ember-soft border border-ember/25 px-1.5 sm:px-2 py-0.5 rounded-full shadow-2xs">
                    {st.sev}
                  </div>
                </div>
              ) : (
                /* Stitches when ON */
                <div className="relative flex flex-col items-center">
                  <div className="absolute -inset-2 rounded-full bg-resolved/20 blur-xs transition-opacity duration-1000 opacity-60" />

                  <svg viewBox="0 0 28 12" className="w-6 sm:w-7 h-2.5 sm:h-3 text-resolved fill-none stroke-current" strokeWidth="2.2" strokeLinecap="round">
                    <line x1="2" y1="2" x2="6" y2="10" className="stitch-anim" style={{ animationDelay: `${i * 180}ms` }} />
                    <line x1="8" y1="2" x2="12" y2="10" className="stitch-anim" style={{ animationDelay: `${i * 180 + 80}ms` }} />
                    <line x1="14" y1="2" x2="18" y2="10" className="stitch-anim" style={{ animationDelay: `${i * 180 + 160}ms` }} />
                    <line x1="20" y1="2" x2="24" y2="10" className="stitch-anim" style={{ animationDelay: `${i * 180 + 240}ms` }} />
                  </svg>

                  <div className="mt-1 whitespace-nowrap font-mono text-[8px] sm:text-[9px] font-semibold text-resolved bg-emerald-50 border border-resolved/30 px-1.5 sm:px-2 py-0.5 rounded-full shadow-2xs">
                    SEALED
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* ── 6. Quote Bubbles rising near cracks ── */}
        {activeQuote && !fixesOn && (
          (() => {
            const st = STATIONS[activeQuote.stationIndex];
            const pt = getPointAtT(st.t);
            return (
              <div
                key={activeQuote.key}
                className="absolute quote-bubble pointer-events-none"
                style={{
                  left: isMobile ? `${pt.x}px` : `${pt.x}px`,
                  top: isMobile ? `${pt.y + 20}px` : `${pt.y + 44}px`,
                  transform: "translate(-50%, 0)",
                }}
              >
                <div className="bg-white/95 backdrop-blur-sm border border-line rounded-full px-3 py-1 sm:px-3.5 sm:py-1.5 shadow-[0_4px_16px_rgba(10,10,12,0.08)] flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                  <span className="font-serif italic text-ink text-[12px] sm:text-[13px] tracking-tight">
                    “{activeQuote.text}”
                  </span>
                  <span className="font-mono text-[9px] sm:text-[10px] text-ash-text border-l border-line pl-1.5 sm:pl-2 uppercase">
                    {activeQuote.persona}
                  </span>
                </div>
              </div>
            );
          })()
        )}

        {/* ── 7. Finish Marker: "ENQUIRY / BOOKED" ── */}
        {samples.length > 0 && (() => {
          const finishPt = getPointAtT(0.97);
          return (
            <div
              className="absolute transition-transform duration-500"
              style={{
                left: `${finishPt.x}px`,
                top: `${finishPt.y}px`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className="flex flex-col items-center">
                <div className="font-mono text-[9px] sm:text-[10px] tracking-[0.06em] uppercase text-graphite font-semibold mb-1 whitespace-nowrap bg-white/80 px-1.5 py-0.5 rounded shadow-2xs">
                  ENQUIRY / BOOKED
                </div>

                <div
                  className={cn(
                    "font-mono text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full border transition-all duration-500 whitespace-nowrap shadow-xs",
                    fixesOn
                      ? "bg-emerald-50 text-resolved border-resolved/40 animate-pulse shadow-[0_0_12px_rgba(18,161,94,0.2)]"
                      : "bg-ember-soft text-ember-text border-ember/25"
                  )}
                >
                  REACHING THE END · {fixesOn ? "HIGH" : "LOW"}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Animation Styles */}
      <style>{`
        @keyframes quoteFloat {
          0% {
            opacity: 0;
            transform: translate(-50%, 8px) scale(0.94);
          }
          15% {
            opacity: 1;
            transform: translate(-50%, -4px) scale(1);
          }
          85% {
            opacity: 1;
            transform: translate(-50%, -18px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -28px) scale(0.96);
          }
        }
        .quote-bubble {
          animation: quoteFloat 3.1s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        @keyframes stitchDraw {
          from {
            stroke-dashoffset: 14;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        .stitch-anim {
          stroke-dasharray: 14;
          stroke-dashoffset: 0;
          animation: stitchDraw 500ms ease-out forwards;
        }

        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: translate(-50%, 4px) scale(0.92);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeInScale 350ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>
    </div>
  );
}
