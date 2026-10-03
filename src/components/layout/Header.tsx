"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { GhostMark } from "@/components/ui/GhostMark";
import { UserMenu } from "@/components/auth/UserMenu";
import { cn } from "@/lib/utils";

const links = [['How it works','#program'],['Example report','#sample'],['Shoppers','#shoppers'],['Friction engine','#leaks'],['For agencies','#agencies']] as const;
const EASE = [0.22, 1, 0.36, 1] as const;

/** Scroll-spy: which section owns the middle band of the viewport. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const seen = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => seen.set(e.target.id, e.isIntersecting));
        setActive(ids.find((id) => seen.get(id)) ?? null);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [ids]);
  return active;
}

const SECTION_IDS = links.map(([, href]) => href.slice(1));

export function Header() {
  const [open, setOpen] = useState(false);
  const [condensed, setCondensed] = useState(false);
  const active = useActiveSection(SECTION_IDS);
  const firstLink = useRef<HTMLAnchorElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => firstLink.current?.focus(), 120);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    toggle.current?.focus();
  };

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4">
      <div
        className={cn(
          "pointer-events-auto mx-auto flex items-center justify-between gap-4 rounded-full border bg-paper/70 backdrop-blur-xl backdrop-saturate-150 transition-[max-width,padding,border-color,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          condensed
            ? "max-w-[880px] border-line py-1.5 pl-4 pr-1.5 shadow-[0_1px_1px_rgba(10,10,12,0.03),0_12px_32px_-18px_rgba(10,10,12,0.22)] bg-paper/80"
            : "max-w-[1240px] border-line/70 py-2.5 pl-5 pr-2.5",
        )}
      >
        <Link href="/" aria-label="Ghost home" className="group inline-flex shrink-0 items-center gap-2">
          <span data-nav-mark className="inline-flex">
            <GhostMark className="h-7 w-7" track />
          </span>
          <span className="font-heading text-[19px] font-semibold tracking-[-0.04em] text-ink">
            Ghost<span className="text-ember">.</span>
          </span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
          {links.map(([label, href]) => {
            const isActive = active === href.slice(1);
            return (
              <a
                key={href}
                href={href}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "relative rounded-full px-3.5 py-2 text-[14px] tracking-[-0.01em] transition-colors duration-200",
                  isActive ? "text-ink" : "text-graphite hover:bg-fog/70 hover:text-ink",
                )}
              >
                {label}
                <span
                  aria-hidden
                  className={cn(
                    "absolute bottom-[3px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-ember transition-[opacity,transform] duration-300",
                    isActive ? "scale-100 opacity-100" : "scale-0 opacity-0",
                  )}
                />
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <UserMenu />
          <button
            ref={toggle}
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="landing-mobile-menu"
            onClick={() => setOpen(!open)}
            className="relative grid h-11 w-11 place-items-center rounded-full border border-line bg-paper text-ink transition-colors hover:bg-mist lg:hidden"
          >
            <span aria-hidden className="relative block h-3 w-4">
              <span className={cn("absolute left-0 top-0 h-[1.5px] w-4 rounded bg-ink transition-transform duration-300", open && "translate-y-[5px] rotate-45")} />
              <span className={cn("absolute bottom-0 left-0 h-[1.5px] w-4 rounded bg-ink transition-transform duration-300", open && "-translate-y-[5.5px] -rotate-45")} />
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="landing-mobile-menu"
            aria-label="Mobile navigation"
            onKeyDown={(e) => { if (e.key === "Escape") close(); }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: 0.3, ease: EASE }}
            className="pointer-events-auto fixed inset-0 -z-10 flex flex-col bg-paper/95 px-6 pb-10 pt-28 backdrop-blur-xl lg:hidden"
          >
            <p className="mono-label mb-6 text-ash-text">Menu</p>
            <ul className="flex flex-col">
              {links.map(([label, href], i) => (
                <motion.li
                  key={href}
                  initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.55, ease: EASE, delay: 0.06 + i * 0.06 }}
                  className="border-b border-line"
                >
                  <a
                    ref={i === 0 ? firstLink : undefined}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-16 items-center justify-between py-4 font-heading text-[clamp(28px,8vw,40px)] font-medium tracking-[-0.035em] text-ink"
                  >
                    {label}
                    <span className="mono-label text-ash-text">0{i + 1}</span>
                  </a>
                </motion.li>
              ))}
            </ul>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-auto flex items-center gap-2 text-sm text-graphite"
            >
              <span aria-hidden className="ember-dot !h-1.5 !w-1.5" /> AI website audits · Early access
            </motion.p>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
