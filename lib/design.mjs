/**
 * Design system rules for Requirement 7.
 *
 * The document states breakpoints, grid, type and accessibility limits.
 * This module makes them executable: layout maths, contrast ratios and
 * asset checks that catch violations before design review.
 */

export const BREAKPOINTS = [360, 768, 1024, 1280, 1440];

export const GRID = {
  mobile: { minWidth: 0, maxWidth: 767, columns: 4, gutter: 16 },
  tablet: { minWidth: 768, maxWidth: 1023, columns: 8, gutter: 16 },
  desktop: { minWidth: 1024, maxWidth: Infinity, columns: 12, gutter: 24 },
};

export const MAX_CONTENT_WIDTH = 1280;

export const TYPE = {
  mobileBase: 16,
  desktopBase: { min: 16, max: 18 },
  h1: { min: 32, max: 56, unit: "clamp" },
};

export const MOTION = { minMs: 150, maxMs: 250, easing: "ease-out" };

export const A11Y = {
  textContrast: 4.5,
  largeTextContrast: 3,
  uiContrast: 3,
  tapTarget: { width: 44, height: 44 },
};

export function breakpointFor(width) {
  if (!Number.isFinite(width) || width < 0) throw new RangeError("viewport width must be >= 0");
  if (width < GRID.tablet.minWidth) return "mobile";
  if (width < GRID.desktop.minWidth) return "tablet";
  return "desktop";
}

export function columnsFor(width) {
  return GRID[breakpointFor(width)].columns;
}

export function gutterFor(width) {
  return GRID[breakpointFor(width)].gutter;
}

/** Content is centred inside a 1280px container on large screens. */
export function containerWidth(viewport) {
  if (!Number.isFinite(viewport) || viewport <= 0) throw new RangeError("viewport must be > 0");
  return Math.min(viewport, MAX_CONTENT_WIDTH);
}

export function validateTapTarget({ width, height } = {}) {
  const issues = [];
  if (!(width >= A11Y.tapTarget.width)) issues.push(`Tap target width ${width}px is below 44px.`);
  if (!(height >= A11Y.tapTarget.height)) issues.push(`Tap target height ${height}px is below 44px.`);
  return { ok: issues.length === 0, issues };
}

export function validateMotion(durationMs) {
  const issues = [];
  if (!Number.isFinite(durationMs)) issues.push("Duration must be a number.");
  else if (durationMs < MOTION.minMs || durationMs > MOTION.maxMs) {
    issues.push(`Duration ${durationMs}ms is outside ${MOTION.minMs}-${MOTION.maxMs}ms.`);
  }
  return { ok: issues.length === 0, issues };
}

/* ---------------- Contrast (WCAG 2.x) ---------------- */

function channel(value) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex) {
  const clean = String(hex).replace("#", "").trim();
  if (!/^[0-9a-f]{6}$/i.test(clean)) throw new Error(`Invalid hex colour: ${hex}`);
  const [r, g, b] = [0, 2, 4].map((index) => parseInt(clean.slice(index, index + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

export function meetsContrast(foreground, background, kind = "text") {
  const minimum = kind === "large" ? A11Y.largeTextContrast : kind === "ui" ? A11Y.uiContrast : A11Y.textContrast;
  return contrastRatio(foreground, background) >= minimum;
}

/* ---------------- Image / text rules ---------------- */

export function validateImage({ textBaked = false, alt = "", role = "content" } = {}) {
  const issues = [];
  if (textBaked) issues.push("Text is baked into the image; headings and CTAs must be real HTML.");
  if (role === "content" && !String(alt).trim()) issues.push("Content image is missing alt text.");
  if (role === "decorative" && String(alt).trim()) issues.push("Decorative image should use empty alt text.");
  return { ok: issues.length === 0, issues };
}
