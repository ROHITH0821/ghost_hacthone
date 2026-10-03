"use client";

import { useEffect } from "react";
import { INTRO_DONE_EVENT } from "../intro/script";

const OFFSET = -96;

/**
 * Lenis smooth scroll for the landing page only. Loaded lazily, skipped for
 * reduced motion, paused while the intro plays. In-page anchors keep their
 * native URL hash; the skip link is left entirely native so focus moves.
 */
export function SmoothScroll() {
  useEffect(() => {
    const html = document.documentElement;
    const reduced =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches || html.dataset.reduceMotion === "true";
    if (reduced) return;

    let cancelled = false;
    let frame = 0;
    let destroy = () => {};

    void import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      const lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1 });
      const loop = (time: number) => {
        lenis.raf(time);
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);

      if (html.dataset.intro === "play") {
        lenis.stop();
        window.addEventListener(INTRO_DONE_EVENT, () => lenis.start(), { once: true });
      }

      const onClick = (event: MouseEvent) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
        const link = (event.target as HTMLElement | null)?.closest?.("a[href^='#']") as HTMLAnchorElement | null;
        if (!link) return;
        const hash = link.getAttribute("href") ?? "";
        if (hash.length < 2 || hash === "#main-content") return;
        const target = document.getElementById(decodeURIComponent(hash.slice(1)));
        if (!target) return;
        event.preventDefault();
        lenis.scrollTo(target, { offset: OFFSET, duration: 1.1 });
        history.pushState(null, "", hash);
      };
      document.addEventListener("click", onClick);

      destroy = () => {
        document.removeEventListener("click", onClick);
        lenis.destroy();
      };
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      destroy();
    };
  }, []);

  return null;
}
