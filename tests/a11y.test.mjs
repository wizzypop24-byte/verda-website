/**
 * Test suite for Requirement 10 — Accessibility (WCAG 2.2 AA)
 *
 * Run: node --test tests/a11y.test.mjs
 *
 * A. Document  — the seven accessibility rules are stated, plus page language.
 * B. Components — focus, names, skip link, carousel, forms, video, landmarks.
 * C. Aggregate  — a healthy page passes; a broken page reports every issue.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  A11Y,
  hasAccessibleName,
  auditInteractive,
  auditSkipLink,
  auditCarousel,
  auditFormErrors,
  auditVideo,
  auditLandmarks,
  auditLangTitle,
  auditFocusObscured,
  duplicateIds,
  auditPage,
} from "../lib/a11y.mjs";

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

const a11yText = section(doc, "## 10. Accessibility (WCAG 2.2 AA)");

const goodPage = {
  meta: { lang: "en-IN", title: "Health supplements for sleep, energy and gut" },
  landmarks: { header: true, nav: true, main: true, footer: true },
  skipLink: { href: "#main", firstFocusable: true, visibleOnFocus: true },
  interactive: [
    { name: "cart", interactive: true, label: "Cart, 2 items", focusVisible: true, tabIndex: 0 },
    { name: "menu", interactive: true, label: "Menu", focusVisible: true, tabIndex: 0 },
  ],
  carousel: { autoAdvanceMs: 4000, hasPauseControl: true, hasKeyboardControls: true },
  formErrors: { ariaLive: "polite", describedBy: true, suggestsFix: true },
  video: { captions: true, transcript: true, flashesPerSecond: 0, autoplaySound: false },
  stickyHeader: { headerHeight: 72, scrollPaddingTop: 88 },
  ids: ["main", "cart", "hero"],
};

/* ---------------- A. Document ---------------- */

test('TC-A11Y-01: WCAG 2.2 AA scope is declared', () => {
  assert.ok(doc.includes('## 10. Accessibility (WCAG 2.2 AA)'), 'section heading must state the WCAG level');
});

test('TC-A11Y-02: keyboard navigation and focus indicators are required', () => {
  assert.match(a11yText, /keyboard navigation/i);
  assert.match(a11yText, /focus indicator|focus indicators/i);
});

test('TC-A11Y-03: skip-to-content link is required', () => {
  assert.match(a11yText, /skip-to-content/i);
});

test('TC-A11Y-04: icon-only buttons need ARIA labels', () => {
  assert.match(a11yText, /ARIA labels/i);
  assert.match(a11yText, /icon-only/i);
});

test('TC-A11Y-05: carousel rules are complete', () => {
  assert.match(a11yText, /pause control/i);
  assert.match(a11yText, /keyboard arrows/i);
  assert.match(a11yText, /5 s/i);
  assert.equal(A11Y.autoAdvanceMaxMs, 5000);
});

test('TC-A11Y-06: form errors must be announced', () => {
  assert.match(a11yText, /aria-live/);
});

test('TC-A11Y-07: video captions, transcript and flash limits', () => {
  assert.match(a11yText, /captions/i);
  assert.match(a11yText, /transcript/i);
  assert.match(a11yText, /flashing/i);
  assert.equal(A11Y.flashesPerSecondMax, 3);
});

test('TC-A11Y-08: screen-reader testing on mobile and desktop', () => {
  for (const tool of ['VoiceOver', 'TalkBack', 'NVDA']) {
    assert.ok(a11yText.includes(tool), `screen-reader target missing: ${tool}`);
  }
});

