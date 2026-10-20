/**
 * Test suite for Requirement 1 — Goals & KPIs (G1-G5)
 *
 * Run: node --test tests/
 *
 * Two kinds of tests:
 *   A. Specification tests  — the targets in homepage-requirements.md are usable
 *                             (numeric, consistent, backed by tracking events).
 *   B. Calculation tests    — the KPI math is correct, deduplicated, bot-safe,
 *                             and reproducible on simulated traffic.
 *   C. Live measurement     — runs only when a deployed home page URL is supplied.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  KPI_TARGETS,
  computeMetrics,
  evaluateKPIs,
  evaluateDiagnostics,
  formatValue,
  validateTargetConsistency,
  projectFunnel,
  simulateEvents,
  simulateLcp,
  groupSessions,
} from '../lib/kpi.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const doc = readFileSync(join(root, 'homepage-requirements.md'), 'utf8');

function section(text, heading) {
  const start = text.indexOf(heading);
  assert.notEqual(start, -1, `missing section: ${heading}`);
  const rest = text.slice(start + heading.length);
  const end = rest.indexOf('\n---');
  return end === -1 ? rest : rest.slice(0, end);
}

/* ------------------------------------------------------------------ */
/* A. Specification tests                                              */
/* ------------------------------------------------------------------ */

test('TC-SPEC-01: all five KPIs from Section 1.1 are defined', () => {
  const goals = section(doc, '### 1.1 Primary business goals');
  for (const id of ['G1', 'G2', 'G3', 'G4', 'G5']) {
    assert.match(goals, new RegExp(`\\|\\s*${id}\\s*\\|`), `${id} missing from goals table`);
  }
});

test('TC-SPEC-02: every KPI has a numeric target', () => {
  const goals = section(doc, '### 1.1 Primary business goals');
  const rows = [...goals.matchAll(/^\|\s*(G\d)\s*\|([^|]+)\|([^|]+)\|/gm)];
  assert.equal(rows.length, 6, 'expected 5 goals + 1 diagnostic (G6)');

  for (const [, id, name, target] of rows) {
    assert.match(target, /\d/, `${id} (${name.trim()}) has no numeric target`);
  }
});

test('TC-SPEC-03: KPI engine targets match the document values', () => {
  const goals = section(doc, '### 1.1 Primary business goals');
  const docTargets = Object.fromEntries(
    [...goals.matchAll(/^\|\s*(G\d)\s*\|([^|]+)\|([^|]+)\|/gm)].map(([, id, , target]) => [
      id,
      Number((target.match(/(\d+(?:\.\d+)?)/) || [])[1]),
    ]),
  );

  for (const kpi of KPI_TARGETS) {
    assert.ok(Number.isFinite(docTargets[kpi.id]), `${kpi.id} target unreadable`);
    const expected = kpi.unit === 'seconds' ? docTargets[kpi.id] : docTargets[kpi.id] / 100;
    assert.ok(
      Math.abs(kpi.target - expected) < 1e-9,
      `${kpi.id} drift between doc (${expected}) and engine (${kpi.target})`,
    );
  }
});

test('TC-SPEC-04: every KPI is backed by tracked events listed in Section 12', () => {
  const analytics = section(doc, '## 12. Analytics & Tracking');
  const missing = [];

  for (const kpi of KPI_TARGETS) {
    for (const event of kpi.requiresEvents) {
      if (!analytics.includes(`\`${event}\``)) {
        missing.push(`${kpi.id} needs event "${event}"`);
      }
    }
  }

  assert.deepEqual(missing, [], `untracked KPI inputs:\n  - ${missing.join('\n  - ')}`);
});

test('TC-SPEC-05: measurement window and owner are stated', () => {
  const goals = section(doc, '### 1.1 Primary business goals');
  assert.match(goals, /90 days/i, 'no measurement window in the goals table');
});

test('TC-SPEC-06: targets are internally consistent (funnel sanity)', () => {
  const { ok, issues } = validateTargetConsistency();
  assert.ok(ok, `inconsistent targets:\n  - ${issues.join('\n  - ')}`);
});

test('TC-SPEC-07: guard against impossible or duplicate targets', () => {
  const bad = validateTargetConsistency([
    { id: 'G1', unit: 'ratio', target: 0.3 },
    { id: 'G2', unit: 'ratio', target: 0.5 },
    { id: 'G3', unit: 'ratio', target: 0.8 },
    { id: 'G4', unit: 'ratio', target: 1.2 },
    { id: 'G5', unit: 'seconds', target: 0 },
  ]);
  assert.equal(bad.ok, false);
  assert.ok(bad.issues.length >= 4, 'validator must catch every bad target');
});

