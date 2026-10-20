/**
 * Accessibility rules for Requirement 10 (WCAG 2.2 AA).
 *
 * These validators cover the failures that are cheap to catch before a browser
 * is involved: missing names, broken focus order, carousel timing, form errors,
 * video captions and landmarks.
 */

export const A11Y = {
  autoAdvanceMaxMs: 5000,
  flashesPerSecondMax: 3,
  requiredLandmarks: ["header", "nav", "main", "footer"],
};

const issue = (rule, message, severity = "error") => ({ rule, message, severity });

export function hasAccessibleName(element = {}) {
  return Boolean(
    String(element.label ?? "").trim() ||
      String(element.text ?? "").trim() ||
      String(element.ariaLabelledBy ?? "").trim(),
  );
}

/** Interactive elements need a name, a visible focus ring and no positive tabindex. */
export function auditInteractive(elements = []) {
  const issues = [];
  for (const element of elements) {
    const name = element.name ?? element.id ?? "(unnamed)";
    if (element.interactive && !hasAccessibleName(element)) {
      issues.push(issue("accessible-name", `${name} is interactive but has no accessible name.`));
    }
    if (Number(element.tabIndex) > 0) {
      issues.push(issue("tabindex", `${name} uses tabindex="${element.tabIndex}"; use 0 or -1.`));
    }
    if (element.interactive && element.focusVisible === false) {
      issues.push(issue("focus-visible", `${name} has no visible focus indicator.`));
    }
  }
  return { ok: issues.length === 0, issues };
}

/** Skip link must target main content and appear on first Tab. */
export function auditSkipLink({ href = "", firstFocusable = false, visibleOnFocus = true } = {}) {
  const issues = [];
  if (href !== "#main" && href !== "#content") issues.push(issue("skip-link", 'Skip link must target "#main" or "#content".'));
  if (!firstFocusable) issues.push(issue("skip-link", "Skip link must be the first focusable element."));
  if (!visibleOnFocus) issues.push(issue("skip-link", "Skip link must become visible on focus."));
  return { ok: issues.length === 0, issues };
}

/** Carousels: pause control, keyboard controls, and ≤5s auto-advance. */
export function auditCarousel({ autoAdvanceMs = 0, hasPauseControl = false, hasKeyboardControls = false } = {}) {
  const issues = [];
  if (autoAdvanceMs > A11Y.autoAdvanceMaxMs) {
    issues.push(issue("carousel-timing", `Auto-advance ${autoAdvanceMs}ms exceeds ${A11Y.autoAdvanceMaxMs}ms.`));
  }
  if (autoAdvanceMs > 0 && !hasPauseControl) {
    issues.push(issue("carousel-pause", "Auto-advancing carousel needs a pause control."));
  }
  if (!hasKeyboardControls) {
    issues.push(issue("carousel-keyboard", "Carousel needs previous/next keyboard controls."));
  }
  return { ok: issues.length === 0, issues };
}

/** Errors must be announced and tied to the field. */
export function auditFormErrors({ ariaLive = "", describedBy = false, suggestsFix = false } = {}) {
  const issues = [];
  if (!["polite", "assertive"].includes(ariaLive)) {
    issues.push(issue("form-error-live", 'Form errors need aria-live="polite" or "assertive".'));
  }
  if (!describedBy) issues.push(issue("form-error-link", "Error text must be linked with aria-describedby."));
  if (!suggestsFix) issues.push(issue("form-error-fix", "Error message should say how to fix the problem.", "warning"));
  return { ok: issues.filter((entry) => entry.severity === "error").length === 0, issues };
}

/** Video needs captions and a transcript; flashing must stay under 3 Hz. */
export function auditVideo({ captions = false, transcript = false, flashesPerSecond = 0, autoplaySound = false } = {}) {
  const issues = [];
  if (!captions) issues.push(issue("video-captions", "Video needs captions."));
  if (!transcript) issues.push(issue("video-transcript", "Video needs a transcript."));
  if (flashesPerSecond > A11Y.flashesPerSecondMax) {
    issues.push(issue("video-flashing", `${flashesPerSecond} flashes/second exceeds 3.`));
  }
  if (autoplaySound) issues.push(issue("video-autoplay", "No autoplay with sound."));
  return { ok: issues.length === 0, issues };
}

export function auditLandmarks({ header = false, nav = false, main = false, footer = false } = {}) {
  const issues = [];
  for (const landmark of A11Y.requiredLandmarks) {
    if (!{ header, nav, main, footer }[landmark]) {
      issues.push(issue("landmark", `Missing <${landmark}> landmark.`));
    }
  }
  return { ok: issues.length === 0, issues };
}

/** 3.1.1 Language of page + 2.4.2 Page titled. */
export function auditLangTitle({ lang = "", title = "" } = {}) {
  const issues = [];
  if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(lang)) issues.push(issue("lang", `Invalid or missing lang attribute: "${lang}".`));
  if (!String(title).trim()) issues.push(issue("page-title", "Page title is empty."));
  return { ok: issues.length === 0, issues };
}

/** WCAG 2.2 · 2.4.11 Focus Not Obscured — sticky headers must reserve scroll padding. */
export function auditFocusObscured({ headerHeight = 0, scrollPaddingTop = 0 } = {}) {
  const issues = [];
  if (headerHeight > 0 && scrollPaddingTop < headerHeight) {
    issues.push(issue("focus-obscured", `scroll-padding-top ${scrollPaddingTop}px is smaller than the ${headerHeight}px sticky header.`));
  }
  return { ok: issues.length === 0, issues };
}

export function duplicateIds(ids = []) {
  const seen = new Set();
  const duplicates = new Set();
  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  return [...duplicates];
}

export function auditPage(page = {}) {
  const issues = [];
  const run = (result) => issues.push(...result.issues);

  if (page.interactive) run(auditInteractive(page.interactive));
  if (page.skipLink) run(auditSkipLink(page.skipLink));
  if (page.carousel) run(auditCarousel(page.carousel));
  if (page.formErrors) run(auditFormErrors(page.formErrors));
  if (page.video) run(auditVideo(page.video));
  if (page.landmarks) run(auditLandmarks(page.landmarks));
  if (page.meta) run(auditLangTitle(page.meta));
  if (page.stickyHeader) run(auditFocusObscured(page.stickyHeader));
  if (page.ids) {
    for (const id of duplicateIds(page.ids)) issues.push(issue("duplicate-id", `Duplicate id "${id}".`));
  }

  const errors = issues.filter((entry) => entry.severity === "error");
  return { ok: errors.length === 0, violations: issues, errorCount: errors.length, warningCount: issues.length - errors.length };
}