test('TC-A11Y-09: page language is declared', () => {
  assert.match(a11yText, /<html lang|lang="en/i, 'WCAG 3.1.1: page language is not stated');
});

test('TC-A11Y-10: focus cannot be hidden behind the sticky header', () => {
  assert.match(a11yText, /scroll-padding|focus.*obscured|obscured.*focus/i, 'WCAG 2.2 · 2.4.11 Focus Not Obscured missing');
  assert.equal(A11Y.requiredLandmarks.length, 4);
});

/* ---------------- B. Components ---------------- */

test('TC-A11Y-11: accessible names come from text, label or aria-labelledby', () => {
  assert.equal(hasAccessibleName({ text: 'Search' }), true);
  assert.equal(hasAccessibleName({ label: 'Cart' }), true);
  assert.equal(hasAccessibleName({ ariaLabelledBy: 'cart-heading' }), true);
  assert.equal(hasAccessibleName({ text: '   ' }), false);
});

test('TC-A11Y-12: icon-only buttons without a name fail', () => {
  const result = auditInteractive([{ name: 'cart', interactive: true, focusVisible: true }]);
  assert.equal(result.ok, false);
  assert.equal(result.issues[0].rule, 'accessible-name');
});

test('TC-A11Y-13: labelled icon buttons pass', () => {
  assert.equal(auditInteractive([{ name: 'cart', interactive: true, label: 'Cart, 2 items', focusVisible: true }]).ok, true);
});

test('TC-A11Y-14: positive tabindex is rejected', () => {
  const result = auditInteractive([{ name: 'search', interactive: true, label: 'Search', focusVisible: true, tabIndex: 2 }]);
  assert.equal(result.ok, false);
  assert.equal(result.issues[0].rule, 'tabindex');
});

test('TC-A11Y-15: missing focus indicator is rejected', () => {
  const result = auditInteractive([{ name: 'cta', interactive: true, text: 'Shop', focusVisible: false }]);
  assert.equal(result.ok, false);
  assert.equal(result.issues[0].rule, 'focus-visible');
});

test('TC-A11Y-16: skip link must target main and be first', () => {
  assert.equal(auditSkipLink({ href: '#main', firstFocusable: true, visibleOnFocus: true }).ok, true);
  const result = auditSkipLink({ href: '#footer', firstFocusable: false, visibleOnFocus: false });
  assert.equal(result.ok, false);
  assert.equal(result.issues.length, 3);
});

test('TC-A11Y-17: skip link must be visible on focus', () => {
  const result = auditSkipLink({ href: '#content', firstFocusable: true, visibleOnFocus: false });
  assert.equal(result.ok, false);
});

test('TC-A11Y-18: carousel at 5000ms passes, 5001ms fails', () => {
  assert.equal(auditCarousel({ autoAdvanceMs: 5000, hasPauseControl: true, hasKeyboardControls: true }).ok, true);
  const result = auditCarousel({ autoAdvanceMs: 5001, hasPauseControl: true, hasKeyboardControls: true });
  assert.equal(result.ok, false);
  assert.equal(result.issues[0].rule, 'carousel-timing');
});

test('TC-A11Y-19: auto-advancing carousel without pause fails', () => {
  const result = auditCarousel({ autoAdvanceMs: 3000, hasPauseControl: false, hasKeyboardControls: true });
  assert.equal(result.ok, false);
  assert.equal(result.issues[0].rule, 'carousel-pause');
});

test('TC-A11Y-20: static carousel needs no pause control', () => {
  assert.equal(auditCarousel({ autoAdvanceMs: 0, hasPauseControl: false, hasKeyboardControls: true }).ok, true);
});

test('TC-A11Y-21: carousel without keyboard controls fails', () => {
  const result = auditCarousel({ autoAdvanceMs: 0, hasPauseControl: true, hasKeyboardControls: false });
  assert.equal(result.ok, false);
});

test('TC-A11Y-22: form errors require aria-live and aria-describedby', () => {
  assert.equal(auditFormErrors({ ariaLive: 'polite', describedBy: true, suggestsFix: true }).ok, true);
  const result = auditFormErrors({ ariaLive: '', describedBy: false, suggestsFix: false });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((entry) => entry.rule === 'form-error-live'));
});

