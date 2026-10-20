/**
 * Test suite for Requirement 2 — Target Audience (3 personas)
 *
 * Run: node --test tests/persona.test.mjs
 *
 * What "testing an audience requirement" means before the site exists:
 *   A. Traceability — every persona need maps to a real home-page section (HM-xx).
 *   B. Reachability — every persona has one unique primary path, one click from home.
 *   C. Observability — every persona produces tracked events, so we can prove they were served.
 *   D. Market fit — the India / INR / UPI / COD / FSSAI assumptions are stated.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  PERSONAS,
  CORE_SECTIONS,
  coverageMatrix,
  uncoveredCoreSections,
  validatePersonas,
  sectionLoad,
} from '../lib/persona.mjs';
import { KPI_TARGETS, DIAGNOSTIC_KPIS } from '../lib/kpi.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const doc = readFileSync(join(root, 'homepage-requirements.md'), 'utf8');

function section(text, heading) {
  const start = text.indexOf(heading);
  if (start === -1) return '';
  const rest = text.slice(start + heading.length);
  const end = rest.indexOf('\n---');
  return end === -1 ? rest : rest.slice(0, end);
}

/* ---------------- parsed requirement document ---------------- */

const audienceText = section(doc, '## 2. Target Audience');
const structureText = section(doc, '## 4. Page Structure');
const analyticsText = section(doc, '## 12. Analytics & Tracking');
const mappingText = section(doc, '### 2.1');

