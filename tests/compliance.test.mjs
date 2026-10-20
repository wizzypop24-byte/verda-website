/**
 * Test suite for Requirement 11 — Compliance & Claims
 *
 * Run: node --test tests/compliance.test.mjs
 *
 * A. Document — the claims policy and importer checklist are complete.
 * B. Rules    — disclaimer, label, shelf life, ports, PIF, GST, origin.
 * C. Trust    — testimonials, age gate, privacy, footer importer block.
 * D. Integration — the brand linter actually blocks the claims this section bans.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  DISCLAIMER,
  REQUIRED_LABEL_FIELDS,
  ALLOWED_PORTS,
  validateDisclaimer,
  validateLabel,
  validateShelfLife,
  validateSupplierClause,
  validatePort,
  validatePIF,
  validateGst,
  validateOriginClaim,
  validateTestimonial,
  validateAgeGate,
  validateProductPage,
  validatePrivacy,
  validateFooter,
  auditCompliance,
} from '../lib/compliance.mjs';
import { lintCopy } from '../lib/tone.mjs';

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

const complianceText = section(doc, '## 11. Compliance & Claims');
const importerRows = [...complianceText.matchAll(/^\|\s*(IMP-\d{2})\s*\|([^|]+)\|([^|]+)\|/gm)].map(([, id, text, why]) => ({
  id,
  text: text.trim(),
  why: why.trim(),
}));
const byImp = Object.fromEntries(importerRows.map((row) => [row.id, row.text]));

const goodLabel = {
  productName: 'Magnesium Glycinate',
  brandName: 'Brand',
  healthSupplement: 'HEALTH SUPPLEMENT',
  notForMedicinal: 'NOT FOR MEDICINAL USE',
  netQuantity: '60 capsules',
  mrp: '₹1,299',
  batchNumber: 'B2026-01',
  bestBefore: '2027-10',
  fssaiLogo: true,
  licenseNumber: '12345678901234',
  importerName: 'Importer Pvt Ltd',
  importerAddress: 'Mumbai, MH',
  countryOfOrigin: 'USA',
  dosage: '1 capsule daily',
  allergen: 'None',
  storage: 'Cool, dry place',
  consumerCare: 'care@brand.in',
};

const goodFooter = {
  fssaiNumber: '12345678901234',
  licenseUrl: 'https://foscos.fssai.gov.in/',
  importerName: 'Importer Pvt Ltd',
  importerAddress: 'Mumbai, MH',
  countryOfOrigin: 'USA',
  customerCare: 'care@brand.in',
};

/* ---------------- A. Document ---------------- */

test('TC-COMP-01: claims policy covers all six prohibitions', () => {
  for (const token of ['No disease/cure/treatment claims', 'structure-function', 'Mandatory disclaimer', 'before/after', 'weight-loss', 'For adults 18+']) {
    assert.ok(complianceText.includes(token), `claims rule missing: ${token}`);
  }
});

test('TC-COMP-02: FSSAI number and status link are required in the footer', () => {
  assert.match(complianceText, /FSSAI license number\*\* in footer/i);
  assert.match(complianceText, /license status page/i);
});

test('TC-COMP-03: the exact disclaimer is written in the document', () => {
  assert.ok(complianceText.includes('diagnose, treat, cure, or prevent any disease'));
  assert.ok(complianceText.includes('Not for medicinal use'));
  assert.ok(DISCLAIMER.includes('Not for medicinal use'));
});

test('TC-COMP-04: product pages must show ingredients, allergens, dosage and storage', () => {
  for (const field of ['ingredient list', 'allergen', 'dosage', 'storage']) {
    assert.ok(complianceText.toLowerCase().includes(field), `product-page field missing: ${field}`);
  }
});

test('TC-COMP-05: testimonials are labelled as individual experiences', () => {
  assert.match(complianceText, /individual experiences/i);
});

test('TC-COMP-06: privacy requirements name DPDP and consent', () => {
  assert.match(complianceText, /consent banner/i);
  assert.match(complianceText, /DPDP Act 2023/i);
});