test('TC-A11Y-23: a fix suggestion is a warning, not a blocker', () => {
  const result = auditFormErrors({ ariaLive: 'assertive', describedBy: true, suggestsFix: false });
  assert.equal(result.ok, true);
  assert.equal(result.issues[0].severity, 'warning');
});

test('TC-A11Y-24: video requires captions and a transcript', () => {
  assert.equal(auditVideo({ captions: true, transcript: true }).ok, true);
  const result = auditVideo({ captions: false, transcript: false });
  assert.equal(result.ok, false);
  assert.equal(result.issues.length, 2);
});

test('TC-A11Y-25: flashing above 3 per second fails', () => {
  assert.equal(auditVideo({ captions: true, transcript: true, flashesPerSecond: 3 }).ok, true);
  assert.equal(auditVideo({ captions: true, transcript: true, flashesPerSecond: 4 }).ok, false);
});

test('TC-A11Y-26: autoplay with sound is rejected', () => {
  const result = auditVideo({ captions: true, transcript: true, autoplaySound: true });
  assert.equal(result.ok, false);
});

test('TC-A11Y-27: all four landmarks are required', () => {
  assert.equal(auditLandmarks({ header: true, nav: true, main: true, footer: true }).ok, true);
  const result = auditLandmarks({ header: true });
  assert.equal(result.ok, false);
  assert.equal(result.issues.length, 3);
});

test('TC-A11Y-28: lang and title are validated', () => {
  assert.equal(auditLangTitle({ lang: 'en-IN', title: 'Supplements' }).ok, true);
  assert.equal(auditLangTitle({ lang: '', title: '' }).ok, false);
  assert.equal(auditLangTitle({ lang: 'english', title: 'x' }).ok, false);
});

test('TC-A11Y-29: sticky header must reserve scroll padding', () => {
  assert.equal(auditFocusObscured({ headerHeight: 72, scrollPaddingTop: 88 }).ok, true);
  const result = auditFocusObscured({ headerHeight: 96, scrollPaddingTop: 0 });
  assert.equal(result.ok, false);
  assert.equal(result.issues[0].rule, 'focus-obscured');
});

test('TC-A11Y-30: duplicate ids are detected', () => {
  assert.deepEqual(duplicateIds(['a', 'b', 'a', 'c', 'b']), ['a', 'b']);
  assert.deepEqual(duplicateIds(['a', 'b']), []);
});

/* ---------------- C. Aggregate ---------------- */

test('TC-A11Y-31: a compliant page passes with zero violations', () => {
  const result = auditPage(goodPage);
  assert.equal(result.ok, true, JSON.stringify(result.violations));
  assert.equal(result.errorCount, 0);
});

test('TC-A11Y-32: a broken page reports every category', () => {
  const result = auditPage({
    meta: { lang: '', title: '' },
    landmarks: { header: true },
    skipLink: { href: '#footer', firstFocusable: false, visibleOnFocus: false },
    interactive: [{ name: 'icon', interactive: true, focusVisible: false }],
    carousel: { autoAdvanceMs: 9000, hasPauseControl: false, hasKeyboardControls: false },
    formErrors: { ariaLive: '', describedBy: false },
    video: { captions: false, transcript: false, flashesPerSecond: 6 },
    stickyHeader: { headerHeight: 100, scrollPaddingTop: 10 },
    ids: ['a', 'a'],
  });
  assert.equal(result.ok, false);
  assert.ok(result.violations.length >= 12, `only ${result.violations.length} issues reported`);
});

test('TC-A11Y-33: warnings alone do not block', () => {
  const result = auditPage({
    ...goodPage,
    formErrors: { ariaLive: 'polite', describedBy: true, suggestsFix: false },
  });
  assert.equal(result.ok, true);
  assert.equal(result.warningCount, 1);
});

test('TC-A11Y-34: empty audit is valid', () => {
  assert.equal(auditPage({}).ok, true);
});
