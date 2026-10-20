/**
 * SEO rules for Requirement 9.
 *
 * Everything here is checkable before a page is deployed: titles, headings,
 * social tags, JSON-LD, robots and sitemap. No crawler required.
 */

export const LIMITS = { title: 60, description: 155 };

export const SCHEMA_TYPES = ["Organization", "WebSite", "ItemList", "Product", "FAQPage"];

export const PRODUCT_FIELDS = ["name", "image", "price", "availability", "url"];

export function validateTitle(title = "") {
  const issues = [];
  const value = String(title).trim();
  if (!value) issues.push("Title is empty.");
  if (value.length > LIMITS.title) issues.push(`Title is ${value.length} chars; max ${LIMITS.title}.`);
  if (value !== title) issues.push("Title has leading/trailing whitespace.");
  return { ok: issues.length === 0, issues, length: value.length };
}

export function validateDescription(description = "") {
  const issues = [];
  const value = String(description).trim();
  if (!value) issues.push("Meta description is empty.");
  if (value.length > LIMITS.description) issues.push(`Description is ${value.length} chars; max ${LIMITS.description}.`);
  return { ok: issues.length === 0, issues, length: value.length };
}

/** Exactly one H1, starting at level 1, no skipped levels (1 → 3 is invalid). */
export function validateHeadings(levels = []) {
  const issues = [];
  const h1Count = levels.filter((level) => level === 1).length;
  if (h1Count === 0) issues.push("Page has no H1.");
  if (h1Count > 1) issues.push(`Page has ${h1Count} H1 tags; exactly one is allowed.`);
  if (levels.length && levels[0] !== 1) issues.push("First heading must be H1.");

  for (let i = 1; i < levels.length; i += 1) {
    if (levels[i] > levels[i - 1] + 1) {
      issues.push(`Heading level jumps from H${levels[i - 1]} to H${levels[i]}.`);
    }
  }
  return { ok: issues.length === 0, issues };
}

export function validateOpenGraph(og = {}) {
  const issues = [];
  for (const key of ["title", "description", "image", "url", "type"]) {
    if (!og[key]) issues.push(`og:${key} is missing.`);
  }
  if (og.image && !/^https:\/\//.test(og.image)) issues.push("og:image must be an absolute https URL.");
  if (og.url && !/^https:\/\//.test(og.url)) issues.push("og:url must be an absolute https URL.");
  if (og.type && og.type !== "website") issues.push(`Home page og:type should be "website", got "${og.type}".`);
  return { ok: issues.length === 0, issues };
}

export function validateTwitter(twitter = {}) {
  const issues = [];
  if (!["summary", "summary_large_image"].includes(twitter.card)) {
    issues.push('twitter:card must be "summary" or "summary_large_image".');
  }
  for (const key of ["title", "description", "image"]) {
    if (!twitter[key]) issues.push(`twitter:${key} is missing.`);
  }
  return { ok: issues.length === 0, issues };
}

/** Canonical must be absolute https, self-referencing and free of tracking params. */
export function validateCanonical(url = "", { expectedPath } = {}) {
  const issues = [];
  if (!/^https:\/\//.test(url)) issues.push("Canonical must be an absolute https URL.");
  if (/[?#]/.test(url)) issues.push("Canonical must not contain a query string or fragment.");
  if (expectedPath) {
    const path = url.replace(/^https:\/\/[^/]+/, "") || "/";
    if (path !== expectedPath) issues.push(`Canonical path "${path}" does not match page "${expectedPath}".`);
  }
  return { ok: issues.length === 0, issues };
}

/** Validate the required JSON-LD blocks and their mandatory fields. */
export function validateSchemas(schemas = []) {
  const issues = [];
  const types = new Set(schemas.map((schema) => schema.type));

  for (const required of SCHEMA_TYPES) {
    if (!types.has(required)) issues.push(`Missing structured data: ${required}.`);
  }

  for (const schema of schemas) {
    if (schema.format && schema.format !== "json-ld") issues.push(`${schema.type} must be JSON-LD.`);
    if (schema.type === "Product") {
      for (const field of PRODUCT_FIELDS) {
        if (schema[field] == null || schema[field] === "") issues.push(`Product schema missing "${field}".`);
      }
    }
    if (schema.type === "Organization") {
      for (const field of ["logo", "sameAs", "contactPoint"]) {
        if (!schema[field]) issues.push(`Organization schema missing "${field}".`);
      }
    }
    if (schema.type === "WebSite" && !schema.searchAction) {
      issues.push("WebSite schema missing SearchAction.");
    }
  }
  return { ok: issues.length === 0, issues };
}

/** Visible FAQ and FAQPage JSON-LD must match exactly. */
export function validateFaqParity(visibleQuestions = [], schemaQuestions = []) {
  const norm = (list) => list.map((q) => String(q).trim().toLowerCase()).sort();
  const visible = norm(visibleQuestions);
  const schema = norm(schemaQuestions);
  const issues = [];
  if (visible.length !== schema.length) issues.push(`FAQ count mismatch: ${visible.length} visible vs ${schema.length} in schema.`);
  const missing = visible.filter((q) => !schema.includes(q));
  const extra = schema.filter((q) => !visible.includes(q));
  if (missing.length) issues.push(`In schema but not visible: ${missing.join(", ")}`);
  if (extra.length) issues.push(`Visible but not in schema: ${extra.join(", ")}`);
  return { ok: issues.length === 0, issues };
}

export function validateRobots(text = "") {
  const value = String(text);
  const issues = [];
  if (!/User-agent:\s*\*/i.test(value)) issues.push("robots.txt missing a wildcard user-agent group.");
  for (const path of ["/cart", "/search"]) {
    if (!new RegExp(`Disallow:\\s*${path}`, "i").test(value)) issues.push(`robots.txt must disallow ${path}.`);
  }
  if (!/Disallow:\s*.*filter/i.test(value)) issues.push("robots.txt must disallow filtered collection URLs.");
  if (!/Sitemap:\s*https:\/\//i.test(value)) issues.push("robots.txt must reference an absolute sitemap URL.");
  return { ok: issues.length === 0, issues };
}

export function validateSitemap(urls = [], siteUrl = "") {
  const issues = [];
  if (!urls.length) issues.push("Sitemap is empty.");
  if (siteUrl && !urls.includes(`${siteUrl.replace(/\/$/, "")}/`)) issues.push("Sitemap must include the home page.");
  for (const url of urls) {
    if (!/^https:\/\//.test(url)) issues.push(`Sitemap entry is not absolute https: ${url}`);
  }
  return { ok: issues.length === 0, issues };
}

/** Cart, search and filtered collections must never be indexed. */
export function isIndexable(path = "/") {
  const value = String(path);
  if (/^\/(cart|checkout)(\/|$)/.test(value)) return false;
  if (/^\/search(\/|$|\?)/.test(value)) return false;
  if (/filter=/.test(value)) return false;
  return true;
}

/** Alt text policy: descriptive for content, empty for decorative. */
export function validateAlt({ alt = "", decorative = false } = {}) {
  const issues = [];
  if (decorative) {
    if (String(alt).trim()) issues.push("Decorative image should have empty alt text.");
  } else {
    if (!String(alt).trim()) issues.push("Content image needs descriptive alt text.");
    if (String(alt).length > 125) issues.push("Alt text is longer than 125 characters.");
  }
  return { ok: issues.length === 0, issues };
}
