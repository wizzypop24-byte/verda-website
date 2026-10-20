/**
 * Integration map for Requirement 13.
 *
 * One registry for the eight services the store depends on, plus the security
 * rules that are easy to skip: webhook signatures, idempotency and secrets
 * staying server-side.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const INTEGRATIONS = [
  {
    id: "storefront",
    label: "Storefront",
    vendors: ["Shopify", "Next.js + Commerce API"],
    critical: true,
    capabilities: ["catalog", "cart", "checkout", "cms"],
  },
  {
    id: "payments",
    label: "Payments",
    vendors: ["Razorpay", "Stripe"],
    critical: true,
    capabilities: ["upi", "cards", "netbanking", "cod", "inr", "webhooks", "refunds"],
  },
  {
    id: "shipping",
    label: "Shipping",
    vendors: ["Shiprocket", "Delhivery"],
    critical: true,
    capabilities: ["serviceability", "codRemittance", "rto", "tracking"],
  },
  {
    id: "reviews",
    label: "Reviews",
    vendors: ["Judge.me", "Loox", "Yotpo"],
    critical: false,
    capabilities: ["moderation", "photoReviews", "productSchema"],
  },
  {
    id: "messaging",
    label: "Email + WhatsApp",
    vendors: ["Klaviyo", "Wati"],
    critical: true,
    capabilities: ["email", "whatsapp", "doubleOptIn", "consent"],
  },
  {
    id: "analytics",
    label: "Analytics",
    vendors: ["GA4", "GTM", "Meta CAPI"],
    critical: true,
    capabilities: ["consentMode", "serverSide", "events"],
  },
  {
    id: "cms",
    label: "CMS content",
    vendors: ["Shopify metafields", "Sanity", "Contentful"],
    critical: false,
    capabilities: ["hero", "bestsellers", "testimonials", "faq", "blog"],
  },
  {
    id: "support",
    label: "Support",
    vendors: ["Wati widget", "Freshdesk"],
    critical: false,
    capabilities: ["whatsapp", "tickets", "sla"],
  },
];

export const SECURITY = {
  webhookSignature: "hmac-sha256",
  idempotency: true,
  secretsLocation: "server",
};

/** All eight integration categories must exist exactly once. */
export function validateCoverage(integrations = INTEGRATIONS) {
  const issues = [];
  const ids = integrations.map((entry) => entry.id);
  if (new Set(ids).size !== ids.length) issues.push("Duplicate integration category.");
  for (const required of ["storefront", "payments", "shipping", "reviews", "messaging", "analytics", "cms", "support"]) {
    if (!ids.includes(required)) issues.push(`Missing integration category: ${required}.`);
  }
  return { ok: issues.length === 0, issues };
}

/** A vendor may only be chosen if it covers every required capability. */
export function validateVendor({ category, capabilities = [] } = {}) {
  const issues = [];
  const entry = INTEGRATIONS.find((item) => item.id === category);
  if (!entry) return { ok: false, issues: [`Unknown integration category: ${category}.`] };

  for (const capability of entry.capabilities) {
    if (!capabilities.includes(capability)) issues.push(`${category}: missing capability "${capability}".`);
  }
  return { ok: issues.length === 0, issues };
}

/** Critical categories need at least two vendor options (primary + fallback). */
export function validateFallbacks(integrations = INTEGRATIONS) {
  const issues = [];
  for (const entry of integrations.filter((item) => item.critical)) {
    if (entry.vendors.length < 2) issues.push(`${entry.id}: critical integration has no fallback vendor.`);
  }
  return { ok: issues.length === 0, issues };
}

const SECRET_PATTERNS = [
  /rzp_live_[A-Za-z0-9]{10,}/,
  /sk_live_[A-Za-z0-9]{10,}/,
  /-----BEGIN (RSA )?PRIVATE KEY-----/,
  /AKIA[0-9A-Z]{16}/,
];

/** Public keys (Firebase apiKey, publishable keys) are not secrets. */
export function scanForSecrets(text = "") {
  return SECRET_PATTERNS.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
}

export function verifyWebhook({ payload = "", signature = "", secret = "" } = {}) {
  if (!secret) return { ok: false, reason: "no_secret" };
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const left = Buffer.from(expected);
  const right = Buffer.from(String(signature));
  const ok = left.length === right.length && timingSafeEqual(left, right);
  return { ok, reason: ok ? "verified" : "signature_mismatch" };
}

/** Webhook retries must not double-charge or double-ship. */
export function createIdempotencyGuard() {
  const seen = new Set();
  return {
    check(key) {
      if (!key) return { duplicate: false, reason: "no_key" };
      if (seen.has(key)) return { duplicate: true };
      seen.add(key);
      return { duplicate: false };
    },
    size: () => seen.size,
  };
}

/** Exponential backoff, capped at 30s. */
export function retryDelay(attempt = 1) {
  if (!Number.isFinite(attempt) || attempt < 1) throw new RangeError("attempt must be >= 1");
  return Math.min(30000, 2 ** (attempt - 1) * 1000);
}

export function capabilityCoverage(required = [], integrations = INTEGRATIONS) {
  const available = new Set(integrations.flatMap((entry) => entry.capabilities));
  return [...new Set(required.filter((capability) => !available.has(capability)))];
}

/** Pre-launch check: critical services configured, webhooks verified, secrets server-side. */
export function auditIntegrations({
  configured = [],
  webhooksVerified = false,
  clientSecrets = [],
  fallbacksChecked = false,
} = {}) {
  const issues = [];

  for (const entry of INTEGRATIONS.filter((item) => item.critical)) {
    if (!configured.includes(entry.id)) issues.push(`${entry.id}: critical integration not configured.`);
  }
  if (!webhooksVerified) issues.push("Webhook signatures are not verified.");
  for (const leak of clientSecrets) issues.push(`Secret exposed in client: ${leak}.`);

  if (!fallbacksChecked) {
    const fallback = validateFallbacks();
    issues.push(...fallback.issues);
  }

  return { ok: issues.length === 0, issues };
}
