import { CATALOG, CART_KEY } from "/catalog.js";

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

function updateBadge() {
  const el = $("#cart-count");
  if (el) el.textContent = String(cart.reduce((sum, line) => sum + line.qty, 0));
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

function trackAdd(id, qty) {
  try {
    const consent = JSON.parse(localStorage.getItem("verda_consent") ?? "null");
    if (!consent?.analytics) return;
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({
      event: "add_to_cart",
      product_id: id,
      value: CATALOG[id].price * qty,
      currency: "INR",
      quantity: qty,
    });
  } catch {
    /* ignore */
  }
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");
  if (!button) return;

  const id = button.dataset.add;
  const line = cart.find((item) => item.id === id);
  if (line) line.qty = Math.min(QTY_MAX, line.qty + 1);
  else cart.push({ id, qty: 1 });

  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateBadge();
  trackAdd(id, 1);
  toast(`${CATALOG[id].name} added to cart`);
});

updateBadge();
