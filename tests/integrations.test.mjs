/**
 * Test suite for Requirement 13 — Integrations
 *
 * Run: node --test tests/integrations.test.mjs
 *
 * A. Document — eight categories, each with a suggested vendor.
 * B. Registry — capabilities, fallbacks and coverage.
 * C. Security — webhook signatures, idempotency, secrets, retries.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  INTEGRATIONS,
  SECURITY,
  validateCoverage,
  validateVendor,
  validateFallbacks,
  scanForSecrets,
  verifyWebhook,
  createIdempotencyGuard,
  retryDelay,
  capabilityCoverage,
  auditIntegrations,
} from '../lib/integrations.mjs';

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

const integrationText = section(doc, '## 13. Integrations');

const rows = integrationText
  .split(/\r?\n/)
  .filter((line) => /^\|\s*[^|]/.test(line) && !/^\|\s*-+/.test(line))
  .slice(1)
  .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));

const byNeed = (need) => rows.find((row) => row[0].toLowerCase().includes(need.toLowerCase())) ?? [];

const payload = '{"event":"payment.captured","id":"pay_123"}';
const secret = 'whsec_test_secret';

/* ---------------- A. Document ---------------- */

test('TC-INTG-01: eight integration needs are documented', () => {
  assert.equal(rows.length, 8, `found ${rows.length} rows`);
  const needs = rows.map((row) => row[0].toLowerCase()).join(' | ');
  for (const need of ['storefront', 'payments', 'shipping', 'reviews', 'email', 'analytics', 'cms', 'support']) {
    assert.ok(needs.includes(need), `integration missing: ${need}`);
  }
});

test('TC-INTG-02: every need suggests at least one vendor', () => {
  for (const row of rows) {
    assert.ok(row[1].length >= 3, `${row[0]} has no suggested vendor`);
  }
});

test('TC-INTG-03: payments cover UPI, cards, netbanking and COD', () => {
  const row = byNeed('payments');
  for (const method of ['UPI', 'cards', 'netbanking', 'COD']) {
    assert.ok(row[1].includes(method), `payment method missing: ${method}`);
  }
});

test('TC-INTG-04: email and WhatsApp are both covered', () => {
  const row = byNeed('email');
  assert.ok(row[1].toLowerCase().includes('klaviyo'));
  assert.ok(row[1].toLowerCase().includes('wati'));
});

test('TC-INTG-05: analytics stack includes GA4, GTM and Meta CAPI', () => {
  const row = byNeed('analytics');
  for (const tool of ['GA4', 'GTM', 'Meta CAPI']) {
    assert.ok(row[1].includes(tool), `analytics tool missing: ${tool}`);
  }
});

test('TC-INTG-06: CMS options cover both Shopify and headless', () => {
  const row = byNeed('cms');
  assert.match(row[1], /metafields/i);
  assert.match(row[1], /Sanity|Contentful/);
});

test('TC-INTG-07: support stack includes WhatsApp and a helpdesk', () => {
  const row = byNeed('support');
  assert.match(row[1], /WhatsApp/i);
  assert.match(row[1], /Freshdesk/i);
});

test('TC-INTG-08: webhook security is required', () => {
  assert.match(integrationText, /webhook/i, 'no webhook requirement');
  assert.match(integrationText, /signature/i, 'no signature verification');
  assert.match(integrationText, /idempotent|idempotency/i, 'no idempotency requirement');
});

test('TC-INTG-09: secrets must stay server-side', () => {
  assert.match(integrationText, /secret/i);
  assert.match(integrationText, /server-side|never .*client/i);
});

test('TC-INTG-10: critical integrations need a fallback', () => {
  const fallback = validateFallbacks();
  assert.ok(fallback.ok, fallback.issues.join('; '));
});

/* ---------------- B. Registry ---------------- */

test('TC-INTG-11: registry covers all eight categories exactly once', () => {
  assert.equal(INTEGRATIONS.length, 8);
  const coverage = validateCoverage();
  assert.ok(coverage.ok, coverage.issues.join('; '));
});

test('TC-INTG-12: duplicate categories are rejected', () => {
  const broken = [...INTEGRATIONS, { ...INTEGRATIONS[0] }];
  assert.equal(validateCoverage(broken).ok, false);
});

test('TC-INTG-13: payments capability set is complete', () => {
  const payments = INTEGRATIONS.find((entry) => entry.id === 'payments');
  for (const capability of ['upi', 'cards', 'netbanking', 'cod', 'inr', 'webhooks', 'refunds']) {
    assert.ok(payments.capabilities.includes(capability), `payments missing: ${capability}`);
  }
  assert.equal(SECURITY.webhookSignature, 'hmac-sha256');
});

