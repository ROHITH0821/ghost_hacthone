"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { GhostReport, MissionState } from "@/lib/types";
import { FeedbackState } from "@/components/ui/FeedbackState";
import type { ReportViewMode } from "@/lib/entitlements/report-access";
import { MissionDashboard } from "@/components/mission/MissionDashboard";
import { copy } from "@/lib/copy";
import { redirectToLogin } from "@/lib/auth/redirect-to-login";

interface MissionPageClientProps {
  missionId: string;
}

const POLL_MIN_MS = 1000;
const POLL_MAX_MS = 2500;

export function MissionPageClient({ missionId }: MissionPageClientProps) {
  const [mission, setMission] = useState<MissionState | null>(null);
  const [report, setReport] = useState<GhostReport | null>(null);
  const [viewMode, setViewMode] = useState<ReportViewMode>("free");
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setError(false);
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let delay = POLL_MIN_MS;

    const fetchReport = async (): Promise<boolean> => {
      try {
        const res = await fetch(`/api/reports/${missionId}`, {
          cache: "default",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.report) {
            if (!cancelled) { setReport(data.report); setViewMode(data.viewMode ?? "free"); }
            return true;
          }
        }
      } catch {
        // transient — retry on the next poll
      }
      return false;
    };

    const poll = async () => {
      try {
        const res = await fetch(`/api/analyze?missionId=${missionId}`, {
          cache: "no-store",
        });
        if (res.status === 401) {
          redirectToLogin(router, {
            redirect: `/mission/${missionId}`,
          });
          return;
        }
        if (!res.ok) {
          if (!cancelled) setError(true);
          return;
        }
        const data = await res.json();
        if (!cancelled) setMission(data.mission);

        if (data.mission.status === "complete") {
          const got = await fetchReport();
          if (got || cancelled) return;
          // Report write can race — keep polling, but back off.
          delay = Math.min(POLL_MAX_MS, delay + 250);
        } else if (data.mission.status === "error") {
          return;
        } else {
          delay = Math.min(POLL_MAX_MS, delay + 250);
        }
      } catch {
        if (!cancelled) setError(true);
        return;
      }

      if (!cancelled) {
        timer = setTimeout(() => {
          void poll();
        }, delay);
      }
    };

    void poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [missionId, router, attempt]);

  if (error) return <main id="main-content" className="mx-auto max-w-xl px-6 py-24"><FeedbackState title="Audit progress is unavailable" description="Your connection may have been interrupted, or this audit may no longer be accessible." onRetry={() => setAttempt(n => n + 1)} /></main>;

  if (!mission) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet/30 border-t-violet" />
      </div>
    );
  }

  return <MissionDashboard mission={mission} report={report} viewMode={viewMode} />;
}
