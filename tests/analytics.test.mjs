/**
 * Test suite for Requirement 12 — Analytics & Tracking
 *
 * Run: node --test tests/analytics.test.mjs
 *
 * A. Document   — every event has a trigger and params, and covers all consumers.
 * B. Validation — required params, enums, naming, currency, PII.
 * C. Consent    — nothing leaves the browser without permission.
 * D. Integration— KPI and persona signals are all in the plan.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  EVENT_SCHEMA,
  isSnakeCase,
  findPii,
  validateEvent,
  track,
  auditEventLog,
  missingFromPlan,
} from '../lib/analytics.mjs';
import { KPI_TARGETS, DIAGNOSTIC_KPIS } from '../lib/kpi.mjs';
import { PERSONAS } from '../lib/persona.mjs';

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

const analyticsText = section(doc, '## 12. Analytics & Tracking');
const eventRows = analyticsText
  .split(/\r?\n/)
  .filter((line) => /^\|\s*`/.test(line))
  .map((line) => {
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    const names = [...cells[0].matchAll(/`([a-z_]+)`/g)].map((match) => match[1]);
    return { names, trigger: cells[1] ?? '', params: cells[2] ?? '' };
  });
const documented = eventRows.flatMap((row) => row.names);

const goodEvent = { name: 'purchase', params: { order_id: 'A1', value: 1299, currency: 'INR', payment_method: 'UPI' } };

/* ---------------- A. Document ---------------- */

test('TC-ANLT-01: the event plan documents at least 17 events', () => {
  assert.ok(documented.length >= 17, `only ${documented.length} events documented`);
  for (const required of ['view_home', 'page_view', 'purchase', 'web_vitals', 'quick_add', 'bundle_click']) {
    assert.ok(documented.includes(required), `missing event: ${required}`);
  }
});

test('TC-ANLT-02: every event row has a trigger and params', () => {
  for (const row of eventRows) {
    assert.ok(row.trigger.length > 2, `${row.names[0]}: trigger missing`);
    assert.ok(row.params.length > 2, `${row.names[0]}: params missing`);
  }
});

test('TC-ANLT-03: event names follow snake_case', () => {
  for (const name of documented) {
    assert.equal(isSnakeCase(name), true, `bad event name: ${name}`);
  }
});

test('TC-ANLT-04: page_type enum covers home, collection, pdp and cart', () => {
  const row = eventRows.find((entry) => entry.names.includes('page_view'));
  for (const value of ['home', 'collection', 'pdp', 'cart']) {
    assert.ok(row.params.includes(value), `page_type missing: ${value}`);
  }
});

test('TC-ANLT-05: purchase params allow attribution and payment analysis', () => {
  const row = eventRows.find((entry) => entry.names.includes('purchase'));
  for (const param of ['order_id', 'value', 'currency', 'payment_method']) {
    assert.ok(row.params.includes(param), `purchase missing: ${param}`);
  }
});

test('TC-ANLT-06: web_vitals records metric, value and page', () => {
  const row = eventRows.find((entry) => entry.names.includes('web_vitals'));
  for (const param of ['metric', 'value', 'page']) {
    assert.ok(row.params.includes(param), `web_vitals missing: ${param}`);
  }
});

test('TC-ANLT-07: consent gating is stated', () => {
  assert.match(analyticsText, /gated behind consent/i);
});

test('TC-ANLT-08: server-side tracking is considered', () => {
  assert.match(analyticsText, /server-side/i);
});

test('TC-ANLT-09: the plan forbids personal data in params', () => {
  assert.match(analyticsText, /no pii|personal data/i, 'PII prohibition missing');
});

test('TC-ANLT-10: search is measurable', () => {
  assert.ok(documented.includes('search_submit'), 'no search event: zero-result rate is invisible');
});

test('TC-ANLT-11: PDP add-to-cart is measurable', () => {
  assert.ok(documented.includes('add_to_cart'), 'no add_to_cart: PDP funnel cannot be built');
});

/* ---------------- B. Validation ---------------- */

test('TC-ANLT-12: a valid purchase event passes', () => {
  assert.equal(validateEvent(goodEvent).ok, true);
});

test('TC-ANLT-13: unknown events are rejected', () => {
  const result = validateEvent({ name: 'custom_click', params: {} });
  assert.equal(result.ok, false);
  assert.equal(result.issues[0].rule, 'unknown');
});

test('TC-ANLT-14: missing required params are reported per param', () => {
  const result = validateEvent({ name: 'purchase', params: { order_id: 'A1' } });
  assert.equal(result.ok, false);
  assert.equal(result.issues.filter((issue) => issue.rule === 'param').length, 3);
});

test('TC-ANLT-15: invalid enum values are rejected', () => {
  assert.equal(validateEvent({ name: 'page_view', params: { page_type: 'landing' } }).ok, false);
  assert.equal(validateEvent({ name: 'page_view', params: { page_type: 'pdp' } }).ok, true);
});