const docSections = [...structureText.matchAll(/^###\s+4\.\d+\s+.*?[—-]\s*(HM-\d{2})\s*$/gm)].map((m) => m[1]);
const docEvents = [...analyticsText.matchAll(/^\|\s*`([a-z_]+)`\s*\|/gm)].map((m) => m[1]);
const docKpis = [...KPI_TARGETS, ...DIAGNOSTIC_KPIS].map((kpi) => kpi.id);

const personaRows = [...audienceText.matchAll(/^\|\s*\*\*(.+?)\*\*\s*\((\d{2,3})[–-](\d{2,3})\)\s*\|([^|]+)\|([^|]+)\|/gm)].map(
  ([, name, min, max, profile, needs]) => ({
    name: name.trim(),
    age: [Number(min), Number(max)],
    profile: profile.trim(),
    needs: needs
      .split(',')
      .map((need) => need.trim())
      .filter(Boolean),
  }),
);

const mappingRows = [...mappingText.matchAll(/^\|\s*([^|]+?)\s*\|\s*(HM-\d{2})[^|]*\|\s*([^|]+)\|\s*([^|]+)\|\s*(G\d)\s*\|/gm)].map(
  ([, name, primary, sectionsCell, signalsCell, kpi]) => ({
    name: name.trim(),
    primary,
    sections: [...sectionsCell.matchAll(/HM-\d{2}/g)].map((m) => m[0]),
    signals: [...signalsCell.matchAll(/`([a-z_]+)`/g)].map((m) => m[1]),
    kpi,
  }),
);

/* Requirement sections consumed by the locked market decision */
const functionalText = section(doc, '## 5. Functional Requirements');
const complianceText = section(doc, '## 11. Compliance & Claims');
const footerText = section(doc, '### 4.16 Footer');
const trustText = section(doc, '### 4.4 Trust strip');
const bundlesText = section(doc, '### 4.11 Bundles');

/* ---------------- A. Document / traceability tests ---------------- */

test('TC-AUD-01: exactly three personas are defined', () => {
  assert.equal(personaRows.length, 3, `found ${personaRows.length} persona rows`);
  const names = personaRows.map((p) => p.name.toLowerCase());
  assert.deepEqual(names, ['the fixer', 'the optimizer', 'the gifter / family buyer']);
});

test('TC-AUD-02: every persona has a valid, realistic age band', () => {
  for (const persona of personaRows) {
    const [min, max] = persona.age;
    assert.ok(min < max, `${persona.name}: age band must increase`);
    assert.ok(min >= 18, `${persona.name}: under-18 audience is out of scope`);
    assert.ok(max <= 70, `${persona.name}: age band too wide`);
  }
});

test('TC-AUD-03: every persona lists at least three specific needs', () => {
  for (const persona of personaRows) {
    assert.ok(persona.needs.length >= 3, `${persona.name}: only ${persona.needs.length} needs`);
    for (const need of persona.needs) {
      assert.ok(need.length > 2, `${persona.name}: empty need`);
    }
  }
});

test('TC-AUD-04: Section 2.1 maps every persona to home-page sections', () => {
  assert.ok(mappingText, 'missing "### 2.1" persona -> section mapping table');
  assert.equal(mappingRows.length, 3);
  const mapped = mappingRows.map((r) => r.name.toLowerCase());
  for (const persona of PERSONAS) {
    assert.ok(mapped.includes(persona.name.toLowerCase()), `${persona.name} has no mapping row`);
  }
});

test('TC-AUD-05: every mapped section exists in Section 4', () => {
  const known = new Set(docSections);
  for (const row of mappingRows) {
    for (const id of row.sections) {
      assert.ok(known.has(id), `${row.name}: ${id} is not a real page section`);
    }
  }
});

test('TC-AUD-06: every persona need is covered by a section it actually gets', () => {
  for (const persona of PERSONAS) {
    for (const need of persona.needs) {
      assert.ok(need.sections.length > 0, `${persona.name}: need "${need.key}" uncovered`);
      for (const id of need.sections) {
        assert.ok(
          persona.sections.includes(id),
          `${persona.name}: need "${need.key}" requires ${id}, missing from section list`,
        );
      }
    }
  }
});

test('TC-AUD-07: each persona has one unique primary entry, one click from home', () => {
  const primaries = new Set();
  for (const persona of PERSONAS) {
    assert.ok(persona.primary, `${persona.name}: no primary entry`);
    assert.ok(persona.sections.includes(persona.primary), `${persona.name}: primary not in its sections`);
    assert.ok(!primaries.has(persona.primary), `${persona.name}: primary ${persona.primary} shared`);
    primaries.add(persona.primary);
  }
  assert.equal(primaries.size, PERSONAS.length);
});

test('TC-AUD-08: each persona has at least two tracked signals, all documented', () => {
  const known = new Set(docEvents);
  for (const persona of PERSONAS) {
    assert.ok(persona.signals.length >= 2, `${persona.name}: needs 2+ signals`);
    for (const signal of persona.signals) {
      assert.ok(known.has(signal), `${persona.name}: "${signal}" is not in Section 12`);
    }
  }
});

test('TC-AUD-09: each persona is owned by a defined KPI', () => {
  for (const persona of PERSONAS) {
    assert.ok(docKpis.includes(persona.kpi), `${persona.name}: KPI ${persona.kpi} undefined`);
  }
  assert.deepEqual(PERSONAS.map((p) => p.kpi).sort(), ['G1', 'G2', 'G6']);
});

test('TC-AUD-10: document mapping matches the audience model', () => {
  for (const persona of PERSONAS) {
    const row = mappingRows.find((r) => r.name.toLowerCase() === persona.name.toLowerCase());
    assert.ok(row, `${persona.name}: mapping row missing`);
    assert.equal(row.primary, persona.primary, `${persona.name}: primary entry drift`);
    assert.deepEqual([...row.sections].sort(), [...persona.sections].sort(), `${persona.name}: section drift`);
    assert.deepEqual([...row.signals].sort(), [...persona.signals].sort(), `${persona.name}: signal drift`);
    assert.equal(row.kpi, persona.kpi, `${persona.name}: KPI drift`);
  }
});

test('TC-AUD-11: validator rejects a persona with no needs', () => {
  const { ok, issues } = validatePersonas(
    [{ id: 'x', name: 'X', age: [25, 35], needs: [], sections: ['HM-03'], primary: 'HM-03', signals: ['a', 'b'], kpi: 'G1' }],
    { sections: docSections, events: docEvents, kpis: docKpis },
  );
  assert.equal(ok, false);
  assert.ok(issues.some((issue) => /at least 2 needs/.test(issue)));
});

test('TC-AUD-12: validator rejects unknown sections and events', () => {
  const { ok, issues } = validatePersonas(
    [
      {
        id: 'x',
        name: 'X',
        age: [25, 35],
        needs: [{ key: 'n', sections: ['HM-99'] }],
        sections: ['HM-99'],
        primary: 'HM-99',
        signals: ['ghost_event', 'nope'],
        kpi: 'G9',
      },
    ],
    { sections: docSections, events: docEvents, kpis: docKpis },
  );
  assert.equal(ok, false);
  assert.ok(issues.some((issue) => /unknown section HM-99/.test(issue)));
  assert.ok(issues.some((issue) => /untracked signal/.test(issue)));
});

test('TC-AUD-13: every core section is justified by at least one persona', () => {
  const gaps = uncoveredCoreSections();
  assert.deepEqual(gaps, [], `sections nobody asked for: ${gaps.join(', ')}`);
  for (const id of CORE_SECTIONS) {
    assert.ok(docSections.includes(id), `${id} does not exist in Section 4`);
  }
});

test('TC-AUD-14: no persona depends on a single section', () => {
  for (const persona of PERSONAS) {
    assert.ok(persona.sections.length >= 3, `${persona.name}: only ${persona.sections.length} sections`);
  }
});

test('TC-AUD-15: personas are distinct in id, name and primary path', () => {
  assert.equal(new Set(PERSONAS.map((p) => p.id)).size, 3);
  assert.equal(new Set(PERSONAS.map((p) => p.name)).size, 3);
  assert.equal(new Set(PERSONAS.map((p) => p.primary)).size, 3);
});

test('TC-AUD-16: India-first market assumptions are documented', () => {
  for (const token of ['India', 'INR', 'UPI', 'COD', 'FSSAI']) {
    assert.ok(audienceText.includes(token), `Section 2 missing "${token}" assumption`);
  }
});

test('TC-AUD-17: mobile-first assumption is stated with evidence', () => {
  assert.match(doc, /mobile traffic\s*>\s*75%/i, 'mobile-first assumption missing from Section 15');
});

test('TC-AUD-18: persona trigger text is traceable to Section 2', () => {
  for (const persona of PERSONAS) {
    assert.ok(
      audienceText.toLowerCase().includes(persona.trigger.toLowerCase()),
      `${persona.name}: trigger text not found in Section 2`,
    );
  }
});

test('TC-AUD-19: persona need keywords appear in their document row', () => {
  for (const persona of PERSONAS) {
    const row = personaRows.find((r) => r.name.toLowerCase() === persona.name.toLowerCase());
    assert.ok(row, `${persona.name}: row missing`);
    const haystack = row.needs.join(', ').toLowerCase();
    for (const need of persona.needs) {
      assert.ok(haystack.includes(need.key.toLowerCase()), `${persona.name}: need "${need.key}" missing from doc`);
    }
  }
});

test('TC-AUD-20: section load is balanced (no section serves all personas)', () => {
  const load = sectionLoad();
  assert.equal(load.length >= CORE_SECTIONS.length, true);
  for (const entry of load) {
    assert.ok(entry.count <= PERSONAS.length, `${entry.section}: impossible owner count`);
  }
  const matrix = coverageMatrix();
  assert.equal(matrix.size, new Set(PERSONAS.flatMap((p) => p.sections)).size);
});

test('TC-AUD-21: document naming is stable (no duplicate persona rows)', () => {
  const names = personaRows.map((p) => p.name.toLowerCase());
  assert.equal(new Set(names).size, names.length);
});

/* ---------------- B. Locked market decision (2026-10-20) ---------------- */

test('TC-AUD-22: market decision is locked with import model and launch scale', () => {
  assert.match(audienceText, /LOCKED/i, 'market decision is not marked as locked');
  for (const token of ['India', 'INR', 'UPI', 'COD', 'FSSAI', 'Importer', '800 orders', '4 SKUs', 'GST', '5%']) {
    assert.ok(audienceText.includes(token), `locked decision missing "${token}"`);
  }
  assert.match(audienceText, /Central License/i, 'must specify Central (importer) license, not State');
});

test('TC-AUD-23: Gifter COD need is backed by an enforceable COD policy', () => {
  assert.match(functionalText, /FR-11/, 'COD policy requirement (FR-11) missing');
  assert.match(functionalText, /₹2,000/, 'COD cap missing');
  assert.match(functionalText, /₹29/, 'COD fee missing');
  assert.match(functionalText, /₹50/, 'prepaid incentive missing');
  assert.match(functionalText, /FR-12/, 'COD OTP confirmation missing');
});

test('TC-AUD-24: Gifter returns need is backed by a returns rule and footer policy', () => {
  assert.match(functionalText, /FR-14/, 'returns requirement missing');
  assert.match(functionalText, /sealed|unopened/i, 'sealed-only returns rule missing');
  assert.match(footerText, /Returns/i, 'returns policy link missing from footer');
});

test('TC-AUD-25: no persona relies on a claim the importer cannot make', () => {
  assert.match(trustText, /Made in India/i, 'trust strip must warn about the "Made in India" claim');
  assert.match(trustText, /prohibited/i);
  assert.match(complianceText, /IMP-10/, 'importer checklist must cover the origin claim');
  assert.match(footerText, /country of origin/i, 'footer must disclose country of origin');
  assert.match(footerText, /Imported by/i, 'footer must name the importer');
});

test('TC-AUD-26: Optimizer subscription need is backed by subscription terms', () => {
  assert.match(functionalText, /FR-11/, 'functional section parsed incorrectly');
  assert.match(bundlesText, /skip|cancel/i, 'subscription skip/cancel terms missing from HM-11');
  assert.match(bundlesText, /10[–-]15%|10-15%/, 'subscription discount not quantified');
});

