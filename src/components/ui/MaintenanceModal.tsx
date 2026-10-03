"use client";

import { motion, AnimatePresence } from "framer-motion";
import { GhostLogo } from "@/components/ui/GhostLogo";
import { copy } from "@/lib/copy";
import { EASE_SMOOTH } from "@/lib/motion";

const ENGINE_OFFLINE_CODE = "ENGINE_OFFLINE";

export function isEngineOfflinePayload(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const obj = data as { code?: string; error?: string };
  return (
    obj.code === ENGINE_OFFLINE_CODE ||
    obj.error === copy.authApi.engineOffline ||
    obj.error === ENGINE_OFFLINE_CODE
  );
}

export function MaintenanceModal({
  open,
  onClose,
  url,
}: {
  open: boolean;
  onClose: () => void;
  url?: string;
}) {
  const m = copy.maintenance;
  const displayUrl = url?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? "";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center section-pad p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-midnight/80 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="maintenance-title"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.45, ease: EASE_SMOOTH }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-border bg-surface/90 shadow-[0_40px_100px_rgba(0,0,0,0.55)] backdrop-blur-xl"
          >
            {/* Soft glow */}
            <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-violet/20 blur-[80px]" />

            <div className="relative px-8 pb-8 pt-10 text-center">
              <motion.div
                animate={{ y: [0, -6, 0], opacity: [0.55, 0.85, 0.55] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="mx-auto mb-6 flex justify-center opacity-70"
              >
                <GhostLogo size="lg" linked={false} className="opacity-80" />
              </motion.div>

              <p className="label-caps text-violet-glow/80">{m.eyebrow}</p>

              <h2
                id="maintenance-title"
                className="mt-3 font-heading text-2xl font-bold text-ghost-white md:text-3xl"
              >
                {m.title}
              </h2>
              <p className="mt-1 font-heading text-lg text-ghost-white/50">
                {m.titleAccent}
              </p>

              <p className="mt-5 text-sm leading-relaxed text-muted-light">
                {displayUrl ? m.bodyWithUrl(displayUrl) : m.body}
              </p>

              <div className="mt-6 rounded-2xl border border-border/70 bg-midnight/50 px-4 py-3 text-left">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-muted">{m.statusLabel}</span>
                  <span className="inline-flex items-center gap-2 font-medium text-warning">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning" />
                    {m.statusValue}
                  </span>
                </div>
                {displayUrl && (
                  <p className="mt-2 truncate font-mono text-[11px] text-ghost-white/60">
                    {displayUrl}
                  </p>
                )}
              </div>

              <p className="mt-4 text-xs text-muted">{m.hint}</p>

              <button
                type="button"
                onClick={onClose}
                className="mt-8 w-full rounded-2xl bg-violet py-3.5 font-heading font-semibold text-white transition-colors hover:bg-violet-dim"
              >
                {m.dismiss}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
