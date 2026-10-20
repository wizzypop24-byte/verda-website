/**
 * Test suite for Requirement 8 — Performance Budgets
 *
 * Run: node --test tests/performance.test.mjs
 *
 * A. Document  — every budget is present, numeric and reproducible.
 * B. Budgets   — boundaries (pass at the limit, fail one unit over).
 * C. Delivery  — lazy loading, image dimensions, critical CSS.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  BUDGETS,
  THROTTLE_PROFILE,
  auditPerformance,
  auditDelivery,
  auditPage,
} from "../lib/perf.mjs";

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

const perfText = section(doc, "## 8. Performance Budget");

const KB = 1024;

const goodMetrics = {
  lcpMs: 2100,
  inpMs: 150,
  cls: 0.05,
  ttfbMs: 600,
  jsBytes: 180 * KB,
  cssBytes: 40 * KB,
  heroImageBytes: 160 * KB,
  fonts: { families: 2, files: 4, display: "swap", selfHosted: true },
  thirdParty: { count: 5, deferred: true },
};

const goodDelivery = {
  images: [
    { src: "hero.avif", position: "above", loading: "eager", width: 2400, height: 1200 },
    { src: "product-1.avif", position: "below", loading: "lazy", width: 1200, height: 1200 },
  ],
  criticalCssInlined: true,
};

/* ---------------- A. Document ---------------- */

test('TC-PERF-01: the core seven budget rows exist', () => {
  for (const token of ['LCP (mobile, 4G)', 'INP', 'CLS', 'Total JS (initial)', 'Hero image', 'Fonts', 'Third-party scripts']) {
    assert.ok(perfText.includes(token), `budget row missing: ${token}`);
  }
});

test('TC-PERF-02: LCP / INP / CLS values match the model', () => {
  assert.match(perfText, /≤ 2\.5 s/);
  assert.match(perfText, /≤ 200 ms/);
  assert.match(perfText, /≤ 0\.1/);
  assert.equal(BUDGETS.lcpMs, 2500);
  assert.equal(BUDGETS.inpMs, 200);
  assert.equal(BUDGETS.cls, 0.1);
});

test('TC-PERF-03: JS budget is 200 KB gzipped', () => {
  assert.match(perfText, /≤ 200 KB gzipped/);
  assert.equal(BUDGETS.jsBytes, 200 * KB);
});

test('TC-PERF-04: hero image budget and formats', () => {
  assert.match(perfText, /≤ 180 KB/);
  assert.match(perfText, /AVIF\/WebP/);
  assert.equal(BUDGETS.heroImageBytes, 180 * KB);
});

test('TC-PERF-05: font rules are complete', () => {
  assert.match(perfText, /≤ 2 families/);
  assert.match(perfText, /≤ 4 files/);
  assert.match(perfText, /font-display: swap/);
  assert.match(perfText, /self-hosted/);
  assert.deepEqual(BUDGETS.fonts, { families: 2, files: 4, display: "swap", selfHosted: true });
});

test('TC-PERF-06: third-party scripts are capped and deferred', () => {
  assert.match(perfText, /≤ 6, all deferred/);
  assert.deepEqual(BUDGETS.thirdParty, { max: 6, deferred: true });
});

test('TC-PERF-07: supporting delivery rules are stated', () => {
  for (const rule of ['lazy-load', 'explicit width/height', 'no layout-shifting banners', 'critical CSS inlined']) {
    assert.ok(new RegExp(rule, 'i').test(perfText), `delivery rule missing: ${rule}`);
  }
});

test('TC-PERF-08: TTFB has a budget (LCP depends on it)', () => {
  assert.match(perfText, /TTFB/i, 'no TTFB budget: backend regressions would be invisible');
  assert.equal(BUDGETS.ttfbMs, 800);
});

test('TC-PERF-09: CSS has its own budget', () => {
  assert.match(perfText, /Total CSS[^\n]*≤ 50 KB/i, 'no CSS budget row: JS is capped but stylesheets are not');
  assert.equal(BUDGETS.cssBytes, 50 * KB);
});

test('TC-PERF-10: the "4G" profile is reproducible', () => {
  assert.match(perfText, /1\.6 Mbps/i);
  assert.match(perfText, /150 ms RTT/i);
  assert.match(perfText, /4× CPU/i);
  assert.deepEqual(THROTTLE_PROFILE, { network: "4G", downMbps: 1.6, rttMs: 150, cpuSlowdown: 4 });
});

/* ---------------- B. Budget boundaries ---------------- */

test('TC-PERF-11: a healthy page passes every budget', () => {
  const result = auditPerformance(goodMetrics);
  assert.deepEqual(result.violations, []);
  assert.equal(result.ok, true);
});

test('TC-PERF-12: LCP passes at 2500 and fails at 2501', () => {
  assert.equal(auditPerformance({ ...goodMetrics, lcpMs: 2500 }).ok, true);
  const result = auditPerformance({ ...goodMetrics, lcpMs: 2501 });
  assert.equal(result.ok, false);
  assert.equal(result.violations[0].rule, "LCP");
});

test('TC-PERF-13: INP passes at 200 and fails at 201', () => {
  assert.equal(auditPerformance({ ...goodMetrics, inpMs: 200 }).ok, true);
  assert.equal(auditPerformance({ ...goodMetrics, inpMs: 201 }).ok, false);
});

