"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, Check, Globe2, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";
import { dashboardNewAuditHref } from "@/lib/auth/new-audit-href";
import { redirectToLogin } from "@/lib/auth/redirect-to-login";
import { ReportPreview } from "./ReportPreview";
import { normalizeWebsiteInput } from "@/lib/website-input";

export function Hero() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const { user, loading } = useAuth();
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
    <section className="section-pad border-b border-border/60 pt-32 pb-16 md:pt-40 md:pb-24">
      <div className="product-container grid items-center gap-12 lg:grid-cols-[1.08fr_1fr] lg:gap-16">
        <div>
          <p className="eyebrow mb-6 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-violet" /> AI website audits · Early access</p>
          <h1 className="font-heading text-[clamp(2.7rem,4.5vw,4.25rem)] font-medium leading-[1.08] tracking-[-.045em]">Find the friction.<br /><span className="text-violet">Make the next<br className="hidden xl:block" /> visit count.</span></h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-light md:text-lg">Ghost reviews your website through AI customer journeys. Find what makes buying difficult, see the evidence, and get a clear plan to fix it.</p>
          <form onSubmit={start} className="mt-8" noValidate>
            <label htmlFor="hero-url" className="mb-2 block text-sm font-medium">Your website</label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Globe2 aria-hidden className="absolute left-3.5 top-3.5 h-5 w-5 text-muted" />
                <input id="hero-url" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" autoComplete="url" value={url} onChange={e => { setUrl(e.target.value); setError(""); }} placeholder="yourbusiness.com" aria-invalid={!!error} aria-describedby={error ? "hero-error" : "hero-note"} className="h-12 w-full rounded-lg border border-border bg-surface pl-11 pr-4 text-base" />
              </div>
              <Button type="submit" size="lg" disabled={loading}>Audit my site <ArrowRight aria-hidden className="h-4 w-4" /></Button>
            </div>
            {error && <p id="hero-error" role="alert" className="mt-2 text-sm text-danger">{error}</p>}
            <p id="hero-note" className="mt-3 text-xs text-muted">Sign in to request access. Review your setup before any audit starts.</p>
          </form>
          <a href="#sample" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-ghost-white">Explore an example report <ArrowUpRight aria-hidden className="h-4 w-4 text-violet" /></a>
          <div><a href="#founder-feedback" className="inline-flex min-h-11 items-center gap-2 text-xs text-muted-light hover:text-ghost-white"><Play aria-hidden className="h-3.5 w-3.5 text-violet" />Watch Mivi co-founder’s feedback <span className="text-muted">· 27 sec</span></a></div>
        </div>
        <div><ReportPreview /><p className="mt-4 text-center text-xs text-muted">An illustrative report. Your findings come from your website.</p></div>
      </div>
      <div className="product-container mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-border/60 pt-6 text-sm text-muted-light md:mt-16">
        {["No tracking code to install", "Findings tied to page evidence", "Fixes you can review and use"].map(text => <span key={text} className="flex items-center gap-2"><Check aria-hidden className="h-4 w-4 text-violet" />{text}</span>)}
      </div>
    </section>
  );
}