test('TC-SPEC-08: quick-add exclusion and G6 diagnostic are documented', () => {
  const goals = section(doc, '### 1.1 Primary business goals');
  assert.match(goals, /excluded from G1/i, 'doc must state that quick_add is excluded from G1');
  assert.match(goals, /G6/, 'doc must define the G6 diagnostic');
  assert.match(goals, /diagnostic/i, 'doc must label G6 as diagnostic');
  assert.match(goals, /8\s*[–-]\s*12%/, 'G6 band 8-12% missing');
});

/* ------------------------------------------------------------------ */
/* B. Calculation tests                                                */
/* ------------------------------------------------------------------ */

/**
 * Fixture with known-good traffic:
 *   1,000 sessions | 400 PDP entries (40%) | 20 orders (2%)
 *   45 signups (4.5%) | 300 bounces (30%) | LCP p75 = 2.1s
 */
const healthyTraffic = [
  ...Array.from({ length: 1000 }, (_, i) => ({ sessionId: `s${i}`, type: 'view_home', ts: 1_000 + i })),
  ...Array.from({ length: 1000 }, (_, i) => ({ sessionId: `s${i}`, type: 'web_vitals', metric: 'LCP', value: 2_100 })),
  ...Array.from({ length: 300 }, (_, i) => ({
    sessionId: `s${400 + i}`,
    type: 'scroll_depth',
    ts: 4_000 + i,
    percent: 60,
  })),
  ...Array.from({ length: 400 }, (_, i) => ({ sessionId: `s${i}`, type: 'product_card_click', ts: 5_000 + i })),
  ...Array.from({ length: 400 }, (_, i) => ({
    sessionId: `s${i}`,
    type: 'page_view',
    ts: 5_500 + i,
    page_type: 'pdp',
  })),
  ...Array.from({ length: 45 }, (_, i) => ({ sessionId: `s${i}`, type: 'newsletter_submit', ts: 7_000 + i })),
  ...Array.from({ length: 20 }, (_, i) => ({ sessionId: `s${i}`, type: 'purchase', ts: 9_000 + i, value: 999 })),
];

test('TC-G1-01: home -> PDP CTR counts sessions that view a PDP page', () => {
  const metrics = computeMetrics(healthyTraffic);
  assert.equal(metrics.sessions, 1000);
  assert.equal(metrics.homeToPdpCtr, 0.4);
});

test('TC-G1-02: repeated PDP views in one session count once', () => {
  const events = [
    { sessionId: 'a', type: 'view_home', ts: 1 },
    { sessionId: 'a', type: 'page_view', ts: 2, page_type: 'pdp' },
    { sessionId: 'a', type: 'page_view', ts: 3, page_type: 'pdp' },
    { sessionId: 'a', type: 'page_view', ts: 4, page_type: 'pdp' },
    { sessionId: 'b', type: 'view_home', ts: 5 },
  ];
  const metrics = computeMetrics(events);
  assert.equal(metrics.homeToPdpCtr, 0.5);
});

test('TC-G1-03: click alone is not enough; destination page decides', () => {
  const events = [
    // clicked a card but bounced before the PDP rendered
    { sessionId: 'a', type: 'view_home', ts: 1 },
    { sessionId: 'a', type: 'product_card_click', ts: 2 },
    // went to a collection page only
    { sessionId: 'b', type: 'view_home', ts: 3 },
    { sessionId: 'b', type: 'concern_card_click', ts: 4 },
    { sessionId: 'b', type: 'page_view', ts: 5, page_type: 'collection' },
    // actually reached a PDP
    { sessionId: 'c', type: 'view_home', ts: 6 },
    { sessionId: 'c', type: 'page_view', ts: 7, page_type: 'pdp' },
    // quick-add, no PDP
    { sessionId: 'd', type: 'view_home', ts: 8 },
    { sessionId: 'd', type: 'quick_add', ts: 9 },
  ];
  assert.equal(computeMetrics(events).homeToPdpCtr, 0.25);
});

test('TC-G1-04: quick-add never inflates PDP CTR (decision regression)', () => {
  const events = [
    { sessionId: 'a', type: 'view_home', ts: 1 },
    { sessionId: 'a', type: 'quick_add', ts: 2 },
    { sessionId: 'b', type: 'view_home', ts: 3 },
    { sessionId: 'b', type: 'quick_add', ts: 4 },
    { sessionId: 'c', type: 'view_home', ts: 5 },
    { sessionId: 'c', type: 'page_view', ts: 6, page_type: 'pdp' },
  ];
  const metrics = computeMetrics(events);
  assert.equal(metrics.homeToPdpCtr, 1 / 3);
  assert.equal(metrics.quickAddRate, 2 / 3);
  assert.ok(metrics.homeToPdpCtr < metrics.quickAddRate, 'quick-add heavy traffic must not show a high CTR');
});

