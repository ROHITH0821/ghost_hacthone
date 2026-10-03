export type DispatchResult = { ok: boolean; errors: string[] };

/** Await only the destination's acceptance response, never the heavy job. */
export async function dispatchMission(missionId: string, phase: "run" | "finalize", transport: typeof fetch = fetch): Promise<DispatchResult> {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const secret = process.env.CRON_SECRET?.trim();
  try {
    if (!base || !secret) throw new Error("dispatch_configuration_missing");
    const origin = new URL(base);
    if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password) throw new Error("dispatch_configuration_invalid");
    const url = new URL(`/api/missions/${encodeURIComponent(missionId)}/${phase}?dispatch=1`, origin);
    const response = await transport(url, {
      method: "POST", headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(10_000), redirect: "error", cache: "no-store",
    });
    if (!response.ok) throw new Error(`dispatch_http_${response.status}`);
    const body = await response.json() as { ok?: boolean };
    if (body.ok !== true) throw new Error("dispatch_not_accepted");
    return { ok: true, errors: [] };
  } catch (error) {
    const reason = error instanceof Error && /^dispatch_[a-z_0-9]+$/.test(error.message) ? error.message : "dispatch_transport_failure";
    console.error(JSON.stringify({ event: "mission.dispatch_failed", missionId, phase, reason }));
    return { ok: false, errors: [reason] };
  }
}
