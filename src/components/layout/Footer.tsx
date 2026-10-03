import Link from "next/link";
import { GhostLogo } from "@/components/ui/GhostLogo";
export function Footer() {
  return (
    <footer className="section-pad relative overflow-hidden border-t border-line bg-paper pt-16">
      <div className="product-container relative z-10">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <GhostLogo size="sm" />
            <p className="mt-4 max-w-[30ch] text-[15px] leading-relaxed text-graphite">Customer perspective. Clearer next steps.</p>
          </div>
          <nav aria-label="Footer" className="md:col-span-3 md:col-start-7">
            <p className="mono-label mb-4 text-ash-text">Product</p>
            <ul className="space-y-1 text-[15px]">
              <li><Link href="/dashboard/overview" className="inline-flex min-h-10 items-center text-graphite transition-colors hover:text-ink">Workspace</Link></li>
              <li><Link href="/#faq" className="inline-flex min-h-10 items-center text-graphite transition-colors hover:text-ink">Questions</Link></li>
            </ul>
          </nav>
          <div className="md:col-span-3">
            <p className="mono-label mb-4 text-ash-text">Talk to us</p>
            <ul className="space-y-1 text-[15px]">
              <li><a href="https://wa.me/918019013032" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center text-graphite transition-colors hover:text-ink">Contact</a></li>
              <li><button type="button" className="inline-flex min-h-10 items-center text-graphite transition-colors hover:text-ink">Built by WebAura</button></li>
            </ul>
          </div>
        </div>
        <div className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-line py-6">
          <p className="mono-label text-[10px] text-ash-text">© {new Date().getFullYear()} Ghost. All rights reserved.</p>
          <p className="mono-label flex items-center gap-2 text-[10px] text-ash-text"><span aria-hidden className="ember-dot !h-1.5 !w-1.5" />Early access</p>
        </div>
      </div>
      <p aria-hidden className="pointer-events-none -mt-[0.18em] select-none text-center font-heading text-[clamp(120px,27vw,420px)] font-semibold leading-[0.8] tracking-[-0.07em] text-fog">
        Ghost<span className="text-[#F3E4DE]">.</span>
      </p>
    </footer>
  );
}
