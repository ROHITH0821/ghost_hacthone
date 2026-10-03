"use client";

import { Building2, Target, Goal, Heart } from "lucide-react";
import type { BusinessUnderstanding } from "@/lib/types";
import { ScrollReveal, SectionHeading, SectionLabel } from "@/components/ui/BRAVE";
import { copy } from "@/lib/copy";

interface BusinessUnderstandingCardProps {
  data: BusinessUnderstanding;
}

export function BusinessUnderstandingCard({
  data,
}: BusinessUnderstandingCardProps) {
  const items = [
    {
      icon: Building2,
      label: copy.results.businessUnderstanding.businessType,
      value: data.businessType,
    },
    {
      icon: Target,
      label: copy.results.businessUnderstanding.targetAudience,
      value: data.targetAudience,
    },
    {
      icon: Goal,
      label: copy.results.businessUnderstanding.primaryGoal,
      value: data.primaryGoal,
    },
  ];

  return (
    <div>
      <SectionLabel>{copy.results.businessUnderstanding.label}</SectionLabel>
      <SectionHeading size="lg" className="mb-10">
        What <span className="text-gradient">{copy.brand.name}</span> detected
      </SectionHeading>

      <div className="grid gap-4 sm:grid-cols-3">
        {items.map((item, i) => (
          <ScrollReveal key={item.label} delay={i * 0.08}>
            <div className="brave-card h-full p-6 md:p-8">
              <item.icon className="mb-4 h-5 w-5 text-violet-glow" />
              <p className="label-caps mb-2">{item.label}</p>
              <p className="text-sm leading-relaxed text-ghost-white md:text-base">
                {item.value}
              </p>
            </div>
          </ScrollReveal>
        ))}
      </div>

      <ScrollReveal delay={0.2} className="mt-4">
        <div className="brave-card p-6 md:p-8">
          <div className="mb-4 flex items-center gap-2">
            <Heart className="h-4 w-4 text-violet-glow" />
            <p className="label-caps">
              {copy.results.businessUnderstanding.expectations}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.customerExpectations.map((exp) => (
              <span
                key={exp}
                className="rounded-full border border-border px-3 py-1.5 text-xs text-muted"
              >
                {exp}
              </span>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}
