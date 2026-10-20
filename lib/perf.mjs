/**
 * Performance budgets for Requirement 8.
 *
 * One budget per metric, expressed in the same units a Lighthouse run reports,
 * so a failing build points at a number instead of an opinion.
 */

export const BUDGETS = {
  lcpMs: 2500,
  inpMs: 200,
  cls: 0.1,
  ttfbMs: 800,
  jsBytes: 200 * 1024,
  cssBytes: 50 * 1024,
  heroImageBytes: 180 * 1024,
  fonts: { families: 2, files: 4, display: "swap", selfHosted: true },
  thirdParty: { max: 6, deferred: true },
};

export const THROTTLE_PROFILE = { network: "4G", downMbps: 1.6, rttMs: 150, cpuSlowdown: 4 };

function push(list, rule, actual, budget, hint) {
  list.push({ rule, actual, budget, hint });
}

export function auditPerformance(metrics = {}) {
  const violations = [];
  const {
    lcpMs,
    inpMs,
    cls,
    ttfbMs,
    jsBytes,
    cssBytes,
    heroImageBytes,
    fonts = {},
    thirdParty = {},
  } = metrics;

  if (lcpMs > BUDGETS.lcpMs) push(violations, "LCP", `${lcpMs} ms`, `${BUDGETS.lcpMs} ms`, "Preload the hero image and reduce render-blocking CSS.");
  if (inpMs > BUDGETS.inpMs) push(violations, "INP", `${inpMs} ms`, `${BUDGETS.inpMs} ms`, "Split long tasks; defer third-party JS.");
  if (cls > BUDGETS.cls) push(violations, "CLS", cls, BUDGETS.cls, "Reserve space for images, banners and fonts.");
  if (ttfbMs > BUDGETS.ttfbMs) push(violations, "TTFB", `${ttfbMs} ms`, `${BUDGETS.ttfbMs} ms`, "Cache HTML at the edge.");
  if (jsBytes > BUDGETS.jsBytes) push(violations, "JS", `${Math.round(jsBytes / 1024)} KB`, `${BUDGETS.jsBytes / 1024} KB`, "Remove unused dependencies.");
  if (cssBytes > BUDGETS.cssBytes) push(violations, "CSS", `${Math.round(cssBytes / 1024)} KB`, `${BUDGETS.cssBytes / 1024} KB`, "Purge unused CSS; inline critical only.");
  if (heroImageBytes > BUDGETS.heroImageBytes) push(violations, "Hero image", `${Math.round(heroImageBytes / 1024)} KB`, `${BUDGETS.heroImageBytes / 1024} KB`, "Serve AVIF/WebP at the rendered size.");

  if (fonts.families > BUDGETS.fonts.families) push(violations, "Font families", fonts.families, BUDGETS.fonts.families, "Use one display + one body family.");
  if (fonts.files > BUDGETS.fonts.files) push(violations, "Font files", fonts.files, BUDGETS.fonts.files, "Subset and drop unused weights.");
  if (fonts.display !== BUDGETS.fonts.display) push(violations, "font-display", fonts.display, BUDGETS.fonts.display, "Use font-display: swap.");
  if (fonts.selfHosted !== BUDGETS.fonts.selfHosted) push(violations, "Font hosting", "third-party", "self-hosted", "Self-host fonts to avoid an extra connection.");

  if (thirdParty.count > BUDGETS.thirdParty.max) push(violations, "Third-party scripts", thirdParty.count, BUDGETS.thirdParty.max, "Remove or consolidate tags.");
  if (thirdParty.count > 0 && thirdParty.deferred !== true) push(violations, "Third-party deferral", "blocking", "deferred", "Add defer/async to every third-party tag.");

  return { ok: violations.length === 0, violations };
}

/** Audit the four supporting rules (lazy loading, dimensions, CSS). */
export function auditDelivery({ images = [], criticalCssInlined = false } = {}) {
  const violations = [];

  for (const image of images) {
    const label = image.src ?? "image";
    if (image.position === "below" && image.loading !== "lazy") {
      push(violations, "Lazy loading", label, "loading=lazy", "Below-the-fold images must lazy-load.");
    }
    if (image.position === "above" && image.loading === "lazy") {
      push(violations, "LCP image", label, "loading=eager", "The hero image must not be lazy-loaded.");
    }
    if (!(image.width > 0) || !(image.height > 0)) {
      push(violations, "Image dimensions", label, "width + height", "Set explicit dimensions to prevent CLS.");
    }
  }

  if (criticalCssInlined !== true) {
    push(violations, "Critical CSS", "external", "inlined", "Inline above-the-fold CSS.");
  }

  return { ok: violations.length === 0, violations };
}

/** Convenience: audit both budgets and delivery in one call. */
export function auditPage(metrics, delivery) {
  const perf = auditPerformance(metrics);
  const css = auditDelivery(delivery);
  const violations = [...perf.violations, ...css.violations];
  return { ok: violations.length === 0, violations };
}

/** Human-readable comparison used by the test report. */
export function formatBudget(value, budget, unit = "ms") {
  return `${value}${unit} / ${budget}${unit}`;
}
