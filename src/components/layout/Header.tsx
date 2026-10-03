"use client";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { GhostLogo } from "@/components/ui/GhostLogo";
import { UserMenu } from "@/components/auth/UserMenu";
const links = [['How it works','#program'],['Example report','#sample'],['Plans','#pricing'],['For agencies','#agencies']] as const;
export function Header() {
  const [open,setOpen]=useState(false);
  return <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-midnight/95 section-pad">
    <div className="product-container flex h-[76px] items-center justify-between gap-5"><GhostLogo size="sm" /><nav aria-label="Main navigation" className="hidden items-center gap-7 lg:flex">{links.map(([label,href])=><a key={href} href={href} className="text-sm text-muted-light hover:text-ghost-white">{label}</a>)}</nav><div className="flex items-center gap-3"><UserMenu /><button aria-label={open?'Close navigation':'Open navigation'} aria-expanded={open} aria-controls="landing-mobile-menu" onClick={()=>setOpen(!open)} className="grid h-11 w-11 place-items-center rounded-lg border border-border lg:hidden">{open?<X className="h-5 w-5" />:<Menu className="h-5 w-5" />}</button></div></div>
    {open&&<nav id="landing-mobile-menu" aria-label="Mobile navigation" onKeyDown={e=>{if(e.key==='Escape')setOpen(false)}} className="border-t border-border py-3 lg:hidden">{links.map(([label,href])=><a key={href} href={href} onClick={()=>setOpen(false)} className="block rounded-lg px-3 py-3 text-sm text-muted-light hover:bg-surface">{label}</a>)}</nav>}
  </header>;
}
