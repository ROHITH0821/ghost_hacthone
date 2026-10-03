import type { CompetitorIntelligence } from "@/lib/competitor-intelligence/types";
import { buildMarketComparisonViewModel } from "@/lib/competitor-intelligence/comparison-view-model";
import type { ThemeSide } from "@/lib/competitor-intelligence/theme-builder";
import { GAP_PRIORITY_COLOR, PALETTE, withAlpha } from "../theme";
import {
  badge,
  bar,
  chunk,
  confidenceMeter,
  esc,
  label,
  pad2,
  pageHead,
  sheet,
} from "../primitives";
import type { ReportContext } from "../context";

/**
 * Renders one side of a theme comparison. Logic preserved verbatim from the
 * previous generator so the report never claims more certainty than the
 * evidence resolver allows — unknowns stay unknown, never coerced to zero.
 */
function quoteForSide(side: ThemeSide): string {
  if (side.status === "not_observed" || side.status === "not_crawled") {
    return side.status === "not_crawled" ? "Not crawled" : "Not observed";
  }
  if (side.status === "score_only" && (side.score == null || side.score === 0)) {
    return "Not observed";
  }
  const scoreText = side.score != null ? `Score ${side.score}` : "Score —";
  const detail = side.evidence.quote ?? side.evidence.explanation ?? null;
  return detail ? `${scoreText} — ${detail}` : scoreText;
}

function standingLabel(s: string): string {
  if (s === "behind") return "Behind";
  if (s === "ahead") return "Ahead";
  if (s === "similar") return "Similar";
  return "Unknown";
}

const STANDING_COLOR: Record<string, string> = {
  behind: "#ef4444",
  ahead: "#15803D",
  similar: "#6B7280",
  unknown: "#9CA3AF",
};

