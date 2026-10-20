/**
 * Test suite for Requirement 14 — Acceptance Criteria (release gate)
 *
 * Run: node --test tests/acceptance.test.mjs
 *
 * A. Document — the 12 checklist items are complete and consistent with other sections.
 * B. Gate     — every criterion fails at the right threshold.
 * C. Release  — the gate can approve, block and explain.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { BREAKPOINTS, THRESHOLDS, CRITERIA, evaluateAcceptance, PASSING_RESULTS } from '../lib/acceptance.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const doc = readFileSync(join(root, 'homepage-requirements.md'), 'utf8');

function section(text, heading) {
  const start = text.indexOf(heading);
  if (start === -1) return '';
  const rest = text.slice(start + heading.length);
  const end = rest.search(/\n---/);
  return end === -1 ? rest : rest.slice(0, end);
}

const acceptanceText = section(doc, '## 14. Acceptance Criteria');
const checkedItems = [...acceptanceText.matchAll(/^- \[ \] (.+)$/gm)].map((match) => match[1].trim());

const failing = (patch) => evaluateAcceptance({ ...PASSING_RESULTS, ...patch });

/* ---------------- A. Document ---------------- */

test('TC-ACPT-01: twelve checklist items are present', () => {
  assert.equal(checkedItems.length, 12, `found ${checkedItems.length} items`);
  assert.equal(CRITERIA.length, 12);
});

test('TC-ACPT-02: every item is a checkbox, i.e. verifiable', () => {
  assert.equal(checkedItems.length, (acceptanceText.match(/- \[ \]/g) ?? []).length);
});

test('TC-ACPT-03: render item covers all five breakpoints', () => {
  const item = checkedItems.find((entry) => /render/i.test(entry));
  for (const width of ['360', '768', '1024', '1280', '1440']) {
    assert.ok(item.includes(width), `acceptance is missing ${width}px`);
  }
  assert.deepEqual(BREAKPOINTS, [360, 768, 1024, 1280, 1440]);
});

test('TC-ACPT-04: Lighthouse thresholds match the gate', () => {
  const item = checkedItems.find((entry) => /Lighthouse/i.test(entry));
  assert.match(item, /≥ 85/);
  assert.match(item, /≥ 95/);
  assert.deepEqual(THRESHOLDS.lighthouse, { performance: 85, accessibility: 95, seo: 95, bestPractices: 95 });
});

test('TC-ACPT-05: the vitals item covers LCP, CLS and INP', () => {
  const item = checkedItems.find((entry) => /hero image\/text/i.test(entry)) ?? '';
  assert.match(item, /2\.5/);
  assert.match(item, /CLS/i, 'CLS is not part of acceptance');
  assert.match(item, /INP/i, 'INP is not part of acceptance');
  assert.equal(THRESHOLDS.cls, 0.1);
  assert.equal(THRESHOLDS.inpMs, 200);
});

test('TC-ACPT-06: footer item requires disclaimer and FSSAI', () => {
  const item = checkedItems.find((entry) => /footer/i.test(entry));
  assert.match(item, /Disclaimer/i);
  assert.match(item, /FSSAI/i);
});

test('TC-ACPT-07: consent gate is part of acceptance', () => {
  assert.ok(checkedItems.some((entry) => /consent banner/i.test(entry)));
});

test('TC-ACPT-08: structured data validation is part of acceptance', () => {
  assert.ok(checkedItems.some((entry) => /Rich Results/i.test(entry)));
});

test('TC-ACPT-09: screen-reader item covers labels and heading order', () => {
  const item = checkedItems.find((entry) => /Screen-reader/i.test(entry));
  assert.match(item, /unlabeled/i);
  assert.match(item, /headings in order/i);
});

test('TC-ACPT-10: CMS editability is measured without a developer', () => {
  const item = checkedItems.find((entry) => /CMS editor/i.test(entry));
  assert.match(item, /without developer help/i);
  assert.equal(THRESHOLDS.cmsBlocks, 5);
});

test('TC-ACPT-11: no 404s and every claim sourced', () => {
  assert.ok(checkedItems.some((entry) => /no 404/i.test(entry)));
  assert.ok(checkedItems.some((entry) => /claim .*source|source .*claim/i.test(entry)));
});

/* ---------------- B. Gate ---------------- */

test('TC-ACPT-12: a fully passing run is approved', () => {
  const result = evaluateAcceptance(PASSING_RESULTS);
  assert.equal(result.ok, true, JSON.stringify(result.failed));
  assert.equal(result.summary, '12/12 criteria passed');
});

test('TC-ACPT-13: one missing section at one breakpoint blocks release', () => {
  const result = failing({ rendered: { ...PASSING_RESULTS.rendered, 768: 15 } });
  assert.equal(result.ok, false);
  assert.equal(result.failed[0].id, 'AC-01');
  assert.match(result.failed[0].detail, /15\/16 sections at 768px/);
});

