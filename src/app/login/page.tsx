import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { GhostMark } from "@/components/ui/GhostMark";
import { copy } from "@/lib/copy";

export default function LoginPage() {
  return (
    <main id="main-content" tabIndex={-1} className="relative grid min-h-screen lg:grid-cols-2">
      {/* Brand panel — decorative. */}
      <aside aria-hidden className="relative hidden overflow-hidden border-r border-line bg-mist lg:flex lg:flex-col lg:justify-between lg:p-14">
        <p className="mono-label flex items-center gap-2.5 text-ash-text"><span className="ember-dot !h-1.5 !w-1.5" />AI website audits · Early access</p>
        <div>
          <p className="font-heading text-[clamp(40px,4.4vw,64px)] font-[560] leading-[0.98] tracking-[-0.045em] text-ink">
            Find the <span className="serif-accent">friction.</span><br />Make the next visit count.
          </p>
          <div className="mt-12 max-w-[420px] rounded-[14px] border border-line bg-paper p-4">
            <div className="flex items-center justify-between">
              <span className="mono-label text-[10px] text-ash-text">Services page · Pricing</span>
              <span className="mono-label inline-flex items-center gap-1.5 text-[10px] text-ember-text"><span className="ember-dot !h-1.5 !w-1.5" />High</span>
            </div>
            <p className="mt-2 text-[15px] font-medium tracking-[-0.01em]">Bridal package pricing is unclear</p>
            <div className="mt-3 space-y-1.5"><span className="block h-1.5 w-[86%] rounded-full bg-fog" /><span className="block h-1.5 w-[64%] rounded-full bg-fog" /></div>
          </div>
        </div>
        <GhostMark className="absolute -bottom-16 -right-10 h-72 w-72 opacity-[0.06]" />
        <p className="mono-label text-[10px] text-ash-text">Illustrative example</p>
      </aside>
      <div className="section-pad flex items-center justify-center py-12">
        <Suspense fallback={<div className="mono-label text-ash-text">{copy.common.loading}</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
