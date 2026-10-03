/**
 * Renders the report PDF locally from fixtures and asserts nothing was dropped.
 *
 * Usage (from Ghost/):
 *   npx tsx scripts/preview-report-pdf.ts
 *
 * Writes PDFs to .pdf-preview/ and exits non-zero if any source string is
 * missing from the rendered document — that is the acceptance gate for the
 * redesign, since the whole point is that presentation changed and content
 * did not.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { createMockReport } from "../src/lib/mock-data";
import {
  buildReportHtml,
  generateGhostReportPdf,
  type PdfBrandOptions,
} from "../src/lib/report/reportPdf";
import { fontFaceCss } from "../src/lib/report/pdf/fonts";
import type { CompetitorIntelligence } from "../src/lib/competitor-intelligence/types";
import { INTELLIGENCE_VERSION } from "../src/lib/competitor-intelligence/types";
import { TAXONOMY_VERSION } from "../src/lib/competitor-intelligence/feature-taxonomy";
import type { GhostReport, GhostScoreCheck } from "../src/lib/types";

const OUT_DIR = join(process.cwd(), ".pdf-preview");

function checksFor(prefix: string): GhostScoreCheck[] {
  return [
    {
      id: `${prefix}-1`,
      label: "Pricing is visible without contacting the business",
      points: 12,
      passed: false,
      evidence: "Context Pack indicates pricing is not visible.",
    },
    {
      id: `${prefix}-2`,
      label: "Primary call-to-action present above the fold",
      points: 10,
      passed: true,
      evidence: "Homepage CTAs: Book now, Get a quote",
    },
    {
      id: `${prefix}-3`,
      label: "Contact path reachable in one click",
      points: 8,
      passed: true,
      evidence: "tel:+91XXXXXXXXXX | mailto:hello@example.in | WhatsApp",
    },
    {
      id: `${prefix}-4`,
      label: "Customer reviews or testimonials on a landing page",
      points: 9,
      passed: false,
      evidence: "No review or testimonial blocks detected in crawled pages.",
    },
  ];
}

function fullReport(): GhostReport {
  const report = createMockReport(
    "https://bridalstudio.example",
    "bridalstudio.example",
  );

  report.scoreBreakdown!.dimensions = report.scoreBreakdown!.dimensions.map(
    (d) => ({ ...d, checks: checksFor(d.id) }),
  );

  // Give the top leaks a ready-to-paste fix so that branch renders.
  report.leaks = report.leaks.map((leak, i) =>
    i < 3
      ? {
          ...leak,
          fix: {
            title: `Paste-ready fix for ${leak.title}`,
            content: `Bridal Package — ₹18,500\nHair, makeup, draping and one trial.\n\nAdd-ons: Family makeup ₹2,500 per person.\nHalf the amount holds your date.`,
          },
        }
      : leak,
  );

  return report;
}

function minimalReport(): GhostReport {
  const report = createMockReport("https://tiny.example", "tiny.example");
  report.fixes = [];
  report.leaks = report.leaks.slice(0, 1);
  report.lowConfidence = true;
  report.confidenceNote =
    "Only 2 of 8 pages could be read — the site renders most content with JavaScript.";
  return report;
}

function sampleMarketIntelligence(missionId: string): CompetitorIntelligence {
  return {
    missionId,
    intelligenceVersion: INTELLIGENCE_VERSION,
    generatedAt: new Date().toISOString(),
    taxonomyVersion: TAXONOMY_VERSION,
    market_definition: {
      category: "Bridal & beauty studios",
      geography: "Hyderabad, India",
      buyerGoal: "Book a bridal package with a clear price",
    },
    search_strategy: {
      queries: ["bridal studio hyderabad"],
      sourcesUsed: ["preview-script"],
    },
    competitorSummaries: [
      {
        crawlPackId: "rival-1",
        name: "Rival Studio A",
        canonicalUrl: "https://rival-a.example",
        relevanceScore: 88,
        qualityScore: 72,
        topStrengths: ["Package prices listed openly", "Real client galleries"],
        weaknesses: ["No online booking", "Thin FAQ"],
        evidenceHighlights: ["Pricing page lists all six packages with amounts"],
      },
      {
        crawlPackId: "rival-2",
        name: "Rival Studio B",
        canonicalUrl: "https://rival-b.example",
        relevanceScore: 74,
        qualityScore: 55,
        topStrengths: ["Strong Instagram integration"],
        weaknesses: ["Slow mobile load", "No pricing anywhere"],
        evidenceHighlights: ["Homepage embeds a live Instagram feed"],
      },
    ],
    owner_features: {
      siteUrl: "https://bridalstudio.example",
      siteName: "Bridal Studio",
      extractedAt: new Date().toISOString(),
      features: {},
    },
    market_expectations: {
      competitorCount: 2,
      expectations: [
        {
          featureId: "social_proof",
          marketScore: 78,
          competitorCount: 2,
          criteria: [],
          marketEvidence: "Both rivals surface reviews on the landing page.",
        },
      ],
    },
    market_gaps: [
      {
        gap: "Bridal package price is not published",
        evidence: "Both rivals list package prices on a dedicated pricing page.",
        impact: "High-intent bridal enquiries leave before making contact.",
        recommendation: "Publish the bridal package price and what it includes.",
        featureId: "pricing_transparency",
        dimension: "conversion",
        gapType: "missing_expected",
        priority: "critical",
        prevalence: 1,
        competitorCount: 2,
        ownerScore: 15,
        marketScore: 82,
        scoreDelta: 67,
        missingCriteria: ["Package price visible without contacting"],
      },
      {
        gap: "No customer reviews on any landing page",
        evidence: "Rival Studio A shows star ratings and counts in the hero.",
        impact: "First-time visitors have no proof the studio is legitimate.",
        recommendation: "Surface your existing Google reviews on the homepage.",
        featureId: "social_proof",
        dimension: "trust",
        gapType: "weaker_than_market",
        priority: "high",
        prevalence: 0.8,
        competitorCount: 2,
        ownerScore: 42,
        marketScore: 78,
        scoreDelta: 36,
        missingCriteria: ["Review count visible on homepage"],
      },
    ],
    limitations: [
      "Generated by preview-report-pdf.ts — not real crawl data.",
    ],
  };
}

/** Every string the report must still contain after the redesign. */
function expectedStrings(
  report: GhostReport,
  intel: CompetitorIntelligence | null,
): string[] {
  const out: string[] = [
    report.domain,
    report.url,
    report.businessUnderstanding.businessType,
    report.businessUnderstanding.targetAudience,
    report.businessUnderstanding.primaryGoal,
    ...report.businessUnderstanding.customerExpectations,
  ];

  for (const step of report.journey) {
    out.push(step.label, step.description);
    if (step.leakReason) out.push(step.leakReason);
  }

  for (const leak of report.leaks) {
    out.push(
      leak.title,
      leak.category,
      leak.whatIsWrong,
      leak.whyCustomersLeave,
      leak.impact,
      leak.howToFix,
    );
    if (leak.fix) out.push(leak.fix.title, leak.fix.content);
  }

  for (const fix of report.fixes) {
    out.push(fix.title, fix.category, fix.description, fix.content);
  }

  for (const d of report.scoreBreakdown?.dimensions ?? []) {
    out.push(d.label);
    for (const c of d.checks) {
      out.push(c.label);
      if (c.evidence) out.push(c.evidence);
    }
  }

  if (report.confidenceNote) out.push(report.confidenceNote);
  if (intel) {
    for (const c of intel.competitorSummaries) out.push(c.name);
  }

  return out;
}

