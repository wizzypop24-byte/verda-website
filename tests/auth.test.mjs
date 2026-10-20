/**
 * Test suite for Requirement 17 — Authentication (Login / Sign up)
 *
 * Run: node --test tests/auth.test.mjs
 *
 * Scope: verifies that Section 17 is complete, internally consistent,
 * conflicts with no other requirement, and that every security / compliance
 * promise is written as something a developer can build and QA can check.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { KPI_TARGETS, DIAGNOSTIC_KPIS } from '../lib/kpi.mjs';

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

function sub(text, heading) {
  const start = text.indexOf(heading);
  if (start === -1) return '';
  const rest = text.slice(start + heading.length);
  const next = rest.search(/\n#{2,3} /);
  return next === -1 ? rest : rest.slice(0, next);
}

function tableRows(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => /^\|/.test(line))
    .slice(2)
    .map((line) =>
      line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim()),
    );
}

const authText = section(doc, '## 17. Authentication');
const flows = tableRows(sub(authText, '### 17.2 Flows'));
const screens = tableRows(sub(authText, '### 17.3 Screens'));
const requirements = tableRows(sub(authText, '### 17.4 Functional requirements'));
const validation = tableRows(sub(authText, '### 17.5 Validation'));
const securityText = sub(authText, '### 17.6 Security');
const complianceText = sub(authText, '### 17.7 Compliance');
const eventsText = sub(authText, '### 17.8 Analytics');
const acceptanceText = sub(authText, '### 17.9 Acceptance');
const outOfScopeText = sub(authText, '### 17.10 Out of scope');

const authIds = requirements.map((row) => row[0]).filter((id) => /^AUTH-\d{2}$/.test(id));
const requirementById = Object.fromEntries(requirements.map((row) => [row[0], row[1]]));
const events = [...eventsText.matchAll(/^\|\s*`([a-z_]+)`\s*\|/gm)].map((m) => m[1]);

/* ---------------- A. Structure ---------------- */

test('TC-AUTH-01: Section 17 exists with all ten sub-sections', () => {
  assert.ok(authText, 'Section 17 missing');
  for (const heading of [
    '### 17.1 Principles',
    '### 17.2 Flows',
    '### 17.3 Screens',
    '### 17.4 Functional requirements',
    '### 17.5 Validation',
    '### 17.6 Security',
    '### 17.7 Compliance',
    '### 17.8 Analytics',
    '### 17.9 Acceptance',
    '### 17.10 Out of scope',
  ]) {
    assert.ok(authText.includes(heading), `missing ${heading}`);
  }
});

test('TC-AUTH-02: 22 requirements with sequential, unique IDs', () => {
  assert.equal(authIds.length, 22, `expected 22 requirements, found ${authIds.length}`);
  const expected = Array.from({ length: 22 }, (_, i) => `AUTH-${String(i + 1).padStart(2, '0')}`);
  assert.deepEqual(authIds, expected);
});

test('TC-AUTH-03: every requirement has a valid priority', () => {
  for (const [id, text, priority] of requirements) {
    if (!/^AUTH-\d{2}$/.test(id)) continue;
    assert.match(priority ?? '', /^(Must|Should|Could)$/, `${id} has invalid priority "${priority}"`);
    assert.ok(text.length > 10, `${id} description too short`);
  }
});

/* ---------------- B. Core behaviour ---------------- */

test('TC-AUTH-04: guest checkout is allowed and marked Must', () => {
  assert.match(requirementById['AUTH-01'] ?? '', /guest checkout/i);
  assert.ok(flows.some((row) => /guest checkout/i.test(row[0])), 'guest checkout flow missing');
  const row = requirements.find((r) => r[0] === 'AUTH-01');
  assert.equal(row[2], 'Must');
});

test('TC-AUTH-05: OTP rules are quantified (expiry, resend, attempts, lock)', () => {
  const text = requirementById['AUTH-03'] ?? '';
  assert.match(text, /6 digits?/i, 'OTP length missing');
  assert.match(text, /5 minutes/i, 'OTP expiry missing');
  assert.match(text, /30 s|30 seconds/i, 'resend delay missing');
  assert.match(text, /5 attempts/i, 'attempt limit missing');
  assert.match(text, /15.min/i, 'lockout duration missing');
});

