"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";
import { dashboardNewAuditHref } from "@/lib/auth/new-audit-href";
import { redirectToLogin } from "@/lib/auth/redirect-to-login";
import { useIntroReady } from "./intro/gate";
import { INTRO_DONE_EVENT, INTRO_SEEN_KEY } from "./intro/script";
import { normalizeWebsiteInput } from "@/lib/website-input";

const EXAMPLE_DOMAINS = ["yourbusiness.com", "bridalstudio.in", "smiledental.co", "northbakery.com", "lumenyoga.studio"];

/** Types example domains into the placeholder while the field is empty and idle. */
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

/** The page-level intro gate may still arm `data-intro="play"`; this hero has no
 *  intro, so release it immediately (keeps the nav logo and reveals in sync). */
function useReleaseIntro() {
  useEffect(() => {
    const html = document.documentElement;
    if (html.dataset.intro !== "play") return;
    try { sessionStorage.setItem(INTRO_SEEN_KEY, "1"); } catch { /* optional */ }
    html.setAttribute("data-intro", "done");
    window.dispatchEvent(new Event(INTRO_DONE_EVENT));
  }, []);
}

const TRUST = ["No tracking code to install", "Findings tied to page evidence", "Fixes you can review and use"];
const EASE = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);
  const router = useRouter();
  const { user, loading } = useAuth();
  useReleaseIntro();
  const ready = useIntroReady();
  const reduced = useReducedMotion();
  const placeholder = useTypingPlaceholder(ready && !reduced && !focused && !url);
  function start(event: React.FormEvent) {
    event.preventDefault();
    const normalized = normalizeWebsiteInput(url);
    if (!normalized) { setError("Enter a public website, like yourbusiness.com."); return; }
    setError("");
    const dest = dashboardNewAuditHref(normalized);
    if (!user) redirectToLogin(router, { redirect: dest });
    else router.push(dest);
  }
  return (
    <section className="section-pad relative isolate flex min-h-[100svh] items-center overflow-hidden pb-20 pt-32 md:pt-36">
      {/* Quiet backdrop: a soft spectral wash and hairline rules, nothing competing with the input. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[38%] h-[560px] w-[min(1100px,120vw)] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(238,241,255,0.95),rgba(238,241,255,0))]" />
        <div className="absolute inset-0 [background-image:linear-gradient(to_right,rgba(10,10,12,0.035)_1px,transparent_1px)] [background-size:80px_100%] [mask-image:radial-gradient(ellipse_at_center,#000_20%,transparent_70%)]" />
      </div>

      <div className="mx-auto flex w-full max-w-[1040px] flex-col items-center text-center">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="inline-flex items-center gap-2.5 rounded-full border border-line bg-paper py-1.5 pl-2.5 pr-3.5 text-graphite"
        >
          <span aria-hidden className="ember-dot" />
          <span className="mono-label">AI website audits · Early access</span>
        </motion.p>

        <h1 className="mt-7 font-heading text-[clamp(42px,6.4vw,88px)] font-[560] leading-[1] tracking-[-0.045em] text-ink">
          <span className="block">
            Find the{" "}
            <span className="relative inline-block">
              <span className="serif-accent text-[1.08em] leading-none tracking-[-0.02em]">friction</span>
              <svg aria-hidden viewBox="0 0 300 24" preserveAspectRatio="none" className="absolute -bottom-[0.07em] left-0 h-[0.2em] w-full overflow-visible">
                <motion.path
                  d="M3 15.5c38-6.2 84-9.6 139-9.4 52 .2 101 3.6 155 10.6"
                  fill="none"
                  stroke="var(--color-ember)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  initial={{ pathLength: reduced ? 1 : 0, opacity: reduced ? 1 : 0 }}
                  animate={ready ? { pathLength: 1, opacity: 1 } : undefined}
                  transition={{ pathLength: { duration: 0.9, ease: [0.65, 0, 0.35, 1], delay: 0.35 }, opacity: { duration: 0.01, delay: 0.35 } }}
                />
              </svg>
            </span>.
          </span>
          <span className="block">Make the next visit count.</span>
        </h1>

        <p className="mt-6 max-w-[54ch] text-[17px] leading-[1.6] text-graphite md:text-[19px]">Ghost reviews your website through AI customer journeys. Find what makes buying difficult, see the evidence, and get a clear plan to fix it.</p>

        <form onSubmit={start} className="mt-10 w-full max-w-[640px]" noValidate>
          <label htmlFor="hero-url" className="sr-only">Your website</label>
          <div className="flex flex-col gap-2.5 sm:h-16 sm:flex-row sm:items-center sm:gap-2 sm:rounded-full sm:border sm:border-line sm:bg-paper sm:p-1.5 sm:pl-6 sm:shadow-[0_1px_2px_rgba(10,10,12,0.04),0_18px_44px_-22px_rgba(10,10,12,0.28)] sm:transition-[border-color,box-shadow] sm:duration-300 sm:focus-within:border-ember/40 sm:focus-within:shadow-[var(--ring-ember)]">
            <div className="relative flex h-14 min-w-0 flex-1 items-center rounded-full border border-line bg-paper px-5 shadow-[0_1px_2px_rgba(10,10,12,0.04)] transition-[border-color,box-shadow] duration-300 focus-within:border-ember/40 focus-within:shadow-[var(--ring-ember)] sm:h-full sm:rounded-none sm:border-0 sm:px-0 sm:shadow-none sm:focus-within:shadow-none">
              <Globe2 aria-hidden className="h-[18px] w-[18px] shrink-0 text-ash" strokeWidth={1.6} />
              <input id="hero-url" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" autoComplete="url" value={url} onChange={e => { setUrl(e.target.value); setError(""); }} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder={placeholder} aria-invalid={!!error} aria-describedby={error ? "hero-error" : "hero-note"} className="h-full w-full min-w-0 bg-transparent pl-3 text-left text-[17px] tracking-[-0.01em] text-ink outline-none focus-visible:!outline-none" />
            </div>
            <Button type="submit" size="lg" disabled={loading} className="h-14 px-7 sm:h-full">Audit my site <ArrowRight aria-hidden className="h-4 w-4" /></Button>
          </div>
          {error && <p id="hero-error" role="alert" className="mt-3 flex items-center justify-center gap-2 text-sm text-ember-text"><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ember" />{error}</p>}
          <p id="hero-note" className="mt-4 text-[13px] text-ash-text">Sign in to request access. Review your setup before any audit starts.</p>
        </form>

        <a href="#sample" className="group mt-5 inline-flex min-h-11 items-center gap-2 text-[15px] font-medium text-ink underline decoration-line decoration-1 underline-offset-[6px] transition-[text-decoration-color] hover:decoration-ink">
          Explore an example report <ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </a>

        <ul className="mt-14 flex flex-wrap items-center justify-center gap-y-3 border-t border-line pt-6">
          {TRUST.map((text, i) => (
            <li key={text} className={`mono-label flex items-center gap-2 px-5 text-[11px] text-graphite ${i > 0 ? "sm:border-l sm:border-line" : ""}`}>
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-resolved" />
              {text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
