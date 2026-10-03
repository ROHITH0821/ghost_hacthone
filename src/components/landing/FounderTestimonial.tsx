"use client";

import { useRef, useState } from "react";
import { ArrowUpRight, Play } from "lucide-react";

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
    <section id="founder-feedback" aria-labelledby="founder-feedback-title" className="section-pad product-section scroll-mt-24 border-b border-border/60">
      <div className="product-container grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,340px)] md:gap-16 lg:gap-24">
        <div className="max-w-xl">
          <p className="eyebrow mb-4">Founder feedback</p>
          <h2 id="founder-feedback-title" className="display-lg font-medium">A founder’s<br /><span className="text-violet">perspective.</span></h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-light">Hear from Midhula Devabhaktuni, co-founder of Mivi, in this short video testimonial.</p>
          <div className="mt-8 border-l-2 border-violet pl-5">
            <p className="font-heading text-xl font-medium text-ghost-white">Midhula Devabhaktuni</p>
            <p className="mt-1 text-sm text-muted-light">Co-founder, Mivi</p>
          </div>
          <p className="mt-6 text-xs text-muted">27 seconds · Play with sound</p>
          <a href="#hero-url" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-violet">Explore your own website with Ghost <ArrowUpRight aria-hidden className="h-4 w-4" /></a>
        </div>

        <figure className="mx-auto w-full max-w-[340px]">
          <div className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-border bg-black shadow-xl">
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
              <button type="button" onClick={() => void play()} aria-label="Play Midhula Devabhaktuni’s testimonial, 27 seconds" className="group absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-t from-black/85 via-black/5 to-transparent p-6 text-white focus-visible:outline-offset-[-6px]">
                <span className="mb-5 grid h-16 w-16 place-items-center rounded-full border border-white/30 bg-midnight/80 text-violet transition-colors group-hover:bg-midnight"><Play aria-hidden className="ml-1 h-7 w-7 fill-current" /></span>
                <span className="text-base font-medium">Watch the testimonial</span>
                <span className="mt-1 text-xs text-white/75">Midhula Devabhaktuni · 0:27</span>
              </button>
            )}
          </div>
          <figcaption id="founder-video-caption" className="mt-4 text-center text-xs leading-relaxed text-muted">Midhula Devabhaktuni · Co-founder of Mivi</figcaption>
          {error && <p role="alert" className="mt-3 text-sm text-muted-light">The video couldn’t play here. <a href={FOUNDER_TESTIMONIAL_URL} target="_blank" rel="noopener noreferrer" className="text-violet underline">Open the original video</a>.</p>}
        </figure>
      </div>
    </section>
  );
}
