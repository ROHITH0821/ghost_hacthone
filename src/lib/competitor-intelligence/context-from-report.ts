import type { ContextPack } from "@/lib/ghost-engine/types";
import type { GhostReport } from "@/lib/types";

/** Minimal Context Pack rebuilt from a finished GhostReport (for intelligence regen). */
export function contextPackFromReport(report: GhostReport): ContextPack {
  return {
    business: {
      name: report.domain,
      type: report.businessUnderstanding.businessType,
      location: "not stated on site",
    },
    pages: [
      {
        url: report.url,
        title: report.domain,
        summary: `${report.businessUnderstanding.primaryGoal}. Audience: ${report.businessUnderstanding.targetAudience}`,
        prices_visible: "unknown",
        ctas: [],
        visual_notes: report.businessUnderstanding.customerExpectations.join("; "),
      },
    ],
    nav_structure: [],
    contact_paths: [],
    search: { exists: false },
    reviews: { visible: false },
    trust_signals: report.businessUnderstanding.customerExpectations,
  };
}
