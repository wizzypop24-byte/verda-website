/**
 * Compliance rules for Requirement 11.
 *
 * Supplements are a regulated category. These validators check the things an
 * inspector or a payment gateway would check: label fields, shelf life at
 * import, disclaimer, origin claims, consent and the importer block.
 */

export const DISCLAIMER =
  "This product is not intended to diagnose, treat, cure, or prevent any disease. Not for medicinal use. Consult a qualified healthcare professional before use, especially if pregnant, nursing, or on medication.";

export const REQUIRED_LABEL_FIELDS = [
  "productName",
  "brandName",
  "healthSupplement",
  "notForMedicinal",
  "netQuantity",
  "mrp",
  "batchNumber",
  "bestBefore",
  "fssaiLogo",
  "licenseNumber",
  "importerName",
  "importerAddress",
  "countryOfOrigin",
  "dosage",
  "allergen",
  "storage",
  "consumerCare",
];

export const ALLOWED_PORTS = ["JNPT", "Mumbai", "Chennai", "Kolkata", "Delhi ICD", "Ahmedabad"];

const issue = (rule, message) => ({ rule, message });

export function validateDisclaimer(text = "") {
  const issues = [];
  const value = String(text);
  if (!/not intended to diagnose, treat, cure, or prevent any disease/i.test(value)) {
    issues.push(issue("disclaimer-disease", "Mandatory disease disclaimer is missing."));
  }
  if (!/not for medicinal use/i.test(value)) {
    issues.push(issue("disclaimer-medicinal", '"NOT FOR MEDICINAL USE" is missing.'));
  }
  if (!/consult (a )?qualified healthcare professional/i.test(value)) {
    issues.push(issue("disclaimer-consult", "Consultation advisory is missing."));
  }
  return { ok: issues.length === 0, issues };
}

export function validateLabel(fields = {}) {
  const issues = [];
  for (const field of REQUIRED_LABEL_FIELDS) {
    if (!fields[field]) issues.push(issue("label-field", `Label field missing: ${field}.`));
  }
  if (fields.licenseNumber && !/^\d{14}$/.test(String(fields.licenseNumber))) {
    issues.push(issue("label-license", "FSSAI licence number must be 14 digits."));
  }
  return { ok: issues.length === 0, issues };
}

/** FSS (Import) Regulations 2017: at least 60% shelf life or 3 months, whichever is less. */
export function validateShelfLife({ percentRemaining = 0, monthsRemaining = 0 } = {}) {
  const issues = [];
  const passed = percentRemaining >= 60 || monthsRemaining >= 3;
  if (!passed) {
    issues.push(issue("shelf-life", `Only ${percentRemaining}% / ${monthsRemaining} months remaining at import.`));
  }
  return { ok: passed, issues, threshold: { percent: 60, months: 3 } };
}

export function validateSupplierClause(contractText = "") {
  const ok = /18 months|eighteen months/i.test(String(contractText));
  return {
    ok,
    issues: ok ? [] : [issue("supplier-clause", "Supplier contract must guarantee ≥18 months shelf life at dispatch.")],
  };
}

export function validatePort(port = "", allowed = ALLOWED_PORTS) {
  const ok = allowed.includes(port);
  return { ok, issues: ok ? [] : [issue("port", `${port || "(none)"} is not a designated import port for high-risk food.`)] };
}

export const PIF_FIELDS = ["formulation", "ingredientSchedules", "coa", "shelfLifeStudy", "testMethods"];

export function validatePIF(pif = {}) {
  const issues = [];
  for (const field of PIF_FIELDS) {
    if (!pif[field]) issues.push(issue("pif", `Product Information File missing: ${field}.`));
  }
  return { ok: issues.length === 0, issues };
}

export function validateGst(rate) {
  const ok = rate === 0.05;
  return { ok, issues: ok ? [] : [issue("gst", `GST is ${(rate * 100).toFixed(0)}%; supplements must be 5%.`)] };
}

