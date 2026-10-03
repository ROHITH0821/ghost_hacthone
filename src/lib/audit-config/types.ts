import type { AuditType, PlanId, ProductChoice } from "@/lib/plans";

export type ConfigFieldSource = "inferred" | "user" | "inherited" | "plan";

export type ConfigField<T> = {
  value: T;
  source: ConfigFieldSource;
};

export type AuditConfigSnapshot = {
  capturedAt: string;
  productChoice: ProductChoice | string;
  auditType: AuditType | string;
  planId: PlanId | string;
  planLimits: { maxPages: number; maxPersonas: number };
  url: string;
  domain: string;
  businessName?: ConfigField<string>;
  primaryGoal?: ConfigField<string>;
  targetAudience?: ConfigField<string>;
  importantPage?: ConfigField<string>;
  competitorHints?: ConfigField<string>;
  clientId?: string;
  clientName?: string;
  selectedFixIds?: string[];
};

export type AuditContextInput = {
  primaryGoal?: string;
  targetAudience?: string;
  importantPage?: string;
  competitorHints?: string;
  selectedFixIds?: string[];
};

export type ClientDefaults = {
  primaryGoal?: string;
  targetAudience?: string;
  importantPage?: string;
  goals?: string;
  audience?: string;
};
