"use client";

import { useEffect, useRef, useState } from "react";

type Particle = {
  id: number;
  t: number;
  speed: number;
  size: number;
  opacity: number;
  wobbleOffset: number;
  leakedAt?: boolean;
  leakX?: number;
  leakY?: number;
  leakVx?: number;
  leakVy?: number;
  tint?: number;
};

const STATIONS = [
  { id: 'HOME', t: 0.1, label: 'HOME' },
  { id: 'SERVICES', t: 0.35, label: 'SERVICES' },
  { id: 'PRICING', t: 0.65, label: 'PRICING' },
  { id: 'BOOK', t: 0.85, label: 'BOOK' },
];

const LEAKS = [
  { stationId: 'SERVICES', t: 0.35, size: 'small', rate: 0.15, quote: "Which one is actually for me?", persona: "First-timer" },
  { stationId: 'PRICING', t: 0.65, size: 'large', rate: 0.35, quote: "Contact for details? I'll check elsewhere.", persona: "Budget buyer" },
  { stationId: 'BOOK', t: 0.85, size: 'medium', rate: 0.20, quote: "No reviews here… not sure.", persona: "Skeptic" }
];

export function LeakVisualization({ fixesOn, introFinished }: { fixesOn: boolean; introFinished: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isMobile, setIsMobile] = useState(false);
  const [dimensions, setDimensions] = useState({ w: 1000, h: 440 });
  const [quotes, setQuotes] = useState<{ id: number; text: string; persona: string; x: number; y: number }[]>([]);
  const [inView, setInView] = useState(true);

  const stateRef = useRef({
    particles: [] as Particle[],
    fixesOn: false,
    introFinished: false,
    isMobile: false,
    w: 1000, h: 440,
    activeQuotes: [] as { id: number; text: string; persona: string; x: number; y: number; time: number }[]
  });
  
  stateRef.current.fixesOn = fixesOn;
  stateRef.current.introFinished = introFinished;
  stateRef.current.isMobile = isMobile;
  stateRef.current.w = dimensions.w;
  stateRef.current.h = dimensions.h;

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const mobile = window.innerWidth < 900;
      setIsMobile(mobile);
      setDimensions({ w: rect.width, h: mobile ? 520 : 440 });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    
    // Intersection observer to pause rendering
    const obs = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
    });
    if (containerRef.current) obs.observe(containerRef.current);
    
    return () => {
      window.removeEventListener("resize", handleResize);
      obs.disconnect();
    };
  }, []);

  const getPathPoint = (t: number, w: number, h: number, mobile: boolean) => {
    let p0, p1, p2, p3;
    if (mobile) {
      p0 = { x: w * 0.5, y: 0 };
      p1 = { x: w * 0.5, y: h * 0.4 };
      p2 = { x: w * 0.5, y: h * 0.6 };
      p3 = { x: w * 0.5, y: h };
    } else {
      p0 = { x: -50, y: h * 0.4 };
      p1 = { x: w * 0.4, y: h * 0.4 };
      p2 = { x: w * 0.6, y: h * 0.6 };
      p3 = { x: w + 50, y: h * 0.6 };
    }
    const mt = 1 - t;
    const x = mt*mt*mt*p0.x + 3*mt*mt*t*p1.x + 3*mt*t*t*p2.x + t*t*t*p3.x;
    const y = mt*mt*mt*p0.y + 3*mt*mt*t*p1.y + 3*mt*t*t*p2.y + t*t*t*p3.y;
    
    const dx = 3*mt*mt*(p1.x-p0.x) + 6*mt*t*(p2.x-p1.x) + 3*t*t*(p3.x-p2.x);
    const dy = 3*mt*mt*(p1.y-p0.y) + 6*mt*t*(p2.y-p1.y) + 3*t*t*(p3.y-p2.y);
    const len = Math.sqrt(dx*dx + dy*dy);
    const nx = -dy / len;
    const ny = dx / len;
    
    return { x, y, nx, ny };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !inView) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    let quoteTimer = 0;
    let quoteId = 0;

    const spawnParticle = (): Particle => {
      const state = stateRef.current;
      return {
        id: Math.random(),
        t: state.introFinished ? (Math.random() * -0.1) : -0.1, 
        speed: 0.0004 + Math.random() * 0.0003,
        size: 2.5 + Math.random() * 1.0,
        opacity: 0.55 + Math.random() * 0.3,
        wobbleOffset: Math.random() * Math.PI * 2
      };
    };

    if (stateRef.current.particles.length === 0) {
      const pCount = stateRef.current.isMobile ? 60 : 120;
      for (let i = 0; i < pCount; i++) {
        const p = spawnParticle();
        p.t = Math.random(); 
        stateRef.current.particles.push(p);
      }
    }

    const render = (time: number) => {
      const dt = Math.min(time - lastTime, 50); // cap dt
      lastTime = time;
      
      const state = stateRef.current;
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = state.w * dpr;
      canvas.height = state.h * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, state.w, state.h);

      // Grid background
      ctx.fillStyle = "#E6E6E1";
      for (let x = (time * 0.01) % 20; x < state.w; x += 20) {
        for (let y = 0; y < state.h; y += 20) {
          ctx.beginPath();
          ctx.arc(x, y, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Edge fade gradients
      const grad = ctx.createLinearGradient(0, 0, state.w, 0);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.1, "rgba(255,255,255,0)");
      grad.addColorStop(0.9, "rgba(255,255,255,0)");
      grad.addColorStop(1, "rgba(255,255,255,1)");
      
      // Pipe
      ctx.strokeStyle = "#0A0A0C";
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.2;
      const pipeRadius = 22;
      
      for (let offset of [-pipeRadius, pipeRadius]) {
        ctx.beginPath();
        for (let i = 0; i <= 100; i++) {
          const t = i / 100;
          const pt = getPathPoint(t, state.w, state.h, state.isMobile);
          const px = pt.x + pt.nx * offset;
          const py = pt.y + pt.ny * offset;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      ctx.globalAlpha = 1;

      // Update particles
      const newParticles: Particle[] = [];
      const mobile = state.isMobile;
      
      // Calculate active particles multiplier for thick end stream
      let endMultiplier = state.fixesOn ? 1.5 : 1.0;

      for (let p of state.particles) {
        if (!p.leakedAt) {
          p.t += p.speed * dt;
          if (p.t > 1) {
            newParticles.push(spawnParticle());
            continue;
          }

          if (!state.fixesOn && p.t > 0 && p.t < 1) {
            for (let leak of LEAKS) {
              if (Math.abs(p.t - leak.t) < 0.005 && Math.random() < leak.rate * 0.2) {
                p.leakedAt = true;
                p.tint = 0;
                const pt = getPathPoint(p.t, state.w, state.h, mobile);
                const wobble = Math.sin(time * 0.005 + p.wobbleOffset) * (pipeRadius - 5);
                p.leakX = pt.x + pt.nx * wobble;
                p.leakY = pt.y + pt.ny * wobble;
                
                if (mobile) {
                  p.leakVx = (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random());
                  p.leakVy = Math.random() * 0.5;
                } else {
                  p.leakVx = (Math.random() - 0.5) * 0.5;
                  p.leakVy = 0.5 + Math.random() * 0.5;
                }
                break;
              }
            }
          }
        }

        if (p.leakedAt && p.leakX !== undefined && p.leakY !== undefined && p.leakVx !== undefined && p.leakVy !== undefined) {
          p.leakVx *= 0.98;
          p.leakVy += 0.02; // gravity
          
          p.leakX += p.leakVx;
          p.leakY += p.leakVy;
          
          p.tint = Math.min(1, (p.tint || 0) + 0.015);
          p.opacity *= 0.98;

          const cr = 10 + (255 - 10) * p.tint;
          const cg = 10 + (74 - 10) * p.tint;
          const cb = 12 + (28 - 12) * p.tint;

          ctx.fillStyle = `rgba(${cr},${cg},${cb},${p.opacity})`;
          ctx.beginPath();
          ctx.arc(p.leakX, p.leakY, p.size, 0, Math.PI * 2);
          ctx.fill();
          
          if (p.opacity > 0.05) newParticles.push(p);
          else newParticles.push(spawnParticle());
        } else {
          const pt = getPathPoint(Math.max(0, p.t), state.w, state.h, mobile);
          const wobble = Math.sin(time * 0.003 + p.wobbleOffset) * (pipeRadius - p.size);
          const x = pt.x + pt.nx * wobble;
          const y = pt.y + pt.ny * wobble;

          ctx.fillStyle = `rgba(10,10,12,${p.opacity})`;
          ctx.beginPath();
          ctx.arc(x, y, p.size, 0, Math.PI * 2);
          ctx.fill();
          newParticles.push(p);
        }
      }
      
      // If fixes on, slowly add more particles to end stream
      if (state.fixesOn && state.particles.length < (mobile ? 60 : 120) * 1.5) {
        if (Math.random() < 0.1) {
          const p = spawnParticle();
          p.t = 0.8;
          newParticles.push(p);
        }
      }
      
      state.particles = newParticles;
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, state.w, state.h);

      if (!state.fixesOn) {
        quoteTimer += dt;
        if (quoteTimer > 3000) {
          quoteTimer = 0;
          const leak = LEAKS[Math.floor(Math.random() * LEAKS.length)];
          const pt = getPathPoint(leak.t, state.w, state.h, mobile);
          
          state.activeQuotes.push({
            id: quoteId++,
            text: leak.quote,
            persona: leak.persona,
            x: mobile ? pt.x + 50 : pt.x,
            y: mobile ? pt.y : pt.y - 60,
            time
          });
        }
      } else {
        state.activeQuotes = [];
      }

      state.activeQuotes = state.activeQuotes.filter(q => time - q.time < 2800);
      setQuotes([...state.activeQuotes]);

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [inView]);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }} />
      
      {/* HTML OVERLAYS */}
      <div className="absolute inset-0 pointer-events-none z-10">
        
        {/* Stations */}
        {STATIONS.map((st) => {
          const pt = getPathPoint(st.t, dimensions.w, dimensions.h, isMobile);
          return (
            <div key={st.id} 
                 className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-white border border-line rounded-[12px] shadow-sm flex flex-col items-center justify-center transition-all duration-500"
                 style={{ 
                   left: pt.x, 
                   top: pt.y, 
                   width: '140px', 
                   height: '96px',
                   opacity: introFinished ? 1 : 0,
                   transform: `translate(-50%, -50%) scale(${introFinished ? 1 : 0.92})`
                 }}>
              <div className="text-[10px] font-mono text-graphite mb-2">{st.label}</div>
              <div className="w-[80px] h-[40px] border border-line rounded-[6px] bg-fog opacity-50"></div>
              
              {/* Fix Tag */}
              {fixesOn && (
                <div className="absolute -bottom-8 whitespace-nowrap bg-resolved text-white text-[10px] font-mono px-2 py-1 rounded-[4px] shadow-md animate-fade-in-up">
                  {st.id === 'SERVICES' ? "Clearer service guide" : st.id === 'PRICING' ? "Starting price added" : st.id === 'BOOK' ? "Reviews beside CTA" : ""}
                </div>
              )}
            </div>
          );
        })}

        {/* Leaks */}
        {LEAKS.map((leak) => {
          const pt = getPathPoint(leak.t, dimensions.w, dimensions.h, isMobile);
          return (
            <div key={`leak-${leak.stationId}`}
                 className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300"
                 style={{ left: pt.x, top: pt.y + 30 }}>
              {!fixesOn ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="w-4 h-4 text-ember relative">
                    <div className="absolute inset-0 animate-ping rounded-full bg-ember opacity-40"></div>
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                  </div>
                  <div className="text-[10px] font-mono text-ember-text font-bold bg-ember-soft px-1.5 rounded">{leak.size.toUpperCase()} LEAK</div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <div className="w-4 h-4 text-resolved relative">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l5 5L20 7"/></svg>
                  </div>
                  <div className="text-[10px] font-mono text-resolved-text font-bold">FIXED</div>
                </div>
              )}
            </div>
          );
        })}

        {/* Quotes */}
        {quotes.map(q => (
          <div key={q.id} 
               className="absolute bg-white border border-line px-3 py-2 rounded-full shadow-lg transform -translate-x-1/2 transition-all duration-1000 ease-out"
               style={{ 
                 left: q.x, 
                 top: q.y, 
                 opacity: 1, 
                 animation: 'quoteRise 2.5s ease-out forwards' 
               }}>
            <div className="font-serif italic text-ink text-[14px] whitespace-nowrap">{q.text}</div>
            <div className="font-mono text-[9px] text-ash mt-0.5 ml-1">{q.persona}</div>
          </div>
        ))}

        {/* Finish Marker */}
        <div className="absolute flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2"
             style={{ 
               left: getPathPoint(0.95, dimensions.w, dimensions.h, isMobile).x,
               top: getPathPoint(0.95, dimensions.w, dimensions.h, isMobile).y,
             }}>
          <div className="text-[10px] font-mono text-ink mb-1 whitespace-nowrap">ENQUIRY / BOOKED</div>
          <div className={`font-mono text-[12px] font-bold px-3 py-1 rounded-full transition-colors duration-500 ${fixesOn ? 'bg-spectral text-resolved shadow-[0_0_15px_rgba(18,161,94,0.3)]' : 'bg-ember-soft text-ember-text'}`}>
             REACHING THE END · {fixesOn ? 'HIGH' : 'LOW'}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes quoteRise {
          0% { transform: translate(-50%, 10px) scale(0.9); opacity: 0; }
          10% { transform: translate(-50%, 0px) scale(1); opacity: 1; }
          80% { transform: translate(-50%, -20px) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -30px) scale(0.95); opacity: 0; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
