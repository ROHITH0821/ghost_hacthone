"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { MissionState, ShopperPersona } from "@/lib/types";
import { TypingText } from "@/components/ui/TypingText";
import { copy } from "@/lib/copy";

interface PersonaCardsProps {
  personas: ShopperPersona[];
  mission?: MissionState;
  show: boolean;
}

export function PersonaCards({ personas, mission, show }: PersonaCardsProps) {
  if (!show) return null;

  const snippets = mission?.customerSnippets ?? [];
  const flows = mission?.detectedFlows ?? [];

  return (
    <div className="space-y-3">
      <p className="label-caps mb-4">{copy.mission.shoppersActive}</p>

      {flows.length > 0 && (
        <div className="brave-card mb-4 p-4">
          <p className="mb-2 font-mono text-xs uppercase tracking-wider text-muted">
            Detected customer flows
          </p>
          <div className="flex flex-wrap gap-2">
            {flows.slice(0, 8).map((f) => (
              <span
                key={f.id}
                className="rounded-full border border-ghost-white/10 bg-ghost-black/30 px-3 py-1 text-xs text-ghost-white/70"
                title={f.goal}
              >
                {f.name} · w{f.revenue_weight}
              </span>
            ))}
          </div>
        </div>
      )}

      {snippets.length > 0 && (
        <div className="space-y-3">
          <p className="label-caps">{copy.mission.missionProgress}</p>
          {snippets.slice(-6).map((s) => (
            <div key={`${s.flowId}-${s.droppedAt}`} className="brave-card p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-heading text-sm font-semibold text-ghost-white">
                  {s.flowName}
                </p>
                <p className="font-mono text-xs text-ghost-white/50">{s.outcome}</p>
              </div>
              {s.steps.length > 0 && (
                <div className="mt-2 space-y-1">
                  {s.steps.map((step, i) => (
                    <p key={i} className="font-mono text-xs text-muted">
                      {step.action} → {step.page}
                    </p>
                  ))}
                </div>
              )}
              {s.outcome !== "completed" && (
                <p className="mt-2 text-xs text-ghost-white/40">
                  Dropped at: {s.droppedAt}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <AnimatePresence>
          {personas.map((persona, index) => (
            <motion.div
              key={persona.id}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: index * 0.15, duration: 0.4 }}
            >
              <div className="brave-card relative overflow-hidden p-4">
                {/* Persona cards are decorative; avoid fake progress as a primary signal. */}

                <div className="flex items-start gap-3">
                  <motion.div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
                    style={{ backgroundColor: `${persona.color}15` }}
                  >
                    {persona.avatar}
                  </motion.div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-ghost-white truncate">
                        {persona.name}
                      </h4>
                      <div
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: persona.color }}
                      />
                    </div>
                    <p className="text-xs text-ghost-white/40">
                      {persona.status}
                    </p>
                    <p className="mt-1 text-xs text-ghost-white/25">
                      {copy.common.locationPrefix}
                      {persona.location}
                    </p>

                    <div className="mt-2 rounded-lg bg-midnight/50 p-2">
                      <p className="text-xs text-ghost-white/50 italic leading-relaxed">
                        &ldquo;
                        <TypingText
                          text={persona.thought}
                          speed={25}
                          showCursor={false}
                        />
                        &rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
