/**
 * Content rules for Requirement 6.
 *
 * The document gives word/character limits per section. This module makes them
 * executable so a copywriter can check work before it reaches review.
 */

export const LIMITS = {
  heroH1Words: 12,
  heroSubWords: 20,
  trustItemWords: 4,
  trustItems: { min: 4, max: 5 },
  concernCardWords: 10,
  productNameChars: 60,
  productIngredientWords: 8,
  reviewLines: { min: 2, max: 3 },
  faqAnswerWords: { min: 60, max: 120 },
  announcementWords: 8,
  blogTitleChars: 60,
  bundleNameChars: 40,
  quizQuestionWords: 12,
  quizOptionWords: 4,
};

/** Count words the way a reviewer does: whitespace separated, currency counts as one. */
export function countWords(text) {
  return String(text ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function result(issues) {
  return { ok: issues.length === 0, issues };
}

export function checkHero({ h1 = "", sub = "" } = {}) {
  const issues = [];
  if (!h1.trim()) issues.push("H1 is empty.");
  if (!sub.trim()) issues.push("Sub-headline is empty.");
  if (countWords(h1) > LIMITS.heroH1Words) issues.push(`H1 has ${countWords(h1)} words; max ${LIMITS.heroH1Words}.`);
  if (countWords(sub) > LIMITS.heroSubWords) issues.push(`Sub-headline has ${countWords(sub)} words; max ${LIMITS.heroSubWords}.`);
  return result(issues);
}

export function checkTrustItems(items = []) {
  const issues = [];
  if (items.length < LIMITS.trustItems.min || items.length > LIMITS.trustItems.max) {
    issues.push(`Trust strip needs ${LIMITS.trustItems.min}-${LIMITS.trustItems.max} items; got ${items.length}.`);
  }
  items.forEach((item, index) => {
    const words = countWords(item);
    if (words > LIMITS.trustItemWords) issues.push(`Trust item ${index + 1} has ${words} words; max ${LIMITS.trustItemWords}.`);
  });
  return result(issues);
}

export function checkConcernCard(text = "") {
  const issues = [];
  if (!text.trim()) issues.push("Concern card is empty.");
  if (countWords(text) > LIMITS.concernCardWords) {
    issues.push(`Concern card has ${countWords(text)} words; max ${LIMITS.concernCardWords}.`);
  }
  return result(issues);
}

export function checkProductCard({ name = "", ingredientLine = "" } = {}) {
  const issues = [];
  if (!name.trim()) issues.push("Product name is empty.");
  if (name.length > LIMITS.productNameChars) {
    issues.push(`Product name is ${name.length} chars; max ${LIMITS.productNameChars}.`);
  }
  if (countWords(ingredientLine) > LIMITS.productIngredientWords) {
    issues.push(`Ingredient line has ${countWords(ingredientLine)} words; max ${LIMITS.productIngredientWords}.`);
  }
  return result(issues);
}

export function checkReview(text = "") {
  const lines = String(text ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const issues = [];
  if (lines.length < LIMITS.reviewLines.min) issues.push(`Review needs ${LIMITS.reviewLines.min}-${LIMITS.reviewLines.max} lines; got ${lines.length}.`);
  if (lines.length > LIMITS.reviewLines.max) issues.push(`Review has ${lines.length} lines; max ${LIMITS.reviewLines.max}.`);
  return result(issues);
}

export function checkFaqAnswer(text = "") {
  const words = countWords(text);
  const issues = [];
  if (words < LIMITS.faqAnswerWords.min) issues.push(`FAQ answer has ${words} words; min ${LIMITS.faqAnswerWords.min}.`);
  if (words > LIMITS.faqAnswerWords.max) issues.push(`FAQ answer has ${words} words; max ${LIMITS.faqAnswerWords.max}.`);
  return result(issues);
}

/**
 * Asset plan for the home page (Requirement 6).
 * `required` doubles as the checklist QA uses before build.
 */
export const ASSETS = [
  { id: "hero-desktop", label: "Hero image (desktop)", count: 1, size: "2400×1200", formats: ["AVIF", "WebP"] },
  { id: "hero-mobile", label: "Hero image (mobile)", count: 1, size: "1080×1350", formats: ["AVIF", "WebP"] },
  { id: "concern", label: "Concern images", count: 8, size: "800×800", formats: ["AVIF", "WebP"] },
  { id: "product", label: "Product photos", countMin: 8, countMax: 12, size: "1200×1200", formats: ["AVIF", "WebP"] },
  { id: "trust-icons", label: "Trust icons", count: 5, size: "svg", formats: ["SVG"] },
  { id: "review-photos", label: "Review photos", count: 3, size: "600×600", formats: ["AVIF", "WebP"] },
  { id: "founder", label: "Founder photo", count: 1, size: "800×1000", formats: ["AVIF", "WebP"] },
  { id: "label-closeup", label: "Label close-up", count: 1, size: "1200×1200", formats: ["AVIF", "WebP"] },
  { id: "og-image", label: "OG image", count: 1, size: "1200×630", formats: ["PNG", "JPG"] },
];

export function validateAssetPlan(assets, { requiredIds = [] } = {}) {
  const issues = [];
  for (const id of requiredIds) {
    if (!assets.some((asset) => asset.id === id)) issues.push(`Missing asset group: ${id}`);
  }
  for (const asset of assets) {
    if (!asset.label) issues.push(`${asset.id}: label required.`);
    if (!asset.formats?.length) issues.push(`${asset.id}: no format declared.`);
    if (asset.count == null && (asset.countMin == null || asset.countMax == null)) {
      issues.push(`${asset.id}: count or range required.`);
    }
    if (!asset.size) issues.push(`${asset.id}: size required.`);
  }
  return result(issues);
}
