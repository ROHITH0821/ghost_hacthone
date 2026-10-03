"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Ga4ConnectionCard } from "@/components/dashboard/sites/Ga4ConnectionCard";
import { Dialog } from "@/components/ui/Dialog";
import { normalizeWebsiteInput } from "@/lib/website-input";
import { Button } from "@/components/ui/Button";
import type { AuditOption } from "@/lib/db/entitlements";
import type { FixStatusRow } from "@/lib/db/fix-workflow";
import {
  PLAN_IDS,
  PRODUCT_METADATA,
  PRODUCT_PRICES_INR,
  auditDepthKind,
  type PlanId,
  type ProductChoice,
} from "@/lib/plans";
import { copy } from "@/lib/copy";
import { useDashboard } from "@/components/dashboard/shell/DashboardContext";
import { useNewAudit } from "./NewAuditContext";

type ClientOption = { id: string; name: string; primaryDomain: string };

type Step = 1 | 2 | 3 | 4;

type AuditContext = {
  primaryGoal?: string;
  targetAudience?: string;
  importantPage?: string;
  competitorHints?: string;
  selectedFixIds?: string[];
};

type RescanMeta = {
  baselineMissionId: string | null;
  baselineLabel: string | null;
  rescansRemaining: number;
  rescansExpiresAt: string | null;
  siteId: string | null;
};

const STEPS: Step[] = [1, 2, 3, 4];

