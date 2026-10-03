import type { GhostReport } from "@/lib/types";
import type { ExternalEvidence } from "@/lib/data-sources/types";

/** Everything the section renderers need, resolved once by the orchestrator. */
export type ReportContext = {
  report: GhostReport;
  brandName: string;
  accent: string;
  logoSrc: string | null;
  contactParts: string[];
  date: string;
  time: string;
  /** Left-hand footer run on every light sheet. */
  footLeft: string;
  /** Optional GA4 analytics evidence */
  analyticsEvidence?: ExternalEvidence | null;
};
