/**
 * KPI engine for the health-supplements home page.
 *
 * Requirement set: Section 1 "Goals & KPIs" (G1-G5) of homepage-requirements.md
 * Event contract: Section 12 "Analytics & Tracking"
 *
 * All KPI math lives here so the same code can be used by:
 *  - the test suite (tests/kpi.test.mjs)
 *  - a future dashboard / BigQuery export
 */

export const KPI_TARGETS = [
  {
    id: 'G1',
    name: 'Home -> Product Page CTR',
    metric: 'homeToPdpCtr',
    comparator: '>=',
    target: 0.35,
    unit: 'ratio',
    // Measured by destination: a session counts only when a PDP page view happens.
    // Quick-add and collection clicks do not inflate this number.
    requiresEvents: ['view_home', 'page_view'],
  },
  {
    id: 'G2',
    name: 'Home page conversion rate',
    metric: 'conversionRate',
    comparator: '>=',
    target: 0.018,
    unit: 'ratio',
    requiresEvents: ['view_home', 'purchase'],
  },
  {
    id: 'G3',
    name: 'Email/WhatsApp signup rate',
    metric: 'signupRate',
    comparator: '>=',
    target: 0.04,
    unit: 'ratio',
    requiresEvents: ['view_home', 'newsletter_submit'],
  },
  {
    id: 'G4',
    name: 'Bounce rate',
    metric: 'bounceRate',
    comparator: '<',
    target: 0.55,
    unit: 'ratio',
    requiresEvents: ['view_home', 'scroll_depth'],
  },
  {
    id: 'G5',
    name: 'Mobile LCP (p75)',
    metric: 'lcpP75',
    comparator: '<=',
    target: 2.5,
    unit: 'seconds',
    requiresEvents: ['web_vitals'],
  },
];

const ENGAGEMENT_EVENTS = new Set([
  'pdp_click',
  'product_card_click',
  'hero_cta_click',
  'concern_card_click',
  'quick_add',
  'purchase',
  'newsletter_submit',
]);

/**
 * Diagnostic metrics — monitored, but never treated as launch gates.
 * G6 exists so quick-add gets its own funnel instead of polluting G1.
 */
export const DIAGNOSTIC_KPIS = [
  {
    id: 'G6',
    name: 'Quick-add rate (diagnostic)',
    metric: 'quickAddRate',
    band: [0.08, 0.12],
    note: 'Direct add-to-cart from the home page. Higher intent, shorter path — tracked separately from PDP CTR.',
  },
];

const BOT_PATTERN = /bot|crawler|spider|headless|preview|monitor|lighthouse|gtmetrix/i;

function unique(values) {
  return new Set(values).size;
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, rank))];
}

/** Split raw events into per-session buckets. */
export function groupSessions(events) {
  const sessions = new Map();
  for (const event of events) {
    if (event.isBot) continue;
    if (event.userAgent && BOT_PATTERN.test(event.userAgent) && event.isBot !== false) continue;

    const bucket = sessions.get(event.sessionId) ?? {
      events: [],
      startedAt: event.ts,
      endedAt: event.ts,
    };
    bucket.events.push(event);
    bucket.startedAt = Math.min(bucket.startedAt, event.ts);
    bucket.endedAt = Math.max(bucket.endedAt, event.ts);
    sessions.set(event.sessionId, bucket);
  }
  return sessions;
}

/**
 * Compute every KPI from a flat event stream.
 * Rate metrics are expressed as ratios in [0, 1]; LCP is in seconds.
 */
export function computeMetrics(events) {
  const sessions = groupSessions(events);
  const total = sessions.size;

  if (total === 0) {
    return {
      sessions: 0,
      homeToPdpCtr: 0,
      conversionRate: 0,
      signupRate: 0,
      bounceRate: 0,
      quickAddRate: 0,
      lcpP75: null,
    };
  }

  let pdpSessions = 0;
  let purchaseSessions = 0;
  let signupSessions = 0;
  let bouncedSessions = 0;
  let quickAddSessions = 0;

  for (const { events: sessionEvents, startedAt, endedAt } of sessions.values()) {
    const types = new Set(sessionEvents.map((event) => event.type));
    const pageViews = sessionEvents.filter((event) => event.type === 'view_home').length;
    const engaged =
      [...types].some((type) => ENGAGEMENT_EVENTS.has(type)) ||
      sessionEvents.some((event) => event.type === 'scroll_depth' && Number(event.percent) >= 50);

    // Destination-based: entering a PDP page counts, not the click that caused it.
    if (sessionEvents.some((event) => event.type === 'page_view' && event.page_type === 'pdp')) {
      pdpSessions += 1;
    }
    if (types.has('purchase')) purchaseSessions += 1;
    if (types.has('newsletter_submit')) signupSessions += 1;
    if (types.has('quick_add')) quickAddSessions += 1;
    if (pageViews <= 1 && endedAt - startedAt < 10_000 && !engaged) bouncedSessions += 1;
  }

  const lcpSamples = events
    .filter((event) => event.type === 'web_vitals' && event.metric === 'LCP' && Number.isFinite(event.value))
    .map((event) => event.value / 1000); // ms -> seconds

  return {
    sessions: total,
    homeToPdpCtr: pdpSessions / total,
    conversionRate: purchaseSessions / total,
    signupRate: signupSessions / total,
    bounceRate: bouncedSessions / total,
    quickAddRate: quickAddSessions / total,
    lcpP75: percentile(lcpSamples, 75),
  };
}

function compare(value, comparator, target) {
  switch (comparator) {
    case '>=':
      return value >= target;
    case '>':
      return value > target;
    case '<=':
      return value <= target;
    case '<':
      return value < target;
    default:
      throw new Error(`Unsupported comparator: ${comparator}`);
  }
}

