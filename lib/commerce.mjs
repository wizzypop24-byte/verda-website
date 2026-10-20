/**
 * Commerce rules for Requirement 5 (Functional Requirements).
 *
 * These are the numbers and states the UI must obey. Keeping them here means
 * the home page copy (₹999 free shipping, ₹2,000 COD cap) and the cart logic
 * cannot drift apart.
 */

export const COMMERCE = {
  freeShippingThreshold: 999,
  codCap: 2000,
  codFee: 29,
  prepaidDiscount: 50,
  returnWindowDays: 30,
  gstRate: 0.05,
};

/** Free-shipping progress for the cart drawer (FR-02). */
export function cartProgress(subtotal, threshold = COMMERCE.freeShippingThreshold) {
  if (!Number.isFinite(subtotal) || subtotal < 0) {
    throw new RangeError("subtotal must be a number >= 0");
  }
  if (!Number.isFinite(threshold) || threshold <= 0) {
    throw new RangeError("threshold must be a positive number");
  }
  const qualified = subtotal >= threshold;
  const remaining = Math.max(0, threshold - subtotal);
  return {
    subtotal,
    qualified,
    remaining,
    percent: Math.min(100, Math.round((subtotal / threshold) * 100)),
  };
}

/**
 * COD eligibility (FR-11, FR-12, FR-13).
 * Order of checks is intentional: address quality first, then risk, then cap.
 */
export function codEligibility({
  total,
  pincode,
  verified = true,
  riskPincodes = [],
  codDisabled = false,
} = {}) {
  if (!Number.isFinite(total) || total <= 0) return { eligible: false, reason: "invalid_total" };
  if (!/^\d{6}$/.test(String(pincode ?? ""))) return { eligible: false, reason: "invalid_pincode" };
  if (codDisabled) return { eligible: false, reason: "disabled" };
  if (!verified) return { eligible: false, reason: "unverified_address" };
  if (riskPincodes.includes(String(pincode))) return { eligible: false, reason: "high_risk_pincode" };
  if (total > COMMERCE.codCap) {
    return { eligible: false, reason: "above_cap", cap: COMMERCE.codCap };
  }
  return {
    eligible: true,
    fee: COMMERCE.codFee,
    prepaidDiscount: COMMERCE.prepaidDiscount,
    requiresConfirmation: true,
  };
}

/** "₹18/day" style value (FR-15, HM-11). */
export function perDayCost(price, servings) {
  if (!Number.isFinite(price) || price < 0) throw new RangeError("price must be >= 0");
  if (!Number.isFinite(servings) || servings <= 0) throw new RangeError("servings must be > 0");
  return Math.round((price / servings) * 100) / 100;
}

/** Instant search suggestions (FR-01). */
export function searchSuggest(query, catalog, limit = 6) {
  const term = String(query ?? "").trim().toLowerCase();
  if (term.length < 2) return [];

  const scored = catalog
    .map((item) => {
      const name = String(item.name ?? "").toLowerCase();
      const tags = (item.tags ?? []).map((tag) => String(tag).toLowerCase());
      let score = 0;
      if (name.startsWith(term)) score += 3;
      else if (name.includes(term)) score += 2;
      if (tags.some((tag) => tag.includes(term))) score += 1;
      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || String(a.item.name).localeCompare(String(b.item.name)))
    .slice(0, limit);

  return scored.map((entry) => entry.item);
}

/** Wishlist merge on login (FR-03): account first, guest extras appended, no duplicates. */
export function mergeWishlist(guest = [], account = []) {
  return [...new Set([...account, ...guest])];
}

/** Consent gating (FR-07): analytics and marketing are independent. */
export function consentAllows(consent = {}, category) {
  return consent[category] === true;
}
