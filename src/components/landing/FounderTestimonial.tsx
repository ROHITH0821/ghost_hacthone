"use client";

import { useRef, useState } from "react";
import { ArrowRight, Play } from "lucide-react";
import { Eyebrow, Reveal, Serif } from "./motion/Reveal";

export const FOUNDER_TESTIMONIAL_URL = "https://pub-26ed09495e8a4ca0b8645f65c8668f06.r2.dev/WhatsApp%20Video%202026-07-20%20at%2016.23.50.mp4";

export function FounderTestimonial() {
  const player = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState(false);

  async function play() {
    const video = player.current;
    if (!video) return;
    setError(false);
    // The MP4 is requested only after this explicit interaction.
    if (!video.getAttribute("src")) video.src = FOUNDER_TESTIMONIAL_URL;
    try {
      await video.play();
      setStarted(true);
      video.focus();
    } catch {
      setError(true);
    }
  }

  return (
    <section id="founder-feedback" aria-labelledby="founder-feedback-title" className="section-pad product-section scroll-mt-24">
      <div className="product-container grid items-center gap-12 md:grid-cols-12 md:gap-8">
        <Reveal className="md:col-span-6 lg:col-span-6">
          <Eyebrow>Founder feedback</Eyebrow>
          <h2 id="founder-feedback-title" className="display-lg font-heading text-ink">A founder’s<br /><Serif>perspective.</Serif></h2>
          <p className="mt-6 max-w-[44ch] text-[17px] leading-relaxed text-graphite">Hear from Midhula Devabhaktuni, co-founder of Mivi, in this short video testimonial.</p>
          <div className="mt-10 flex items-center gap-4 border-t border-line pt-6">
            <span aria-hidden className="h-10 w-px bg-ink" />
            <div>
              <p className="font-heading text-xl font-medium tracking-[-0.02em] text-ink">Midhula Devabhaktuni</p>
              <p className="mt-0.5 text-sm text-graphite">Co-founder, Mivi</p>
            </div>
          </div>
          <p className="mono-label mt-6 text-ash-text">27 seconds · Play with sound</p>
          <a href="#hero-url" className="group mt-6 inline-flex min-h-11 items-center gap-2 text-[15px] font-medium text-ink underline decoration-line decoration-1 underline-offset-[6px] transition-[text-decoration-color] hover:decoration-ink">Explore your own website with Ghost <ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" /></a>
        </Reveal>

        <Reveal delay={0.1} className="md:col-span-5 md:col-start-8 lg:col-span-4 lg:col-start-8">
        <figure className="relative mx-auto w-full max-w-[340px]">
          <span aria-hidden className="mono-label absolute -left-3 top-8 z-10 -translate-x-full -rotate-90 origin-right whitespace-nowrap text-[10px] text-ash-text max-lg:hidden">Founder testimonial · 0:27</span>
          <div className="relative aspect-[9/16] overflow-hidden rounded-[22px] border border-line bg-ink shadow-[var(--shadow-float)]">
            <video
              ref={player}
              poster="/testimonials/midhula-devabhaktuni.jpg"
              preload="none"
              playsInline
              controls={started}
              aria-hidden={!started}
              tabIndex={started ? 0 : -1}
              aria-label="Video testimonial from Midhula Devabhaktuni, co-founder of Mivi"
              aria-describedby="founder-video-caption"
              onPlay={() => { setStarted(true); setError(false); }}
              onError={() => setError(true)}
              className="h-full w-full object-contain"
            />
            {!started && (
              <button type="button" onClick={() => void play()} aria-label="Play Midhula Devabhaktuni’s testimonial, 27 seconds" className="group absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-t from-black/80 via-black/5 to-transparent p-6 text-white focus-visible:outline-offset-[-6px]">
                <span className="mb-5 grid h-16 w-16 place-items-center rounded-full bg-paper text-ink shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105 group-active:scale-[0.98]"><Play aria-hidden className="ml-1 h-6 w-6 fill-current" /></span>
                <span className="text-base font-medium">Watch the testimonial</span>
                <span className="mono-label mt-1.5 text-[10px] text-white/80">Midhula Devabhaktuni · 0:27</span>
              </button>
            )}
          </div>
          <figcaption id="founder-video-caption" className="mono-label mt-4 text-center text-[10px] text-ash-text">Midhula Devabhaktuni · Co-founder of Mivi</figcaption>
          {error && <p role="alert" className="mt-3 text-sm text-graphite">The video couldn’t play here. <a href={FOUNDER_TESTIMONIAL_URL} target="_blank" rel="noopener noreferrer" className="text-ink underline">Open the original video</a>.</p>}
        </figure>
        </Reveal>
      </div>
    </section>
  );
}
