/**
 * Test suite for Requirement 5 — Functional Requirements (FR-01 … FR-15)
 *
 * Run: node --test tests/functional.test.mjs
 *
 * A. Document tests  — every FR is present, prioritised and specific.
 * B. Rule tests      — the numbers behind the UI (free shipping, COD, consent)
 *                      behave exactly as the document promises.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  COMMERCE,
  cartProgress,
  codEligibility,
  perDayCost,
  searchSuggest,
  mergeWishlist,
  consentAllows,
} from "../lib/commerce.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const doc = readFileSync(join(root, "homepage-requirements.md"), "utf8");

function section(text, heading) {
  const start = text.indexOf(heading);
  if (start === -1) return "";
  const rest = text.slice(start + heading.length);
  const end = rest.search(/\n---/);
  return end === -1 ? rest : rest.slice(0, end);
}

const functionalText = section(doc, "## 5. Functional Requirements");
const constantsText = section(functionalText, "### 5.1");

const rows = [...functionalText.matchAll(/^\|\s*(FR-\d{2})\s*\|([^|]+)\|([^|]+)\|/gm)].map(([, id, text, priority]) => ({
  id,
  text: text.trim(),
  priority: priority.trim(),
}));
const byId = Object.fromEntries(rows.map((row) => [row.id, row.text]));

const CATALOG = [
  { id: "p1", name: "Magnesium Glycinate 200 mg", tags: ["sleep", "magnesium"] },
  { id: "p2", name: "Whey Protein Isolate", tags: ["fitness", "protein"] },
  { id: "p3", name: "Ashwagandha KSM-66", tags: ["stress", "sleep"] },
  { id: "p4", name: "Omega-3 Fish Oil", tags: ["heart", "joints"] },
];

/* ---------------- A. Document ---------------- */

test('TC-FR-01: fifteen functional requirements with sequential ids', () => {
  const expected = Array.from({ length: 15 }, (_, i) => `FR-${String(i + 1).padStart(2, "0")}`);
  assert.deepEqual(rows.map((row) => row.id), expected);
});

test('TC-FR-02: every requirement has a valid priority', () => {
  for (const row of rows) {
    assert.match(row.priority, /^(Must|Should|Could)$/, `${row.id}: bad priority "${row.priority}"`);
  }
});

test('TC-FR-03: descriptions are specific (at least four words)', () => {
  for (const row of rows) {
    assert.ok(row.text.split(/\s+/).length >= 4, `${row.id} is too vague: "${row.text}"`);
  }
});

test('TC-FR-04: INR-only scope is explicit', () => {
  assert.match(byId['FR-05'], /INR only/i);
  assert.match(byId['FR-05'], /v1/i);
});

test('TC-FR-05: sticky add-to-cart is product-page only', () => {
  assert.match(byId['FR-06'], /product-page only/i);
  assert.match(byId['FR-06'], /not home/i);
});

test('TC-FR-06: locale plan is English now, Hindi later', () => {
  assert.match(byId['FR-08'], /English \(IN\)/i);
  assert.match(byId['FR-08'], /Hindi/i);
  assert.match(byId['FR-08'], /v1\.1/i);
});

test('TC-FR-07: server-side rendering is mandatory for SEO', () => {
  assert.match(byId['FR-09'], /server-side rendered/i);
  assert.match(byId['FR-09'], /SEO/i);
});

test('TC-FR-08: CMS covers the five editable blocks', () => {
  for (const block of ['hero', 'banners', 'bestseller collection', 'testimonials', 'FAQ']) {
    assert.ok(byId['FR-10'].toLowerCase().includes(block.toLowerCase()), `CMS block missing: ${block}`);
  }
});

test('TC-FR-09: returns are restricted to sealed products', () => {
  assert.match(byId['FR-14'], /sealed|unopened/i);
  assert.match(byId['FR-14'], /supplement safety/i);
});

test('TC-FR-10: consent banner has granular categories', () => {
  assert.match(byId['FR-07'], /granular/i);
  assert.match(byId['FR-07'], /analytics/i);
  assert.match(byId['FR-07'], /marketing/i);
});

/* ---------------- B. Commerce constants ---------------- */

test('TC-FR-11: a single commerce-constants table exists', () => {
  assert.ok(constantsText, 'missing "### 5.1" commerce constants table');
});

test('TC-FR-12: constants table documents all money rules', () => {
  for (const token of ['₹999', '₹2,000', '₹29', '₹50', '30 days', '5%']) {
    assert.ok(constantsText.includes(token), `constants table missing ${token}`);
  }
});

test('TC-FR-13: model constants match the document', () => {
  assert.equal(COMMERCE.freeShippingThreshold, 999);
  assert.equal(COMMERCE.codCap, 2000);
  assert.equal(COMMERCE.codFee, 29);
  assert.equal(COMMERCE.prepaidDiscount, 50);
  assert.equal(COMMERCE.returnWindowDays, 30);
  assert.equal(COMMERCE.gstRate, 0.05);
  assert.ok(constantsText.includes(`₹${COMMERCE.freeShippingThreshold}`));
  assert.ok(constantsText.includes(`₹${COMMERCE.codCap.toLocaleString("en-IN")}`));
});

test('TC-FR-14: free-shipping number is identical in every section that uses it', () => {
  const mentions = [...doc.matchAll(/₹(\d{3,4})\s*(?:se|ke|above|over|free shipping)/gi)].map((m) => Number(m[1]));
  for (const value of mentions) {
    assert.equal(value, COMMERCE.freeShippingThreshold, `conflicting free-shipping value ₹${value}`);
  }
  assert.match(doc, /Free shipping over ₹999/);
});

/* ---------------- C. Cart drawer ---------------- */

