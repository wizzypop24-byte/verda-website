import { CATALOG, CART_KEY, inr } from "/catalog.js";

const PRODUCT_ID = document.body.dataset.product;
const product = CATALOG[PRODUCT_ID];
const $ = (selector) => document.querySelector(selector);
const QTY_MAX = 10;

function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
    return Array.isArray(saved) ? saved.filter((line) => CATALOG[line.id]) : [];
  } catch {
    return [];
  }
}

let cart = readCart();

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function cartCount() {
  return cart.reduce((sum, line) => sum + line.qty, 0);
}

function updateBadge() {
  const el = $("#cart-count");
  if (el) el.textContent = String(cartCount());
}

function addToCart(qty) {
  const line = cart.find((item) => item.id === PRODUCT_ID);
  if (line) line.qty = Math.min(QTY_MAX, line.qty + qty);
  else cart.push({ id: PRODUCT_ID, qty });
  saveCart();
  updateBadge();

  // Consent-gated analytics (no PII).
  try {
    const consent = JSON.parse(localStorage.getItem("verda_consent") ?? "null");
    if (consent?.analytics) {
      window.dataLayer = window.dataLayer ?? [];
      window.dataLayer.push({
        event: "add_to_cart",
        product_id: PRODUCT_ID,
        value: product.price * qty,
        currency: "INR",
        quantity: qty,
      });
    }
  } catch {
    /* consent unavailable */
  }
}

let toastTimer = null;
function toast(message) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-visible"), 2600);
}

/* ---------------- Quantity ---------------- */

const qtyInput = $("#qty");

function setQty(next) {
  const value = Math.max(1, Math.min(QTY_MAX, Number(next) || 1));
  qtyInput.value = String(value);
}

$("#qty-minus").addEventListener("click", () => setQty(Number(qtyInput.value) - 1));
$("#qty-plus").addEventListener("click", () => setQty(Number(qtyInput.value) + 1));
qtyInput.addEventListener("change", () => setQty(qtyInput.value));

/* ---------------- Buy ---------------- */

$("#buy-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const qty = Math.max(1, Math.min(QTY_MAX, Number(qtyInput.value) || 1));
  addToCart(qty);
  toast(`${product.name} added to cart`);
});

$("#buy-now").addEventListener("click", () => {
  const qty = Math.max(1, Math.min(QTY_MAX, Number(qtyInput.value) || 1));
  addToCart(qty);
  window.location.assign("/checkout/");
});

/* ---------------- Static interactions ---------------- */

document.querySelectorAll("[data-lab-report]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    try {
      const consent = JSON.parse(localStorage.getItem("verda_consent") ?? "null");
      if (consent?.analytics) {
        window.dataLayer = window.dataLayer ?? [];
        window.dataLayer.push({ event: "lab_report_click", product_id: PRODUCT_ID, report_type: "coa" });
      }
    } catch {
      /* ignore */
    }
    toast("Lab reports publish with the first batch");
  });
});

document.querySelectorAll("[data-faq]").forEach((item) => {
  item.addEventListener("toggle", () => {
    if (!item.open) return;
    try {
      const consent = JSON.parse(localStorage.getItem("verda_consent") ?? "null");
      if (consent?.analytics) {
        window.dataLayer = window.dataLayer ?? [];
        window.dataLayer.push({ event: "faq_open", question: item.dataset.faq });
      }
    } catch {
      /* ignore */
    }
  });
});

updateBadge();
