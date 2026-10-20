/**
 * Test suite for Requirement 4 — Page Structure (HM-01 … HM-16)
 *
 * Run: node --test tests/structure.test.mjs
 *
 * What is verified:
 *   A. The 16 sections exist, in order, with stable ids.
 *   B. Each section's content rules are specific enough to build.
 *   C. Shared taxonomies (nav, concerns) cannot drift.
 *   D. The structural validator rejects broken page trees.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  SECTIONS,
  PRIMARY_NAV,
  CONCERNS,
  FLOW_ORDER,
  CORE_SECTIONS,
  validateStructure,
} from "../lib/structure.mjs";

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

const structureText = section(doc, "## 4. Page Structure");

const blocks = structureText
  .split(/\n### 4\./)
  .slice(1)
  .map((chunk) => {
    const [heading, ...rest] = chunk.split("\n");
    const id = (heading.match(/HM-\d{2}/) ?? [])[0];
    return { id, heading: heading.trim(), body: rest.join("\n") };
  })
  .filter((block) => block.id);

const bodyOf = (id) => blocks.find((block) => block.id === id)?.body ?? "";

/* ---------------- A. Structure & order ---------------- */

test('TC-STRUCT-01: the document defines exactly 16 sections', () => {
  assert.equal(blocks.length, 16, `found ${blocks.length} sections`);
});

test('TC-STRUCT-02: section ids are sequential and unique', () => {
  const expected = Array.from({ length: 16 }, (_, i) => `HM-${String(i + 1).padStart(2, "0")}`);
  assert.deepEqual(blocks.map((block) => block.id), expected);
});

test('TC-STRUCT-03: the model matches the document (ids, names, count)', () => {
  const { ok, issues } = validateStructure(SECTIONS, { docIds: blocks.map((block) => block.id) });
  assert.ok(ok, issues.join("; "));
  for (const block of blocks) {
    const model = SECTIONS.find((section) => section.id === block.id);
    assert.ok(model, `${block.id} missing from model`);
    assert.ok(
      block.heading.toLowerCase().includes(model.name.toLowerCase()),
      `${block.id}: model name "${model.name}" not in heading "${block.heading}"`,
    );
  }
});

test('TC-STRUCT-04: render order follows the mobile flow diagram', () => {
  const flowBlock = structureText.match(/```([\s\S]*?)```/)?.[1] ?? "";
  const numbered = [...flowBlock.matchAll(/\[\s*(\d+)\.\s*([^\]]+)\]/g)].map((m) => ({ order: Number(m[1]), name: m[2].trim() }));
  assert.equal(numbered.length, 13, "flow diagram should have 13 numbered blocks between header and footer");
  numbered.forEach((entry, index) => {
    assert.equal(entry.order, index + 1, `flow numbering broken at ${entry.name}`);
    const model = SECTIONS[index + 2]; // HM-03 onward
    assert.equal(model.id, `HM-${String(index + 3).padStart(2, "0")}`);
  });
  assert.match(flowBlock, /Announcement bar/);
  assert.match(flowBlock, /Header \/ Nav/);
  assert.match(flowBlock.trim(), /\[ Footer \]$/);
  assert.deepEqual(FLOW_ORDER, SECTIONS.map((section) => section.id));
});

test('TC-STRUCT-05: every section has at least two concrete rules', () => {
  for (const block of blocks) {
    const bullets = block.body.split(/\r?\n/).filter((line) => /^\s*-\s+/.test(line));
    assert.ok(bullets.length >= 2, `${block.id} has only ${bullets.length} rule(s)`);
  }
});

test('TC-STRUCT-06: component names are unique', () => {
  const names = SECTIONS.map((section) => section.component);
  assert.equal(new Set(names).size, names.length);
});

/* ---------------- B. Per-section content rules ---------------- */

test('TC-HM01: announcement bar is quantified and dismissible', () => {
  const body = bodyOf('HM-01');
  assert.match(body, /max 3/i);
  assert.match(body, /4 s/i);
  assert.match(body, /pause on hover/i);
  assert.match(body, /7 days/i);
  assert.match(body, /40 px/i);
  assert.match(body, /32 px/i);
  assert.match(body, /layout shift/i);
});

