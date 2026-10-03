"use client";

import { useEffect, useState, useRef, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { dashboardNewAuditHref } from "@/lib/auth/new-audit-href";
import { redirectToLogin } from "@/lib/auth/redirect-to-login";
import { normalizeWebsiteInput } from "@/lib/website-input";
import { ArrowRight, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useReducedMotion } from "framer-motion";
import { GhostMark } from "@/components/ui/GhostMark";
import { cn } from "@/lib/utils";

// Lazy-load the visualization with SSR false: preserves LCP on H1 and guarantees zero hydration mismatch
const LeakVisualization = dynamic(
  () => import("./LeakVisualization").then((m) => m.LeakVisualization),
  {
    ssr: false,
    loading: () => <div className="w-full h-full" aria-hidden="true" />,
  }
);

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
        if (len === 0) {
          word = (word + 1) % EXAMPLE_DOMAINS.length;
          phase = "type";
        }
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
  const [introStep, setIntroStep] = useState(0); // 0..4
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const introFinished = !mounted || introPlayed || introSkipped;

  const placeholder = useTypingPlaceholder(mounted && introFinished && !reduced && !focused && !url);

  function start(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizeWebsiteInput(url);
    if (!normalized) {
      setError("Enter a public website, like yourbusiness.com.");
      return;
    }
    setError("");
    const dest = dashboardNewAuditHref(normalized);
    if (!user) redirectToLogin(router, { redirect: dest });
    else router.push(dest);
  }

  // INTRO SEQUENCE: once per session via sessionStorage, ≤2.6s total
  useEffect(() => {
    if (!mounted) return;
    if (reduced) {
      setIntroSkipped(true);
      return;
    }

    try {
      if (sessionStorage.getItem("ghost_hero_intro_seen")) {
        setIntroSkipped(true);
        return;
      }
    } catch {
      // sessionStorage unavailable
    }

    // Step 1: 0 - 0.5s: logo condenses
    setIntroStep(1);

    // Step 2: 0.5s - 1.4s: logo moves to left band
    const t1 = setTimeout(() => setIntroStep(2), 500);

    // Step 3: 1.4s - 2.0s: stations pop in, cracks ignite
    const t2 = setTimeout(() => setIntroStep(3), 1400);

    // Step 4: 2.0s - 2.6s: overlay fades, reveal H1 & form
    const t3 = setTimeout(() => setIntroStep(4), 2000);

    // Done at 2.6s
    const t4 = setTimeout(() => {
      setIntroPlayed(true);
      try {
        sessionStorage.setItem("ghost_hero_intro_seen", "1");
      } catch {}
    }, 2600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [mounted, reduced]);

  const handleSkip = () => {
    setIntroSkipped(true);
    try {
      sessionStorage.setItem("ghost_hero_intro_seen", "1");
    } catch {}
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!introFinished && (e.key === "Escape" || e.key === " ")) handleSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [introFinished]);

  // AUTO-TOGGLE ONCE after 4s (or on initial full visibility)
  useEffect(() => {
    if (!introFinished) return;
    const timer = setTimeout(() => {
      setFixesOn(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, [introFinished]);

  return (
    <>
      {/* ── HERO SECTION: 100svh on desktop (1440×900 fits with 0 scroll), natural stacking on mobile ── */}
      <section className="relative w-full min-h-[100svh] lg:h-[100svh] lg:max-h-[100svh] flex flex-col justify-between bg-paper text-ink overflow-x-hidden lg:overflow-hidden">
        
        {/* ── TOP SECTION (centered, max-width 880px, padding-top ~96-104px) ── */}
        <div className="relative z-20 w-full max-w-[880px] mx-auto pt-[88px] sm:pt-[96px] lg:pt-[clamp(76px,10vh,104px)] px-5 flex flex-col items-center text-center shrink-0">
          
          {/* Eyebrow Pill */}
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-paper py-1 px-3 text-graphite shadow-2xs mb-2.5">
            <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-ember animate-pulse shadow-[0_0_8px_rgba(255,74,28,0.8)]" />
            <span className="font-mono text-[11px] tracking-[0.04em] uppercase text-graphite font-medium">
              AI website audits · Early access
            </span>
          </p>

          {/* H1 Headline */}
          <h1 className="font-heading text-[clamp(36px,4.5vw,76px)] font-[560] leading-[0.98] tracking-[-0.045em] text-ink select-none">
            Find the{" "}
            <span className="relative inline-block font-serif italic font-normal text-[1.08em] tracking-[-0.02em]">
              friction
              <svg
                aria-hidden
                viewBox="0 0 300 24"
                preserveAspectRatio="none"
                className="absolute -bottom-[0.08em] left-0 h-[0.24em] w-full overflow-visible pointer-events-none"
              >
                <path
                  d="M3 15.5c38-6.2 84-9.6 139-9.4 52 .2 101 3.6 155 10.6"
                  fill="none"
                  stroke="var(--color-ember)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </span>
            .<br />
            Make the next visit count.
          </h1>

          {/* Subcopy */}
          <p className="mt-3 text-[16px] sm:text-[18px] text-graphite max-w-[56ch] leading-[1.4] select-none">
            Ghost reviews your website through AI customer journeys. Find what makes buying difficult, see the evidence, and get a clear plan to fix it.
          </p>

          {/* URL Form as a centered 60px command bar */}
          <form onSubmit={start} className="relative mt-4.5 w-full max-w-[560px]" noValidate>
            <div className="flex flex-col sm:flex-row items-center h-auto sm:h-[60px] rounded-[24px] sm:rounded-full border border-line bg-fog p-1.5 sm:pl-5 transition-[background-color,border-color,box-shadow] duration-300 focus-within:border-ember/40 focus-within:bg-paper focus-within:shadow-[0_0_0_3px_rgba(255,74,28,0.2)]">
              <div className="relative flex h-12 sm:h-full min-w-0 flex-1 items-center bg-transparent w-full">
                <Globe2 aria-hidden className="h-[18px] w-[18px] shrink-0 text-ash" strokeWidth={1.6} />
                <input
                  id="hero-url"
                  type="text"
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="url"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setError("");
                  }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder={placeholder}
                  aria-invalid={!!error}
                  aria-describedby={error ? "hero-error" : "hero-note"}
                  className="h-full w-full min-w-0 bg-transparent pl-3 text-[16px] sm:text-[17px] tracking-[-0.01em] text-ink outline-none"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="w-full sm:w-auto h-12 sm:h-full px-6 sm:px-7 rounded-full bg-ink text-paper hover:bg-ink/90 font-medium text-[15px] shadow-xs cursor-pointer shrink-0"
              >
                Audit my site <ArrowRight aria-hidden className="h-4 w-4 ml-1" />
              </Button>
            </div>
            {error && (
              <p id="hero-error" role="alert" className="mt-2 text-xs text-ember-text font-medium text-center sm:text-left pl-3">
                {error}
              </p>
            )}
            <p id="hero-note" className="mt-2 text-[13px] text-ash text-center select-none">
              Sign in to request access. Review your setup before any audit starts.
            </p>
          </form>
        </div>

        {/* ── BOTTOM BAND (lower ~50% of viewport, full-bleed): "The Leak" visualization ── */}
        <div className="relative w-full h-[540px] lg:h-auto lg:flex-1 lg:min-h-0 flex flex-col justify-between pt-4 lg:pt-1 pb-4 lg:pb-2">
          
          {/* Segmented Pill Toggle centered just above the visualization */}
          <div className="flex justify-center z-30 shrink-0 mb-1">
            <div className="inline-flex items-center gap-2.5 bg-fog/95 backdrop-blur-sm rounded-full p-1 border border-line shadow-2xs">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ash-text pl-3 select-none">
                Ghost fixes
              </span>
              <div className="flex bg-paper rounded-full border border-line/80 p-0.5 shadow-2xs" role="group" aria-label="Toggle fixes">
                <button
                  type="button"
                  aria-pressed={!fixesOn}
                  onClick={() => setFixesOn(false)}
                  className={cn(
                    "px-3.5 py-1 rounded-full font-mono text-[11px] font-medium transition-all duration-200 cursor-pointer",
                    !fixesOn ? "bg-ink text-paper shadow-2xs" : "text-graphite hover:text-ink"
                  )}
                >
                  Off
                </button>
                <button
                  type="button"
                  aria-pressed={fixesOn}
                  onClick={() => setFixesOn(true)}
                  className={cn(
                    "px-3.5 py-1 rounded-full font-mono text-[11px] font-medium transition-all duration-200 cursor-pointer",
                    fixesOn ? "bg-ink text-paper shadow-2xs" : "text-graphite hover:text-ink"
                  )}
                >
                  On
                </button>
              </div>
            </div>
          </div>

          {/* Visualization Area: aria-hidden per requirements */}
          <div className="relative w-full flex-1 min-h-[440px] lg:min-h-0" aria-hidden="true">
            <LeakVisualization
              fixesOn={fixesOn}
              introFinished={introFinished}
              isReducedMotion={!!reduced}
            />
          </div>

          {/* Disclaimer at bottom */}
          <p className="font-mono text-[11px] text-ash text-center shrink-0 pt-1 select-none">
            Illustrative simulation of a fictional business. Not a measured conversion rate.
          </p>
        </div>
      </section>

      {/* ── INTRO SEQUENCE OVERLAY (≤2.6s, skippable, once per session) ── */}
      {mounted && !introFinished && !reduced && (
        <div
          onClick={handleSkip}
          className={cn(
            "fixed inset-0 z-[100] flex items-center justify-center bg-paper transition-opacity duration-600 cursor-pointer",
            introStep >= 4 ? "opacity-0 pointer-events-none" : "opacity-100"
          )}
        >
          {/* Logo animation */}
          <div
            className={cn(
              "transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
              introStep === 1 && "scale-100 blur-0 opacity-100",
              introStep === 2 && "scale-75 -translate-x-[42vw] translate-y-[26vh] opacity-90",
              introStep >= 3 && "scale-50 -translate-x-[44vw] -translate-y-[44vh] opacity-0"
            )}
          >
            <GhostMark className="w-16 h-16" />
          </div>

          {/* Visible Skip button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSkip();
            }}
            className="font-mono absolute bottom-6 right-6 min-h-10 rounded-full border border-line bg-paper/90 px-4 text-[11px] text-graphite hover:text-ink shadow-xs cursor-pointer z-50 backdrop-blur-sm"
          >
            Skip intro
          </button>
        </div>
      )}
    </>
  );
}