test('TC-G2-01: conversion rate counts orders once per session', () => {
  const events = [
    { sessionId: 'a', type: 'view_home', ts: 1 },
    { sessionId: 'a', type: 'purchase', ts: 2 },
    { sessionId: 'a', type: 'purchase', ts: 3 },
    { sessionId: 'b', type: 'view_home', ts: 4 },
  ];
  assert.equal(computeMetrics(events).conversionRate, 0.5);
});

test('TC-G2-02: guests and COD orders are included', () => {
  const events = [
    { sessionId: 'guest', type: 'view_home', ts: 1, userId: null },
    { sessionId: 'guest', type: 'purchase', ts: 2, payment: 'COD', userId: null },
  ];
  assert.equal(computeMetrics(events).conversionRate, 1);
});

test('TC-G3-01: signup rate includes email and WhatsApp channels', () => {
  const events = [
    { sessionId: 'a', type: 'view_home', ts: 1 },
    { sessionId: 'a', type: 'newsletter_submit', ts: 2, channel: 'email' },
    { sessionId: 'b', type: 'view_home', ts: 3 },
    { sessionId: 'b', type: 'newsletter_submit', ts: 4, channel: 'whatsapp' },
    { sessionId: 'c', type: 'view_home', ts: 5 },
    { sessionId: 'd', type: 'view_home', ts: 6 },
  ];
  assert.equal(computeMetrics(events).signupRate, 0.5);
});

test('TC-G4-01: bounce = single page view, <10s, no engagement', () => {
  const events = [
    { sessionId: 'bounce', type: 'view_home', ts: 1_000 },
    { sessionId: 'bounce', type: 'view_home', ts: 2_000 },
    { sessionId: 'engaged', type: 'view_home', ts: 5_000 },
    { sessionId: 'engaged', type: 'view_home', ts: 20_000 },
    { sessionId: 'scroller', type: 'view_home', ts: 30_000 },
    { sessionId: 'scroller', type: 'scroll_depth', ts: 33_000, percent: 50 },
    { sessionId: 'reader', type: 'view_home', ts: 40_000 },
    { sessionId: 'reader', type: 'faq_open', ts: 41_000 },
  ];
  const metrics = computeMetrics(events);
  assert.equal(metrics.sessions, 4);
  assert.equal(metrics.bounceRate, 0.25, 'only "bounce" should be counted');
});

test('TC-G4-02: a 60%+ scroll is engagement, 25% is not', () => {
  const events = [
    { sessionId: 'deep', type: 'view_home', ts: 1 },
    { sessionId: 'deep', type: 'scroll_depth', ts: 2, percent: 75 },
    { sessionId: 'shallow', type: 'view_home', ts: 3 },
    { sessionId: 'shallow', type: 'scroll_depth', ts: 4, percent: 25 },
  ];
  assert.equal(computeMetrics(events).bounceRate, 0.5);
});

test('TC-G5-01: LCP p75 is computed in seconds', () => {
  const events = [
    { sessionId: '1', type: 'web_vitals', metric: 'LCP', value: 1000 },
    { sessionId: '2', type: 'web_vitals', metric: 'LCP', value: 2000 },
    { sessionId: '3', type: 'web_vitals', metric: 'LCP', value: 3000 },
    { sessionId: '4', type: 'web_vitals', metric: 'LCP', value: 4000 },
  ];
  assert.equal(computeMetrics(events).lcpP75, 3);
});

test('TC-G5-02: non-LCP vitals (CLS, INP) are ignored', () => {
  const events = [
    { sessionId: '1', type: 'web_vitals', metric: 'LCP', value: 1800 },
    { sessionId: '1', type: 'web_vitals', metric: 'CLS', value: 2 },
    { sessionId: '1', type: 'web_vitals', metric: 'INP', value: 900 },
  ];
  assert.equal(computeMetrics(events).lcpP75, 1.8);
});

/* ------------------------------------------------------------------ */
/* C. Threshold, safety and simulation tests                           */
/* ------------------------------------------------------------------ */