test('TC-AUTH-06: password rules are explicit', () => {
  const text = requirementById['AUTH-06'] ?? '';
  assert.match(text, /8 chars|8 characters|min 8/i);
  assert.match(text, /show|hide|reveal/i);
  assert.match(text, /no forced complexity/i);
});

test('TC-AUTH-07: password reset link is expiring and single-use', () => {
  const text = requirementById['AUTH-07'] ?? '';
  assert.match(text, /60 minutes/i);
  assert.match(text, /single use|one.time/i);
});

test('TC-AUTH-08: duplicate accounts are resolved, never duplicated', () => {
  const text = requirementById['AUTH-08'] ?? '';
  assert.match(text, /duplicate/i);
  assert.match(text, /login instead|log in to the existing|resolve/i);
});

test('TC-AUTH-09: no user enumeration is required', () => {
  assert.match(requirementById['AUTH-19'] ?? '', /no user enumeration|identical response/i);
});

test('TC-AUTH-10: rate limits are quantified per phone and per IP', () => {
  const text = requirementById['AUTH-22'] ?? '';
  assert.match(text, /5 OTP requests per phone per hour/i);
  assert.match(text, /20 per IP per hour/i);
});

test('TC-AUTH-11: session lifetime and global logout are specified', () => {
  const text = requirementById['AUTH-12'] ?? '';
  assert.match(text, /30 days/i);
  assert.match(text, /logout all devices/i);
});

test('TC-AUTH-12: all seven auth flows are documented', () => {
  assert.equal(flows.length, 7, `expected 7 flows, found ${flows.length}`);
  const flowNames = flows.map((row) => row[0]).join(' | ');
  for (const name of ['Guest checkout', 'Save after purchase', 'Sign up', 'Login', 'Social login', 'Forgot password', 'Guest order claim']) {
    assert.ok(flowNames.includes(name), `missing flow: ${name}`);
  }
});

test('TC-AUTH-13: guest order claim uses the same identity', () => {
  const claim = flows.find((row) => /claim/i.test(row[0]));
  assert.ok(claim, 'guest order claim flow missing');
  assert.match(claim.join(' '), /phone|email/i);
  assert.match(claim.join(' '), /otp/i);
});

test('TC-AUTH-14: five screens are specified', () => {
  assert.equal(screens.length, 5, `expected 5 screens, found ${screens.length}`);
  const names = screens.map((row) => row[0]).join(' | ');
  for (const name of ['Login', 'Sign up', 'OTP', 'Forgot password', 'Account']) {
    assert.ok(names.includes(name), `missing screen: ${name}`);
  }
});

test('TC-AUTH-15: error copy covers the six critical failure cases', () => {
  const labels = validation.map((row) => row[0].toLowerCase()).join(' | ');
  for (const name of ['invalid phone', 'wrong otp', 'expired otp', 'rate limited', 'network failure', 'duplicate account']) {
    assert.ok(labels.includes(name), `missing error case: ${name}`);
  }
});

test('TC-AUTH-16: accessibility is required on every auth screen', () => {
  assert.match(requirementById['AUTH-17'] ?? '', /keyboard/i);
  assert.match(requirementById['AUTH-17'] ?? '', /aria-live/i);
  assert.match(acceptanceText, /WCAG 2\.2 AA/i);
});

test('TC-AUTH-17: mobile-first at 360 px is required', () => {
  assert.match(requirementById['AUTH-16'] ?? '', /360/);
});

/* ---------------- C. Security ---------------- */

test('TC-AUTH-18: transport, password hashing and OTP storage are specified', () => {
  assert.match(securityText, /HTTPS/i);
  assert.match(securityText, /HSTS/i);
  assert.match(securityText, /Argon2id|bcrypt/i);
  assert.match(securityText, /Hashed/i);
  assert.match(securityText, /single-use/i);
});

test('TC-AUTH-19: session cookies and CSRF protection are specified', () => {
  assert.match(securityText, /HttpOnly/i);
  assert.match(securityText, /SameSite/i);
  assert.match(securityText, /CSRF/i);
  assert.match(securityText, /rotate/i);
});