/** "Made in India" is a false origin claim under the import model. */
export function validateOriginClaim(text = "") {
  const issues = [];
  if (/made in india/i.test(String(text))) {
    issues.push(issue("origin", '"Made in India" cannot be used for imported products; use "Imported".'));
  }
  if (!/imported/i.test(String(text))) {
    issues.push(issue("origin", 'Origin disclosure must say "Imported".'));
  }
  return { ok: issues.length === 0, issues };
}

export function validateTestimonial({ label = "", incentivized = false, disclosure = false } = {}) {
  const issues = [];
  if (!/individual experience/i.test(String(label))) {
    issues.push(issue("testimonial-label", 'Testimonials must be labelled "individual experience".'));
  }
  if (incentivized && !disclosure) {
    issues.push(issue("testimonial-disclosure", "Incentivized reviews must disclose the incentive."));
  }
  return { ok: issues.length === 0, issues };
}

export function validateAgeGate(text = "") {
  const ok = /18\+/.test(String(text));
  return { ok, issues: ok ? [] : [issue("age", 'Age note "18+" is missing.')] };
}

export function validateProductPage({ ingredients = false, allergens = false, dosage = false, storage = false } = {}) {
  const issues = [];
  for (const [field, present] of Object.entries({ ingredients, allergens, dosage, storage })) {
    if (!present) issues.push(issue("product-page", `Product page missing: ${field}.`));
  }
  return { ok: issues.length === 0, issues };
}

export function validatePrivacy({ consentBanner = false, policy = false, dpdp = false, marketingOptIn = false } = {}) {
  const issues = [];
  if (!consentBanner) issues.push(issue("privacy", "Consent banner missing."));
  if (!policy) issues.push(issue("privacy", "Privacy policy link missing."));
  if (!dpdp) issues.push(issue("privacy", "DPDP Act 2023 basis not stated."));
  if (!marketingOptIn) issues.push(issue("privacy", "Marketing opt-in with stored proof missing."));
  return { ok: issues.length === 0, issues };
}

/** Footer must carry the importer block + a working licence reference. */
export function validateFooter(footer = {}) {
  const issues = [];
  if (!/^\d{14}$/.test(String(footer.fssaiNumber ?? ""))) issues.push(issue("footer-fssai", "FSSAI number missing or not 14 digits."));
  if (!/^https:\/\//.test(String(footer.licenseUrl ?? ""))) issues.push(issue("footer-link", "FSSAI licence link must be absolute https."));
  if (!footer.importerName) issues.push(issue("footer-importer", "Importer legal name missing."));
  if (!footer.importerAddress) issues.push(issue("footer-importer", "Importer registered address missing."));
  if (!footer.countryOfOrigin) issues.push(issue("footer-origin", "Country of origin missing."));
  if (!footer.customerCare) issues.push(issue("footer-care", "Customer-care contact missing."));
  return { ok: issues.length === 0, issues };
}

/** Combined compliance audit — what a pre-launch review should run. */
export function auditCompliance({
  disclaimer,
  label,
  shelfLife,
  supplierContract,
  port,
  pif,
  gstRate,
  originText,
  testimonial,
  ageText,
  productPage,
  privacy,
  footer,
} = {}) {
  const issues = [];
  const run = (result) => issues.push(...result.issues);

  if (disclaimer !== undefined) run(validateDisclaimer(disclaimer));
  if (label) run(validateLabel(label));
  if (shelfLife) run(validateShelfLife(shelfLife));
  if (supplierContract !== undefined) run(validateSupplierClause(supplierContract));
  if (port !== undefined) run(validatePort(port));
  if (pif) run(validatePIF(pif));
  if (gstRate !== undefined) run(validateGst(gstRate));
  if (originText !== undefined) run(validateOriginClaim(originText));
  if (testimonial) run(validateTestimonial(testimonial));
  if (ageText !== undefined) run(validateAgeGate(ageText));
  if (productPage) run(validateProductPage(productPage));
  if (privacy) run(validatePrivacy(privacy));
  if (footer) run(validateFooter(footer));

  return { ok: issues.length === 0, issues };
}