test('TC-THR-01: on-target values respect comparator semantics', () => {
  const atTarget = {
    sessions: 100,
    homeToPdpCtr: 0.35,
    conversionRate: 0.018,
    signupRate: 0.04,
    bounceRate: 0.55, // "< 55%": exactly 55% is a miss
    lcpP75: 2.5,
  };
  const statuses = evaluateKPIs(atTarget).map((kpi) => `${kpi.id}:${kpi.status}`);
  assert.deepEqual(statuses, ['G1:PASS', 'G2:PASS', 'G3:PASS', 'G4:FAIL', 'G5:PASS']);

  const justUnder = { ...atTarget, bounceRate: 0.549 };
  assert.equal(evaluateKPIs(justUnder).find((kpi) => kpi.id === 'G4').status, 'PASS');
});

test('TC-THR-02: below-target values FAIL and are reported', () => {
  const metrics = {
    sessions: 100,
    homeToPdpCtr: 0.2,
    conversionRate: 0.01,
    signupRate: 0.02,
    bounceRate: 0.7,
    lcpP75: 3.4,
  };
  const results = evaluateKPIs(metrics);
  assert.deepEqual(
    results.map((r) => r.status),
    ['FAIL', 'FAIL', 'FAIL', 'FAIL', 'FAIL'],
  );
  assert.match(results[0].formatted, /20\.00%/);
});

test('TC-THR-03: healthy traffic meets or beats all five targets', () => {
  const metrics = computeMetrics(healthyTraffic);
  const results = evaluateKPIs(metrics);
  const failures = results.filter((r) => r.status !== 'PASS');
  assert.deepEqual(failures, [], `failed KPIs: ${failures.map((r) => r.id).join(', ')}`);
});

test('TC-SAFE-01: zero sessions produces zeros, not NaN', () => {
  const metrics = computeMetrics([]);
  assert.equal(metrics.sessions, 0);
  assert.equal(metrics.homeToPdpCtr, 0);
  assert.equal(metrics.lcpP75, null);
  const results = evaluateKPIs(metrics);
  assert.deepEqual(
    results.map((r) => r.status),
    ['NOT MEASURED', 'NOT MEASURED', 'NOT MEASURED', 'NOT MEASURED', 'NOT MEASURED'],
    'an empty dataset must never report PASS',
  );
  assert.equal(results.find((r) => r.id === 'G5').status, 'NOT MEASURED');
});

test('TC-SAFE-02: bot traffic is excluded from all KPIs', () => {
  const events = [
    { sessionId: 'human', type: 'view_home', ts: 1 },
    { sessionId: 'bot-1', type: 'view_home', ts: 2, isBot: true },
    { sessionId: 'bot-1', type: 'product_card_click', ts: 3, isBot: true },
    { sessionId: 'bot-2', type: 'view_home', ts: 4, userAgent: 'Googlebot/2.1' },
  ];
  const metrics = computeMetrics(events);
  assert.equal(metrics.sessions, 1);
  assert.equal(metrics.homeToPdpCtr, 0);
});

test('TC-SAFE-03: malformed events do not corrupt the math', () => {
  const events = [
    { sessionId: 'a', type: 'view_home', ts: 1 },
    { sessionId: 'a', type: 'web_vitals', metric: 'LCP', value: 'slow' },
    { sessionId: 'a', type: 'scroll_depth', ts: 2, percent: 'abc' },
    { sessionId: 'a', type: 'page_view', ts: 3, page_type: 'pdp' },
  ];
  const metrics = computeMetrics(events);
  assert.equal(metrics.homeToPdpCtr, 1);
  assert.equal(metrics.lcpP75, null);
});

test('TC-SIM-01: 10k simulated sessions reproduce known probabilities', () => {
  const events = simulateEvents({ sessions: 10_000, pPdp: 0.4, pOrder: 0.02, pSignup: 0.06, pBounce: 0.45, seed: 42 });
  const metrics = computeMetrics(events);

  assert.equal(metrics.sessions, 10_000);
  assert.ok(Math.abs(metrics.homeToPdpCtr - 0.4 * 0.55) < 0.02, `CTR drift: ${metrics.homeToPdpCtr}`);
  assert.ok(Math.abs(metrics.conversionRate - 0.02 * 0.55) < 0.01, `CR drift: ${metrics.conversionRate}`);
  assert.ok(Math.abs(metrics.signupRate - 0.06 * 0.55) < 0.01, `signup drift: ${metrics.signupRate}`);
  assert.ok(Math.abs(metrics.bounceRate - 0.45) < 0.02, `bounce drift: ${metrics.bounceRate}`);
});

