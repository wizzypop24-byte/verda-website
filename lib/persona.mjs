/**
 * Audience model for Requirement 2 (Target Audience).
 *
 * Each persona must be:
 *   - reachable in one click from the home page,
 *   - served by concrete home-page sections (HM-xx),
 *   - observable through tracked events,
 *   - owned by one KPI so we can tell whether the page works for them.
 */

export const PERSONAS = [
  {
    id: 'fixer',
    name: 'The Fixer',
    age: [30, 45],
    trigger: 'Has a specific issue (sleep, energy, hair, joints). Searches symptom-first.',
    needs: [
      { key: 'shop by concern', sections: ['HM-05'] },
      { key: 'ingredient evidence', sections: ['HM-07', 'HM-08'] },
      { key: 'dosage clarity', sections: ['HM-08'] },
    ],
    primary: 'HM-05',
    sections: ['HM-03', 'HM-05', 'HM-07', 'HM-08', 'HM-10'],
    signals: ['concern_card_click', 'lab_report_click', 'faq_open'],
    kpi: 'G1',
  },
  {
    id: 'optimizer',
    name: 'The Optimizer',
    age: [22, 35],
    trigger: 'Gym/fitness, already takes supplements.',
    needs: [
      { key: 'third-party testing', sections: ['HM-04', 'HM-07'] },
      { key: 'protein/creatine specs', sections: ['HM-06', 'HM-08'] },
      { key: 'lab reports', sections: ['HM-07'] },
      { key: 'subscription discount', sections: ['HM-11'] },
    ],
    primary: 'HM-06',
    sections: ['HM-03', 'HM-04', 'HM-06', 'HM-07', 'HM-08', 'HM-09', 'HM-11'],
    signals: ['product_card_click', 'quick_add', 'lab_report_click'],
    kpi: 'G6',
  },
  {
    id: 'gifter',
    name: 'The Gifter / Family buyer',
    age: [35, 60],
    trigger: 'Buys for parents or spouse.',
    needs: [
      { key: 'simple bundles', sections: ['HM-11'] },
      { key: 'doctor/pharmacist credibility', sections: ['HM-12'] },
      { key: 'easy returns', sections: ['HM-04', 'HM-16'] },
      { key: 'COD', sections: ['HM-03', 'HM-16'] },
    ],
    primary: 'HM-11',
    sections: ['HM-03', 'HM-04', 'HM-09', 'HM-11', 'HM-12', 'HM-16'],
    signals: ['bundle_click', 'purchase', 'faq_open'],
    kpi: 'G2',
  },
];

/** Sections that must be justified by at least one persona. */
export const CORE_SECTIONS = [
  'HM-03',
  'HM-04',
  'HM-05',
  'HM-06',
  'HM-07',
  'HM-08',
  'HM-09',
  'HM-10',
  'HM-11',
  'HM-12',
];

/** section id -> persona ids that rely on it */
export function coverageMatrix(personas = PERSONAS) {
  const matrix = new Map();
  for (const persona of personas) {
    for (const section of persona.sections) {
      matrix.set(section, [...(matrix.get(section) ?? []), persona.id]);
    }
  }
  return matrix;
}

export function uncoveredCoreSections(personas = PERSONAS, core = CORE_SECTIONS) {
  const matrix = coverageMatrix(personas);
  return core.filter((section) => !matrix.get(section)?.length);
}

/** Validate the audience model against the live requirement document. */
export function validatePersonas(personas, { sections = [], events = [], kpis = [] } = {}) {
  const issues = [];
  const seenIds = new Set();
  const seenPrimary = new Map();

  for (const persona of personas) {
    const label = persona.id || '(missing id)';
    if (!persona.id || !persona.name) issues.push(`${label}: id and name are required`);
    if (seenIds.has(persona.id)) issues.push(`${label}: duplicate persona id`);
    seenIds.add(persona.id);

    const [min, max] = persona.age ?? [];
    if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
      issues.push(`${label}: age band must be an increasing pair`);
    } else if (min < 18 || max > 70) {
      issues.push(`${label}: age band ${min}-${max} outside the 18-70 support range`);
    }

    if (!Array.isArray(persona.needs) || persona.needs.length < 2) {
      issues.push(`${label}: at least 2 needs required`);
    }
    for (const need of persona.needs ?? []) {
      if (!need.sections?.length) {
        issues.push(`${label}: need "${need.key}" has no covering section`);
        continue;
      }
      for (const section of need.sections) {
        if (!persona.sections.includes(section)) {
          issues.push(`${label}: need "${need.key}" needs ${section}, not in the persona's section list`);
        }
      }
    }

    if (!persona.primary) issues.push(`${label}: primary entry point missing`);
    if (persona.primary && !persona.sections.includes(persona.primary)) {
      issues.push(`${label}: primary entry ${persona.primary} is not one of its sections`);
    }
    if (persona.primary && seenPrimary.has(persona.primary)) {
      issues.push(`${label}: primary entry ${persona.primary} already owned by ${seenPrimary.get(persona.primary)}`);
    }
    if (persona.primary) seenPrimary.set(persona.primary, persona.id);

    for (const section of persona.sections ?? []) {
      if (sections.length && !sections.includes(section)) {
        issues.push(`${label}: unknown section ${section}`);
      }
    }

    if ((persona.signals ?? []).length < 2) issues.push(`${label}: needs at least 2 tracking signals`);
    for (const signal of persona.signals ?? []) {
      if (events.length && !events.includes(signal)) {
        issues.push(`${label}: untracked signal "${signal}"`);
      }
    }

    if (kpis.length && !kpis.includes(persona.kpi)) {
      issues.push(`${label}: owning KPI ${persona.kpi} is not defined`);
    }
  }

  const gaps = uncoveredCoreSections(personas);
  if (gaps.length) issues.push(`core sections without an owner persona: ${gaps.join(', ')}`);

  return { ok: issues.length === 0, issues };
}

/** How many personas each section serves — used to spot over/under-built sections. */
export function sectionLoad(personas = PERSONAS) {
  return [...coverageMatrix(personas).entries()]
    .map(([section, ids]) => ({ section, personas: ids, count: ids.length }))
    .sort((a, b) => a.section.localeCompare(b.section));
}