/** Evaluate computed metrics against the Section 1 targets. */
export function evaluateKPIs(metrics) {
  return KPI_TARGETS.map((kpi) => {
    const value = metrics[kpi.metric];
    // No traffic means no measurement — never report a 0% session as a pass.
    const hasTraffic = kpi.unit !== 'ratio' || (metrics.sessions ?? 0) > 0;
    const measurable = hasTraffic && value !== null && value !== undefined && Number.isFinite(value);
    const pass = measurable && compare(value, kpi.comparator, kpi.target);

    return {
      ...kpi,
      value,
      status: measurable ? (pass ? 'PASS' : 'FAIL') : 'NOT MEASURED',
      formatted: formatValue(value, kpi.unit),
      formattedTarget: formatValue(kpi.target, kpi.unit),
    };
  });
}

export function formatValue(value, unit) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'n/a';
  if (unit === 'seconds') return `${value.toFixed(2)} s`;
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * Diagnostics never block a release. They explain *why* a goal moved.
 * Example: high quick-add rate + low PDP CTR = healthy, not broken.
 */
export function evaluateDiagnostics(metrics) {
  return DIAGNOSTIC_KPIS.map((entry) => {
    const value = metrics[entry.metric];
    const measurable =
      (metrics.sessions ?? 0) > 0 && value !== null && value !== undefined && Number.isFinite(value);
    const [low, high] = entry.band;
    let status = 'NOT MEASURED';
    if (measurable) {
      if (value < low) status = 'BELOW BAND';
      else if (value > high) status = 'ABOVE BAND';
      else status = 'IN BAND';
    }
    return {
      ...entry,
      value,
      status,
      formatted: formatValue(value, 'ratio'),
      bandLabel: `${(low * 100).toFixed(0)}-${(high * 100).toFixed(0)}%`,
    };
  });
}

/** Funnel sanity: targets must not contradict each other. */
export function validateTargetConsistency(targets = KPI_TARGETS) {
  const issues = [];
  const byId = Object.fromEntries(targets.map((kpi) => [kpi.id, kpi]));

  for (const kpi of targets) {
    if (kpi.unit === 'ratio' && (kpi.target < 0 || kpi.target > 1)) {
      issues.push(`${kpi.id}: ratio target ${kpi.target} outside [0,1]`);
    }
    if (kpi.unit === 'seconds' && kpi.target <= 0) {
      issues.push(`${kpi.id}: duration target must be positive`);
    }
  }

  // A visitor cannot convert more often than they reach a product page.
  if (byId.G1 && byId.G2 && byId.G2.target >= byId.G1.target) {
    issues.push('G2 (conversion) target must be lower than G1 (home->PDP CTR) target');
  }
  // Bounce is a "<" metric and must stay below 100%.
  if (byId.G4 && byId.G4.target >= 1) {
    issues.push('G4 (bounce rate) target must be below 100%');
  }
  // Signup is a subset of session activity.
  if (byId.G3 && byId.G3.target >= 0.5) {
    issues.push('G3 (signup rate) target looks unrealistic for a home page');
  }

  return { ok: issues.length === 0, issues };
}

/** Human-readable funnel projection, used by the acceptance report. */
export function projectFunnel(sessions, metrics) {
  return {
    sessions,
    productPageVisits: Math.round(sessions * metrics.homeToPdpCtr),
    orders: Math.round(sessions * metrics.conversionRate),
    signups: Math.round(sessions * metrics.signupRate),
    bounced: Math.round(sessions * metrics.bounceRate),
  };
}

/** Deterministic PRNG so the simulation test is reproducible. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Generate synthetic sessions with known conversion probabilities. */
export function simulateEvents({
  sessions = 10_000,
  pPdp = 0.4,
  pQuickAdd = 0.1,
  pOrder = 0.02,
  pSignup = 0.06,
  pBounce = 0.45,
  seed = 42,
}) {
  const random = mulberry32(seed);
  const events = [];

  for (let i = 0; i < sessions; i += 1) {
    const sessionId = `sim-${i}`;
    const start = 1_700_000_000_000 + i * 1000;

    events.push({ sessionId, type: 'view_home', ts: start, page: '/' });

    if (random() < pBounce) continue;

    events.push({ sessionId, type: 'scroll_depth', ts: start + 4000, percent: 75 });

    if (random() < pPdp) {
      events.push({ sessionId, type: 'product_card_click', ts: start + 6000, page: '/' });
      events.push({ sessionId, type: 'page_view', ts: start + 6500, page_type: 'pdp' });
    }
    if (random() < pQuickAdd) {
      events.push({ sessionId, type: 'quick_add', ts: start + 7000, page: '/' });
    }
    if (random() < pSignup) {
      events.push({ sessionId, type: 'newsletter_submit', ts: start + 8000, channel: 'email' });
    }
    if (random() < pOrder) {
      events.push({ sessionId, type: 'purchase', ts: start + 12_000, value: 1299, currency: 'INR' });
    }
  }

  return events;
}

/** p75 LCP sample generator (seconds -> ms events). */
export function simulateLcp({ sessions = 2000, median = 1.9, spread = 0.9, seed = 7 }) {
  const random = mulberry32(seed);
  const events = [];
  for (let i = 0; i < sessions; i += 1) {
    const skewed = median + spread * Math.pow(random(), 2) * 3;
    events.push({ sessionId: `lcp-${i}`, type: 'web_vitals', metric: 'LCP', value: Math.round(skewed * 1000) });
  }
  return events;
}
