/**
 * Acceptance gate for Requirement 14.
 *
 * The QA checklist is only useful if it can produce a pass/fail answer.
 * `evaluateAcceptance()` takes one results object and returns the failing
 * criteria with the measured value, so a release decision is mechanical.
 */

export const BREAKPOINTS = [360, 768, 1024, 1280, 1440];

export const THRESHOLDS = {
  sections: 16,
  lighthouse: { performance: 85, accessibility: 95, seo: 95, bestPractices: 95 },
  lcpMs: 2500,
  cls: 0.1,
  inpMs: 200,
  cmsBlocks: 5,
};

export const CRITERIA = [
  { id: "AC-01", label: "All 16 sections render at 360/768/1024/1280/1440" },
  { id: "AC-02", label: "No horizontal scroll at any breakpoint" },
  { id: "AC-03", label: "Lighthouse: perf ≥ 85, a11y/SEO/best-practices ≥ 95" },
  { id: "AC-04", label: "Core Web Vitals: LCP < 2.5s, CLS ≤ 0.1, INP ≤ 200ms" },
  { id: "AC-05", label: "Cart badge updates without reload; drawer keyboard-operable" },
  { id: "AC-06", label: "No 404 links from the home page" },
  { id: "AC-07", label: "Every claim has a source or is removed" },
  { id: "AC-08", label: "Footer shows disclaimer + FSSAI number" },
  { id: "AC-09", label: "Consent banner blocks analytics until accepted" },
  { id: "AC-10", label: "Structured data validates (Rich Results Test)" },
  { id: "AC-11", label: "Screen reader: no unlabeled buttons, headings in order" },
  { id: "AC-12", label: "CMS editor can change hero, bestsellers and FAQ without a developer" },
];

const labelOf = (id) => CRITERIA.find((entry) => entry.id === id)?.label ?? id;

/** Evaluate a full QA run. Unknown keys in `results` are ignored. */
export function evaluateAcceptance(results = {}) {
  const failed = [];

  const fail = (id, detail) => failed.push({ id, label: labelOf(id), detail });
  const rendered = results.rendered ?? {};

  for (const breakpoint of BREAKPOINTS) {
    const count = rendered[breakpoint] ?? 0;
    if (count < THRESHOLDS.sections) fail("AC-01", `${count}/${THRESHOLDS.sections} sections at ${breakpoint}px`);
  }

  if (results.horizontalScroll !== false) fail("AC-02", "horizontal scroll detected or not measured");

  const lighthouse = results.lighthouse ?? {};
  for (const [metric, minimum] of Object.entries(THRESHOLDS.lighthouse)) {
    const score = lighthouse[metric] ?? 0;
    if (score < minimum) fail("AC-03", `${metric} ${score} < ${minimum}`);
  }

  if (!(results.lcpMs <= THRESHOLDS.lcpMs)) fail("AC-04", `LCP ${results.lcpMs ?? "n/a"}ms (max ${THRESHOLDS.lcpMs})`);
  if (!(results.cls <= THRESHOLDS.cls)) fail("AC-04", `CLS ${results.cls ?? "n/a"} (max ${THRESHOLDS.cls})`);
  if (!(results.inpMs <= THRESHOLDS.inpMs)) fail("AC-04", `INP ${results.inpMs ?? "n/a"}ms (max ${THRESHOLDS.inpMs})`);

  const cart = results.cart ?? {};
  if (cart.badgeUpdates !== true) fail("AC-05", "cart badge does not update without reload");
  if (cart.keyboardDrawer !== true) fail("AC-05", "cart drawer is not keyboard-operable");

  const brokenLinks = results.links404 ?? [];
  if (brokenLinks.length > 0) fail("AC-06", `${brokenLinks.length} broken link(s): ${brokenLinks.slice(0, 3).join(", ")}`);

  if ((results.claimsUnsourced ?? 1) !== 0) fail("AC-07", `${results.claimsUnsourced} unsourced claim(s)`);

  const footer = results.footer ?? {};
  if (footer.disclaimer !== true) fail("AC-08", "disclaimer missing from footer");
  if (footer.fssai !== true) fail("AC-08", "FSSAI number missing from footer");

  if (results.consentBlocksAnalytics !== true) fail("AC-09", "analytics fires before consent");

  if (results.schemaValid !== true) fail("AC-10", "structured data invalid");

  if ((results.unlabeledButtons ?? 1) !== 0) fail("AC-11", `${results.unlabeledButtons} unlabeled button(s)`);
  if (results.headingsOrdered !== true) fail("AC-11", "heading order broken");

  if ((results.cmsEditableBlocks ?? 0) < THRESHOLDS.cmsBlocks) {
    fail("AC-12", `${results.cmsEditableBlocks ?? 0}/${THRESHOLDS.cmsBlocks} blocks editable by CMS`);
  }

  const passed = [...new Set(CRITERIA.map((entry) => entry.id))].filter(
    (id) => !failed.some((entry) => entry.id === id),
  );

  return {
    ok: failed.length === 0,
    passed,
    failed,
    summary: `${passed.length}/${CRITERIA.length} criteria passed`,
  };
}

/** The good fixture used by the tests — also handy as a QA template. */
export const PASSING_RESULTS = {
  rendered: { 360: 16, 768: 16, 1024: 16, 1280: 16, 1440: 16 },
  horizontalScroll: false,
  lighthouse: { performance: 92, accessibility: 98, seo: 100, bestPractices: 96 },
  lcpMs: 2100,
  cls: 0.05,
  inpMs: 150,
  cart: { badgeUpdates: true, keyboardDrawer: true },
  links404: [],
  claimsUnsourced: 0,
  footer: { disclaimer: true, fssai: true },
  consentBlocksAnalytics: true,
  schemaValid: true,
  unlabeledButtons: 0,
  headingsOrdered: true,
  cmsEditableBlocks: 5,
};