export function marketSheets(
  ctx: ReportContext,
  intelligence: CompetitorIntelligence,
): string {
  const { accent, footLeft } = ctx;
  const view = buildMarketComparisonViewModel(intelligence);
  const out: string[] = [];

  // ── Executive summary + verdict ──────────────────────────────────────────

  const coverage = view.coverage.warnings.length
    ? `<div class="note" style="margin-top:14pt;">
         <b>Coverage.</b> ${esc(view.coverage.warnings.join(" · "))}
       </div>`
    : "";

  const standings = [
    { list: view.verdict.behind, name: "Behind", color: STANDING_COLOR.behind },
    { list: view.verdict.ahead, name: "Ahead", color: STANDING_COLOR.ahead },
  ]
    .filter((s) => s.list.length > 0)
    .map(
      (s) => `<div style="margin-bottom:10pt;">
        <div style="display:flex;align-items:center;gap:6pt;margin-bottom:4pt;">
          <span style="width:7pt;height:7pt;border-radius:7pt;background:${s.color};display:inline-block;"></span>
          <span style="font-size:8.4pt;font-weight:600;">${s.name} the market on</span>
        </div>
        <div>${s.list.map((item) => `<span class="chip">${esc(item.label)}</span>`).join("")}</div>
      </div>`,
    )
    .join("");

  out.push(
    sheet(
      `${pageHead("Market intelligence", "08")}

      <div class="lede">${esc(view.executiveSummary)}</div>

      <div class="card" style="border-left:2.5pt solid ${accent};">
        ${label("Verdict")}
        <h3 class="h3" style="font-size:13.5pt;margin-bottom:5pt;">${esc(view.verdict.headline)}</h3>
        <p class="body-sm" style="margin:0;">${esc(view.verdict.support)}</p>
      </div>

      <div class="rule"></div>

      ${standings}

      <div class="stat-row" style="margin-top:6pt;">
        <div class="stat">
          <div class="v">${view.metadata.competitorCount}</div>
          <div class="k">Competitors compared</div>
        </div>
        <div class="stat">
          <div class="v">${view.actions.length}</div>
          <div class="k">Ranked actions</div>
        </div>
        <div class="stat">
          <div class="v" style="font-size:13pt;line-height:1.3;">${esc(view.metadata.category)}</div>
          <div class="k">Category</div>
        </div>
        <div class="stat">
          <div class="v" style="font-size:13pt;line-height:1.3;">${esc(view.metadata.geography)}</div>
          <div class="k">Geography</div>
        </div>
      </div>

      ${coverage}`,
      { footLeft, footRight: "Market intelligence" },
    ),
  );

  // ── Ranked actions ───────────────────────────────────────────────────────

  if (view.actions.length > 0) {
    out.push(
      ...chunk(view.actions, 2).map((group, pageIndex) => {
        const cards = group
          .map((a, i) => {
            const n = pageIndex * 2 + i + 1;
            const color = GAP_PRIORITY_COLOR[a.priority] ?? PALETTE.faint;
            return `<div class="card avoid-break" style="margin-bottom:10pt;border-left:2.5pt solid ${color};">
              <div style="display:flex;align-items:flex-start;gap:9pt;margin-bottom:6pt;">
                <span style="flex:none;font-family:'Space Grotesk',sans-serif;font-size:13pt;font-weight:700;color:${color};line-height:1;">${pad2(n)}</span>
                <h3 class="h4" style="flex:1 1 auto;margin:0;font-size:11.5pt;">${esc(a.title)}</h3>
                ${badge(a.priority, color)}
              </div>

              <div style="display:flex;gap:16pt;align-items:center;margin-bottom:8pt;">
                ${confidenceMeter(a.confidence, accent)}
                ${
                  a.whoLeadsName
                    ? `<span style="font-size:8pt;" class="muted">Who does better: <b style="color:${PALETTE.ink};">${esc(a.whoLeadsName)}</b></span>`
                    : ""
                }
              </div>

              <div style="margin-bottom:6pt;">
                ${label("Evidence")}
                <p class="body-sm" style="margin:0;">${esc(a.evidence)}</p>
              </div>
              <div style="margin-bottom:6pt;">
                ${label("Impact")}
                <p class="body-sm" style="margin:0;">${esc(a.impact)}</p>
              </div>
              <div style="background:${PALETTE.paperTint};border-radius:3pt;padding:7pt 9pt;">
                ${label("Recommendation")}
                <p style="margin:0;font-size:9.4pt;font-weight:600;line-height:1.45;">${esc(a.recommendation)}</p>
              </div>
            </div>`;
          })
          .join("");

        return sheet(
          `${pageHead("What to do about the market", `09.${pad2(pageIndex + 1)}`)}
          ${
            pageIndex === 0
              ? `<div class="lede">Ranked by evidence strength and impact — not by how easy they are.</div>`
              : ""
          }
          ${cards}`,
          { footLeft, footRight: "Market actions" },
        );
      }),
    );
  } else {
    out.push(
      sheet(
        `${pageHead("What to do about the market", "09")}
        <p class="body-sm">No evidence-backed actions ranked for this set.</p>`,
        { footLeft, footRight: "Market actions" },
      ),
    );
  }

  // ── Head to head, one rival per sheet ────────────────────────────────────

  const rivals = [...view.competitors].sort(
    (a, b) => b.relevanceScore - a.relevanceScore,
  );

  if (rivals.length === 0) {
    out.push(
      sheet(
        `${pageHead("Head to head", "10")}
        <p class="body-sm">${
          view.metadata.needsRegenForSideBySide
            ? "Side-by-side requires regenerated market intelligence."
            : "Not enough competitors for theme comparison."
        }</p>`,
        { footLeft, footRight: "Head to head" },
      ),
    );
  } else {
    rivals.forEach((rival, rivalIndex) => {
      const themes = view.sideBySide.byCompetitorUrl[rival.url] ?? [];
      const summary =
        view.sideBySide.summaryByCompetitorUrl[rival.url] ?? view.sideBySide.summary;

      if (themes.length === 0) {
        out.push(
          sheet(
            `${pageHead(`You vs ${rival.name}`, `10.${pad2(rivalIndex + 1)}`)}
            <p class="body-sm">No theme comparison available for this rival.</p>`,
            { footLeft, footRight: "Head to head" },
          ),
        );
        return;
      }

      const summaryBar = `<div style="display:flex;gap:10pt;margin-bottom:14pt;">
        ${[
          { k: "Behind", v: summary.behind, c: STANDING_COLOR.behind },
          { k: "Ahead", v: summary.ahead, c: STANDING_COLOR.ahead },
          { k: "Similar", v: summary.similar, c: STANDING_COLOR.similar },
          ...(summary.unknown
            ? [{ k: "Unknown", v: summary.unknown, c: STANDING_COLOR.unknown }]
            : []),
        ]
          .map(
            (s) => `<div class="stat" style="padding:7pt 9pt;">
              <div class="v" style="font-size:17pt;color:${s.c};">${s.v}</div>
              <div class="k">${s.k}</div>
            </div>`,
          )
          .join("")}
      </div>`;

      const renderTheme = (t: (typeof themes)[number]) => {
          const color = STANDING_COLOR[t.standing] ?? PALETTE.faint;
          return `<div class="card avoid-break" style="margin-bottom:9pt;">
            <div style="display:flex;align-items:center;gap:8pt;margin-bottom:6pt;">
              <h3 class="h4" style="flex:1 1 auto;margin:0;">${esc(t.title)}</h3>
              ${badge(standingLabel(t.standing), color)}
            </div>

            <div style="margin-bottom:7pt;">${confidenceMeter(t.confidence, color)}</div>

            <div class="grid-2" style="gap:8pt 14pt;margin-bottom:7pt;">
              <div style="border-left:2pt solid ${withAlpha(PALETTE.ink, 0.25)};padding-left:8pt;">
                ${label("Your website")}
                <p class="body-sm" style="margin:0;">${esc(quoteForSide(t.owner))}</p>
              </div>
              <div style="border-left:2pt solid ${withAlpha(color, 0.55)};padding-left:8pt;">
                ${label(rival.name)}
                <p class="body-sm" style="margin:0;">${esc(quoteForSide(t.competitor))}</p>
              </div>
            </div>

            <div style="margin-bottom:5pt;">
              ${label("Why it matters")}
              <p class="body-sm" style="margin:0;">${esc(t.whyItMatters)}</p>
            </div>
            <div style="background:${PALETTE.paperTint};border-radius:3pt;padding:6pt 9pt;">
              ${label("Recommended action")}
              <p style="margin:0;font-size:9.2pt;font-weight:600;line-height:1.45;">${esc(t.recommendedAction)}</p>
            </div>
          </div>`;
      };

      // Three theme cards is what fits under the summary block; beyond that the
      // sheet would run onto a second page with no header to orient the reader.
      const themePages = chunk(themes, 3);

      out.push(
        ...themePages.map((group, partIndex) =>
          sheet(
            `${pageHead(
              `You vs ${rival.name}`,
              themePages.length > 1
                ? `10.${pad2(rivalIndex + 1)}.${partIndex + 1}`
                : `10.${pad2(rivalIndex + 1)}`,
            )}
            ${
              partIndex === 0
                ? `<div class="lede" style="margin-bottom:12pt;">
                     Compared across ${summary.themeCount} theme${summary.themeCount === 1 ? "" : "s"}.
                   </div>
                   ${summaryBar}`
                : `<div class="lede" style="margin-bottom:12pt;">
                     Continued — themes ${partIndex * 3 + 1}–${Math.min((partIndex + 1) * 3, themes.length)} of ${themes.length}.
                   </div>`
            }
            ${group.map(renderTheme).join("")}`,
            { footLeft, footRight: `vs ${rival.name}` },
          ),
        ),
      );
    });
  }

  // ── Competitor profiles ──────────────────────────────────────────────────

  if (view.competitors.length > 0) {
    out.push(
      ...chunk(view.competitors, 2).map((group, pageIndex) => {
        const cards = group
          .map((c) => {
            const quality = c.crawlQuality ?? "partial";
            const qualityColor =
              quality === "good"
                ? PALETTE.positive
                : quality === "weak"
                  ? "#ef4444"
                  : PALETTE.warn;

            const bullets = (
              items: Array<{ text: string; confidence: number }>,
              heading: string,
            ) =>
              items.length
                ? `<div style="margin-top:7pt;">
                     ${label(heading)}
                     <ul style="margin:0;padding-left:13pt;">
                       ${items.map((s) => `<li class="body-sm" style="margin-bottom:2.5pt;">${esc(s.text)}</li>`).join("")}
                     </ul>
                   </div>`
                : "";

            return `<div class="card avoid-break" style="margin-bottom:10pt;">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10pt;">
                <div style="min-width:0;">
                  <h3 class="h4" style="margin:0;">${esc(c.name)}</h3>
                  <div style="font-size:7.8pt;word-break:break-all;" class="faint">${esc(c.url.replace(/^https?:\/\//, ""))}</div>
                </div>
                ${badge(`crawl ${quality}`, qualityColor)}
              </div>

              <div style="margin-top:8pt;display:flex;align-items:center;gap:8pt;">
                <span class="label" style="margin:0;">Relevance</span>
                <div style="width:52pt;">${bar(c.relevanceScore, accent, 4)}</div>
                <span style="font-size:7.8pt;font-weight:600;font-variant-numeric:tabular-nums;" class="muted">${c.relevanceScore}%</span>
              </div>

              ${
                c.selectionReason
                  ? `<div style="margin-top:7pt;">
                       ${label("Why selected")}
                       <p class="body-sm" style="margin:0;">${esc(c.selectionReason)}</p>
                     </div>`
                  : ""
              }

              ${bullets(c.strengths, "Strengths")}
              ${bullets(c.weaknesses, "Weaknesses")}
            </div>`;
          })
          .join("");

        return sheet(
          `${pageHead("Who you're up against", `11.${pad2(pageIndex + 1)}`)}
          ${
            pageIndex === 0
              ? `<div class="lede">The sites Ghost compared you with, and why each one was picked.</div>`
              : ""
          }
          ${cards}`,
          { footLeft, footRight: "Competitors" },
        );
      }),
    );
  }

  // ── Feature matrix ───────────────────────────────────────────────────────

  if (view.metadata.canClaimMarketAverage && view.appendix.length > 0) {
    const rows = view.appendix
      .map((row) => {
        const hasOwner =
          row.owner.score != null &&
          row.owner.status !== "not_observed" &&
          row.owner.status !== "not_crawled";
        const you = hasOwner ? String(Math.round(row.owner.score!)) : "—";
        const market =
          row.marketScore != null ? String(Math.round(row.marketScore)) : "—";
        const gapNum = row.delta == null ? null : Math.round(row.delta);
        const gap =
          gapNum == null ? "—" : gapNum > 0 ? `+${gapNum}` : String(gapNum);
        const gapColor =
          gapNum == null
            ? PALETTE.faint
            : gapNum > 0
              ? PALETTE.positive
              : gapNum < 0
                ? "#ef4444"
                : PALETTE.muted;

        return `<tr>
          <td>${esc(row.label)}</td>
          <td style="width:70pt;">${hasOwner ? bar(row.owner.score!, accent, 4) : ""}</td>
          <td class="num">${you}</td>
          <td class="num">${market}</td>
          <td class="num" style="color:${gapColor};">${gap}</td>
        </tr>`;
      })
      .join("");

    out.push(
      sheet(
        `${pageHead("Full feature scorecard", "12")}

        <div class="lede">
          Every criterion Ghost scored, you against the market average.
          Unknowns are shown as — and are never counted as zero.
        </div>

        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th></th>
              <th style="text-align:right;">You</th>
              <th style="text-align:right;">Market</th>
              <th style="text-align:right;">Gap</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`,
        { footLeft, footRight: "Feature scorecard" },
      ),
    );
  }

  return out.join("");
}