/** Mirrors the escaping applied when values are interpolated into the HTML. */
function escForCompare(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function render(
  name: string,
  report: GhostReport,
  intel: CompetitorIntelligence | null,
  brand?: PdfBrandOptions,
): Promise<boolean> {
  const fontCss = await fontFaceCss();
  const html = buildReportHtml(report, null, brand, intel, fontCss);

  const missing = expectedStrings(report, intel).filter(
    (s) => s.trim() !== "" && !html.includes(escForCompare(s)),
  );

  const sheets = (html.match(/class="sheet"/g) ?? []).length;
  const bytes = await generateGhostReportPdf(report, brand, intel);
  const pdfPath = join(OUT_DIR, `${name}.pdf`);
  await writeFile(pdfPath, bytes);
  await writeFile(join(OUT_DIR, `${name}.html`), html);

  const pages = (bytes.length && countPages(bytes)) || 0;

  console.log(
    `\n${name}\n  sheets emitted : ${sheets}\n  pdf pages      : ${pages}\n  size           : ${(bytes.length / 1024).toFixed(0)} KB\n  fonts embedded : ${fontCss.length > 0 ? "yes" : "NO"}\n  missing strings: ${missing.length}`,
  );
  for (const m of missing.slice(0, 10)) {
    console.log(`    MISSING → ${m.slice(0, 90)}`);
  }
  console.log(`  written        : ${pdfPath}`);

  return missing.length === 0;
}

function countPages(bytes: Uint8Array): number {
  const s = Buffer.from(bytes).toString("latin1");
  const counts = [...s.matchAll(/\/Type\s*\/Page[^s]/g)].length;
  return counts;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const full = fullReport();
  const okFull = await render("full", full, sampleMarketIntelligence(full.id));

  const min = minimalReport();
  const okMin = await render("minimal", min, null);

  const brandedReport = fullReport();
  const okBranded = await render(
    "white-label",
    brandedReport,
    sampleMarketIntelligence(brandedReport.id),
    {
      agencyName: "Northbridge Digital Partners LLP",
      accentColor: "#0F766E",
      contactEmail: "studio@northbridge.example",
      contactPhone: "+91 90000 00000",
      website: "northbridge.example",
    },
  );

  if (!okFull || !okMin || !okBranded) {
    console.error("\n✗ Content preservation FAILED — see MISSING lines above.");
    process.exit(1);
  }
  console.log("\n✓ All source content present in every variant.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
