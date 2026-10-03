import { z } from "zod";

// Provider-neutral evidence contract. API-specific names are normalized at the edge.
const value = z.number().finite().nonnegative().nullable();
export const metricsSchema = z.object({
  activeUsers: value, totalUsers: value, newUsers: value, sessions: value,
  views: value, engagementRate: value, engagementSeconds: value,
  keyEvents: value, sessionKeyEventRate: value,
});
export const snapshotSchema = z.object({
  version: z.literal(1), source: z.literal("ga4"), propertyId: z.string(), propertyName: z.string(),
  streamId: z.string(), hostname: z.string(), timeZone: z.string(), syncedAt: z.string().datetime(),
  period: z.object({ start: z.string(), end: z.string() }),
  previousPeriod: z.object({ start: z.string(), end: z.string() }),
  current: metricsSchema, previous: metricsSchema.nullable(),
  pages: z.array(z.object({ path: z.string(), views: value })),
  landingPages: z.array(z.object({ path: z.string(), sessions: value, engagementRate: value, sessionKeyEventRate: value })),
  acquisition: z.array(z.object({ source: z.string(), medium: z.string(), sessions: value })),
  devices: z.array(z.object({ category: z.string(), sessions: value })),
  events: z.array(z.object({ name: z.string(), count: value, keyEvents: value })),
  revenue: z.object({ purchases: value, purchaseRevenue: value, currency: z.string().nullable() }),
  keyEventConfiguration: z.enum(["present", "absent", "unknown"]),
  reliable: z.boolean(), notes: z.array(z.string()),
});
export type AnalyticsSnapshot = z.infer<typeof snapshotSchema>;
export type AnalyticsMetrics = z.infer<typeof metricsSchema>;
export interface FindingEvidence {
  findingId: string;
  path: string;
  views: number | null;
  landingSessions: number | null;
  engagementRate: number | null;
  sessionKeyEventRate: number | null;
  observation: string;
  interpretation?: string;
  recommendation: string;
}
export interface ExternalEvidence {
  snapshot: AnalyticsSnapshot;
  findings: FindingEvidence[];
  priorityFindingIds: string[];
  activeUserChangePercent: number | null;
}