test('TC-COMP-07: importer checklist has ten sequential items', () => {
  const expected = Array.from({ length: 10 }, (_, i) => `IMP-${String(i + 1).padStart(2, '0')}`);
  assert.deepEqual(importerRows.map((row) => row.id), expected);
});

test('TC-COMP-08: every importer item explains why it matters', () => {
  for (const row of importerRows) {
    assert.ok(row.why.length > 10, `${row.id} has no rationale`);
  }
});

test('TC-COMP-09: the label spec includes batch number and best-before', () => {
  for (const token of ['batch number', 'best before']) {
    assert.ok(byImp['IMP-07']?.toLowerCase().includes(token), `label field missing from IMP-07: ${token}`);
  }
});

test('TC-COMP-10: marketing consent requires stored proof', () => {
  assert.match(complianceText, /opt-in.*proof|proof.*opt-in/i, 'DPDP marketing proof-of-consent is not required');
});

test('TC-COMP-11: the licence type is Central (importer), not State', () => {
  assert.match(byImp['IMP-01'] ?? '', /Central/i);
  assert.match(byImp['IMP-01'] ?? '', /Importer/i);
});

test('TC-COMP-12: shelf-life threshold is 60% or 3 months', () => {
  assert.match(byImp['IMP-03'] ?? '', /60%/);
  assert.match(byImp['IMP-03'] ?? '', /3 months/i);
});

/* ---------------- B. Rules ---------------- */

test('TC-COMP-13: the full disclaimer passes', () => {
  assert.equal(validateDisclaimer(DISCLAIMER).ok, true);
});

test('TC-COMP-14: a partial disclaimer fails on each missing clause', () => {
  assert.equal(validateDisclaimer('Consult a qualified healthcare professional.').ok, false);
  const result = validateDisclaimer('This product is not intended to diagnose, treat, cure, or prevent any disease. Consult a qualified healthcare professional.');
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => /MEDICINAL/.test(issue.message)));
});

test('TC-COMP-15: a complete label passes', () => {
  assert.equal(validateLabel(goodLabel).ok, true);
});

test('TC-COMP-16: every missing label field is reported', () => {
  const result = validateLabel({ ...goodLabel, batchNumber: '', bestBefore: '' });
  assert.equal(result.ok, false);
  assert.equal(result.issues.length, 2);
});

test('TC-COMP-17: licence number must be 14 digits', () => {
  assert.equal(validateLabel({ ...goodLabel, licenseNumber: '123' }).ok, false);
});

test('TC-COMP-18: shelf life passes at 60% or at 3 months', () => {
  assert.equal(validateShelfLife({ percentRemaining: 60, monthsRemaining: 2 }).ok, true);
  assert.equal(validateShelfLife({ percentRemaining: 59, monthsRemaining: 3 }).ok, true);
});

test('TC-COMP-19: shelf life fails below both thresholds', () => {
  const result = validateShelfLife({ percentRemaining: 59, monthsRemaining: 2 });
  assert.equal(result.ok, false);
  assert.deepEqual(result.threshold, { percent: 60, months: 3 });
});

test('TC-COMP-20: supplier clause must promise 18 months', () => {
  assert.equal(validateSupplierClause('Minimum 18 months remaining shelf life at dispatch').ok, true);
  assert.equal(validateSupplierClause('Fresh stock guaranteed').ok, false);
});

test('TC-COMP-21: only designated ports are accepted', () => {
  assert.equal(validatePort('JNPT').ok, true);
  assert.equal(validatePort('Goa').ok, false);
  assert.ok(ALLOWED_PORTS.includes('Chennai'));
});

test('TC-COMP-22: PIF needs all five documents', () => {
  const complete = { formulation: true, ingredientSchedules: true, coa: true, shelfLifeStudy: true, testMethods: true };
  assert.equal(validatePIF(complete).ok, true);
  assert.equal(validatePIF({ formulation: true }).ok, false);
});

test('TC-COMP-23: GST must be 5%', () => {
  assert.equal(validateGst(0.05).ok, true);
  assert.equal(validateGst(0.12).ok, false);
  assert.equal(validateGst(0.18).ok, false);
});