test('TC-ANLT-16: value must be numeric', () => {
  const result = validateEvent({ name: 'quick_add', params: { product_id: 'p1', value: '1299', currency: 'INR' } });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.rule === 'type'));
});

test('TC-ANLT-17: currency must be INR', () => {
  const result = validateEvent({ name: 'quick_add', params: { product_id: 'p1', value: 1299, currency: 'USD' } });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.rule === 'currency'));
});

test('TC-ANLT-18: scroll_depth only accepts 25/50/75/100', () => {
  for (const percent of [25, 50, 75, 100]) {
    assert.equal(validateEvent({ name: 'scroll_depth', params: { percent } }).ok, true);
  }
  assert.equal(validateEvent({ name: 'scroll_depth', params: { percent: 33 } }).ok, false);
});

test('TC-ANLT-19: web_vitals metric enum is enforced', () => {
  assert.equal(validateEvent({ name: 'web_vitals', params: { metric: 'FCP', value: 1.2, page: '/' } }).ok, false);
  assert.equal(validateEvent({ name: 'web_vitals', params: { metric: 'LCP', value: 2100, page: '/' } }).ok, true);
});

test('TC-ANLT-20: PII is detected in params and nested objects', () => {
  assert.equal(findPii({ email: 'a@b.com' }).length, 1);
  assert.ok(findPii({ user: { phone: '9876543210' } }).length >= 1);
  assert.ok(findPii({ note: 'call 9876543210' }).length >= 1);
});

test('TC-ANLT-21: a hashed user id is allowed', () => {
  assert.deepEqual(findPii({ user_id: 'a'.repeat(64) }), []);
});

test('TC-ANLT-22: PII in an otherwise valid event fails validation', () => {
  const result = validateEvent({ name: 'newsletter_submit', params: { channel: 'email', email: 'a@b.com' } });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.rule === 'pii'));
});

test('TC-ANLT-23: newsletter channel is email or whatsapp', () => {
  assert.equal(validateEvent({ name: 'newsletter_submit', params: { channel: 'sms' } }).ok, false);
});

/* ---------------- C. Consent ---------------- */

test('TC-ANLT-24: no analytics consent means the event is dropped', () => {
  const result = track(goodEvent, { analytics: false, marketing: true });
  assert.equal(result.sent, false);
  assert.equal(result.reason, 'no_consent');
});

test('TC-ANLT-25: analytics consent sends the event', () => {
  assert.equal(track(goodEvent, { analytics: true }).sent, true);
});

test('TC-ANLT-26: ads destinations need marketing consent specifically', () => {
  assert.equal(track(goodEvent, { analytics: true }, { destination: 'ads' }).sent, false);
  assert.equal(track(goodEvent, { analytics: false, marketing: true }, { destination: 'ads' }).sent, true);
});

test('TC-ANLT-27: invalid events are dropped even with consent', () => {
  const result = track({ name: 'purchase', params: {} }, { analytics: true });
  assert.equal(result.sent, false);
  assert.equal(result.reason, 'invalid_event');
});

test('TC-ANLT-28: batch audit separates accepted and dropped events', () => {
  const log = auditEventLog(
    [goodEvent, { name: 'page_view', params: { page_type: 'pdp' } }, { name: 'nope', params: {} }],
    { analytics: true },
  );
  assert.deepEqual(log.accepted, ['purchase', 'page_view']);
  assert.equal(log.dropped.length, 1);
  assert.equal(log.ok, false);
});

test('TC-ANLT-29: a fully valid batch is clean', () => {
  const log = auditEventLog([goodEvent, { name: 'scroll_depth', params: { percent: 50 } }], { analytics: true });
  assert.equal(log.ok, true);
  assert.equal(log.accepted.length, 2);
});

/* ---------------- D. Integration ---------------- */

test('TC-ANLT-30: every KPI input event exists in the plan', () => {
  const required = [...KPI_TARGETS, ...DIAGNOSTIC_KPIS].flatMap((kpi) => kpi.requiresEvents ?? []);
  assert.deepEqual(missingFromPlan(required), []);
});

test('TC-ANLT-31: every persona signal exists in the plan', () => {
  const signals = PERSONAS.flatMap((persona) => persona.signals);
  assert.deepEqual(missingFromPlan(signals), []);
});

test('TC-ANLT-32: the plan and the validator share one registry', () => {
  const documentedNames = [...new Set(documented)];
  for (const name of documentedNames) {
    assert.ok(EVENT_SCHEMA[name], `${name} documented but not validated`);
  }
});

test('TC-ANLT-33: unknown names are surfaced by the integration helper', () => {
  assert.deepEqual(missingFromPlan(['purchase', 'ghost_event']), ['ghost_event']);
});
