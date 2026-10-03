/** True while a completed deep audit still needs market intelligence. */
export function isMarketIntelPending(input: {
  hasIntel?: boolean;
  intelStatus?: string | null;
}): boolean {
  if (input.hasIntel) return false;
  const status = input.intelStatus ?? null;
  if (status === "failed" || status === "not_applicable") return false;
  return true;
}