test('TC-HM02: header nav, mega-menu and drawer behaviour are defined', () => {
  const body = bodyOf('HM-02');
  for (const item of PRIMARY_NAV) {
    assert.ok(body.includes(item), `nav item missing: ${item}`);
  }
  for (const concern of CONCERNS) {
    assert.ok(body.includes(concern), `mega-menu concern missing: ${concern}`);
  }
  assert.match(body, /sticky/i);
  assert.match(body, /side drawer/i);
  assert.match(body, /Esc/i);
  assert.match(body, /focus trap/i);
});

test('TC-HM03: hero requires H1, two CTAs, trust line and LCP rules', () => {
  const body = bodyOf('HM-03');
  assert.match(body, /\bH1\b/);
  assert.match(body, /Shop Bestsellers/);
  assert.match(body, /60-sec Quiz/);
  assert.match(body, /Free shipping over ₹999/);
  assert.match(body, /fetchpriority="high"/);
  assert.match(body, /srcset/);
  assert.match(body, /autoplay video with sound/i);
});

test('TC-HM04: trust strip is static, verifiable and import-safe', () => {
  const body = bodyOf('HM-04');
  assert.match(body, /4–5 items/);
  assert.match(body, /no carousel/i);
  assert.match(body, /verifiable/i);
  assert.match(body, /Made in India/i);
  assert.match(body, /prohibited/i);
});

test('TC-HM05: concern grid size, destination and interaction are specified', () => {
  const body = bodyOf('HM-05');
  assert.match(body, /6–8 concern cards/);
  assert.match(body, /filtered collection/i);
  assert.match(body, /focus ring/i);
});

test('TC-HM06: bestsellers rail defines layout, card data and quick-add states', () => {
  const body = bodyOf('HM-06');
  assert.match(body, /4 products desktop/i);
  assert.match(body, /1\.2 cards visible mobile/i);
  for (const field of ['image', 'name', 'ingredient', 'rating', 'MRP', 'Add to cart', 'Notify me']) {
    assert.ok(new RegExp(field, 'i').test(body), `card field missing: ${field}`);
  }
  assert.match(body, /toast/i);
  assert.match(body, /30-day revenue/i);
});

test('TC-HM07: differentiation shows 3-4 props and links lab reports', () => {
  const body = bodyOf('HM-07');
  assert.match(body, /3–4 value props/i);
  assert.match(body, /clinically dosed/i);
  assert.match(body, /GMP/i);
  assert.match(body, /View lab reports/i);
  assert.match(body, /PDF per batch/i);
});

test('TC-HM08: ingredient table exposes dose, form and evidence', () => {
  const body = bodyOf('HM-08');
  for (const column of ['Ingredient', 'Dose', 'Form', 'Evidence link']) {
    assert.ok(body.includes(column), `column missing: ${column}`);
  }
  assert.match(body, /label image/i);
  assert.match(body, /without horizontal scroll/i);
});

test('TC-HM09: reviews show aggregate proof and are moderation-safe', () => {
  const body = bodyOf('HM-09');
  assert.match(body, /Aggregate rating/i);
  assert.match(body, /3 review cards/i);
  assert.match(body, /verified badge/i);
  assert.match(body, /incentivized/i);
  assert.match(body, /Read all reviews/i);
});

test('TC-HM10: quiz captures email only after results', () => {
  const body = bodyOf('HM-10');
  assert.match(body, /5 questions/i);
  assert.match(body, /after\*? results|after results/i);
  assert.match(body, /1–3 products/i);
  assert.match(body, /Add all to cart/i);
});

test('TC-HM11: bundles and subscription terms are explicit', () => {
  const body = bodyOf('HM-11');
  assert.match(body, /2–3 curated bundles/i);
  assert.match(body, /10–15% off/i);
  assert.match(body, /skip\/cancel anytime/i);
  assert.match(body, /per-day cost/i);
});

