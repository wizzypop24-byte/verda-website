/**
 * Test suite for Requirement 7 — Design & Responsive Rules
 *
 * Run: node --test tests/design.test.mjs
 *
 * A. Document tests — the eight design rules are present and numeric.
 * B. Layout maths    — breakpoints, columns, gutters, container width.
 * C. Accessibility   — tap targets, motion limits, WCAG contrast.
 * D. Image rules     — no baked text, alt-text policy.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  BREAKPOINTS,
  GRID,
  MAX_CONTENT_WIDTH,
  TYPE,
  MOTION,
  A11Y,
  breakpointFor,
  columnsFor,
  gutterFor,
  containerWidth,
  validateTapTarget,
  validateMotion,
  contrastRatio,
  meetsContrast,
  validateImage,
} from "../lib/design.mjs";

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

const designText = section(doc, "## 7. Design & Responsive Rules");

/* ---------------- A. Document ---------------- */

test('TC-DSGN-01: all eight design rules are present', () => {
  for (const token of ['**Breakpoints:**', '**Grid:**', '**Max content width:**', '**Type scale:**', '**Tap targets:**', '**Contrast:**', '**Motion:**', '**No text inside images**']) {
    assert.ok(designText.includes(token), `missing rule: ${token}`);
  }
});

test('TC-DSGN-02: breakpoint list matches the model', () => {
  assert.match(designText, /360 \/ 768 \/ 1024 \/ 1280 \/ 1440 px/);
  assert.deepEqual(BREAKPOINTS, [360, 768, 1024, 1280, 1440]);
});

test('TC-DSGN-03: grid columns are defined per device', () => {
  assert.match(designText, /12-col desktop, 8-col tablet, 4-col mobile/);
  assert.equal(GRID.desktop.columns, 12);
  assert.equal(GRID.tablet.columns, 8);
  assert.equal(GRID.mobile.columns, 4);
});

test('TC-DSGN-04: gutters are 24 / 16 / 16', () => {
  assert.match(designText, /gutter 24 \/ 16 \/ 16 px/);
  assert.equal(gutterFor(1440), 24);
  assert.equal(gutterFor(800), 16);
  assert.equal(gutterFor(360), 16);
});

test('TC-DSGN-05: max content width is 1280px', () => {
  assert.match(designText, /Max content width:<\/strong> 1280 px|Max content width:\*\* 1280 px/);
  assert.equal(MAX_CONTENT_WIDTH, 1280);
});

test('TC-DSGN-06: type scale is quantified', () => {
  assert.match(designText, /mobile base 16 px/);
  assert.match(designText, /desktop base 16–18 px/);
  assert.match(designText, /H1 clamp\(32px → 56px\)/);
  assert.equal(TYPE.mobileBase, 16);
  assert.deepEqual(TYPE.desktopBase, { min: 16, max: 18 });
  assert.deepEqual([TYPE.h1.min, TYPE.h1.max], [32, 56]);
});

test('TC-DSGN-07: tap target is at least 44x44', () => {
  assert.match(designText, /44×44 px/);
  assert.deepEqual(A11Y.tapTarget, { width: 44, height: 44 });
});

test('TC-DSGN-08: contrast covers body text AND large text / UI', () => {
  assert.match(designText, /4\.5:1/);
  assert.match(designText, /3:1/, 'large text and UI contrast (WCAG 1.4.3 / 1.4.11) not stated');
  assert.equal(A11Y.textContrast, 4.5);
  assert.equal(A11Y.largeTextContrast, 3);
  assert.equal(A11Y.uiContrast, 3);
});

test('TC-DSGN-09: motion duration and reduced-motion support are stated', () => {
  assert.match(designText, /150–250 ms/);
  assert.match(designText, /prefers-reduced-motion/);
  assert.equal(MOTION.minMs, 150);
  assert.equal(MOTION.maxMs, 250);
});

test('TC-DSGN-10: no-text-in-images applies to every image', () => {
  assert.match(designText, /No text inside images/);
  assert.match(designText, /every image|all images/i, 'rule is limited to headings/CTAs; it must cover every image');
});

