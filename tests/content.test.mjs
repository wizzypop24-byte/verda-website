/**
 * Test suite for Requirement 6 — Content Requirements
 *
 * Run: node --test tests/content.test.mjs
 *
 * A. Document tests  — every copy block has an owner and a numeric limit.
 * B. Validator tests — limits are executable, boundaries behave, unicode is safe.
 * C. Asset plan      — the pre-build asset checklist is complete and usable.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  LIMITS,
  ASSETS,
  countWords,
  checkHero,
  checkTrustItems,
  checkConcernCard,
  checkProductCard,
  checkReview,
  checkFaqAnswer,
  validateAssetPlan,
} from "../lib/content.mjs";

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

const contentText = section(doc, "## 6. Content Requirements");
const tableRows = contentText
  .split(/\r?\n/)
  .filter((line) => /^\|\s*[^|-]/.test(line) && !/^\|\s*-+/.test(line))
  .slice(1)
  .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));

const ORDER = ["Hero H1 + sub", "Trust strip", "Concern cards", "Product cards", "Reviews", "FAQ"];
const NEW_ROWS = ["Announcement bar", "Blog teaser titles", "Bundle names", "Quiz copy"];

const words = (n) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");

/* ---------------- A. Document ---------------- */

test('TC-CONT-01: the six original content blocks are documented in order', () => {
  assert.deepEqual(tableRows.slice(0, 6).map((row) => row[0]), ORDER);
});

test('TC-CONT-02: every content row has an owner', () => {
  for (const [block, owner] of tableRows.map((row) => [row[0], row[1]])) {
    assert.ok(owner && owner.length >= 3, `${block}: owner missing`);
  }
});

test('TC-CONT-03: every content row has a numeric limit', () => {
  for (const [block, , limit] of tableRows) {
    assert.match(limit, /\d/, `${block}: no numeric limit`);
  }
});

test('TC-CONT-04: hero limits match the validator', () => {
  const hero = tableRows.find((row) => row[0] === "Hero H1 + sub");
  assert.match(hero[2], /H1 ≤ 12 words/);
  assert.match(hero[2], /sub ≤ 20 words/);
  assert.equal(LIMITS.heroH1Words, 12);
  assert.equal(LIMITS.heroSubWords, 20);
});

test('TC-CONT-05: trust-strip limit is four words per item', () => {
  const row = tableRows.find((entry) => entry[0] === "Trust strip");
  assert.match(row[2], /≤ 4 words/);
  assert.equal(LIMITS.trustItemWords, 4);
});

test('TC-CONT-06: concern cards are capped at ten words', () => {
  const row = tableRows.find((entry) => entry[0] === "Concern cards");
  assert.match(row[2], /≤ 10 words/);
  assert.equal(LIMITS.concernCardWords, 10);
});

test('TC-CONT-07: product names are capped at sixty characters', () => {
  const row = tableRows.find((entry) => entry[0] === "Product cards");
  assert.match(row[2], /Name ≤ 60 chars/);
  assert.equal(LIMITS.productNameChars, 60);
});

test('TC-CONT-08: review length is measured in lines', () => {
  const row = tableRows.find((entry) => entry[0] === "Reviews");
  assert.match(row[2], /2–3 lines/);
  assert.deepEqual(LIMITS.reviewLines, { min: 2, max: 3 });
});

test('TC-CONT-09: FAQ answers are bounded on both sides', () => {
  const row = tableRows.find((entry) => entry[0] === "FAQ");
  assert.match(row[2], /60–120 words/);
  assert.deepEqual(LIMITS.faqAnswerWords, { min: 60, max: 120 });
});

test('TC-CONT-10: all copy-bearing sections have a documented limit', () => {
  const documented = tableRows.map((row) => row[0].toLowerCase());
  for (const block of NEW_ROWS) {
    assert.ok(documented.includes(block.toLowerCase()), `no limit defined for "${block}"`);
  }
});

test('TC-CONT-11: the asset plan lists every required group', () => {
  for (const token of [
    'hero image',
    'concern images',
    'product photos',
    'trust icons',
    'review photos',
    'founder photo',
    'label close-up',
    'OG image',
  ]) {
    assert.ok(new RegExp(token, 'i').test(contentText), `asset plan missing ${token}`);
  }
});

test('TC-CONT-12: image dimensions are specified', () => {
  for (const size of ['2400×1200', '1080×1350', '1200×630']) {
    assert.ok(contentText.includes(size), `dimension missing: ${size}`);
  }
});

test('TC-CONT-13: product photo volume matches the four-SKU launch', () => {
  assert.match(contentText, /8–12 product photos/i);
  assert.match(contentText, /2–3 angles/i);
  assert.match(contentText, /4 launch SKUs/i);
});

test('TC-CONT-14: assets declare format and alt text', () => {
  assert.match(contentText, /AVIF|WebP/i, 'modern image format not required');
  assert.match(contentText, /alt text/i, 'alt text not required in the asset plan');
});

/* ---------------- B. Validators ---------------- */

test('TC-CONT-15: word counting treats currency and hyphens as one word', () => {
  assert.equal(countWords('₹999'), 1);
  assert.equal(countWords('Hair & Skin'), 3);
  assert.equal(countWords('sleep–wake cycle'), 2);
  assert.equal(countWords('   '), 0);
});

