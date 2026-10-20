/**
 * Test suite for Requirement 3 — Brand & Tone
 *
 * Run: node --test tests/tone.test.mjs
 *
 * Two layers:
 *   A. Document tests  — the style guide says something concrete.
 *   B. Linter tests    — the rules are executable, so copy can be checked
 *                        before it reaches the home page.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  BRAND,
  BANNED_TERMS,
  URGENCY_PATTERNS,
  RESULT_PATTERNS,
  APPROVED_DISCLAIMER,
  lintCopy,
  validateTypography,
} from "../lib/tone.mjs";

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

const toneText = section(doc, "## 3. Brand & Tone");
const rules = (text) => text.split(/\r?\n/).filter((line) => line.trim().startsWith("-"));

const VOICE_EXAMPLE = "Magnesium glycinate, 200 mg. Third-party tested. No fillers.";
const VOICE_ANTI_EXAMPLE = "Unlock your best sleep ever!!";

/* ---------------- A. Document tests ---------------- */

test('TC-TONE-01: Section 3 defines all five brand dimensions', () => {
  assert.ok(toneText, "Section 3 missing");
  for (const token of ["**Tone:**", "**Avoid:**", "**Visual direction:**", "**Typography:**", "**Voice example:**"]) {
    assert.ok(toneText.includes(token), `missing ${token}`);
  }
});

test('TC-TONE-02: tone is stated as a position, not a vibe', () => {
  assert.match(toneText, /clinical but warm/i);
  assert.match(toneText, /lab-backed, not hype-backed/i);
});

test('TC-TONE-03: the avoid-list covers all five risk categories', () => {
  const avoid = rules(toneText).find((line) => line.includes("**Avoid:**")) ?? "";
  for (const token of ["miracle", "cure", "guaranteed results", "before/after", "urgency"]) {
    assert.ok(avoid.toLowerCase().includes(token.toLowerCase()), `avoid-list missing "${token}"`);
  }
});

test('TC-TONE-04: every banned word in the document is enforced by the linter', () => {
  const terms = BANNED_TERMS.map((entry) => entry.term.toLowerCase());
  for (const required of ["miracle", "cure", "guaranteed"]) {
    assert.ok(terms.includes(required), `linter does not enforce "${required}"`);
  }
  assert.ok(URGENCY_PATTERNS.length > 0, "no urgency patterns defined");
  assert.ok(
    RESULT_PATTERNS.some((entry) => /before/i.test(String(entry.pattern))),
    "before/after rule missing",
  );
});

test('TC-TONE-05: visual direction is specific enough to art-direct', () => {
  assert.match(toneText, /white\/off-white/i);
  assert.match(toneText, /accent colour|accent color/i);
  assert.match(toneText, /real product photography/i);
  assert.match(toneText, /ingredient macro/i);
  assert.match(toneText, /stock.*gym/i);
});

test('TC-TONE-06: typography is quantified', () => {
  assert.match(toneText, /1 display \+ 1 body/i);
  assert.match(toneText, /max 2 weights/i);
  assert.equal(BRAND.typography.families.max, 2);
  assert.equal(BRAND.typography.weightsPerFamily.max, 2);
});

test('TC-TONE-07: a good AND a bad voice example are both present', () => {
  assert.match(toneText, /Magnesium glycinate, 200 mg\. Third-party tested\. No fillers\./);
  assert.match(toneText, /not "Unlock your best sleep ever!!"/i);
});

test('TC-TONE-08: the approved voice example passes the linter', () => {
  const result = lintCopy(VOICE_EXAMPLE);
  assert.equal(result.ok, true);
  assert.deepEqual(result.violations, []);
});

test('TC-TONE-09: the anti-example is caught by the linter', () => {
  const result = lintCopy(VOICE_ANTI_EXAMPLE);
  const ruleNames = result.violations.map((v) => v.rule);
  assert.ok(ruleNames.includes("hype"), "hype word not detected");
  assert.ok(ruleNames.includes("punctuation"), "exclamation stacking not detected");
});

/* ---------------- B. Linter — claims ---------------- */

test('TC-TONE-10: "cure" is an error, not a warning', () => {
  const result = lintCopy("This supplement cures joint pain.");
  assert.equal(result.ok, false);
  assert.ok(result.violations.some((v) => v.match.toLowerCase() === "cures" && v.severity === "error"));
});

test('TC-TONE-11: "miracle" is blocked', () => {
  const result = lintCopy("A miracle formula for energy.");
  assert.equal(result.ok, false);
});

test('TC-TONE-12: "guaranteed" is blocked', () => {
  const result = lintCopy("Guaranteed results in 7 days.");
  assert.equal(result.ok, false);
});

test('TC-TONE-13: "clinically proven" raises a warning for evidence', () => {
  const result = lintCopy("Clinically proven to improve sleep.");
  assert.equal(result.ok, true, "a warning must not block publishing by itself");
  assert.equal(result.warnings >= 1, true);
  assert.ok(result.violations.some((v) => /clinically proven/i.test(v.match)));
});

