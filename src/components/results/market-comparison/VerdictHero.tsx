"use client";

import type { MarketComparisonViewModel } from "@/lib/competitor-intelligence/comparison-view-model";
import { copy } from "@/lib/copy";
import { ShieldAlert, ShieldCheck, Zap } from "lucide-react";

export function VerdictHero({ view }: { view: MarketComparisonViewModel }) {
  const { verdict } = view;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-surface-elevated/90 to-surface/90 p-6 backdrop-blur-md shadow-2xl md:p-8">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet/15 text-violet border border-violet/30">
            <Zap className="h-3.5 w-3.5" />
          </span>
          <p className="label-caps tracking-widest text-violet-glow/90 font-mono">
            {copy.marketIntelligence.verdictTitle}
          </p>
        </div>

        <h3 className="mt-3 font-heading text-2xl font-bold leading-tight text-ghost-white md:text-3xl lg:text-4xl tracking-tight">
          {verdict.headline}
        </h3>

        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-light md:text-base">
          {verdict.support}
        </p>

        {(verdict.behind.length > 0 || verdict.ahead.length > 0) && (
          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            {verdict.behind.length > 0 && (
              <div className="rounded-xl border border-danger/25 bg-danger/5 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 pb-3 border-b border-danger/15">
                  <ShieldAlert className="h-4 w-4 text-danger" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-danger">
                    Market Disadvantage ({verdict.behind.length})
                  </p>
                </div>
                <ul className="mt-3 space-y-2 text-sm text-ghost-white/95">
                  {verdict.behind.map((item) => (
                    <li
                      key={item.featureId}
                      className="flex items-center justify-between gap-3 rounded-lg bg-midnight/50 px-3 py-2 border border-danger/10"
                    >
                      <span className="font-medium text-xs md:text-sm">{item.label}</span>
                      <span className="font-mono text-xs font-semibold text-danger/90">
                        {Math.round(item.confidence * 100)}% conf.
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {verdict.ahead.length > 0 && (
              <div className="rounded-xl border border-neon-green/25 bg-neon-green/5 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 pb-3 border-b border-neon-green/15">
                  <ShieldCheck className="h-4 w-4 text-neon-green" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-neon-green">
                    Competitive Advantage ({verdict.ahead.length})
                  </p>
                </div>
                <ul className="mt-3 space-y-2 text-sm text-ghost-white/95">
                  {verdict.ahead.map((item) => (
                    <li
                      key={item.featureId}
                      className="flex items-center justify-between gap-3 rounded-lg bg-midnight/50 px-3 py-2 border border-neon-green/10"
                    >
                      <span className="font-medium text-xs md:text-sm">{item.label}</span>
                      <span className="font-mono text-xs font-semibold text-neon-green/90">
                        {Math.round(item.confidence * 100)}% conf.
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

