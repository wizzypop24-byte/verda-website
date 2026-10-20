/**
 * Test suite for Requirement 9 — SEO Requirements
 *
 * Run: node --test tests/seo.test.mjs
 *
 * A. Document — every SEO rule is stated in a checkable way.
 * B. On-page  — titles, descriptions, headings, social tags, canonical.
 * C. Structured data — required blocks, Product fields, FAQ parity.
 * D. Crawl    — robots.txt, sitemap, indexation rules, alt text.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  LIMITS,
  SCHEMA_TYPES,
  PRODUCT_FIELDS,
  validateTitle,
  validateDescription,
  validateHeadings,
  validateOpenGraph,
  validateTwitter,
  validateCanonical,
  validateSchemas,
  validateFaqParity,
  validateRobots,
  validateSitemap,
  isIndexable,
  validateAlt,
} from "../lib/seo.mjs";

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

const seoText = section(doc, "## 9. SEO Requirements");

const goodSchemas = [
  { type: "Organization", format: "json-ld", logo: "https://x/logo.png", sameAs: ["https://instagram.com/x"], contactPoint: "support@x" },
  { type: "WebSite", format: "json-ld", searchAction: true },
  { type: "ItemList", format: "json-ld" },
  { type: "Product", format: "json-ld", name: "Magnesium", image: "https://x/m.avif", price: "1299", availability: "InStock", url: "https://x/products/magnesium" },
  { type: "FAQPage", format: "json-ld" },
];

const goodRobots = [
  "User-agent: *",
  "Disallow: /cart",
  "Disallow: /search",
  "Disallow: /*?filter=",
  "Sitemap: https://shop.example.com/sitemap.xml",
].join("\n");

const SITE = "https://shop.example.com";

/* ---------------- A. Document ---------------- */

test('TC-SEO-01: all seven SEO rule groups are present', () => {
  for (const token of ['One `<h1>`', 'Title ≤ 60 chars', 'Open Graph', 'Structured data', 'robots.txt', 'No indexation', 'Clean URLs']) {
    assert.ok(seoText.includes(token), `SEO rule missing: ${token}`);
  }
});

test('TC-SEO-02: title, description and canonical limits', () => {
  assert.match(seoText, /Title ≤ 60 chars/);
  assert.match(seoText, /meta description ≤ 155 chars/);
  assert.match(seoText, /canonical URL/i);
  assert.equal(LIMITS.title, 60);
  assert.equal(LIMITS.description, 155);
});

test('TC-SEO-03: canonical rules are complete (absolute, self, no params)', () => {
  assert.match(seoText, /absolute/i, 'canonical must be absolute');
  assert.match(seoText, /self-referencing/i, 'canonical must be self-referencing');
  assert.match(seoText, /no .*(query|tracking)/i, 'canonical must exclude tracking/query params');
});

test('TC-SEO-04: all five structured-data types are listed', () => {
  for (const type of SCHEMA_TYPES) {
    assert.ok(seoText.includes(type), `schema type missing: ${type}`);
  }
});

test('TC-SEO-05: Product schema fields are specified', () => {
  for (const field of PRODUCT_FIELDS) {
    assert.ok(new RegExp(`\\b${field}\\b`, 'i').test(seoText), `Product schema field missing: ${field}`);
  }
});

test('TC-SEO-06: structured data format is JSON-LD', () => {
  assert.match(seoText, /JSON-LD/i);
});

test('TC-SEO-07: robots and sitemap requirements are stated', () => {
  assert.match(seoText, /robots\.txt/);
  assert.match(seoText, /XML sitemap/i);
  assert.match(seoText, /home included/i);
});

test('TC-SEO-08: non-indexable URL patterns are named', () => {
  for (const token of ['cart', 'search', 'filter']) {
    assert.ok(seoText.toLowerCase().includes(token), `non-indexable pattern missing: ${token}`);
  }
});

test('TC-SEO-09: alt-text policy distinguishes content and decorative', () => {
  assert.match(seoText, /descriptive alt text/i);
  assert.match(seoText, /empty alt for decorative/i);
});

/* ---------------- B. On-page ---------------- */

test('TC-SEO-10: title passes at 60 chars and fails at 61', () => {
  assert.equal(validateTitle('a'.repeat(60)).ok, true);
  const result = validateTitle('a'.repeat(61));
  assert.equal(result.ok, false);
  assert.match(result.issues[0], /61 chars; max 60/);
});

test('TC-SEO-11: empty title is rejected', () => {
  assert.equal(validateTitle('   ').ok, false);
});

test('TC-SEO-12: description passes at 155 and fails at 156', () => {
  assert.equal(validateDescription('a'.repeat(155)).ok, true);
  assert.equal(validateDescription('a'.repeat(156)).ok, false);
});

test('TC-SEO-13: one H1 with a clean hierarchy passes', () => {
  assert.equal(validateHeadings([1, 2, 2, 3, 2]).ok, true);
});

test('TC-SEO-14: zero or two H1 tags fail', () => {
  assert.equal(validateHeadings([2, 3]).ok, false);
  assert.equal(validateHeadings([1, 2, 1]).ok, false);
});

test('TC-SEO-15: skipped heading levels fail', () => {
  const result = validateHeadings([1, 3]);
  assert.equal(result.ok, false);
  assert.match(result.issues[0], /jumps from H1 to H3/);
});

