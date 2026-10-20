/**
 * Brand & Tone rules for Requirement 3.
 *
 * Purpose: turn the prose style guide ("clinical but warm, lab-backed not
 * hype-backed") into something a copywriter and a test suite can both check.
 *
 * Usage:
 *   lintCopy("Unlock your best sleep ever!!")
 *   -> { ok: false, violations: [...] }
 */

export const BRAND = {
  tone: ["clinical but warm", "lab-backed", "specific", "no hype"],
  typography: {
    families: { min: 1, max: 2, roles: ["display", "body"] },
    weightsPerFamily: { max: 2 },
  },
  visual: {
    base: "white / off-white",
    accent: "one accent colour per product category",
    photography: ["real product photography", "ingredient macro shots"],
    prohibited: ["stock gym models", "before/after body photos"],
  },
};

/** Words and claims that must never ship. */
export const BANNED_TERMS = [
  { term: "miracle", severity: "error", reason: "Hype claim; implies supernatural efficacy.", suggestion: "Describe the ingredient and dose instead." },
  { term: "cure", severity: "error", reason: "Disease/treatment claim — prohibited by FSSAI and consumer law.", suggestion: "Use 'supports normal function'." },
  { term: "cures", severity: "error", reason: "Disease/treatment claim.", suggestion: "Use 'supports'." },
  { term: "curing", severity: "error", reason: "Disease/treatment claim.", suggestion: "Use 'supports'." },
  { term: "treats", severity: "error", reason: "Disease/treatment claim.", suggestion: "Use 'helps maintain'." },
  { term: "treatment", severity: "error", reason: "Medical framing of a food supplement.", suggestion: "Use 'routine' or 'support'." },
  { term: "guarantee", severity: "error", reason: "Outcome cannot be guaranteed for a supplement.", suggestion: "State what is tested, not what is promised." },
  { term: "guaranteed", severity: "error", reason: "Outcome cannot be guaranteed.", suggestion: "Remove the promise." },
  { term: "guaranteed results", severity: "error", reason: "Explicit results promise.", suggestion: "Remove." },
  { term: "100% safe", severity: "error", reason: "Absolute safety claim; unprovable.", suggestion: "State certifications instead." },
  { term: "no side effects", severity: "error", reason: "Absolute safety claim.", suggestion: "Add the standard advisory instead." },
  { term: "fda approved", severity: "error", reason: "Dietary supplements are not FDA approved.", suggestion: "Say 'manufactured in a GMP-certified facility'." },
  { term: "clinically proven", severity: "warn", reason: "Needs a citation or it becomes a claim.", suggestion: "Link the study or say 'studied ingredient'." },
  { term: "doctor recommended", severity: "warn", reason: "Needs substantiation and a named expert.", suggestion: "Name the expert and qualification." },
  { term: "detox", severity: "warn", reason: "Unregulated wellness claim.", suggestion: "Name the organ/function supported." },
  { term: "instant results", severity: "error", reason: "Implies immediate physiological change.", suggestion: "State the expected timeline honestly." },
];

/** Psychological pressure tactics. */
export const URGENCY_PATTERNS = [
  { pattern: /\bonly\s+\d+\s+(left|remaining)\b/i, reason: "Fake scarcity." },
  { pattern: /\bhurry\b/i, reason: "Pressure language." },
  { pattern: /\blast\s+chance\b/i, reason: "Pressure language." },
  { pattern: /\btoday\s+only\b/i, reason: "Fake deadline." },
  { pattern: /\blimited\s+time\b/i, reason: "Fake deadline." },
  { pattern: /\bexpires\s+in\b/i, reason: "Countdown pressure." },
  { pattern: /\b\d+\s+(people|others)\s+(are\s+)?(viewing|bought|ordered)\b/i, reason: "Manufactured social proof." },
];