test('TC-COMP-24: origin must say Imported, never Made in India', () => {
  assert.equal(validateOriginClaim('Imported by Importer Pvt Ltd').ok, true);
  const result = validateOriginClaim('Made in India');
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => /Made in India/.test(issue.message)));
});

/* ---------------- C. Trust ---------------- */

test('TC-COMP-25: testimonials need the individual-experience label', () => {
  assert.equal(validateTestimonial({ label: 'Individual experience, results vary' }).ok, true);
  assert.equal(validateTestimonial({ label: 'Verified buyer' }).ok, false);
});

test('TC-COMP-26: incentivized reviews must disclose the incentive', () => {
  assert.equal(validateTestimonial({ label: 'Individual experience', incentivized: true, disclosure: false }).ok, false);
  assert.equal(validateTestimonial({ label: 'Individual experience', incentivized: true, disclosure: true }).ok, true);
});

test('TC-COMP-27: age gate requires 18+', () => {
  assert.equal(validateAgeGate('For adults 18+').ok, true);
  assert.equal(validateAgeGate('For adults').ok, false);
});

test('TC-COMP-28: product page must show all four safety blocks', () => {
  assert.equal(validateProductPage({ ingredients: true, allergens: true, dosage: true, storage: true }).ok, true);
  assert.equal(validateProductPage({ ingredients: true, dosage: true }).ok, false);
});

test('TC-COMP-29: privacy needs banner, policy, DPDP basis and proven opt-in', () => {
  assert.equal(validatePrivacy({ consentBanner: true, policy: true, dpdp: true, marketingOptIn: true }).ok, true);
  assert.equal(validatePrivacy({ consentBanner: true }).ok, false);
});

test('TC-COMP-30: footer importer block requires six legal facts', () => {
  assert.equal(validateFooter(goodFooter).ok, true);
  const result = validateFooter({ ...goodFooter, importerName: '', countryOfOrigin: '' });
  assert.equal(result.ok, false);
  assert.equal(result.issues.length, 2);
});

test('TC-COMP-31: a fully compliant page passes the combined audit', () => {
  const result = auditCompliance({
    disclaimer: DISCLAIMER,
    label: goodLabel,
    shelfLife: { percentRemaining: 80, monthsRemaining: 10 },
    supplierContract: 'Minimum 18 months shelf life at dispatch',
    port: 'JNPT',
    pif: { formulation: true, ingredientSchedules: true, coa: true, shelfLifeStudy: true, testMethods: true },
    gstRate: 0.05,
    originText: 'Imported by Importer Pvt Ltd',
    testimonial: { label: 'Individual experience' },
    ageText: 'Adults 18+',
    productPage: { ingredients: true, allergens: true, dosage: true, storage: true },
    privacy: { consentBanner: true, policy: true, dpdp: true, marketingOptIn: true },
    footer: goodFooter,
  });
  assert.deepEqual(result.issues, []);
});

test('TC-COMP-32: the combined audit surfaces every breach at once', () => {
  const result = auditCompliance({
    disclaimer: '',
    shelfLife: { percentRemaining: 40, monthsRemaining: 1 },
    port: 'Goa',
    gstRate: 0.18,
    originText: 'Made in India',
    ageText: 'Adults',
  });
  assert.equal(result.ok, false);
  assert.ok(result.issues.length >= 6, `only ${result.issues.length} issues reported`);
});

/* ---------------- D. Integration with the brand linter ---------------- */

test('TC-COMP-33: every banned claim in this section is blocked by the copy linter', () => {
  const samples = [
    'Cures joint pain',
    'Miracle formula',
    'Guaranteed results',
    'Lose 5 kg in 2 weeks',
    'Before & after photos',
  ];
  for (const sample of samples) {
    assert.equal(lintCopy(sample).ok, false, `linter allowed: ${sample}`);
  }
});

test('TC-COMP-34: compliant structure-function copy passes the linter', () => {
  const copy = 'Magnesium glycinate 200 mg supports normal muscle function. Third-party tested.';
  assert.deepEqual(lintCopy(copy).violations, []);
});
