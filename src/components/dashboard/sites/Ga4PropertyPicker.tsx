"use client";

import { useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, Check, CheckCircle2, Globe, Loader2, X } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";

type Stream = { id: string; name: string; url: string; matches?: boolean };
type Property = { id: string; name: string; account: string; streams: Stream[] };

export function Ga4PropertyPicker({
  siteId,
  onClose,
  onSelected,
  inline = false,
}: {
  siteId: string;
  inline?: boolean;
  onClose: () => void;
  onSelected: () => void;
}) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [siteDomain, setSiteDomain] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<{ property: Property; stream: Stream } | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/integrations/ga4/properties?siteId=${siteId}`);
        if (res.ok) {
          const data = await res.json();
          setProperties(data.properties ?? []);
          setSiteDomain(data.siteDomain ?? "");
        } else {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Failed to load properties.");
        }
      } catch {
        setError("Failed to load properties.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [siteId]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);

    // Extract hostname from the stream URL.
    let hostname = "";
    try {
      hostname = new URL(selected.stream.url.includes("://") ? selected.stream.url : `https://${selected.stream.url}`).hostname;
    } catch {
      hostname = selected.stream.url;
    }

    try {
      const res = await fetch("/api/integrations/ga4/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          propertyId: selected.property.id,
          propertyName: selected.property.name,
          streamId: selected.stream.id,
          hostname,
          timeZone: "UTC",
        }),
      });
      if (res.ok) {
        onSelected();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to save property.");
      }
    } catch {
      setError("Failed to save property.");
    } finally {
      setSaving(false);
    }
  };

  const propertiesWithStreams = properties.filter((p) => p.streams.length > 0);
  const hasMatching = propertiesWithStreams.some((p) => p.streams.some((s) => s.matches));
  const selectedMismatched = selected && selected.stream.matches === false;

  const content = (
      <div className="max-h-[80dvh] overflow-y-auto p-6">
        <div className="flex items-center justify-between gap-3 mb-5">
          <h2 id="ga4-picker-title" className="font-heading text-xl font-semibold text-ghost-white">
            Select GA4 Property
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-muted-light hover:text-ghost-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-3 text-sm text-muted-light">
          Choose the Google Analytics 4 property that corresponds to this website.
          Ghost will use data from this property to enhance your audit insights.
        </p>

        {siteDomain && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-violet/20 bg-violet/5 px-3 py-2 text-xs text-violet">
            <Globe className="h-3.5 w-3.5 shrink-0" />
            <span>
              Looking for properties matching <strong>{siteDomain}</strong>
            </span>
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {selectedMismatched && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-amber-400">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              This property tracks a different domain than your site ({siteDomain}).
              The server will reject this selection if the domains don&apos;t match.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted" />
          </div>
        ) : propertiesWithStreams.length === 0 ? (
          <div className="rounded-xl border border-border bg-midnight/40 p-6 text-center">
            <Globe className="mx-auto h-8 w-8 text-muted" />
            <p className="mt-3 text-sm font-medium text-ghost-white">No GA4 properties found</p>
            <p className="mt-1 text-xs text-muted">
              Your Google account doesn&apos;t have access to any GA4 properties with web data streams.
              Make sure you have the correct Google account and that GA4 is set up for your website.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Show matching properties first, then non-matching */}
            {hasMatching && (
              <p className="label-caps text-xs text-neon-green/80 mb-1">Matching properties</p>
            )}
            {propertiesWithStreams.map((property) =>
              property.streams
                .filter((s) => !hasMatching || s.matches)
                .map((stream) => {
                  const isSelected =
                    selected?.property.id === property.id && selected?.stream.id === stream.id;
                  return (
                    <button
                      key={`${property.id}-${stream.id}`}
                      type="button"
                      onClick={() => setSelected({ property, stream })}
                      className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                        isSelected
                          ? "border-violet/50 bg-violet/10"
                          : "border-border/60 bg-midnight/40 hover:border-border-hover"
                      }`}
                    >
                      <div
                        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                          isSelected ? "border-violet bg-violet/20" : "border-border"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-violet" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-ghost-white">{property.name}</p>
                          {stream.matches && (
                            <span className="flex items-center gap-1 rounded-full border border-neon-green/30 bg-neon-green/10 px-2 py-0.5 text-[10px] font-medium text-neon-green">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              Domain match
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted">{stream.url || stream.name}</p>
                        <p className="mt-0.5 text-xs text-muted/70">
                          {property.account} · Property ID: {property.id}
                        </p>
                      </div>
                    </button>
                  );
                }),
            )}

            {/* Show non-matching properties in a collapsed section */}
            {hasMatching && propertiesWithStreams.some((p) => p.streams.some((s) => !s.matches)) && (
              <>
                <details className="mt-4">
                  <summary className="label-caps text-xs text-muted cursor-pointer hover:text-muted-light">
                    Other properties (different domain)
                  </summary>
                  <div className="mt-2 space-y-2">
                    {propertiesWithStreams.map((property) =>
                      property.streams
                        .filter((s) => !s.matches)
                        .map((stream) => {
                          const isSelected =
                            selected?.property.id === property.id && selected?.stream.id === stream.id;
                          return (
                            <button
                              key={`other-${property.id}-${stream.id}`}
                              type="button"
                              onClick={() => setSelected({ property, stream })}
                              className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors opacity-70 ${
                                isSelected
                                  ? "border-amber-400/50 bg-amber-400/10 opacity-100"
                                  : "border-border/40 bg-midnight/30 hover:border-border/60 hover:opacity-90"
                              }`}
                            >
                              <div
                                className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                                  isSelected ? "border-amber-400 bg-amber-400/20" : "border-border"
                                }`}
                              >
                                {isSelected && <Check className="h-3 w-3 text-amber-400" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-ghost-white">{property.name}</p>
                                  <span className="flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                                    <AlertTriangle className="h-2.5 w-2.5" />
                                    Different domain
                                  </span>
                                </div>
                                <p className="mt-0.5 text-xs text-muted">{stream.url || stream.name}</p>
                                <p className="mt-0.5 text-xs text-muted/70">
                                  {property.account} · Property ID: {property.id}
                                </p>
                              </div>
                            </button>
                          );
                        }),
                    )}
                  </div>
                </details>
              </>
            )}

            {/* When there are NO matching streams at all, show all as normal */}
            {!hasMatching && siteDomain && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <p>
                  None of these properties match <strong>{siteDomain}</strong>.
                  Make sure you&apos;re logged into the Google account that manages GA4 for this website.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted-light transition-colors hover:text-ghost-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!selected || saving}
            className="flex items-center gap-2 rounded-xl border border-violet/40 bg-violet/10 px-4 py-2.5 text-sm font-medium text-violet transition-all hover:bg-violet/15 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Connecting and syncing…" : "Connect Property"}
          </button>
        </div>
      </div>
  );
  return inline ? <section aria-labelledby="ga4-picker-title" className="rounded-xl border border-violet/30">{content}</section> : (
    <Dialog open onClose={onClose} labelledBy="ga4-picker-title" className="max-w-lg" busy={saving}>{content}</Dialog>
  );
}

