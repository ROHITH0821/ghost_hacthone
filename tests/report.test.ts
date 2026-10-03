import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReportHtml } from '../src/lib/report/reportPdf';
import { toGhostReport } from '../src/lib/ghost-engine/adapter';
import { validateAggregation } from '../src/lib/ghost-engine/validate-output';
import type { AuditResult } from '../src/lib/ghost-engine/pipeline';
import { pack, flow, journey, report } from './fixtures';

test('PDF output preserves simulated-evidence caveats and removes legacy drop-off visualizations', () => {
  const result: AuditResult = {
    flows: [flow], journeys: [journey], report: validateAggregation(report, [journey]), fixes: [],
    score: { value: 62, version: '2', band: 'NeedsImprovement', dimensions: [] },
  };
  const ui = toGhostReport('test', 'https://studio.example', 'studio.example', pack, result);
  // Stored historical reports may still contain the old unsupported percentage.
  ui.journey[0].dropOffRate = 72;
  ui.leaks[0].whatIsWrong = '<script>untrusted evidence</script>';
  const html = buildReportHtml(ui, null);
  assert.match(html, /Simulated customer journeys/);
  assert.match(html, /ranked by simulated friction/);
  assert.doesNotMatch(html, /72%|72\s*%/);
  assert.doesNotMatch(html, /<script>untrusted/);
  assert.match(html, /&lt;script&gt;untrusted/);
  assert.doesNotMatch(html, /move the score more than the rest combined|places a real customer would leave/);
});