test('TC-HM12: expert block requires qualification and a real bio', () => {
  const body = bodyOf('HM-12');
  assert.match(body, /qualification/i);
  assert.match(body, /1–2 line bio/i);
  assert.match(body, /photo/i);
  assert.match(body, /click-to-play/i);
});

test('TC-HM13: blog teaser is capped at three posts and cannot bury the CTA', () => {
  const body = bodyOf('HM-13');
  assert.match(body, /3 latest articles/i);
  assert.match(body, /read time/i);
  assert.match(body, /below the fold/i);
});

test('TC-HM14: FAQ size, topics and schema parity are defined', () => {
  const body = bodyOf('HM-14');
  assert.match(body, /6–8 questions/i);
  assert.match(body, /first one open/i);
  assert.match(body, /FAQPage/);
  assert.match(body, /no mismatch/i);
  for (const topic of ['safety', 'dosage', 'interactions', 'shipping', 'returns']) {
    assert.ok(body.toLowerCase().includes(topic), `FAQ topic missing: ${topic}`);
  }
});

test('TC-HM15: newsletter has consent, double opt-in and honest incentive', () => {
  const body = bodyOf('HM-15');
  assert.match(body, /single field/i);
  assert.match(body, /consent checkbox/i);
  assert.match(body, /double opt-in/i);
  assert.match(body, /No pre-checked consent/i);
  assert.match(body, /₹100 off/i);
});

test('TC-HM16: footer carries the legal importer block', () => {
  const body = bodyOf('HM-16');
  assert.match(body, /Shop · Learn · Support · Company/);
  for (const policy of ['Shipping', 'Returns', 'Privacy', 'Terms', 'Disclaimer']) {
    assert.ok(body.includes(policy), `policy link missing: ${policy}`);
  }
  assert.match(body, /Imported by/i);
  assert.match(body, /country of origin/i);
  assert.match(body, /FSSAI license number/i);
  assert.match(body, /UPI/i);
  assert.match(body, /GST 5%/i);
});

/* ---------------- C. Shared taxonomy ---------------- */

test('TC-STRUCT-07: mega-menu and concern grid share one taxonomy', () => {
  const navBody = bodyOf('HM-02');
  const gridBody = bodyOf('HM-05');
  for (const concern of CONCERNS) {
    assert.ok(navBody.includes(concern), `mega-menu missing ${concern}`);
  }
  assert.match(gridBody, /same .*concern taxonomy|same taxonomy/i, 'HM-05 must declare that it reuses the HM-02 taxonomy');
  assert.match(gridBody, /6–8/, 'grid range missing');
  assert.ok(CONCERNS.length >= 6 && CONCERNS.length <= 8, 'taxonomy size must fit the 6-8 card grid');
});

test('TC-STRUCT-08: every core section between hero and expert is present', () => {
  assert.equal(CORE_SECTIONS.length, 10);
  for (const id of CORE_SECTIONS) {
    assert.ok(blocks.some((block) => block.id === id), `${id} missing from document`);
  }
});

/* ---------------- D. Validator (negative cases) ---------------- */

test('TC-STRUCT-09: validator rejects duplicate ids', () => {
  const broken = [...SECTIONS.slice(0, 2), { ...SECTIONS[1] }];
  assert.equal(validateStructure(broken).ok, false);
});

test('TC-STRUCT-10: validator rejects out-of-order sections', () => {
  const broken = SECTIONS.map((section) => ({ ...section }));
  broken[2].order = 99;
  const { ok, issues } = validateStructure(broken);
  assert.equal(ok, false);
  assert.ok(issues.some((issue) => /order 99/.test(issue)));
});

test('TC-STRUCT-11: validator rejects sections without required elements', () => {
  const broken = [{ ...SECTIONS[0], required: [] }];
  const { ok, issues } = validateStructure(broken);
  assert.equal(ok, false);
  assert.ok(issues.some((issue) => /no required elements/.test(issue)));
});

test('TC-STRUCT-12: validator detects model/document drift', () => {
  const { ok, issues } = validateStructure(SECTIONS, { docIds: ['HM-01', 'HM-99'] });
  assert.equal(ok, false);
  assert.ok(issues.some((issue) => /HM-99|HM-0[2-9]/.test(issue)));
});
