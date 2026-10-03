/**
 * Screenshots each sheet of a rendered report inside an isolated A4 page box,
 * so what you see matches a single PDF page (no rasteriser needed).
 *
 * Usage (from Ghost/):
 *   npx tsx scripts/shoot-report-sheets.ts [full|minimal|white-label]
 *   SHEETS=1,2,20 npx tsx scripts/shoot-report-sheets.ts full
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const variant = process.argv[2] ?? "full";
const OUT = join(process.cwd(), ".pdf-preview");

// Must mirror the @page margins in pdf/theme.ts.
const M_TOP = 16;
const M_SIDE = 16;
const M_BOTTOM = 14;

function splitSheets(html: string): { head: string; sheets: string[] } {
  const styleMatch = html.match(/<style>[\s\S]*?<\/style>/);
  const head = styleMatch ? styleMatch[0] : "";
  const sheets = [...html.matchAll(/<section class="sheet">[\s\S]*?<\/section>/g)].map(
    (m) => m[0],
  );
  return { head, sheets };
}

async function main() {
  const html = await readFile(join(OUT, `${variant}.html`), "utf8");
  const { head, sheets } = splitSheets(html);
  console.log(`${variant}: ${sheets.length} sheets`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 2 });

  const wanted = process.env.SHEETS
    ? process.env.SHEETS.split(",").map((n) => Number(n) - 1)
    : sheets.map((_, i) => i);

  for (const i of wanted) {
    if (i < 0 || i >= sheets.length) continue;

    // One sheet inside a real A4 page box with the @page margins as padding.
    const doc = `<!doctype html><html><head><meta charset="utf-8">${head}
      <style>
        body { margin:0; background:#888; }
        .page {
          width:210mm; height:297mm;
          padding:${M_TOP}mm ${M_SIDE}mm ${M_BOTTOM}mm;
          background:#fff; overflow:hidden; position:relative;
        }
        .page .sheet { min-height:${297 - M_TOP - M_BOTTOM}mm; }
      </style></head>
      <body><div class="page">${sheets[i]}</div></body></html>`;

    await page.setContent(doc, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);

    const box = page.locator(".page");
    const inner = await page
      .locator(".page .sheet")
      .evaluate((el) => el.scrollHeight);
    const avail = await page
      .locator(".page")
      .evaluate(
        (el) =>
          el.clientHeight -
          parseFloat(getComputedStyle(el).paddingTop) -
          parseFloat(getComputedStyle(el).paddingBottom),
      );

    await box.screenshot({
      path: join(OUT, `${variant}-sheet-${String(i + 1).padStart(2, "0")}.png`),
    });

    // Full-bleed sheets deliberately extend 30mm past the content box to reach
    // the paper edge, so they read as "over" without actually spilling a page.
    const isBleed = await page.locator(".page .sheet .bleed").count();
    const over = !isBleed && inner > avail + 2;
    console.log(
      `  sheet ${String(i + 1).padStart(2, "0")}  content=${Math.round(inner)}px avail=${Math.round(avail)}px${isBleed ? "  (full-bleed)" : ""}${over ? "   ← OVERFLOWS PAGE" : ""}`,
    );
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