/** Hype vocabulary that breaks the "lab-backed" voice. */
export const HYPE_PATTERNS = [
  { pattern: /\bunlock\b/i, reason: "Marketing cliché.", suggestion: "Say what the product does." },
  { pattern: /\bgame[- ]?changer\b/i, reason: "Hype.", suggestion: "Remove." },
  { pattern: /\brevolutionary\b/i, reason: "Hype.", suggestion: "Remove." },
  { pattern: /\bbreakthrough\b/i, reason: "Hype.", suggestion: "Remove." },
  { pattern: /\bultimate\b/i, reason: "Superlative.", suggestion: "Remove." },
  { pattern: /\bbest\s+ever\b/i, reason: "Superlative.", suggestion: "Remove." },
  { pattern: /\b#1\b/, reason: "Unverifiable ranking.", suggestion: "Remove or cite the source." },
];

/** Claims that need a number or a study behind them. */
export const RESULT_PATTERNS = [
  { pattern: /\b(lose|shed|drop)\s+\d+\s*(kg|kgs|kilos|pounds|lbs)\b/i, reason: "Weight-loss promise." },
  { pattern: /\bbefore\s*(&|and|\/)\s*after\b/i, reason: "Before/after transformation framing." },
  { pattern: /\b\d+\s*%\s*(faster|better|stronger)\b/i, reason: "Uncited comparative claim." },
];

/** The legally required disclaimer is allowed to mention "treat" and "cure". */
export const APPROVED_DISCLAIMER =
  "This product is not intended to diagnose, treat, cure, or prevent any disease. Not for medicinal use. Consult a qualified healthcare professional before use, especially if pregnant, nursing, or on medication.";

function stripApprovedDisclaimer(text) {
  const normalised = text.replace(/\s+/g, " ").trim();
  if (!normalised.includes("diagnose, treat, cure, or prevent any disease")) return text;
  return normalised.replace(
    /This product is not intended to diagnose, treat, cure, or prevent any disease\.[^.]*\.?/gi,
    " ",
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function addViolation(list, seen, violation) {
  const key = `${violation.rule}:${violation.index}`;
  if (seen.has(key)) return;
  seen.add(key);
  list.push(violation);
}

/**
 * Lint a piece of copy against the brand rules.
 * `ok` is false only when at least one ERROR exists — warnings are advisory.
 */
export function lintCopy(input, { allowDisclaimer = true } = {}) {
  const original = String(input ?? "");
  const text = allowDisclaimer ? stripApprovedDisclaimer(original) : original;
  const violations = [];
  const seen = new Set();

  for (const entry of BANNED_TERMS) {
    const regex = new RegExp(`\\b${escapeRegExp(entry.term)}\\b`, "gi");
    for (const match of text.matchAll(regex)) {
      addViolation(violations, seen, {
        rule: "banned-term",
        severity: entry.severity,
        match: match[0],
        index: match.index ?? 0,
        reason: entry.reason,
        suggestion: entry.suggestion,
      });
    }
  }

  for (const { pattern, reason } of [...URGENCY_PATTERNS, ...RESULT_PATTERNS]) {
    const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
    for (const match of text.matchAll(new RegExp(pattern.source, flags))) {
      addViolation(violations, seen, {
        rule: "prohibited-pattern",
        severity: "error",
        match: match[0],
        index: match.index ?? 0,
        reason,
        suggestion: "Remove the pressure or promise.",
      });
    }
  }

  for (const { pattern, reason, suggestion } of HYPE_PATTERNS) {
    const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
    for (const match of text.matchAll(new RegExp(pattern.source, flags))) {
      addViolation(violations, seen, {
        rule: "hype",
        severity: "warn",
        match: match[0],
        index: match.index ?? 0,
        reason,
        suggestion,
      });
    }
  }

  for (const match of text.matchAll(/!{2,}/g)) {
    addViolation(violations, seen, {
      rule: "punctuation",
      severity: "warn",
      match: match[0],
      index: match.index ?? 0,
      reason: "Exclamation stacking reads as hype.",
      suggestion: "Use one full stop.",
    });
  }

  const words = text.split(/\s+/).filter((word) => /[A-Za-z]{4,}/.test(word));
  const shouting = words.filter((word) => /[A-Z]{4,}/.test(word) && word === word.toUpperCase());
  if (words.length > 0 && shouting.length / words.length > 0.3) {
    addViolation(violations, seen, {
      rule: "shouting",
      severity: "warn",
      match: shouting.slice(0, 3).join(" "),
      index: 0,
      reason: "All-caps blocks shout instead of explain.",
      suggestion: "Sentence case.",
    });
  }

  const errors = violations.filter((v) => v.severity === "error");
  return {
    ok: errors.length === 0,
    errors: errors.length,
    warnings: violations.length - errors.length,
    violations: violations.sort((a, b) => a.index - b.index),
  };
}

/** Validate the typography contract from Section 3. */
export function validateTypography({ families = [], weights = {} } = {}) {
  const issues = [];
  if (families.length < BRAND.typography.families.min) issues.push("At least one font family is required.");
  if (families.length > BRAND.typography.families.max) {
    issues.push(`Too many font families (${families.length}); max ${BRAND.typography.families.max}.`);
  }
  if (new Set(families).size !== families.length) issues.push("Duplicate font families are not allowed.");

  for (const [family, list] of Object.entries(weights)) {
    if (!families.includes(family)) issues.push(`Weights declared for unknown family "${family}".`);
    if (list.length > BRAND.typography.weightsPerFamily.max) {
      issues.push(`"${family}" uses ${list.length} weights; max ${BRAND.typography.weightsPerFamily.max}.`);
    }
    if (new Set(list).size !== list.length) issues.push(`"${family}" declares a duplicate weight.`);
  }

  return { ok: issues.length === 0, issues };
}