test('TC-PERF-14: CLS passes at 0.1 and fails at 0.11', () => {
  assert.equal(auditPerformance({ ...goodMetrics, cls: 0.1 }).ok, true);
  assert.equal(auditPerformance({ ...goodMetrics, cls: 0.11 }).ok, false);
});

test('TC-PERF-15: TTFB passes at 800 and fails at 801', () => {
  assert.equal(auditPerformance({ ...goodMetrics, ttfbMs: 800 }).ok, true);
  assert.equal(auditPerformance({ ...goodMetrics, ttfbMs: 801 }).ok, false);
});

test('TC-PERF-16: JS passes at 200 KB and fails one byte over', () => {
  assert.equal(auditPerformance({ ...goodMetrics, jsBytes: 200 * KB }).ok, true);
  const result = auditPerformance({ ...goodMetrics, jsBytes: 200 * KB + 1 });
  assert.equal(result.ok, false);
  assert.equal(result.violations[0].rule, "JS");
});

test('TC-PERF-17: CSS passes at 50 KB and fails above', () => {
  assert.equal(auditPerformance({ ...goodMetrics, cssBytes: 50 * KB }).ok, true);
  assert.equal(auditPerformance({ ...goodMetrics, cssBytes: 50 * KB + 1 }).ok, false);
});

test('TC-PERF-18: hero image passes at 180 KB and fails above', () => {
  assert.equal(auditPerformance({ ...goodMetrics, heroImageBytes: 180 * KB }).ok, true);
  assert.equal(auditPerformance({ ...goodMetrics, heroImageBytes: 180 * KB + 1 }).ok, false);
});

test('TC-PERF-19: a third font family fails', () => {
  const result = auditPerformance({ ...goodMetrics, fonts: { ...goodMetrics.fonts, families: 3 } });
  assert.equal(result.ok, false);
  assert.equal(result.violations[0].rule, "Font families");
});

test('TC-PERF-20: a fifth font file fails', () => {
  assert.equal(auditPerformance({ ...goodMetrics, fonts: { ...goodMetrics.fonts, files: 5 } }).ok, false);
});

test('TC-PERF-21: font-display and self-hosting are enforced', () => {
  assert.equal(auditPerformance({ ...goodMetrics, fonts: { ...goodMetrics.fonts, display: "block" } }).ok, false);
  assert.equal(auditPerformance({ ...goodMetrics, fonts: { ...goodMetrics.fonts, selfHosted: false } }).ok, false);
});

test('TC-PERF-22: seven third-party scripts fail, six pass', () => {
  assert.equal(auditPerformance({ ...goodMetrics, thirdParty: { count: 6, deferred: true } }).ok, true);
  const result = auditPerformance({ ...goodMetrics, thirdParty: { count: 7, deferred: true } });
  assert.equal(result.ok, false);
  assert.equal(result.violations[0].rule, "Third-party scripts");
});

test('TC-PERF-23: blocking third-party scripts fail even under the cap', () => {
  const result = auditPerformance({ ...goodMetrics, thirdParty: { count: 2, deferred: false } });
  assert.equal(result.ok, false);
  assert.equal(result.violations[0].rule, "Third-party deferral");
});

test('TC-PERF-24: multiple breaches are all reported', () => {
  const result = auditPerformance({
    ...goodMetrics,
    lcpMs: 4000,
    cls: 0.3,
    jsBytes: 300 * KB,
  });
  assert.equal(result.violations.length, 3);
});

/* ---------------- C. Delivery ---------------- */

test('TC-PERF-25: a compliant delivery setup passes', () => {
  assert.equal(auditDelivery(goodDelivery).ok, true);
});

test('TC-PERF-26: below-the-fold images must lazy-load', () => {
  const result = auditDelivery({
    ...goodDelivery,
    images: [{ src: "product.avif", position: "below", loading: "eager", width: 100, height: 100 }],
  });
  assert.equal(result.ok, false);
  assert.equal(result.violations[0].rule, "Lazy loading");
});

test('TC-PERF-27: the hero must not be lazy-loaded', () => {
  const result = auditDelivery({
    ...goodDelivery,
    images: [{ src: "hero.avif", position: "above", loading: "lazy", width: 100, height: 100 }],
  });
  assert.equal(result.ok, false);
  assert.equal(result.violations[0].rule, "LCP image");
});

test('TC-PERF-28: images need explicit dimensions', () => {
  const result = auditDelivery({
    ...goodDelivery,
    images: [{ src: "x.avif", position: "below", loading: "lazy" }],
  });
  assert.equal(result.ok, false);
  assert.equal(result.violations[0].rule, "Image dimensions");
});

test('TC-PERF-29: critical CSS must be inlined', () => {
  assert.equal(auditDelivery({ ...goodDelivery, criticalCssInlined: false }).ok, false);
});

test('TC-PERF-30: combined audit reports performance and delivery issues together', () => {
  const result = auditPage({ ...goodMetrics, lcpMs: 5000 }, { ...goodDelivery, criticalCssInlined: false });
  assert.equal(result.ok, false);
  assert.equal(result.violations.length, 2);
});
