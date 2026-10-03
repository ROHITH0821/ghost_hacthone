"use client";

import { useEffect, useState, useRef, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { dashboardNewAuditHref } from "@/lib/auth/new-audit-href";
import { redirectToLogin } from "@/lib/auth/redirect-to-login";
import { normalizeWebsiteInput } from "@/lib/website-input";
import { ArrowRight, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useReducedMotion } from "framer-motion";
import { GhostMark } from "@/components/ui/GhostMark";
import { LeakVisualization } from "./LeakVisualization";

const EXAMPLE_DOMAINS = ["yourbusiness.com", "bridalstudio.in", "smiledental.co", "northbakery.com", "lumenyoga.studio"];

function useTypingPlaceholder(active: boolean) {
  const [text, setText] = useState(EXAMPLE_DOMAINS[0]);
  useEffect(() => {
    if (!active) return;
    let word = 0;
    let len = EXAMPLE_DOMAINS[0].length;
    let phase: "hold" | "delete" | "type" = "hold";
    let timer = 0;
    const tick = () => {
      const current = EXAMPLE_DOMAINS[word];
      if (phase === "hold") {
        phase = "delete";
      } else if (phase === "delete") {
        len -= 1;
        setText(current.slice(0, len));
        if (len === 0) { word = (word + 1) % EXAMPLE_DOMAINS.length; phase = "type"; }
      } else {
        len += 1;
        setText(current.slice(0, len));
        if (len === current.length) phase = "hold";
      }
      timer = window.setTimeout(tick, phase === "hold" ? 2200 : phase === "delete" ? 38 : 72);
    };
    setText(EXAMPLE_DOMAINS[0]);
    timer = window.setTimeout(tick, 2400);
    return () => window.clearTimeout(timer);
  }, [active]);
  return active ? text : EXAMPLE_DOMAINS[0];
}

export function Hero() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);
  const router = useRouter();
  const { user, loading } = useAuth();
  const reduced = useReducedMotion();
  
  const [fixesOn, setFixesOn] = useState(false);
  const [introPlayed, setIntroPlayed] = useState(false);
  const [introSkipped, setIntroSkipped] = useState(false);
  const introFinished = introPlayed || introSkipped;
  const [scrolledIntoView, setScrolledIntoView] = useState(false);

  const placeholder = useTypingPlaceholder(introFinished && !reduced && !focused && !url);

  function start(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizeWebsiteInput(url);
    if (!normalized) { setError("Enter a public website, like yourbusiness.com."); return; }
    setError("");
    const dest = dashboardNewAuditHref(normalized);
    if (!user) redirectToLogin(router, { redirect: dest });
    else router.push(dest);
  }

  // INTRO LOGIC
  useEffect(() => {
    if (reduced) {
      setIntroSkipped(true);
      return;
    }
    const hasPlayed = sessionStorage.getItem("ghost_hero_intro_played");
    if (hasPlayed) {
      setIntroSkipped(true);
      return;
    }
    
    const timer = setTimeout(() => {
      setIntroPlayed(true);
      sessionStorage.setItem("ghost_hero_intro_played", "true");
    }, 2600); 

    return () => clearTimeout(timer);
  }, [reduced]);

  const handleSkip = () => {
    setIntroSkipped(true);
    sessionStorage.setItem("ghost_hero_intro_played", "true");
  };
  
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!introPlayed && !introSkipped && e.key === "Escape") handleSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [introPlayed, introSkipped]);

  // TOGGLE: auto-toggles ON once when band first scrolls fully into view/after 4s, then back to user control
  const bandRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!bandRef.current || !introFinished) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !scrolledIntoView) {
        setScrolledIntoView(true);
        setTimeout(() => {
          setFixesOn(true);
        }, 1000); // 1s after scrolling into view
      }
    }, { threshold: 0.8 });
    observer.observe(bandRef.current);
    return () => observer.disconnect();
  }, [introFinished, scrolledIntoView]);

  return (
    <>
      <section className="relative w-full min-h-[100svh] flex flex-col bg-paper text-ink overflow-hidden">
        {/* TOP */}
        <div className="relative z-10 w-full max-w-[880px] mx-auto pt-[120px] px-6 flex flex-col items-center text-center transition-opacity duration-700" style={{ opacity: introFinished ? 1 : 0 }}>
          
          <p className="inline-flex items-center gap-2.5 rounded-full border border-line bg-paper py-1.5 pl-2.5 pr-3.5 text-graphite mb-6">
            <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-ember animate-pulse" />
            <span className="font-mono text-[11px] tracking-[0.02em] uppercase">AI website audits · Early access</span>
          </p>

          <h1 className="font-heading text-[clamp(44px,5.4vw,84px)] font-[560] leading-[0.98] tracking-[-0.045em] text-ink">
            Find the <span className="relative inline-block font-serif italic text-[1.08em] tracking-[-0.02em]">friction
              <svg aria-hidden viewBox="0 0 300 24" preserveAspectRatio="none" className="absolute -bottom-[0.07em] left-0 h-[0.2em] w-full overflow-visible">
                <path d="M3 15.5c38-6.2 84-9.6 139-9.4 52 .2 101 3.6 155 10.6" fill="none" stroke="var(--color-ember)" strokeWidth="3.2" strokeLinecap="round" />
              </svg>
            </span>.<br />
            Make the next visit count.
          </h1>

          <p className="mt-5 text-[18px] text-graphite max-w-[56ch]">
            Ghost reviews your website through AI customer journeys. Find what makes buying difficult, see the evidence, and get a clear plan to fix it.
          </p>

          <form onSubmit={start} className="relative mt-8 w-full max-w-[560px]" noValidate>
            <div className="flex flex-col gap-2.5 sm:h-[60px] sm:flex-row sm:items-center sm:gap-2 sm:rounded-full sm:border sm:border-line sm:bg-fog sm:p-1.5 sm:pl-6 sm:transition-[background-color,border-color,box-shadow] sm:duration-300 sm:focus-within:border-ember/40 sm:focus-within:bg-paper sm:focus-within:shadow-[0_0_0_2px_rgba(255,74,28,0.2)]">
              <div className="relative flex h-14 min-w-0 flex-1 items-center rounded-full border border-line bg-fog px-5 sm:h-full sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0">
                <Globe2 aria-hidden className="h-[18px] w-[18px] shrink-0 text-ash" strokeWidth={1.6} />
                <input id="hero-url" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" autoComplete="url" value={url} onChange={e => { setUrl(e.target.value); setError(""); }} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder={placeholder} aria-invalid={!!error} className="h-full w-full min-w-0 bg-transparent pl-3 text-[17px] tracking-[-0.01em] text-ink outline-none" />
              </div>
              <Button type="submit" size="lg" disabled={loading} className="h-14 px-8 sm:h-full rounded-full bg-ink text-white hover:bg-ink/90">Audit my site <ArrowRight aria-hidden className="h-4 w-4 ml-1" /></Button>
            </div>
            {error && <p role="alert" className="mt-3 text-sm text-ember-text">{error}</p>}
            <p className="mt-3 text-[13px] text-ash text-center">Sign in to request access. Review your setup before any audit starts.</p>
          </form>
        </div>

        {/* BOTTOM BAND */}
        <div ref={bandRef} className="relative flex-1 w-full mt-10 min-h-[400px] flex flex-col justify-end pb-8">
          
          <div className="flex justify-center mb-4 transition-opacity duration-700" style={{ opacity: introFinished ? 1 : 0, position: 'relative', zIndex: 20 }}>
             <div className="inline-flex items-center gap-3 bg-fog rounded-full p-1 border border-line">
               <span className="font-mono text-[11px] uppercase tracking-wider text-ash-text pl-3">Ghost fixes</span>
               <div className="flex bg-paper rounded-full border border-line p-0.5" role="group" aria-label="Toggle fixes">
                 <button type="button" aria-pressed={!fixesOn} onClick={() => setFixesOn(false)} className={`px-4 py-1.5 rounded-full font-mono text-[11px] transition-colors ${!fixesOn ? 'bg-ink text-paper' : 'text-graphite hover:text-ink'}`}>Off</button>
                 <button type="button" aria-pressed={fixesOn} onClick={() => setFixesOn(true)} className={`px-4 py-1.5 rounded-full font-mono text-[11px] transition-colors ${fixesOn ? 'bg-ink text-paper' : 'text-graphite hover:text-ink'}`}>On</button>
               </div>
             </div>
          </div>

          <div className="w-full relative h-[320px] md:h-[440px]">
            {reduced ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-graphite font-mono text-[12px]">
                {/* Fallback for reduced motion */}
                Static before/after view
              </div>
            ) : (
              <LeakVisualization fixesOn={fixesOn} introFinished={introFinished} />
            )}
          </div>

          <p className="font-mono text-[11px] text-ash text-center mt-6 z-10 transition-opacity duration-700" style={{ opacity: introFinished ? 1 : 0 }}>
            Illustrative simulation of a fictional business. Not a measured conversion rate.
          </p>
        </div>
      </section>

      {/* INTRO OVERLAY */}
      {!introFinished && !reduced && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-paper pointer-events-none intro-sequence">
          <div className="logo-anim">
            <GhostMark className="w-16 h-16" />
          </div>
          <button type="button" onClick={handleSkip} className="pointer-events-auto font-mono absolute bottom-6 right-6 min-h-11 rounded-full border border-line bg-paper/80 px-4 text-[11px] text-graphite hover:text-ink">Skip</button>
          <style>{`
            .intro-sequence { animation: fadeOut 0.6s ease 2s forwards; }
            .logo-anim { animation: condense 0.5s cubic-bezier(0.22,1,0.36,1) forwards, moveLogo 0.9s cubic-bezier(0.22,1,0.36,1) 0.5s forwards, flyLogo 0.6s cubic-bezier(0.22,1,0.36,1) 2.0s forwards; }
            @keyframes fadeOut { to { opacity: 0; visibility: hidden; } }
            @keyframes condense { 0% { transform: scale(1.5); filter: blur(10px); opacity: 0; } 100% { transform: scale(1); filter: blur(0px); opacity: 1; } }
            @keyframes moveLogo { 100% { transform: translate(calc(-50vw + 60px), 25vh) scale(0.6); } }
            @keyframes flyLogo { 100% { transform: translate(calc(-50vw + 40px), -45vh) scale(0.4); opacity: 0; } }
          `}</style>
        </div>
      )}
    </>
  );
}
