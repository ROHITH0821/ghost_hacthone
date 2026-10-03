import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { CompetitorIntelligence } from "@/lib/competitor-intelligence/types";
import type { GhostReport } from "@/lib/types";
import type { ExternalEvidence } from "@/lib/data-sources/types";
import { launchPdfBrowser } from "./launchBrowser";
import { FONT_PROBE, fontFaceCss } from "./pdf/fonts";
import { buildStylesheet } from "./pdf/theme";
import type { ReportContext } from "./pdf/context";
import { backCoverSheet, coverSheet } from "./pdf/sections/cover";
import {
  scoreEvidenceSheets,
  scoreSheet,
  verdictSheet,
} from "./pdf/sections/score";
import { analyticsSheet } from "./pdf/sections/analytics";
import { detectedSheet, funnelSheet } from "./pdf/sections/business";
import { leakSheets, leaksIndexSheet } from "./pdf/sections/leaks";
import { growthKitSheets } from "./pdf/sections/growthKit";
import { marketSheets } from "./pdf/sections/market";
import { roadmapSheet } from "./pdf/sections/roadmap";

/**
 * Builds the downloadable branded PDF from a GhostReport — the same data the
 * user sees on the results page — as a paginated intelligence report.
 *
 * Composition lives in ./pdf: `theme.ts` holds the tokens and stylesheet,
 * `primitives.ts` the shared components, and `sections/` one module per part of
 * the narrative. This file only decides which sheets are emitted and in what
 * order.
 *
 * Rendered through Playwright with the brand logo and fonts embedded, so the
 * document is self-contained and needs no network at render time.
 */

const LOGO_PATH = join(process.cwd(), "public", "webaura-mark-light.png");
const DEFAULT_BRAND = "Web Aura India";
const DEFAULT_ACCENT = "#16745F";

export type PdfBrandOptions = {
  agencyName: string;
  logoUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  accentColor?: string | null;
};

async function loadLogo(): Promise<string | null> {
  try {
    const buf = await readFile(LOGO_PATH);
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function buildContext(
  report: GhostReport,
  logo: string | null,
  brandOptions?: PdfBrandOptions,
  analyticsEvidence?: ExternalEvidence | null,
): ReportContext {
  const brandName = brandOptions?.agencyName ?? DEFAULT_BRAND;
  const scannedAt = new Date(report.scannedAt);

  return {
    report,
    brandName,
    accent: brandOptions?.accentColor ?? DEFAULT_ACCENT,
    logoSrc: brandOptions?.logoUrl ?? logo,
    contactParts: [
      brandOptions?.contactEmail,
      brandOptions?.contactPhone,
      brandOptions?.website,
    ].filter((c): c is string => Boolean(c)),
    date: scannedAt.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    time: scannedAt.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    footLeft: `${brandName} · ${report.domain}`,
    analyticsEvidence,
  };
}

/**
 * Assembles the report document.
 *
 * `fontCss` is passed in rather than read here so this stays synchronous and
 * unit-testable; the async orchestration lives in `generateGhostReportPdf`.
 */
export function buildReportHtml(
  report: GhostReport,
  logo: string | null,
  brandOptions?: PdfBrandOptions,
  marketIntelligence?: CompetitorIntelligence | null,
  fontCss = "",
  analyticsEvidence?: ExternalEvidence | null,
): string {
  const ctx = buildContext(report, logo, brandOptions, analyticsEvidence);

  const sheets = [
    coverSheet(ctx),
    verdictSheet(ctx),
    scoreSheet(ctx),
    ctx.analyticsEvidence ? analyticsSheet(ctx) : "",
    scoreEvidenceSheets(ctx),
    detectedSheet(ctx),
    funnelSheet(ctx),
    leaksIndexSheet(ctx),
    leakSheets(ctx),
    growthKitSheets(ctx),
    marketIntelligence ? marketSheets(ctx, marketIntelligence) : "",
    roadmapSheet(ctx, marketIntelligence),
    backCoverSheet(ctx),
  ]
    .filter(Boolean)
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8">
    <title>Growth Leak Report — ${report.domain}</title>
    <style>${buildStylesheet(ctx.accent, fontCss)}</style>
  </head><body>${sheets}</body></html>`;
}

export async function generateGhostReportPdf(
  report: GhostReport,
  brandOptions?: PdfBrandOptions,
  marketIntelligence?: CompetitorIntelligence | null,
  analyticsEvidence?: ExternalEvidence | null,
): Promise<Uint8Array> {
  const [logo, fontCss] = await Promise.all([
    brandOptions?.logoUrl ? Promise.resolve(null) : loadLogo(),
    fontFaceCss(),
  ]);

  const html = buildReportHtml(
    report,
    logo,
    brandOptions,
    marketIntelligence,
    fontCss,
    analyticsEvidence,
  );

  const browser = await launchPdfBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });

    // Embedded faces are decoded asynchronously. Without this the first render
    // on a cold instance can lay out in the fallback metrics.
    const fontsReady = await page.evaluate(async (probe) => {
      await document.fonts.ready;
      return document.fonts.check(probe);
    }, FONT_PROBE);

    if (!fontsReady) {
      // Non-fatal: the report still renders, but silently shipping a fallback
      // font in production is exactly the failure this is here to surface.
      console.error(
        `[reportPdf] embedded fonts not applied (probe: ${FONT_PROBE}) — check public/fonts is present in the deployment`,
      );
    }

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });
    return new Uint8Array(pdf);
  } finally {
    await browser.close();
  }
}
