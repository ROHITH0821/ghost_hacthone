import { getClientForUser } from "@/lib/db/clients";
import type { ScanValidationResult } from "@/lib/db/entitlements";
import {
  PRODUCT_METADATA,
  type AuditType,
  type PlanId,
  type ProductChoice,
} from "@/lib/plans";
import type {
  AuditConfigSnapshot,
  AuditContextInput,
  ClientDefaults,
  ConfigField,
} from "@/lib/audit-config/types";

function userField(value: string | undefined): ConfigField<string> | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return { value: trimmed, source: "user" };
}

function inheritedField(value: string | undefined): ConfigField<string> | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return { value: trimmed, source: "inherited" };
}

function pickDefault(defaults: ClientDefaults | null, key: keyof ClientDefaults) {
  if (!defaults) return undefined;
  const direct = defaults[key];
  if (typeof direct === "string" && direct.trim()) return direct;
  if (key === "primaryGoal" && typeof defaults.goals === "string") return defaults.goals;
  if (key === "targetAudience" && typeof defaults.audience === "string") return defaults.audience;
  return undefined;
}

function mergeField(
  userValue: string | undefined,
  inheritedValue: string | undefined
): ConfigField<string> | undefined {
  const user = userField(userValue);
  if (user) return user;
  return inheritedField(inheritedValue);
}

export async function buildAuditConfigSnapshot(input: {
  userId: string;
  url: string;
  domain: string;
  businessName?: string;
  productChoice?: ProductChoice;
  validation: Extract<ScanValidationResult, { ok: true }>;
  context?: AuditContextInput | null;
  clientId?: string | null;
}): Promise<AuditConfigSnapshot> {
  const meta = PRODUCT_METADATA[input.validation.planId as PlanId];
  let clientDefaults: ClientDefaults | null = null;
  let clientName: string | undefined;

  if (input.clientId) {
    const client = await getClientForUser(input.userId, input.clientId);
    if (client) {
      clientName = client.name;
      clientDefaults = (client.defaults as ClientDefaults | null) ?? null;
    }
  }

  const ctx = input.context ?? {};

  return {
    capturedAt: new Date().toISOString(),
    productChoice: input.productChoice ?? input.validation.auditType,
    auditType: input.validation.auditType as AuditType,
    planId: input.validation.planId,
    planLimits: {
      maxPages: meta.pages,
      maxPersonas: meta.personas,
    },
    url: input.url,
    domain: input.domain,
    businessName: userField(input.businessName),
    primaryGoal: mergeField(ctx.primaryGoal, pickDefault(clientDefaults, "primaryGoal")),
    targetAudience: mergeField(ctx.targetAudience, pickDefault(clientDefaults, "targetAudience")),
    importantPage: mergeField(ctx.importantPage, pickDefault(clientDefaults, "importantPage")),
    competitorHints: userField(ctx.competitorHints),
    clientId: input.clientId ?? undefined,
    clientName,
    selectedFixIds: ctx.selectedFixIds?.length ? ctx.selectedFixIds : undefined,
  };
}