test('TC-SEO-16: complete Open Graph tags pass', () => {
  const og = {
    title: 'Health supplements',
    description: 'Lab-backed supplements',
    image: 'https://shop.example.com/og.png',
    url: 'https://shop.example.com/',
    type: 'website',
  };
  assert.equal(validateOpenGraph(og).ok, true);
});

test('TC-SEO-17: missing or relative OG image fails', () => {
  const base = {
    title: 't',
    description: 'd',
    url: 'https://shop.example.com/',
    type: 'website',
  };
  assert.equal(validateOpenGraph(base).ok, false);
  assert.equal(validateOpenGraph({ ...base, image: '/og.png' }).ok, false);
});

test('TC-SEO-18: Twitter card must be a large image card', () => {
  assert.equal(validateTwitter({ card: 'summary_large_image', title: 't', description: 'd', image: 'https://x/i.png' }).ok, true);
  assert.equal(validateTwitter({ card: 'player', title: 't', description: 'd', image: 'https://x/i.png' }).ok, false);
});

test('TC-SEO-19: canonical must be absolute, clean and self-referencing', () => {
  assert.equal(validateCanonical('https://shop.example.com/', { expectedPath: '/' }).ok, true);
  assert.equal(validateCanonical('/products/x').ok, false);
  assert.equal(validateCanonical('http://shop.example.com/').ok, false);
  assert.equal(validateCanonical('https://shop.example.com/?utm_source=ig').ok, false);
  assert.equal(validateCanonical('https://shop.example.com/products/a', { expectedPath: '/products/b' }).ok, false);
});

/* ---------------- C. Structured data ---------------- */

test('TC-SEO-20: all required schema blocks pass', () => {
  assert.equal(validateSchemas(goodSchemas).ok, true);
});

test('TC-SEO-21: missing schema types are reported', () => {
  const result = validateSchemas(goodSchemas.filter((schema) => schema.type !== 'FAQPage'));
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => /Missing structured data: FAQPage/.test(issue)));
});

test('TC-SEO-22: incomplete Product schema is rejected', () => {
  const result = validateSchemas(goodSchemas.map((schema) => (schema.type === 'Product' ? { type: 'Product', format: 'json-ld', name: 'x', price: '1' } : schema)));
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => /Product schema missing "image"/.test(issue)));
});

test('TC-SEO-23: non-JSON-LD blocks are rejected', () => {
  const result = validateSchemas(goodSchemas.map((schema) => ({ ...schema, format: 'microdata' })));
  assert.equal(result.ok, false);
});

test('TC-SEO-24: FAQ parity passes when visible and schema match', () => {
  assert.equal(validateFaqParity(['Is it safe?', 'How to take?'], ['how to take?', 'is it safe?']).ok, true);
});

test('TC-SEO-25: FAQ parity fails on count or content mismatch', () => {
  assert.equal(validateFaqParity(['A', 'B'], ['A']).ok, false);
  const result = validateFaqParity(['A'], ['B']);
  assert.equal(result.ok, false);
});

/* ---------------- D. Crawl ---------------- */

test('TC-SEO-26: a correct robots.txt passes', () => {
  assert.equal(validateRobots(goodRobots).ok, true);
});

test('TC-SEO-27: robots.txt must block cart, search, filters and link the sitemap', () => {
  const result = validateRobots('User-agent: *\nDisallow: /admin');
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => /cart/.test(issue)));
  assert.ok(result.issues.some((issue) => /search/.test(issue)));
  assert.ok(result.issues.some((issue) => /filter/.test(issue)));
  assert.ok(result.issues.some((issue) => /sitemap/i.test(issue)));
});

test('TC-SEO-28: sitemap must include the home page with absolute URLs', () => {
  assert.equal(validateSitemap([`${SITE}/`, `${SITE}/products/a`], SITE).ok, true);
  assert.equal(validateSitemap([`${SITE}/products/a`], SITE).ok, false);
  assert.equal(validateSitemap(['/products/a'], SITE).ok, false);
});

test('TC-SEO-29: cart, checkout and search are not indexable', () => {
  assert.equal(isIndexable('/cart'), false);
  assert.equal(isIndexable('/checkout'), false);
  assert.equal(isIndexable('/search?q=magnesium'), false);
});

test('TC-SEO-30: filtered collections are not indexable, clean ones are', () => {
  assert.equal(isIndexable('/collections/sleep'), true);
  assert.equal(isIndexable('/collections/sleep?filter=energy'), false);
});

test('TC-SEO-31: home and product pages are indexable', () => {
  assert.equal(isIndexable('/'), true);
  assert.equal(isIndexable('/products/magnesium'), true);
});

test('TC-SEO-32: alt-text policy works both ways', () => {
  assert.equal(validateAlt({ alt: 'Magnesium bottle, 60 capsules' }).ok, true);
  assert.equal(validateAlt({ alt: '' }).ok, false);
  assert.equal(validateAlt({ alt: '', decorative: true }).ok, true);
  assert.equal(validateAlt({ alt: 'decor', decorative: true }).ok, false);
  assert.equal(validateAlt({ alt: 'x'.repeat(126) }).ok, false);
});
