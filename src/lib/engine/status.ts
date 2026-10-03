/**
 * Ghost audit engine readiness.
 * Without ANTHROPIC_API_KEY the swarm cannot run — surface a maintenance UI instead.
 */
export const ENGINE_OFFLINE_CODE = "ENGINE_OFFLINE";

export function isEngineConfigured(): boolean {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return false;
  // Reject placeholder values from .env.example
  if (key.includes("...") || key === "sk-ant-") return false;
  return key.length > 12;
}
