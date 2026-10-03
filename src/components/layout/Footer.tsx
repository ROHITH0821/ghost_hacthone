import Link from "next/link";
import { GhostLogo } from "@/components/ui/GhostLogo";
export function Footer() {
  return <footer className="section-pad border-t border-border py-10"><div className="product-container"><div className="flex flex-col justify-between gap-8 sm:flex-row"><div><GhostLogo size="sm" /><p className="mt-3 text-sm text-muted">Customer perspective. Clearer next steps.</p></div><nav aria-label="Footer" className="flex flex-wrap items-center gap-6 text-sm text-muted-light"><Link href="/dashboard/overview">Workspace</Link><Link href="/#faq">Questions</Link><a href="https://wa.me/918019013032" target="_blank" rel="noopener noreferrer">Contact</a></nav></div><div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-border/60 pt-5 text-xs text-muted"><p>© {new Date().getFullYear()} Ghost. All rights reserved.</p><a href="https://webauraindia.com" target="_blank" rel="noopener noreferrer">Built by WebAura ↗</a></div></div></footer>;
}
