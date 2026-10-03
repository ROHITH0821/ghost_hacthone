import type { CrawlSignals, DimensionScore, ScoreCheck } from "./types";
import { applyChecklist } from "./utils";

export function scoreTechnical(signals: CrawlSignals): DimensionScore {
  const checks: ScoreCheck[] = [];

  checks.push({
    id: "pages_crawled",
    label: "More than one page was successfully crawled.",
    passed: signals.pageCount >= 2,
    points: signals.pageCount >= 3 ? 5 : signals.pageCount >= 2 ? 2 : -8,
    evidence: `Pages crawled: ${signals.pageCount}`,
  });

  checks.push({
    id: "rich_pages",
    label: "The crawl captured meaningful readable text on multiple pages.",
    passed: signals.richPageCount >= 2,
    points: signals.richPageCount >= 2 ? 8 : signals.richPageCount === 1 ? 3 : -8,
    evidence: `Rich pages: ${signals.richPageCount}`,
  });

  checks.push({
    id: "screenshots",
    label: "Screenshots were captured for key pages (visual analysis available).",
    passed: signals.screenshotCount > 0,
    points: signals.screenshotCount > 0 ? 4 : 0,
    evidence: `Screenshots: ${signals.screenshotCount}`,
  });

  checks.push({
    id: "dynamic_render",
    label: "Site is not excessively reliant on client-side rendering (crawlable for slow devices/SEO).",
    passed: signals.dynamicRenderCount <= Math.ceil(signals.pageCount / 2),
    points:
      signals.pageCount > 0 && signals.dynamicRenderCount > Math.ceil(signals.pageCount / 2)
        ? -4
        : 0,
    evidence: `Dynamic-rendered pages: ${signals.dynamicRenderCount} / ${signals.pageCount}`,
  });

  checks.push({
    id: "low_confidence",
    label: "Crawl confidence is high (not blocked / not empty JS shell).",
    passed: !signals.lowConfidence,
    points: signals.lowConfidence ? -15 : 0,
    evidence: signals.lowConfidence ? "Low-confidence crawl detected." : "Crawl confidence OK.",
  });

  const { value } = applyChecklist(55, checks);
  return {
    id: "technical",
    label: "Technical Experience",
    weight: 0.05,
    value,
    contribution: Math.round(value * 0.05),
    checks,
  };
}

