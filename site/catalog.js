export const CATALOG = {
  magnesium: { name: "Magnesium Glycinate 200 mg", price: 899, concern: "Sleep", tags: ["sleep", "magnesium", "stress", "muscle"] },
  probiotic: { name: "Probiotic 10B CFU", price: 1099, concern: "Gut", tags: ["gut", "digestion", "probiotic", "immunity"] },
  d3k2: { name: "Vitamin D3 + K2", price: 649, concern: "Immunity", tags: ["immunity", "vitamin d", "bones", "d3", "k2"] },
  biotin: { name: "Biotin 10,000 mcg", price: 749, concern: "Hair & Skin", tags: ["hair", "skin", "biotin", "nails"] },
  "bundle-basics": { name: "Daily Basics bundle", price: 1249, concern: "Bundle", tags: ["bundle", "daily", "value"] },
  "bundle-gut": { name: "Gut & Immunity bundle", price: 1499, concern: "Bundle", tags: ["bundle", "gut", "immunity"] },
};

export const FREE_SHIPPING = 999;
export const SHIPPING_FEE = 59;
export const COD_FEE = 29;
export const COD_CAP = 2000;
export const GST_RATE = 0.05;

export const CART_KEY = "verda_cart";

export function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
    return Array.isArray(saved) ? saved.filter((line) => CATALOG[line.id] && line.qty > 0) : [];
  } catch {
    return [];
  }
}

export function clearCart() {
  localStorage.removeItem(CART_KEY);
}

export function inr(value) {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

export function totals(cart) {
  const subtotal = cart.reduce((sum, line) => sum + CATALOG[line.id].price * line.qty, 0);
  const shipping = subtotal >= FREE_SHIPPING ? 0 : SHIPPING_FEE;
  const codFee = COD_FEE;
  return { subtotal, shipping, codFee, discount: 0, total: subtotal + shipping + codFee };
}