export function NewAuditModal() {
  const { open, initialUrl, initialSiteId, initialClientId, preset, closeNewAudit } =
    useNewAudit();
  const { isAgencyUser } = useDashboard();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [url, setUrl] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [bindConfirmed, setBindConfirmed] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [options, setOptions] = useState<AuditOption[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<ProductChoice | null>(null);
  const [context, setContext] = useState<AuditContext>({});
  const [analyticsBusy, setAnalyticsBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchasePending, setPurchasePending] = useState(false);
  const [rescanMeta, setRescanMeta] = useState<RescanMeta | null>(null);
  const [implementedFixes, setImplementedFixes] = useState<FixStatusRow[]>([]);
  const [selectedFixIds, setSelectedFixIds] = useState<string[]>([]);
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  const isRescan = selectedChoice === "rescan";

  useEffect(() => {
    if (open) {
      idempotencyKeyRef.current = crypto.randomUUID();
      setStep(1);
      setAnalyticsBusy(false);
      setUrl(initialUrl);
      setBusinessName("");
      setAuthorized(preset === "rescan");
      setBindConfirmed(false);
      setClientId(initialClientId);
      setClients([]);
      setOptions([]);
      setSelectedChoice(null);
      setContext({});
      setError(null);
      setPurchasePending(false);
      setRescanMeta(null);
      setImplementedFixes([]);
      setSelectedFixIds([]);
    }
  }, [open, initialUrl, initialClientId, preset]);

  useEffect(() => {
    if (!open || !isAgencyUser) return;
    fetch("/api/dashboard/clients")
      .then((res) => (res.ok ? res.json() : { clients: [] }))
      .then((data) => setClients(data.clients ?? []))
      .catch(() => setClients([]));
  }, [open, isAgencyUser]);

  const selectedOption = useMemo(
    () => options.find((o) => o.id === selectedChoice) ?? null,
    [options, selectedChoice]
  );

  const selectedPlanId = selectedOption?.planId ?? PLAN_IDS.free;
  const reviewMeta = PRODUCT_METADATA[selectedPlanId as PlanId];
  const bindsOnStart = selectedOption?.bindsOnStart === true;
  const displayDomain = url.replace(/^https?:\/\//, "").split("/")[0];
  const depthKind = auditDepthKind({
    auditType: selectedOption?.auditType,
    planId: selectedPlanId,
  });
  const depthCopy = copy.auditDepth[depthKind];

  if (!open) return null;

  async function loadOptions(targetUrl: string) {
    const res = await fetch(`/api/dashboard/audit-options?url=${encodeURIComponent(targetUrl)}`);
    if (!res.ok) throw new Error("Could not load audit options");
    const data = await res.json();
    setOptions(data.options ?? []);
    setRescanMeta(data.rescanMeta ?? null);

    const opts = data.options ?? [];
    if (preset === "rescan") {
      const rescanOpt = opts.find((o: AuditOption) => o.id === "rescan");
      if (rescanOpt) setSelectedChoice("rescan");
      else if (opts[0]) setSelectedChoice(opts[0].id);
    } else if (opts[0]) {
      setSelectedChoice(opts[0].id);
    }
  }

  async function loadImplementedFixes(siteId: string) {
    const res = await fetch(
      `/api/dashboard/fixes?siteId=${encodeURIComponent(siteId)}&status=implemented`
    );
    if (!res.ok) return;
    const data = await res.json();
    const fixes = (data.fixes ?? []) as FixStatusRow[];
    setImplementedFixes(fixes);
    setSelectedFixIds(fixes.map((f) => f.id));
  }

  async function handlePurchase() {
    if (!selectedOption?.requiresPurchase || !url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedOption.planId,
          domain: url.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? copy.newAudit.errors.purchaseFailed);
        return;
      }
      await loadOptions(url.trim());
      setPurchasePending(false);
      setStep(3);
    } catch {
      setError(copy.newAudit.errors.purchaseFailed);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartAudit() {
    if (!url.trim() || !selectedChoice) return;
    setLoading(true);
    setError(null);
    try {
      const auditContext: AuditContext = { ...context };
      if (isRescan && selectedFixIds.length) {
        auditContext.selectedFixIds = selectedFixIds;
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          idempotencyKey: idempotencyKeyRef.current,
          businessName: businessName.trim() || undefined,
          authorized,
          bindConfirmed: bindsOnStart ? bindConfirmed : undefined,
          productChoice: selectedChoice,
          auditType: selectedOption?.auditType,
          context: Object.keys(auditContext).length ? auditContext : undefined,
          baselineMissionId: isRescan ? rescanMeta?.baselineMissionId : undefined,
          clientId: clientId ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? copy.newAudit.errors.startFailed);
        return;
      }
      closeNewAudit();
      if (data.missionId) router.push(`/mission/${data.missionId}`);
    } catch {
      setError(copy.newAudit.errors.startFailed);
    } finally {
      setLoading(false);
    }
  }

  async function goNext() {
    setError(null);
    if (step === 1) {
      const normalized = normalizeWebsiteInput(url);
      if (!normalized) {
        setError(copy.newAudit.errors.urlRequired);
        return;
      }
      if (!authorized) {
        setError(copy.newAudit.errors.authRequired);
        return;
      }
      setUrl(normalized);
      setLoading(true);
      try {
        await loadOptions(normalized);
        if (preset === "rescan") {
          setStep(2);
        } else {
          setStep(2);
        }
      } catch {
        setError(copy.newAudit.errors.optionsFailed);
      } finally {
        setLoading(false);
      }
      return;
    }
    if (step === 2) {
      if (!selectedChoice) {
        setError(copy.newAudit.errors.choiceRequired);
        return;
      }
      if (selectedOption?.action === "purchase") {
        setPurchasePending(true);
        setStep(4);
        return;
      }
      const siteId = rescanMeta?.siteId ?? initialSiteId;
      if (selectedChoice === "rescan" && siteId) {
        await loadImplementedFixes(siteId);
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      setStep(4);
      return;
    }
    if (step === 4) {
      if (purchasePending) {
        await handlePurchase();
        return;
      }
      if (bindsOnStart && !bindConfirmed) {
        setError(copy.newAudit.errors.bindRequired);
        return;
      }
      await handleStartAudit();
    }
  }

  function goBack() {
    setError(null);
    if (step === 4 && purchasePending) {
      setPurchasePending(false);
      setStep(2);
      return;
    }
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  function toggleFix(id: string) {
    setSelectedFixIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const primaryLabel =
    step === 4
      ? purchasePending
        ? copy.newAudit.actions.continueToPayment
        : isRescan
          ? copy.newAudit.actions.startVerification
          : copy.newAudit.actions.startAudit
      : copy.newAudit.actions.continue;

  return (
    <Dialog open={open} onClose={closeNewAudit} labelledBy="audit-dialog-title" busy={loading || analyticsBusy}>
      <div className="flex max-h-[90dvh] flex-col">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 id="audit-dialog-title" className="font-heading text-lg font-semibold text-ghost-white">
              {copy.newAudit.title}
            </h2>
            <p className="text-xs text-muted">
              {copy.newAudit.stepLabel(step, STEPS.length)} · {["Website", "Audit depth", "Your goals", "Review & start"][step - 1]}
            </p>
          </div>
          <button
            type="button"
            onClick={closeNewAudit}
            disabled={loading || analyticsBusy}
            className="rounded-lg p-2 text-muted-light hover:text-ghost-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {step === 1 && (
            <div className="space-y-4">
              {isAgencyUser && clients.length > 0 && preset !== "rescan" && (
                <label className="block">
                  <span className="text-sm text-muted-light">{copy.newAudit.fields.client}</span>
                  <select
                    value={clientId ?? ""}
                    onChange={(e) => {
                      const id = e.target.value || null;
                      setClientId(id);
                      const client = clients.find((c) => c.id === id);
                      if (client) {
                        setUrl(`https://${client.primaryDomain}`);
                        setBusinessName(client.name);
                      }
                    }}
                    className="mt-2 w-full rounded-xl border border-border/60 bg-midnight/40 px-4 py-3 text-ghost-white outline-none focus:border-violet/40"
                  >
                    <option value="">Select a client (optional)</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.primaryDomain}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block">
                <span className="text-sm text-muted-light">{copy.newAudit.fields.url}</span>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  readOnly={preset === "rescan"}
                  className="mt-2 w-full rounded-xl border border-border/60 bg-midnight/40 px-4 py-3 text-ghost-white outline-none focus:border-violet/40 read-only:opacity-70"
                />
              </label>
              {!isRescan && (
                <label className="block">
                  <span className="text-sm text-muted-light">{copy.newAudit.fields.businessName}</span>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder={copy.newAudit.fields.businessNamePlaceholder}
                    className="mt-2 w-full rounded-xl border border-border/60 bg-midnight/40 px-4 py-3 text-ghost-white outline-none focus:border-violet/40"
                  />
                </label>
              )}
              <label className="flex items-start gap-3 rounded-xl border border-border/60 bg-midnight/40 p-4">
                <input
                  type="checkbox"
                  checked={authorized}
                  onChange={(e) => setAuthorized(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-violet"
                />
                <span className="text-sm text-muted-light">{copy.newAudit.fields.authorization}</span>
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {options.length === 0 ? (
                <p className="text-sm text-muted">{copy.newAudit.noOptions}</p>
              ) : (
                options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedChoice(opt.id)}
                    aria-pressed={selectedChoice === opt.id}
                    className={`w-full rounded-xl border p-4 text-left transition-colors ${
                      selectedChoice === opt.id
                        ? "border-violet/50 bg-violet/10"
                        : "border-border/60 bg-midnight/40 hover:border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-ghost-white">{opt.title}</p>
                        <p className="mt-1 text-sm text-muted">{opt.description}</p>
                      </div>
                      {opt.priceInr != null && opt.priceInr > 0 && (
                        <span className="shrink-0 text-sm font-medium text-violet">
                          ₹{opt.priceInr}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-light">Optional context helps Ghost focus on what matters to your business. Leave a field blank to use the website evidence.</p>
              {isRescan ? (
                <>
                  <div>
                    <p className="text-sm font-medium text-ghost-white">
                      {copy.newAudit.rescan.implementedFixes}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {copy.newAudit.rescan.implementedFixesHint}
                    </p>
                  </div>
                  {implementedFixes.length === 0 ? (
                    <p className="text-sm text-muted">{copy.newAudit.rescan.noImplementedFixes}</p>
                  ) : (
                    <ul className="space-y-2">
                      {implementedFixes.map((fix) => (
                        <li key={fix.id}>
                          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-midnight/40 p-3">
                            <input
                              type="checkbox"
                              checked={selectedFixIds.includes(fix.id)}
                              onChange={() => toggleFix(fix.id)}
                              className="mt-1 h-4 w-4 accent-violet"
                            />
                            <span className="text-sm text-ghost-white/90">{fix.title}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                  <label className="block">
                    <span className="text-sm text-muted-light">{copy.newAudit.fields.importantPage}</span>
                    <input
                      type="text"
                      value={context.importantPage ?? ""}
                      onChange={(e) => setContext((c) => ({ ...c, importantPage: e.target.value }))}
                      placeholder="/pricing"
                      className="mt-2 w-full rounded-xl border border-border/60 bg-midnight/40 px-4 py-3 text-ghost-white outline-none"
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="block">
                    <span className="text-sm text-muted-light">{copy.newAudit.fields.primaryGoal}</span>
                    <input
                      type="text"
                      value={context.primaryGoal ?? ""}
                      onChange={(e) => setContext((c) => ({ ...c, primaryGoal: e.target.value }))}
                      className="mt-2 w-full rounded-xl border border-border/60 bg-midnight/40 px-4 py-3 text-ghost-white outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm text-muted-light">{copy.newAudit.fields.audience}</span>
                    <input
                      type="text"
                      value={context.targetAudience ?? ""}
                      onChange={(e) => setContext((c) => ({ ...c, targetAudience: e.target.value }))}
                      className="mt-2 w-full rounded-xl border border-border/60 bg-midnight/40 px-4 py-3 text-ghost-white outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm text-muted-light">{copy.newAudit.fields.importantPage}</span>
                    <input
                      type="text"
                      value={context.importantPage ?? ""}
                      onChange={(e) => setContext((c) => ({ ...c, importantPage: e.target.value }))}
                      placeholder="/pricing"
                      className="mt-2 w-full rounded-xl border border-border/60 bg-midnight/40 px-4 py-3 text-ghost-white outline-none"
                    />
                  </label>
                  {selectedPlanId === PLAN_IDS.deep999 && (
                    <label className="block">
                      <span className="text-sm text-muted-light">{copy.newAudit.fields.competitorHints}</span>
                      <textarea
                        value={context.competitorHints ?? ""}
                        onChange={(e) => setContext((c) => ({ ...c, competitorHints: e.target.value }))}
                        rows={3}
                        className="mt-2 w-full rounded-xl border border-border/60 bg-midnight/40 px-4 py-3 text-ghost-white outline-none"
                      />
                    </label>
                  )}
                </>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              {purchasePending ? (
                <>
                  <p className="text-sm text-muted-light">{copy.newAudit.review.purchaseIntro}</p>
                  <div className="rounded-xl border border-violet/30 bg-violet/5 p-4">
                    <p className="font-medium text-ghost-white">{selectedOption?.title}</p>
                    <p className="mt-1 text-2xl font-semibold text-violet">
                      ₹{PRODUCT_PRICES_INR[selectedOption?.planId as PlanId] ?? 0}
                    </p>
                    <p className="mt-2 text-sm text-muted">{url}</p>
                  </div>
                </>
              ) : isRescan ? (
                <div className="rounded-xl border border-border/60 bg-midnight/40 p-4 text-sm">
                  <p className="font-medium text-ghost-white">
                    {copy.newAudit.review.rescanTitle} {url.replace(/^https?:\/\//, "").split("/")[0]}
                  </p>
                  {rescanMeta?.baselineLabel && (
                    <p className="mt-3">
                      <span className="text-muted">{copy.newAudit.rescan.baseline}:</span>{" "}
                      <span className="text-ghost-white">{rescanMeta.baselineLabel}</span>
                    </p>
                  )}
                  <p className="mt-2">
                    <span className="text-muted">{copy.newAudit.rescan.selectedFixes}:</span>{" "}
                    <span className="text-ghost-white">{selectedFixIds.length}</span>
                  </p>
                  {rescanMeta?.rescansExpiresAt && (
                    <p className="mt-2">
                      <span className="text-muted">{copy.newAudit.rescan.entitlement}:</span>{" "}
                      <span className="text-ghost-white">
                        {rescanMeta.rescansRemaining} remaining · expires {rescanMeta.rescansExpiresAt}
                      </span>
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-border/60 bg-midnight/40 p-4 text-sm">
                    <p>
                      <span className="text-muted">URL:</span>{" "}
                      <span className="text-ghost-white">{url}</span>
                    </p>
                    <p className="mt-2">
                      <span className="text-muted">Audit:</span>{" "}
                      <span className="text-ghost-white">{selectedOption?.title}</span>
                    </p>
                    <p className="mt-2">
                      <span className="text-muted">{copy.auditDepth.label}:</span>{" "}
                      <span className="text-ghost-white">{depthCopy.title}</span>
                      <span className="mt-1 block text-xs text-muted-light">
                        {depthCopy.body}
                      </span>
                    </p>
                    <p className="mt-2">
                      <span className="text-muted">Time:</span>{" "}
                      <span className="text-ghost-white">{reviewMeta.timeEstimate}</span>
                    </p>
                  </div>
                  <ul className="space-y-1 text-sm text-muted-light">
                    {reviewMeta.features.map((f) => (
                      <li key={f}>· {f}</li>
                    ))}
                  </ul>
                  {bindsOnStart && (
                    <div className="space-y-3 rounded-xl border border-violet/30 bg-violet/5 p-4">
                      <p className="text-sm text-ghost-white">
                        {copy.newAudit.review.bindWarning(displayDomain)}
                      </p>
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={bindConfirmed}
                          onChange={(e) => setBindConfirmed(e.target.checked)}
                          className="mt-1 h-4 w-4 accent-violet"
                        />
                        <span className="text-sm text-muted-light">
                          {copy.newAudit.review.bindConfirm}
                        </span>
                      </label>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {(step === 3 || (step === 4 && !purchasePending)) && (
            <div className="mt-5">
              <Ga4ConnectionCard key={url} websiteUrl={url} auditFlow onBusyChange={setAnalyticsBusy} />
              <p className="mt-2 text-xs text-muted">Optional — connect Google Analytics to add real website usage data. You can also continue without connecting.</p>
            </div>
          )}

          {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
          <Button
            variant="ghost"
            size="md"
            onClick={goBack}
            disabled={step === 1 || loading || analyticsBusy}
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.newAudit.actions.back}
          </Button>
          <Button variant="glow" size="md" onClick={goNext} isLoading={loading} disabled={analyticsBusy}>
            {primaryLabel}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </footer>
      </div>
    </Dialog>
  );
}