test('TC-FR-15: cart shows the remaining amount below the threshold', () => {
  const progress = cartProgress(749);
  assert.equal(progress.qualified, false);
  assert.equal(progress.remaining, 250);
  assert.equal(progress.percent, 75);
});

test('TC-FR-16: cart qualifies exactly at the threshold', () => {
  const progress = cartProgress(999);
  assert.equal(progress.qualified, true);
  assert.equal(progress.remaining, 0);
  assert.equal(progress.percent, 100);
});

test('TC-FR-17: empty cart sits at zero without dividing by zero', () => {
  const progress = cartProgress(0);
  assert.equal(progress.percent, 0);
  assert.equal(progress.remaining, 999);
});

test('TC-FR-18: cart rejects invalid subtotals', () => {
  assert.throws(() => cartProgress(-1), RangeError);
  assert.throws(() => cartProgress(Number.NaN), RangeError);
});

/* ---------------- D. COD ---------------- */

test('TC-FR-19: COD is available under the cap with a valid address', () => {
  const result = codEligibility({ total: 1299, pincode: "400001" });
  assert.equal(result.eligible, true);
  assert.equal(result.fee, 29);
  assert.equal(result.prepaidDiscount, 50);
  assert.equal(result.requiresConfirmation, true);
});

test('TC-FR-20: COD is blocked above ₹2,000', () => {
  const result = codEligibility({ total: 2500, pincode: "400001" });
  assert.equal(result.eligible, false);
  assert.equal(result.reason, "above_cap");
});

test('TC-FR-21: high-risk pincodes are blocked', () => {
  const result = codEligibility({ total: 999, pincode: "110001", riskPincodes: ["110001"] });
  assert.equal(result.eligible, false);
  assert.equal(result.reason, "high_risk_pincode");
});

test('TC-FR-22: unverified addresses are blocked', () => {
  const result = codEligibility({ total: 999, pincode: "400001", verified: false });
  assert.equal(result.reason, "unverified_address");
});

test('TC-FR-23: invalid pincodes are rejected before anything else', () => {
  assert.equal(codEligibility({ total: 999, pincode: "40" }).reason, "invalid_pincode");
  assert.equal(codEligibility({ total: 999, pincode: "ABCDEF" }).reason, "invalid_pincode");
});

test('TC-FR-24: invalid totals cannot reach COD', () => {
  assert.equal(codEligibility({ total: 0, pincode: "400001" }).reason, "invalid_total");
  assert.equal(codEligibility({ total: -50, pincode: "400001" }).reason, "invalid_total");
});

test('TC-FR-25: COD can be switched off globally', () => {
  const result = codEligibility({ total: 999, pincode: "400001", codDisabled: true });
  assert.equal(result.eligible, false);
  assert.equal(result.reason, "disabled");
});

/* ---------------- E. Search ---------------- */

test('TC-FR-26: search matches product names', () => {
  const results = searchSuggest("magnesium", CATALOG);
  assert.equal(results[0].id, "p1");
});

test('TC-FR-27: search matches tags, case-insensitively', () => {
  const results = searchSuggest("SLEEP", CATALOG).map((item) => item.id);
  assert.deepEqual(results.sort(), ["p1", "p3"]);
});

test('TC-FR-28: one-character queries do not trigger suggestions', () => {
  assert.deepEqual(searchSuggest("m", CATALOG), []);
  assert.deepEqual(searchSuggest("   ", CATALOG), []);
});

test('TC-FR-29: search results are capped', () => {
  const big = Array.from({ length: 12 }, (_, i) => ({ id: `x${i}`, name: `Protein ${i}`, tags: ["protein"] }));
  assert.equal(searchSuggest("protein", big).length, 6);
});

test('TC-FR-30: the zero-result state is specified in the document', () => {
  assert.match(byId['FR-01'], /no results|zero.result|empty state/i, 'FR-01 must define what happens when nothing matches');
});

/* ---------------- F. Wishlist ---------------- */

test('TC-FR-31: guest wishlist merges into the account without duplicates', () => {
  assert.deepEqual(mergeWishlist(["p3", "p1"], ["p1", "p2"]), ["p1", "p2", "p3"]);
});

test('TC-FR-32: account order is preserved, guest items appended', () => {
  assert.deepEqual(mergeWishlist(["p9"], ["p4", "p5"]), ["p4", "p5", "p9"]);
});

/* ---------------- G. Consent ---------------- */

test('TC-FR-33: analytics is blocked until explicitly allowed', () => {
  assert.equal(consentAllows({}, "analytics"), false);
  assert.equal(consentAllows({ analytics: false, marketing: true }, "analytics"), false);
});

test('TC-FR-34: marketing and analytics are independent toggles', () => {
  assert.equal(consentAllows({ analytics: true, marketing: false }, "marketing"), false);
  assert.equal(consentAllows({ analytics: true, marketing: false }, "analytics"), true);
});

test('TC-FR-35: unknown categories never default to allowed', () => {
  assert.equal(consentAllows({ analytics: true }, "advertising"), false);
});

/* ---------------- H. Per-day cost ---------------- */

test('TC-FR-36: per-day cost maths', () => {
  assert.equal(perDayCost(1299, 30), 43.3);
  assert.equal(perDayCost(540, 30), 18);
});

test('TC-FR-37: per-day cost rejects impossible inputs', () => {
  assert.throws(() => perDayCost(500, 0), RangeError);
  assert.throws(() => perDayCost(-1, 30), RangeError);
});

/* ---------------- I. Quick view ---------------- */

test('TC-FR-38: quick-view content is defined (not just "a modal")', () => {
  assert.match(byId['FR-04'], /spec|ingredient|price|add to cart/i, 'FR-04 must state what the modal shows');
});
