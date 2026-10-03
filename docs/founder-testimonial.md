# Homepage founder testimonial

The user-supplied 27-second portrait video is presented between the sample report and pricing, with a secondary anchor link near the hero's example-report link. This gives visitors a personal testimonial after seeing the product and before considering an audit option.

Attribution: **Midhula Devabhaktuni — Co-founder, Mivi**, as supplied by the user. The copy does not invent a quotation, measured outcome, Mivi customer relationship or company partnership. No transcript was supplied, so the component does not invent captions or quote her spoken words.

The original MP4 remains at the user-provided R2 URL. A 41 KB JPEG preview was extracted from the video to `public/testimonials/midhula-devabhaktuni.jpg`. The video has no source until the visitor presses play, preventing an initial video download or autoplay. Native controls and inline mobile playback are enabled after interaction; playback failure exposes a link to the original video. The portrait frame is preserved without cropping.

Implementation: `src/components/landing/FounderTestimonial.tsx`, inserted by `src/app/page.tsx`; `src/components/landing/Hero.tsx` adds the anchor link. Verified live video playback and 26.99-second metadata, desktop/mobile layout, keyboard activation, no autoplay and no video source before interaction. The 51-test suite and typecheck pass. No production deployment was performed.