test('TC-TONE-14: unprovable absolute-safety claims are errors', () => {
  for (const copy of ["100% safe for everyone", "No side effects at all", "FDA approved supplement"]) {
    assert.equal(lintCopy(copy).ok, false, `not blocked: ${copy}`);
  }
});

test('TC-TONE-15: medical framing ("treats") is blocked', () => {
  assert.equal(lintCopy("Treats vitamin deficiency.").ok, false);
});

/* ---------------- C. Linter — pressure tactics ---------------- */

test('TC-TONE-16: fake scarcity is blocked', () => {
  const result = lintCopy("Only 3 left in stock.");
  assert.equal(result.ok, false);
  assert.ok(result.violations.some((v) => /only 3 left/i.test(v.match)));
});

test('TC-TONE-17: urgency vocabulary is blocked', () => {
  for (const copy of ["Hurry, offer ends soon", "Last chance to buy", "Today only deal", "Limited time offer", "Expires in 2 hours"]) {
    assert.equal(lintCopy(copy).ok, false, `not blocked: ${copy}`);
  }
});

test('TC-TONE-18: manufactured social proof is blocked', () => {
  assert.equal(lintCopy("42 people are viewing this product.").ok, false);
});

test('TC-TONE-19: before/after framing is blocked', () => {
  assert.equal(lintCopy("See the before & after results.").ok, false);
  assert.equal(lintCopy("Before/after photos inside.").ok, false);
});

test('TC-TONE-20: weight-loss promises are blocked', () => {
  assert.equal(lintCopy("Lose 5 kg in 2 weeks.").ok, false);
});

test('TC-TONE-21: uncited comparative claims are blocked', () => {
  assert.equal(lintCopy("30% faster recovery than other brands.").ok, false);
});

/* ---------------- D. Linter — voice & safety ---------------- */

test('TC-TONE-22: compliant, specific copy stays clean', () => {
  const copy =
    "Magnesium glycinate 200 mg supports normal muscle function. Third-party tested, no fillers. Take one capsule daily.";
  assert.deepEqual(lintCopy(copy).violations, []);
});

test('TC-TONE-23: matching is case-insensitive', () => {
  assert.equal(lintCopy("A MIRACLE formula.").ok, false);
});

test('TC-TONE-24: no false positives inside ordinary words', () => {
  const result = lintCopy("Secure checkout. Book a manicure. We procure from certified labs.");
  assert.equal(result.ok, true);
  assert.equal(result.violations.length, 0, `false positive: ${JSON.stringify(result.violations)}`);
});

test('TC-TONE-25: exclamation stacking is flagged as hype', () => {
  const result = lintCopy("Amazing energy!!!");
  assert.ok(result.violations.some((v) => v.rule === "punctuation"));
});

test('TC-TONE-26: all-caps shouting is flagged', () => {
  const result = lintCopy("BUY TODAY AND FEEL AMAZING ENERGY");
  assert.ok(result.violations.some((v) => v.rule === "shouting"));
});

test('TC-TONE-27: empty copy is not an error', () => {
  const result = lintCopy("");
  assert.equal(result.ok, true);
  assert.equal(result.violations.length, 0);
});

test('TC-TONE-28: violations explain themselves (reason + suggestion)', () => {
  const violation = lintCopy("This cures everything.").violations[0];
  assert.ok(violation.reason.length > 10, "reason missing");
  assert.ok(violation.suggestion.length > 5, "suggestion missing");
  assert.equal(typeof violation.index, "number");
});

test('TC-TONE-29: the mandatory legal disclaimer is allowed to say "treat" and "cure"', () => {
  const copy = `Supports daily wellbeing. ${APPROVED_DISCLAIMER}`;
  const result = lintCopy(copy);
  assert.equal(result.ok, true, `disclaimer falsely flagged: ${JSON.stringify(result.violations)}`);
});

test('TC-TONE-30: the same words outside the disclaimer are still blocked', () => {
  const copy = "Our blend cures fatigue and treats low energy.";
  assert.equal(lintCopy(copy).ok, false);
});

test('TC-TONE-31: disclaimer stripping can be disabled for auditing', () => {
  const result = lintCopy(APPROVED_DISCLAIMER, { allowDisclaimer: false });
  assert.equal(result.ok, false, "audit mode should expose the disclaimer words");
});

/* ---------------- E. Typography contract ---------------- */

test('TC-TONE-32: two families with two weights each is valid', () => {
  const result = validateTypography({
    families: ["Manrope", "DM Sans"],
    weights: { Manrope: [400, 700], "DM Sans": [400, 600] },
  });
  assert.equal(result.ok, true, JSON.stringify(result.issues));
});

test('TC-TONE-33: a third font family is rejected', () => {
  const result = validateTypography({
    families: ["Manrope", "DM Sans", "Inter"],
    weights: { Manrope: [400], "DM Sans": [400], Inter: [400] },
  });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => /Too many font families/.test(issue)));
});

test('TC-TONE-34: a third weight on one family is rejected', () => {
  const result = validateTypography({
    families: ["Manrope"],
    weights: { Manrope: [300, 400, 700] },
  });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => /3 weights/.test(issue)));
});