/* ---------------- B. Layout maths ---------------- */

test('TC-DSGN-11: breakpoint mapping at the boundaries', () => {
  assert.equal(breakpointFor(360), "mobile");
  assert.equal(breakpointFor(767), "mobile");
  assert.equal(breakpointFor(768), "tablet");
  assert.equal(breakpointFor(1023), "tablet");
  assert.equal(breakpointFor(1024), "desktop");
  assert.equal(breakpointFor(1440), "desktop");
});

test('TC-DSGN-12: columns follow the device', () => {
  assert.equal(columnsFor(360), 4);
  assert.equal(columnsFor(800), 8);
  assert.equal(columnsFor(1440), 12);
});

test('TC-DSGN-13: container is capped at 1280 but never overflows small screens', () => {
  assert.equal(containerWidth(1440), 1280);
  assert.equal(containerWidth(1280), 1280);
  assert.equal(containerWidth(360), 360);
});

test('TC-DSGN-14: invalid viewports are rejected', () => {
  assert.throws(() => breakpointFor(-1), RangeError);
  assert.throws(() => containerWidth(0), RangeError);
});

/* ---------------- C. Accessibility ---------------- */

test('TC-DSGN-15: tap targets pass at 44x44 and fail at 43', () => {
  assert.equal(validateTapTarget({ width: 44, height: 44 }).ok, true);
  assert.equal(validateTapTarget({ width: 44, height: 48 }).ok, true);
  assert.equal(validateTapTarget({ width: 43, height: 44 }).ok, false);
});

test('TC-DSGN-16: motion durations inside the window pass, outside fail', () => {
  assert.equal(validateMotion(150).ok, true);
  assert.equal(validateMotion(200).ok, true);
  assert.equal(validateMotion(250).ok, true);
  assert.equal(validateMotion(149).ok, false);
  assert.equal(validateMotion(251).ok, false);
});

test('TC-DSGN-17: contrast maths is correct at the extremes', () => {
  assert.equal(Math.round(contrastRatio('#000000', '#ffffff')), 21);
  assert.equal(Math.round(contrastRatio('#ffffff', '#ffffff')), 1);
  assert.equal(Math.round(contrastRatio('#ffffff', '#000000')), 21, 'ratio must be symmetric');
});

test('TC-DSGN-18: brand ink on white passes body-text contrast', () => {
  assert.equal(meetsContrast('#16211a', '#ffffff'), true);
  assert.equal(meetsContrast('#5d6b62', '#ffffff'), true, 'muted text must still pass 4.5:1');
});

test('TC-DSGN-19: light grey on white fails body-text contrast', () => {
  assert.equal(meetsContrast('#cccccc', '#ffffff'), false);
  assert.ok(contrastRatio('#cccccc', '#ffffff') < 4.5);
});

test('TC-DSGN-20: large text uses a 3:1 threshold', () => {
  const ratio = contrastRatio('#888888', '#ffffff');
  assert.ok(ratio < 4.5 && ratio >= 3, `fixture ratio ${ratio} must sit between 3 and 4.5`);
  assert.equal(meetsContrast('#888888', '#ffffff', 'large'), true);
  assert.equal(meetsContrast('#888888', '#ffffff', 'text'), false);
});

test('TC-DSGN-21: invalid hex colours are rejected', () => {
  assert.throws(() => contrastRatio('#fff', '#000000'));
  assert.throws(() => contrastRatio('nope', '#000000'));
});

/* ---------------- D. Image rules ---------------- */

test('TC-DSGN-22: baked-in text is rejected', () => {
  assert.equal(validateImage({ textBaked: true, alt: 'Hero image' }).ok, false);
});

test('TC-DSGN-23: content images require alt text', () => {
  assert.equal(validateImage({ alt: '' }).ok, false);
  assert.equal(validateImage({ alt: 'Magnesium bottle on a white background' }).ok, true);
});

test('TC-DSGN-24: decorative images must use empty alt', () => {
  assert.equal(validateImage({ role: 'decorative', alt: '' }).ok, true);
  assert.equal(validateImage({ role: 'decorative', alt: 'decoration' }).ok, false);
});