test('TC-CONT-16: H1 boundary — 12 passes, 13 fails', () => {
  assert.equal(checkHero({ h1: words(12), sub: 'short line' }).ok, true);
  const result = checkHero({ h1: words(13), sub: 'short line' });
  assert.equal(result.ok, false);
  assert.match(result.issues[0], /13 words; max 12/);
});

test('TC-CONT-17: sub-headline boundary — 20 passes, 21 fails', () => {
  assert.equal(checkHero({ h1: 'Sleep better', sub: words(20) }).ok, true);
  assert.equal(checkHero({ h1: 'Sleep better', sub: words(21) }).ok, false);
});

test('TC-CONT-18: hero requires both fields', () => {
  const result = checkHero({ h1: '', sub: '' });
  assert.equal(result.ok, false);
  assert.equal(result.issues.length, 2);
});

test('TC-CONT-19: trust strip requires 4-5 items', () => {
  const items = ['FSSAI Licensed', 'Lab Tested', 'GMP Certified', '30-Day Returns'];
  assert.equal(checkTrustItems(items).ok, true);
  assert.equal(checkTrustItems(items.slice(0, 3)).ok, false);
  assert.equal(checkTrustItems([...items, 'COD Available']).ok, true, 'five items are allowed');
  assert.equal(checkTrustItems([...items, 'COD Available', 'Extra item']).ok, false, 'six items are not');
});

test('TC-CONT-20: trust item boundary — 4 words pass, 5 fail', () => {
  const base = ['FSSAI Licensed', 'GMP Certified', '30-Day Returns'];
  assert.equal(checkTrustItems(['Third Party Lab Tested', ...base]).ok, true);
  const result = checkTrustItems(['Third Party Lab Tested Free', ...base]);
  assert.equal(result.ok, false);
  assert.match(result.issues[0], /5 words; max 4/);
});

test('TC-CONT-21: concern card boundary — 10 passes, 11 fails', () => {
  assert.equal(checkConcernCard(words(10)).ok, true);
  assert.equal(checkConcernCard(words(11)).ok, false);
});

test('TC-CONT-22: product name boundary — 60 chars pass, 61 fail', () => {
  assert.equal(checkProductCard({ name: 'a'.repeat(60), ingredientLine: 'Magnesium 200 mg' }).ok, true);
  const result = checkProductCard({ name: 'a'.repeat(61), ingredientLine: 'Magnesium 200 mg' });
  assert.equal(result.ok, false);
  assert.match(result.issues[0], /61 chars; max 60/);
});

test('TC-CONT-23: ingredient line is capped at eight words', () => {
  assert.equal(checkProductCard({ name: 'Magnesium', ingredientLine: words(8) }).ok, true);
  assert.equal(checkProductCard({ name: 'Magnesium', ingredientLine: words(9) }).ok, false);
});

test('TC-CONT-24: reviews must be 2-3 lines', () => {
  assert.equal(checkReview('Line one.\nLine two.').ok, true);
  assert.equal(checkReview('Line one.\nLine two.\nLine three.').ok, true);
  assert.equal(checkReview('Only one line.').ok, false);
  assert.equal(checkReview('a\nb\nc\nd').ok, false);
});

test('TC-CONT-25: FAQ boundary — 60 and 120 pass, outside fails', () => {
  assert.equal(checkFaqAnswer(words(60)).ok, true);
  assert.equal(checkFaqAnswer(words(120)).ok, true);
  assert.equal(checkFaqAnswer(words(59)).ok, false);
  assert.equal(checkFaqAnswer(words(121)).ok, false);
});

test('TC-CONT-26: empty content is rejected, not silently accepted', () => {
  assert.equal(checkConcernCard('').ok, false);
  assert.equal(checkProductCard({ name: '', ingredientLine: '' }).ok, false);
});

/* ---------------- C. Asset plan ---------------- */

test('TC-CONT-27: the executable asset plan covers all required groups', () => {
  const required = ASSETS.map((asset) => asset.id);
  const { ok, issues } = validateAssetPlan(ASSETS, { requiredIds: required });
  assert.ok(ok, issues.join("; "));
  assert.equal(ASSETS.length, 9, `expected 9 asset groups, found ${ASSETS.length}`);
});

test('TC-CONT-28: product photo range allows 2-3 angles for four SKUs', () => {
  const product = ASSETS.find((asset) => asset.id === 'product');
  assert.ok(product.countMin >= 4 * 2, 'minimum photos must cover 2 angles per SKU');
  assert.ok(product.countMax >= product.countMin);
});

test('TC-CONT-29: every asset declares a format and a size', () => {
  for (const asset of ASSETS) {
    assert.ok(asset.formats.length > 0, `${asset.id}: format missing`);
    assert.ok(asset.size, `${asset.id}: size missing`);
  }
});

test('TC-CONT-30: asset validator catches an incomplete plan', () => {
  const broken = [{ id: 'hero-desktop', label: 'Hero', formats: [], size: '' }];
  const { ok, issues } = validateAssetPlan(broken, { requiredIds: ['og-image'] });
  assert.equal(ok, false);
  assert.ok(issues.some((issue) => /Missing asset group: og-image/.test(issue)));
  assert.ok(issues.some((issue) => /no format declared/.test(issue)));
  assert.ok(issues.some((issue) => /size required/.test(issue)));
});
