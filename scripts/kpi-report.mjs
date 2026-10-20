/**
 * Prints a markdown KPI status table from simulated home-page traffic.
 *
 * Usage: node scripts/kpi-report.mjs
 *
 * These are simulated numbers used to validate the measurement model, not
 * live site performance. Replace simulateEvents() with your warehouse export.
 */

import {
  computeMetrics,
  evaluateKPIs,
  evaluateDiagnostics,
  projectFunnel,
  simulateEvents,
  simulateLcp,
} from '../lib/kpi.mjs';

const sessions = 10_000;

const events = [
  ...simulateEvents({
    sessions,
    pBounce: 0.45,
    pPdp: 0.65,
    pQuickAdd: 0.2,
    pOrder: 0.035,
    pSignup: 0.09,
    seed: 2026,
  }),
  // Attach LCP samples to a subset of the same sessions so the denominator stays 10,000.
  ...simulateLcp({ sessions: 4000, median: 1.6, spread: 0.35, seed: 11 }).map((event, i) => ({
    ...event,
    sessionId: `sim-${i}`,
    ts: 1_700_000_000_000 + i * 1000 + 1,
  })),
];

const metrics = computeMetrics(events);
const results = evaluateKPIs(metrics);
const diagnostics = evaluateDiagnostics(metrics);
const funnel = projectFunnel(metrics.sessions, metrics);

const pct = (value) => `${(value * 100).toFixed(2)}%`;
const target = (kpi) => (kpi.unit === 'seconds' ? `${kpi.target.toFixed(2)} s` : pct(kpi.target));
const actual = (kpi) =>
  kpi.value === null ? 'n/a' : kpi.unit === 'seconds' ? `${kpi.value.toFixed(2)} s` : pct(kpi.value);

console.log(`| ID | KPI | Target | Simulated | Status |`);
console.log(`|---|---|---|---|---|`);
for (const kpi of results) {
  console.log(`| ${kpi.id} | ${kpi.name} | ${kpi.comparator} ${target(kpi)} | ${actual(kpi)} | **${kpi.status}** |`);
}

console.log('');
console.log('Diagnostics (not a launch gate):');
console.log('');
console.log(`| ID | Metric | Band | Simulated | Status |`);
console.log(`|---|---|---|---|---|`);
for (const entry of diagnostics) {
  console.log(`| ${entry.id} | ${entry.name} | ${entry.bandLabel} | ${entry.formatted} | ${entry.status} |`);
}

console.log('');
console.log(`Sessions: ${funnel.sessions.toLocaleString('en-IN')}`);
console.log(`Product page visits: ${funnel.productPageVisits.toLocaleString('en-IN')}`);
console.log(`Orders: ${funnel.orders.toLocaleString('en-IN')}`);
console.log(`Signups: ${funnel.signups.toLocaleString('en-IN')}`);
console.log(`Bounced: ${funnel.bounced.toLocaleString('en-IN')}`);
console.log(`All KPIs passing: ${results.every((kpi) => kpi.status === 'PASS') ? 'YES' : 'NO'}`);
