import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHandoffDraft, handoffText, HandoffInputSchema, HandoffSnapshotSchema, safePageUrl } from '../src/lib/fixes/handoff';
import type { GhostReport } from '../src/lib/types';

const fix = { title: 'Clarify package pricing', category: 'pricing', pageUrl: null, leakId: 'leak-1', fixId: null, fixContent: 'Include [confirmed services].', note: 'PRIVATE OWNER NOTE', userId: 'PRIVATE ID' };
const report = { url: 'https://studio.example', domain: 'studio.example', leaks: [{ id: 'leak-1', whatIsWrong: 'Package inclusions are unclear.', category: '/services', whyCustomersLeave: 'PRIVATE QUOTE', impact: 'PRIVATE ANALYTICS' }], fixes: [] } as unknown as GhostReport;

test('handoff uses an allowlist and an observed path, excluding private report fields', () => {
  const result = buildHandoffDraft(fix, report, 'studio.example');
  assert.equal(result.pageUrl, 'https://studio.example/services');
  assert.equal(result.issue, 'Package inclusions are unclear.');
  assert.equal(JSON.stringify(result).includes('PRIVATE'), false);
  assert.equal(result.acceptanceCriteria.length, 4);
  assert.ok(HandoffSnapshotSchema.safeParse(result).success);
});

test('page labels never become guessed URLs and owner must confirm a URL before publication', () => {
  const labelReport = { ...report, leaks: [{ ...report.leaks[0], category: 'Services' }] };
  const draft = buildHandoffDraft(fix, labelReport, 'studio.example');
  assert.equal(draft.pageUrl, '');
  assert.equal(HandoffSnapshotSchema.safeParse(draft).success, false);
  const found = buildHandoffDraft({ ...fix, pageUrl: 'https://studio.example/services?token=private#account' }, report, 'studio.example');
  assert.equal(found.pageUrl, 'https://studio.example/services');
});

test('publication rejects executable links, extra fields and empty or oversized checklists', () => {
  const { version: _version, title: _title, domain: _domain, ...input } = buildHandoffDraft(fix, report, 'studio.example');
  for (const pageUrl of ['javascript:alert(1)', 'data:text/html,bad', '//example.com', 'https://user:password@example.com']) {
    assert.equal(safePageUrl(pageUrl), null);
    assert.equal(HandoffInputSchema.safeParse({ ...input, pageUrl }).success, false);
  }
  assert.equal(HandoffInputSchema.safeParse({ ...input, userId: 'someone-else' }).success, false);
  assert.equal(HandoffInputSchema.safeParse({ ...input, acceptanceCriteria: [] }).success, false);
  assert.equal(HandoffInputSchema.safeParse({ ...input, acceptanceCriteria: Array(13).fill('check') }).success, false);
});

test('growth-kit handoffs map back to the related finding and copy a complete checklist', () => {
  const kit = { id: 'kit-1', title: 'Price card', content: 'Reviewed price copy', description: 'Explain inclusions', category: 'Price Card', icon: '' };
  const related = { ...report, fixes: [kit], leaks: [{ ...report.leaks[0], fix: { title: kit.title, content: kit.content } }] };
  const result = buildHandoffDraft({ ...fix, leakId: null, fixId: 'kit-1' }, related, 'studio.example');
  assert.equal(result.pageUrl, 'https://studio.example/services');
  assert.equal(result.issue, 'Package inclusions are unclear.');
  assert.match(handoffText(result), /Acceptance checklist\n- \[ \]/);
  assert.equal(handoffText(result).includes('PRIVATE'), false);
});
