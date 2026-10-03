export const FIX_WORKFLOW_STATUSES = [
  "recommended",
  "planned",
  "implemented",
  "verified",
] as const;

export type FixWorkflowStatus = (typeof FIX_WORKFLOW_STATUSES)[number];

/**
 * How much fix content travels with a list response. The card clamps to four
 * lines, so anything beyond this is invisible until the user copies it.
 */
export const FIX_CONTENT_PREVIEW_CHARS = 200;

export type FixStatusRow = {
  id: string;
  userId: string;
  siteId: string;
  missionId: string;
  sourceKey: string;
  leakId: string | null;
  fixId: string | null;
  kind: string;
  title: string;
  severity: string | null;
  category: string | null;
  pageUrl: string | null;
  shopperQuote: string | null;
  /**
   * Truncated to {@link FIX_CONTENT_PREVIEW_CHARS} for list payloads — the card
   * only ever shows ~4 clamped lines. The untruncated text is fetched on demand
   * from `/api/dashboard/fixes/[id]/content` when the user copies it.
   */
  fixContent: string | null;
  /** True when {@link fixContent} was cut short and a full version exists. */
  fixContentTruncated?: boolean;
  status: FixWorkflowStatus;
  note: string | null;
  implementedAt: Date | null;
  verifiedAt: Date | null;
  verifiedByMissionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  siteDomain?: string;
  missionDomain?: string;
  missionCreatedAt?: Date;
};

export type FixCounts = {
  implemented: number;
  verified: number;
  total: number;
};