test('TC-SIM-02: the same seed always yields the same numbers', () => {
  const a = computeMetrics(simulateEvents({ sessions: 5000, seed: 99 }));
  const b = computeMetrics(simulateEvents({ sessions: 5000, seed: 99 }));
  assert.deepEqual(a, b);
});

test('TC-SIM-03: simulated LCP p75 stays within budget', () => {
  const metrics = computeMetrics([...simulateLcp({ sessions: 2000, median: 1.6, spread: 0.5 }), { sessionId: 'x', type: 'view_home', ts: 1 }]);
  assert.ok(metrics.lcpP75 <= 2.5, `LCP p75 ${metrics.lcpP75}s exceeds budget`);
  const results = evaluateKPIs(metrics);
  assert.equal(results.find((r) => r.id === 'G5').status, 'PASS');
});

test('TC-REPORT-01: funnel projection is ordered and adds up', () => {
  const metrics = computeMetrics(healthyTraffic);
  const funnel = projectFunnel(metrics.sessions, metrics);
  assert.equal(funnel.sessions, 1000);
  assert.equal(funnel.productPageVisits, 400);
  assert.equal(funnel.orders, 20);
  assert.equal(funnel.signups, 45);
  assert.ok(funnel.bounced <= funnel.sessions);
  assert.ok(funnel.orders <= funnel.productPageVisits);
});

test('TC-REPORT-02: formatting is human readable', () => {
  assert.equal(formatValue(0.4, 'ratio'), '40.00%');
  assert.equal(formatValue(2.456, 'seconds'), '2.46 s');
  assert.equal(formatValue(null, 'ratio'), 'n/a');
});

test('TC-SESSION-01: session grouping is stable across interleaved events', () => {
  const events = [
    { sessionId: 'a', type: 'view_home', ts: 5 },
    { sessionId: 'b', type: 'view_home', ts: 6 },
    { sessionId: 'a', type: 'purchase', ts: 7 },
  ];
  const sessions = groupSessions(events);
  assert.equal(sessions.size, 2);
  assert.equal(sessions.get('a').events.length, 2);
});

test('TC-G6-01: quick-add rate is computed independently of G1', () => {
  const events = [
    { sessionId: 'a', type: 'view_home', ts: 1 },
    { sessionId: 'a', type: 'quick_add', ts: 2 },
    { sessionId: 'b', type: 'view_home', ts: 3 },
    { sessionId: 'b', type: 'quick_add', ts: 4 },
    { sessionId: 'c', type: 'view_home', ts: 5 },
    { sessionId: 'd', type: 'view_home', ts: 6 },
  ];
  assert.equal(computeMetrics(events).quickAddRate, 0.5);
});

test('TC-G6-02: diagnostic band classification', () => {
  const band = (rate) => evaluateDiagnostics({ ...computeMetrics(healthyTraffic), quickAddRate: rate })[0].status;
  assert.equal(band(0.05), 'BELOW BAND');
  assert.equal(band(0.1), 'IN BAND');
  assert.equal(band(0.2), 'ABOVE BAND');
  assert.equal(evaluateDiagnostics(computeMetrics([]))[0].status, 'NOT MEASURED');
});

test('TC-G6-03: G6 never enters the launch gate', () => {
  const gate = evaluateKPIs(computeMetrics(healthyTraffic)).map((kpi) => kpi.id);
  assert.deepEqual(gate, ['G1', 'G2', 'G3', 'G4', 'G5']);
});

test('TC-REPORT-03: quick-add purchase can exceed PDP visits without breaking metrics', () => {
  const events = [
    { sessionId: 'a', type: 'view_home', ts: 1 },
    { sessionId: 'a', type: 'quick_add', ts: 2 },
    { sessionId: 'a', type: 'purchase', ts: 3 },
  ];
  const metrics = computeMetrics(events);
  assert.equal(metrics.homeToPdpCtr, 0);
  assert.equal(metrics.conversionRate, 1);
  const funnel = projectFunnel(1, metrics);
  assert.equal(funnel.orders, 1);
  assert.equal(funnel.productPageVisits, 0);
});

/* ------------------------------------------------------------------ */
/* D. Live measurement (opt-in)                                        */
/* ------------------------------------------------------------------ */

test('TC-LIVE-01: live home page measurement', { skip: !process.env.HOME_URL && 'set HOME_URL to run against a deployed page' }, async () => {
  const url = process.env.HOME_URL;
  const response = await fetch(url);
  assert.equal(response.status, 200, `${url} did not return 200`);
  const html = await response.text();
  assert.match(html, /<(h1|main)/i, 'no h1/main element found');
});