test('TC-ACPT-14: horizontal scroll blocks release', () => {
  const result = failing({ horizontalScroll: true });
  assert.equal(result.failed[0].id, 'AC-02');
});

test('TC-ACPT-15: Lighthouse boundaries — 85/95 pass, one point below fails', () => {
  assert.equal(failing({ lighthouse: { performance: 85, accessibility: 95, seo: 95, bestPractices: 95 } }).ok, true);
  assert.equal(failing({ lighthouse: { performance: 84, accessibility: 95, seo: 95, bestPractices: 95 } }).ok, false);
  assert.equal(failing({ lighthouse: { performance: 85, accessibility: 94, seo: 95, bestPractices: 95 } }).ok, false);
  assert.equal(failing({ lighthouse: { performance: 85, accessibility: 95, seo: 94, bestPractices: 95 } }).ok, false);
  assert.equal(failing({ lighthouse: { performance: 85, accessibility: 95, seo: 95, bestPractices: 94 } }).ok, false);
});

test('TC-ACPT-16: LCP 2500 passes, 2501 fails', () => {
  assert.equal(failing({ lcpMs: 2500 }).ok, true);
  assert.equal(failing({ lcpMs: 2501 }).ok, false);
});

test('TC-ACPT-17: CLS 0.1 passes, 0.11 fails', () => {
  assert.equal(failing({ cls: 0.1 }).ok, true);
  assert.equal(failing({ cls: 0.11 }).ok, false);
});

test('TC-ACPT-18: INP 200 passes, 201 fails', () => {
  assert.equal(failing({ inpMs: 200 }).ok, true);
  assert.equal(failing({ inpMs: 201 }).ok, false);
});

test('TC-ACPT-19: cart badge or keyboard drawer failure blocks release', () => {
  assert.equal(failing({ cart: { badgeUpdates: false, keyboardDrawer: true } }).failed[0].id, 'AC-05');
  assert.equal(failing({ cart: { badgeUpdates: true, keyboardDrawer: false } }).failed[0].id, 'AC-05');
});

test('TC-ACPT-20: a broken link blocks release and is named', () => {
  const result = failing({ links404: ['/products/magnesium'] });
  assert.equal(result.ok, false);
  assert.match(result.failed[0].detail, /magnesium/);
});

test('TC-ACPT-21: an unsourced claim blocks release', () => {
  assert.equal(failing({ claimsUnsourced: 1 }).failed[0].id, 'AC-07');
});

test('TC-ACPT-22: missing disclaimer or FSSAI blocks release', () => {
  assert.equal(failing({ footer: { disclaimer: false, fssai: true } }).failed[0].id, 'AC-08');
  assert.equal(failing({ footer: { disclaimer: true, fssai: false } }).failed[0].id, 'AC-08');
});

test('TC-ACPT-23: analytics firing before consent blocks release', () => {
  assert.equal(failing({ consentBlocksAnalytics: false }).failed[0].id, 'AC-09');
});

test('TC-ACPT-24: invalid structured data blocks release', () => {
  assert.equal(failing({ schemaValid: false }).failed[0].id, 'AC-10');
});

test('TC-ACPT-25: unlabeled buttons or broken heading order block release', () => {
  assert.equal(failing({ unlabeledButtons: 2 }).failed[0].id, 'AC-11');
  assert.equal(failing({ headingsOrdered: false }).failed[0].id, 'AC-11');
});

test('TC-ACPT-26: fewer than five CMS blocks blocks release', () => {
  assert.equal(failing({ cmsEditableBlocks: 4 }).failed[0].id, 'AC-12');
  assert.equal(failing({ cmsEditableBlocks: 5 }).ok, true);
});

/* ---------------- C. Release behaviour ---------------- */

test('TC-ACPT-27: unhealthy defaults fail closed', () => {
  const result = evaluateAcceptance({});
  assert.equal(result.ok, false);
  assert.ok(result.failed.length >= 10, `only ${result.failed.length} failures on empty input`);
});

test('TC-ACPT-28: multiple failures are all reported', () => {
  const result = evaluateAcceptance({
    ...PASSING_RESULTS,
    rendered: { 360: 10 },
    lcpMs: 4000,
    footer: { disclaimer: false, fssai: false },
  });
  assert.ok(result.failed.length >= 4);
  const ids = new Set(result.failed.map((entry) => entry.id));
  assert.ok(ids.has('AC-01') && ids.has('AC-04') && ids.has('AC-08'));
});

test('TC-ACPT-29: passed list and summary are accurate', () => {
  const result = failing({ lcpMs: 9000 });
  assert.equal(result.passed.length, 11);
  assert.equal(result.summary, '11/12 criteria passed');
  assert.equal(result.failed[0].id, 'AC-04');
});

test('TC-ACPT-30: every failure names a criterion and a measurement', () => {
  const result = failing({ inpMs: 500 });
  for (const entry of result.failed) {
    assert.ok(entry.label.length > 10);
    assert.ok(entry.detail.includes('500'));
  }
});
