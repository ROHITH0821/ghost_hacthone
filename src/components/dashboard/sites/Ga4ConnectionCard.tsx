"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Unlink,
  Wifi,
  WifiOff,
  AlertCircle,
} from "lucide-react";
import { LocalTime } from "@/components/ui/LocalTime";
import { Ga4PropertyPicker } from "./Ga4PropertyPicker";

type Ga4Status = {
  siteId?: string | null;
  configured: boolean;
  connected: boolean;
  connection: {
    id: string;
    propertyId: string;
    propertyName: string;
    streamId: string;
    hostname: string;
    timeZone: string;
    status: string;
    lastError: string | null;
    lastSyncedAt: string | null;
    lastAttemptAt: string | null;
    nextSyncAt: string | null;
  } | null;
};

export function Ga4ConnectionCard({ siteId, websiteUrl, auditFlow = false, onBusyChange }: {
  siteId?: string;
  websiteUrl?: string;
  auditFlow?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const popupRef = useRef<Window | null>(null);
  const pendingSiteRef = useRef<string | null>(null);
  const [status, setStatus] = useState<Ga4Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = siteId ? new URLSearchParams({ siteId }) : new URLSearchParams({ url: websiteUrl ?? "" });
      const res = await fetch(`/api/integrations/ga4/status?${params}`, { cache: "no-store" });
      if (res.ok) {
        setStatus(await res.json());
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to check GA4 status.");
      }
    } catch {
      setError("Failed to check GA4 status.");
    } finally {
      setLoading(false);
    }
  }, [siteId, websiteUrl]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const resolvedSiteId = siteId ?? status?.siteId ?? pendingSiteRef.current;

  useEffect(() => {
    onBusyChange?.(connecting || syncing || disconnecting || showPropertyPicker);
    return () => onBusyChange?.(false);
  }, [connecting, syncing, disconnecting, showPropertyPicker, onBusyChange]);

  useEffect(() => {
    if (!auditFlow) return;
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== popupRef.current || event.data?.type !== "ghost-ga4-result") return;
      if (event.data.siteId && event.data.siteId !== pendingSiteRef.current) return;
      popupRef.current?.close();
      popupRef.current = null;
      setConnecting(false);
      if (event.data.error) {
        setError(event.data.error === "denied" ? "Google access was declined. You can continue without Analytics." : "Google connection could not be completed. Please try again.");
      } else {
        setShowPropertyPicker(true);
      }
    };
    window.addEventListener("message", receive);
    const timer = window.setInterval(() => {
      if (popupRef.current?.closed) {
        popupRef.current = null;
        setConnecting(false);
        setError("Google sign-in was closed. Try again or continue without Analytics.");
      }
    }, 750);
    return () => { window.removeEventListener("message", receive); window.clearInterval(timer); popupRef.current?.close(); popupRef.current = null; };
  }, [auditFlow]);

  const handleConnect = async () => {
    // Open synchronously during the click to avoid popup blocking after the API request.
    if (auditFlow) {
      popupRef.current = window.open("about:blank", "ghost-ga4-connect", "popup,width=560,height=720");
      if (!popupRef.current) { setError("Allow pop-ups to connect Google Analytics, or continue without it."); return; }
    }
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/ga4/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: resolvedSiteId, url: websiteUrl, returnTo: auditFlow ? "audit" : undefined }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        if (auditFlow) {
          pendingSiteRef.current = data.siteId;
          if (popupRef.current && !popupRef.current.closed) popupRef.current.location.href = data.url;
          else setConnecting(false);
        } else window.location.href = data.url;
      } else {
        popupRef.current?.close(); popupRef.current = null;
        setError(data.error ?? "Failed to start Google connection.");
        setConnecting(false);
      }
    } catch {
      popupRef.current?.close(); popupRef.current = null;
      setError("Failed to start Google connection.");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Google Analytics? Your audits will continue to work without GA4 data.")) return;
    setDisconnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/ga4/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: resolvedSiteId }),
      });
      if (res.ok) {
        await fetchStatus();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to disconnect.");
      }
    } catch {
      setError("Failed to disconnect.");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/ga4/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: resolvedSiteId }),
      });
      if (res.ok) {
        await fetchStatus();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Sync failed.");
      }
    } catch {
      setError("Sync failed.");
    } finally {
      setSyncing(false);
    }
  };

  const handlePropertySelected = () => {
    setShowPropertyPicker(false);
    fetchStatus();
  };

  // Handle URL params from OAuth callback.
  useEffect(() => {
    if (auditFlow) return;
    const params = new URLSearchParams(window.location.search);
    const ga4Select = params.get("ga4_select");
    const ga4Error = params.get("ga4_error");
    if (ga4Select && ga4Select === siteId) {
      setShowPropertyPicker(true);
      // Clean up URL params.
      const url = new URL(window.location.href);
      url.searchParams.delete("ga4_select");
      window.history.replaceState({}, "", url.toString());
    }
    if (ga4Error) {
      const messages: Record<string, string> = {
        denied: "Google access was declined. Your website audits still work normally.",
        invalid_state: "This connection request expired or was already used. Try again.",
        no_refresh_token: "Google did not provide offline access. Please reconnect and approve access.",
        reconnect: "Google access expired. Please reconnect.",
      };
      setError(messages[ga4Error] ?? "Google Analytics connection failed.");
      const url = new URL(window.location.href);
      url.searchParams.delete("ga4_error");
      window.history.replaceState({}, "", url.toString());
    }
  }, [siteId, auditFlow]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-border bg-surface/40 p-6 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-midnight/80 text-ghost-white/70">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <p className="font-heading text-lg font-semibold text-ghost-white">Google Analytics</p>
            <p className="text-xs text-muted">Checking connection…</p>
          </div>
        </div>
      </section>
    );
  }

  if (!status?.configured) {
    if (!auditFlow && !error) return null;
    return <section className="rounded-xl border border-border bg-midnight/40 p-4 text-sm">
      <p className="font-medium text-ghost-white">Google Analytics · Optional</p>
      <p className="mt-2 text-muted-light" role={error ? "alert" : undefined}>{error || "Google Analytics is not available on this installation yet. You can start your website audit without it."}</p>
      {error && <button type="button" onClick={fetchStatus} className="mt-2 text-violet">Check again</button>}
    </section>;
  }

  const isConnected = status.connected && status.connection;
  const conn = status.connection;

  return (
    <>
      <section hidden={auditFlow && showPropertyPicker} className="rounded-2xl border border-border bg-surface/40 p-6 backdrop-blur-sm">
        <header className="mb-4 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-midnight/80 text-ghost-white/70">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-heading text-lg font-semibold text-ghost-white">Google Analytics</p>
            <p className="text-xs text-muted">
              {isConnected ? "Connected — available for this website’s audits" : "Optional — add real visitor data to audits"}
            </p>
          </div>
          {isConnected ? (
            <span className="flex items-center gap-1.5 rounded-full border border-neon-green/30 bg-neon-green/10 px-2.5 py-1 text-xs font-medium text-neon-green">
              <Wifi className="h-3 w-3" />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full border border-border bg-midnight/50 px-2.5 py-1 text-xs text-muted">
              <WifiOff className="h-3 w-3" />
              Not connected
            </span>
          )}
        </header>

        {error && (
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {isConnected && conn ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-midnight/40 p-4">
                <p className="label-caps text-muted">Property</p>
                <p className="mt-1 text-sm font-medium text-ghost-white/90">{conn.propertyName}</p>
                <p className="mt-0.5 text-xs text-muted">{conn.hostname}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-midnight/40 p-4">
                <p className="label-caps text-muted">Last synced</p>
                <p className="mt-1 text-sm text-ghost-white/90">
                  {conn.lastSyncedAt ? <LocalTime date={conn.lastSyncedAt} /> : "Never"}
                </p>
                {conn.lastError && (
                  <p className="mt-1 text-xs text-danger">{conn.lastError}</p>
                )}
              </div>
            </div>

            {auditFlow && <p className="text-xs text-muted-light">{conn.lastSyncedAt ? "The audit will use the latest available analytics snapshot." : "Analytics has not synced yet. Sync now to include traffic data, or continue with a website-only audit."}</p>}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing || connecting || disconnecting}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-surface/40 px-3 py-2 text-sm text-ghost-white/80 transition-colors hover:text-ghost-white disabled:opacity-50"
              >
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {syncing ? "Syncing…" : "Sync now"}
              </button>
              <button
                type="button"
                onClick={handleConnect}
                disabled={connecting || syncing || disconnecting}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-surface/40 px-3 py-2 text-sm text-ghost-white/80 transition-colors hover:text-ghost-white"
              >
                <ExternalLink className="h-4 w-4" />
                {conn.status === "error" ? "Reconnect" : "Change property"}
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting || connecting || syncing}
                className="flex items-center gap-1.5 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
              >
                {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-light leading-relaxed">
              Connect Google Analytics to give Ghost access to real website usage data.
              Your audits will include actual visitor counts, engagement rates, and traffic
              patterns — making recommendations more evidence-based and prioritized by real impact.
            </p>
            <button
              type="button"
              onClick={handleConnect}
              disabled={connecting}
              className="flex items-center gap-2 rounded-xl border border-violet/40 bg-violet/10 px-4 py-2.5 text-sm font-medium text-violet transition-all hover:border-violet/60 hover:bg-violet/15 disabled:opacity-50"
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {connecting ? "Connecting…" : "Connect Google Analytics"}
            </button>
          </div>
        )}
      </section>

      {showPropertyPicker && resolvedSiteId && (
        <Ga4PropertyPicker
          siteId={resolvedSiteId}
          inline={auditFlow}
          onClose={() => setShowPropertyPicker(false)}
          onSelected={handlePropertySelected}
        />
      )}
    </>
  );
}
