"use client";

import { SectionHeading, SectionLabel } from "@/components/ui/BRAVE";
import { StickyPillars } from "@/components/ui/StickyPillars";
import { copy } from "@/lib/copy";

export function GhostMindset() {
  return (
    <section id="mindset" className="section-pad py-24 md:py-32">
      <div className="mx-auto max-w-[1400px]">
        <SectionLabel>{copy.landing.mindset.label}</SectionLabel>
        <SectionHeading size="xl" className="mb-4 md:mb-8">
          The <span className="text-gradient">{copy.brand.name}</span> intelligence
        </SectionHeading>
      </div>

      <StickyPillars pillars={[...copy.landing.mindset.pillars]} />
    </section>
  );
}