test('TC-INTG-14: shipping supports serviceability, COD remittance and RTO', () => {
  const shipping = INTEGRATIONS.find((entry) => entry.id === 'shipping');
  for (const capability of ['serviceability', 'codRemittance', 'rto', 'tracking']) {
    assert.ok(shipping.capabilities.includes(capability), `shipping missing: ${capability}`);
  }
});

test('TC-INTG-15: a vendor missing a capability is rejected', () => {
  const result = validateVendor({ category: 'payments', capabilities: ['upi', 'cards'] });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => /missing capability "cod"/.test(issue)));
});

test('TC-INTG-16: a complete vendor capability set passes', () => {
  const payments = INTEGRATIONS.find((entry) => entry.id === 'payments');
  assert.equal(validateVendor({ category: 'payments', capabilities: payments.capabilities }).ok, true);
});

test('TC-INTG-17: unknown categories are rejected', () => {
  assert.equal(validateVendor({ category: 'crm', capabilities: [] }).ok, false);
});

test('TC-INTG-18: required capabilities are covered by the stack', () => {
  const required = ['upi', 'cod', 'serviceability', 'whatsapp', 'consentMode', 'hero', 'tickets'];
  assert.deepEqual(capabilityCoverage(required), []);
});

test('TC-INTG-19: uncovered capabilities are reported', () => {
  assert.deepEqual(capabilityCoverage(['upi', 'loyaltyWallet']), ['loyaltyWallet']);
});

/* ---------------- C. Security ---------------- */

test('TC-INTG-20: a valid webhook signature passes', () => {
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  assert.equal(verifyWebhook({ payload, signature, secret }).ok, true);
});

test('TC-INTG-21: a tampered payload fails', () => {
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  assert.equal(verifyWebhook({ payload: payload + 'x', signature, secret }).ok, false);
});

test('TC-INTG-22: a missing secret fails closed', () => {
  assert.equal(verifyWebhook({ payload, signature: 'abc', secret: '' }).reason, 'no_secret');
});

test('TC-INTG-23: replayed webhooks are ignored', () => {
  const guard = createIdempotencyGuard();
  assert.equal(guard.check('evt_1').duplicate, false);
  assert.equal(guard.check('evt_1').duplicate, true);
  assert.equal(guard.check('evt_2').duplicate, false);
  assert.equal(guard.size(), 2);
});

test('TC-INTG-24: retries back off and cap at 30s', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(retryDelay), [1000, 2000, 4000, 8000, 16000, 30000]);
  assert.throws(() => retryDelay(0), RangeError);
});

test('TC-INTG-25: live payment secrets are detected', () => {
  assert.ok(scanForSecrets('key=rzp_live_ABC123456789').length >= 1);
  assert.ok(scanForSecrets('sk_live_ABC123456789').length >= 1);
});

test('TC-INTG-26: public keys are not treated as secrets', () => {
  assert.deepEqual(scanForSecrets('AIzaSyB3Pa0TylDXPswxiAWSj4im9ZApkr6EHOo'), []);
  assert.deepEqual(scanForSecrets('pk_test_123'), []);
});

test('TC-INTG-27: a fully configured stack passes the audit', () => {
  const result = auditIntegrations({
    configured: INTEGRATIONS.filter((entry) => entry.critical).map((entry) => entry.id),
    webhooksVerified: true,
    clientSecrets: [],
  });
  assert.deepEqual(result.issues, []);
});

test('TC-INTG-28: a missing critical service is reported', () => {
  const result = auditIntegrations({ configured: ['payments'], webhooksVerified: true });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => /shipping: critical integration not configured/.test(issue)));
});

test('TC-INTG-29: unverified webhooks and leaked secrets both fail', () => {
  const result = auditIntegrations({ configured: [], webhooksVerified: false, clientSecrets: ['rzp_live_x'] });
  assert.ok(result.issues.some((issue) => /Webhook signatures/.test(issue)));
  assert.ok(result.issues.some((issue) => /Secret exposed in client/.test(issue)));
});

test('TC-INTG-30: the registry documents a fallback for every critical service', () => {
  for (const entry of INTEGRATIONS.filter((item) => item.critical)) {
    assert.ok(entry.vendors.length >= 2, `${entry.id} has only ${entry.vendors.length} vendor`);
  }
});