test('TC-AUTH-20: bot protection and audit logging are specified', () => {
  assert.match(securityText, /captcha|risk check/i);
  assert.match(securityText, /audit/i);
  assert.match(securityText, /90 days/i);
});

/* ---------------- D. Compliance (DPDP) ---------------- */

test('TC-AUTH-21: marketing consent is separate and unticked by default', () => {
  assert.match(requirementById['AUTH-14'] ?? '', /separate/i);
  assert.match(requirementById['AUTH-14'] ?? '', /unticked|not.*pre-ticked/i);
  assert.match(complianceText, /unticked|not pre-ticked/i);
});

test('TC-AUTH-22: privacy policy is linked at the point of collection', () => {
  assert.match(complianceText, /point of collection/i);
});

test('TC-AUTH-23: account deletion and export have a 30-day SLA', () => {
  const text = requirementById['AUTH-13'] ?? '';
  assert.match(text, /export/i);
  assert.match(text, /30 days/i);
  assert.match(complianceText, /deletion|export/i);
});

test('TC-AUTH-24: grievance officer contact is required', () => {
  assert.match(complianceText, /grievance officer/i);
});

test('TC-AUTH-25: age gate (18+) is required', () => {
  assert.match(requirementById['AUTH-15'] ?? '', /18\+|18 \+/);
  assert.match(authText, /18\+/);
});

/* ---------------- E. Analytics contract ---------------- */

test('TC-AUTH-26: eight auth events are defined', () => {
  const expected = [
    'auth_started',
    'otp_requested',
    'otp_verified',
    'auth_completed',
    'auth_failed',
    'guest_checkout_selected',
    'account_created',
    'logout',
  ];
  assert.deepEqual([...events].sort(), [...expected].sort());
});

test('TC-AUTH-27: auth events do not replace the purchase / KPI events', () => {
  assert.match(eventsText, /do not replace/i);
  assert.match(eventsText, /purchase/i);
  const kpiEvents = new Set([...KPI_TARGETS, ...DIAGNOSTIC_KPIS].flatMap((kpi) => kpi.requiresEvents));
  for (const event of events) {
    assert.ok(!kpiEvents.has(event), `${event} is a KPI input and must not be redefined as auth state`);
  }
});

test('TC-AUTH-28: unresolved integration note is recorded', () => {
  assert.match(eventsText, /add to Section 12/i, 'events must be flagged for Section 12 merge');
});

/* ---------------- F. Acceptance & scope ---------------- */

test('TC-AUTH-29: acceptance checklist has at least 12 checks', () => {
  const checks = acceptanceText.match(/- \[ \]/g) ?? [];
  assert.ok(checks.length >= 12, `only ${checks.length} acceptance checks`);
  assert.match(acceptanceText, /without creating an account/i, 'guest checkout not in acceptance');
  assert.match(acceptanceText, /duplicate phone/i, 'duplicate phone not in acceptance');
});

test('TC-AUTH-30: out-of-scope list is explicit', () => {
  assert.ok(outOfScopeText.trim().length > 40, 'out-of-scope section is empty');
  assert.match(outOfScopeText, /2FA|SSO/i);
});

test('TC-AUTH-31: duplicate-account copy never leaks account existence before verification', () => {
  const duplicate = validation.find((row) => /duplicate account/i.test(row[0]));
  assert.ok(duplicate, 'duplicate account copy missing');
  const message = duplicate[1];
  assert.match(
    message,
    /after (otp )?verification|verified|welcome back/i,
    `duplicate copy reveals existence before verification: "${message}"`,
  );
});

/* ---------------- G. Live check (opt-in) ---------------- */

test(
  'TC-AUTH-32: live auth page check',
  { skip: !process.env.AUTH_URL && 'set AUTH_URL to run against a deployed login page' },
  async () => {
    const response = await fetch(process.env.AUTH_URL);
    assert.equal(response.status, 200, `${process.env.AUTH_URL} did not return 200`);
    const html = await response.text();
    assert.match(html, /<form|type="tel"|type="email"/i, 'no auth form found');
  },
);
