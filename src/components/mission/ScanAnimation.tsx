"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { MissionStage, MissionState } from "@/lib/types";
import { copy } from "@/lib/copy";

interface ScanAnimationProps {
  url: string;
  domain: string;
  missionId: string;
  active: boolean;
  currentStage: MissionStage;
  stageProgress: number;
  mission?: MissionState;
}

export function ScanAnimation({
  url,
  domain,
  missionId,
  active,
  currentStage,
  stageProgress,
  mission,
}: ScanAnimationProps) {
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

  const targetUrl = url.startsWith("http") ? url : `https://${url}`;

  // Prefer preview data embedded in mission state (no extra call). Fallback to polling.
  useEffect(() => {
    if (!active) return;
    if (mission?.previewImageUrl) setScreenshotUrl(mission.previewImageUrl);
  }, [active, mission?.previewImageUrl]);

  // Poll for THIS mission's real homepage screenshot (captured during the crawl).
  useEffect(() => {
    if (!active) return;
    if (mission?.previewImageUrl) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let tries = 0;
    const MAX_TRIES = 40; // ~60s safety net

    const poll = async () => {
      if (cancelled) return;
      tries += 1;
      try {
        const res = await fetch(
          `/api/site-preview?missionId=${encodeURIComponent(missionId)}&url=${encodeURIComponent(targetUrl)}`
        );
        const data = await res.json();
        if (!cancelled && data.imageUrl) {
          setScreenshotUrl(data.imageUrl as string);
          return; // stop polling — we're live
        }
      } catch {
        // transient — retry
      }
      if (!cancelled && tries < MAX_TRIES) {
        timer = setTimeout(poll, 1500);
      }
    };

    timer = setTimeout(poll, 700);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active, mission?.previewImageUrl, missionId, targetUrl]);

  const terminalLines = (() => {
    const lines = mission?.progressLog?.slice(-6).map((l) => l.message) ?? [];
    if (lines.length > 0) return lines;
    return [`${copy.mission.missionProgress}: ${currentStage} (${stageProgress}%)`];
  })();

  if (!active) return null;

  const showPreview = !!screenshotUrl;
  const isLive = showPreview && stageProgress >= 15;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet/20 bg-navy/60">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-violet/10 px-4 py-3">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-danger/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-warning/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-neon-green/60 animate-pulse" />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md bg-midnight/80 px-3 py-1.5 font-mono text-xs">
          <span className="text-muted">{copy.common.urlPrefix}</span>
          <span className="truncate text-ghost-white/70">{domain}</span>
        </div>
        {isLive && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5 rounded-full border border-neon-green/30 bg-neon-green/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neon-green"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon-green" />
            {copy.common.live}
          </motion.span>
        )}
      </div>

      {/* Viewport */}
      <div className="relative aspect-[16/10] overflow-hidden bg-midnight">
        {/* Real crawled screenshot (only when available) */}
        {screenshotUrl ? (
          <motion.img
            src={screenshotUrl}
            alt={copy.scan.previewAlt(domain)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.92 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 pointer-events-none w-full select-none object-cover object-top"
          />
        ) : (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-midnight/95 p-8 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-violet/20 border-t-violet" />
            <p className="font-mono text-sm text-ghost-white/80">
              Waiting for homepage snapshot…
            </p>
            <p className="font-mono text-xs text-muted">{domain}</p>
          </div>
        )}

        {/* Scan grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-15"
          style={{
            backgroundImage:
              "linear-gradient(rgba(120, 222, 197, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(120, 222, 197, 0.06) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* NOTE: Removed bounding boxes, fake scan line, and random counters to keep UI strictly real-work-driven. */}

        {/* Vignette */}
        <div className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(3,3,8,0.4)_100%)]" />
      </div>

      {/* Terminal */}
      <div className="border-t border-violet/10 bg-midnight/90 p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted">
            {copy.scan.terminalLabel}
          </span>
          <span className="h-1 w-1 animate-pulse rounded-full bg-neon-green" />
        </div>
        <div className="min-h-[72px] space-y-1 font-mono text-[10px] sm:text-xs">
          {terminalLines.slice(0, -1).map((line, i) => (
            <p key={`${i}-${line}`} className="flex items-center gap-2 text-muted/60">
              <span className="text-neon-green/40">{copy.scan.terminalPrompt}</span>
              {line}
            </p>
          ))}
          <p className="flex items-center gap-2 break-words text-ai-blue">
            <span className="text-neon-green/70">{copy.scan.terminalPrompt}</span>
            <span>
              {terminalLines[terminalLines.length - 1] ?? ""}
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="ml-0.5 inline-block h-3 w-1.5 bg-ai-blue/80"
              />
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
