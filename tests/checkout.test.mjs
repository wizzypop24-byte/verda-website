/**
 * Test suite for the Checkout page — /checkout/
 *
 * Run: node --test tests/checkout.test.mjs
 * Optional live check: CHECKOUT_URL=https://fir-479b9.web.app/checkout/ node --test tests/checkout.test.mjs
 *
 * What is verified:
 *   A. Page shell: noindex, one H1, back link, footer disclosures.
 *   B. Form: every required field, label, error hook and state list.
 *   C. Pricing: shipping, COD fee, cap and total maths (site/catalog.js).
 *   D. Checkout script: validation rules, submit guards, order payload,
 *      cart clearing, consent-gated purchase event, input hygiene.
 *   E. Live page (optional, needs CHECKOUT_URL).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  CATALOG,
  COD_CAP,
  COD_FEE,
  FREE_SHIPPING,
  GST_RATE,
  SHIPPING_FEE,
  readCart,
  totals,
} from "../site/catalog.js";
import { COMMERCE, codEligibility } from "../lib/commerce.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const html = readFileSync(join(root, "site/checkout/index.html"), "utf8");
const js = readFileSync(join(root, "site/checkout/checkout.js"), "utf8");
const css = readFileSync(join(root, "site/checkout/checkout.css"), "utf8");

/* ---------------- A. Page shell ---------------- */

test("TC-CHK-01: checkout is not indexable", () => {
  assert.match(html, /<meta\s+name="robots"\s+content="noindex,nofollow"\s*\/?>/i);
});

test("TC-CHK-02: page has one H1 and a labelled main landmark", () => {
  assert.equal((html.match(/<h1\b/gi) ?? []).length, 1);
  assert.match(html, /<h1[^>]*id="checkout-title"[^>]*>Checkout<\/h1>/i);
  assert.match(html, /<main[^>]*id="main"/i);
});

test("TC-CHK-03: a back-to-store link exists and points home", () => {
  assert.match(html, /class="checkout__back"\s+href="\/"/i);
});

test("TC-CHK-04: footer carries importer and FSSAI disclosure", () => {
  assert.match(html, /Imported by/i);
  assert.match(html, /FSSAI/i);
  assert.match(html, /not intended to diagnose, treat, cure, or prevent any disease/i);
});

test("TC-CHK-05: checkout.css loads after the shared stylesheet", () => {
  const shared = html.indexOf('/styles.css');
  const local = html.indexOf('./checkout.css');
  assert.ok(shared > -1 && local > shared, "checkout.css must override styles.css");
});

/* ---------------- B. Form & accessibility ---------------- */

const FIELD_IDS = ["name", "phone", "email", "address", "city", "pincode", "state"];

test("TC-CHK-06: every checkout field has a label bound with for/id", () => {
  for (const id of FIELD_IDS) {
    const label = new RegExp(`<label[^>]*for="${id}"[^>]*>`, "i");
    assert.match(html, label, `missing label for #${id}`);
    assert.match(html, new RegExp(`id="${id}"`, "i"), `missing field #${id}`);
  }
});

test("TC-CHK-07: required fields are marked required and form disables native validation", () => {
  for (const id of ["name", "phone", "address", "city", "pincode", "state"]) {
    const input = html.match(new RegExp(`<(input|select|textarea)[^>]*id="${id}"[^>]*>`, "i"))?.[0] ?? "";
    assert.match(input, /\brequired\b/i, `#${id} must be required`);
  }
  assert.match(html, /<form[^>]*id="checkout-form"[^>]*novalidate/i);
});

test("TC-CHK-08: every field is linked to an existing inline error node", () => {
  for (const id of FIELD_IDS) {
    const input = html.match(new RegExp(`<(input|select|textarea)[^>]*id="${id}"[^>]*>`, "i"))?.[0] ?? "";
    const describedBy = input.match(/aria-describedby="([^"]+)"/i)?.[1];
    assert.equal(describedBy, `${id}-error`, `#${id} should describe ${id}-error`);
    assert.match(html, new RegExp(`id="${id}-error"`, "i"), `missing error node for #${id}`);
  }
});

test("TC-CHK-09: phone and PIN inputs are numeric and length-capped", () => {
  const phone = html.match(/<input[^>]*id="phone"[^>]*>/i)[0];
  const pin = html.match(/<input[^>]*id="pincode"[^>]*>/i)[0];
  assert.match(phone, /type="tel"/i);
  assert.match(phone, /inputmode="numeric"/i);
  assert.match(phone, /maxlength="10"/i);
  assert.match(pin, /inputmode="numeric"/i);
  assert.match(pin, /maxlength="6"/i);
});

test("TC-CHK-10: autocomplete hints are present for fast mobile checkout", () => {
  for (const [id, token] of [
    ["name", "name"],
    ["phone", "tel-national"],
    ["email", "email"],
    ["address", "street-address"],
    ["city", "address-level2"],
    ["pincode", "postal-code"],
    ["state", "address-level1"],
  ]) {
    const input = html.match(new RegExp(`<(input|select|textarea)[^>]*id="${id}"[^>]*>`, "i"))?.[0] ?? "";
    assert.match(input, new RegExp(`autocomplete="${token}"`, "i"), `#${id} autocomplete`);
  }
});

test("TC-CHK-11: COD is the default and online payment is disabled", () => {
  assert.match(html, /<input[^>]*type="radio"[^>]*name="payment"[^>]*value="cod"[^>]*checked/i);
  assert.match(html, /<input[^>]*type="radio"[^>]*name="payment"[^>]*value="online"[^>]*disabled/i);
});

test("TC-CHK-12: terms checkbox is required and links the policies", () => {
  assert.match(html, /<input[^>]*type="checkbox"[^>]*id="terms"[^>]*required/i);
  assert.match(html, /href="\/policies\/terms\/"/i, "Terms link must open the terms policy");
  assert.match(html, /href="\/policies\/returns\/"/i, "Returns link must open the returns policy");
});

test("TC-CHK-13: submit status is announced politely", () => {
  assert.match(html, /id="order-status"[^>]*role="status"[^>]*aria-live="polite"/i);
});

test("TC-CHK-14: summary exposes subtotal, shipping, COD fee and total", () => {
  for (const id of ["sum-subtotal", "sum-shipping", "sum-cod", "sum-total"]) {
    assert.match(html, new RegExp(`id="${id}"`, "i"), `missing #${id}`);
  }
  assert.match(html, /id="mobile-total"/i);
});

test("TC-CHK-15: empty state, form and confirmation are mutually exclusive by default", () => {
  assert.match(html, /id="empty-cart"\s+hidden/i);
  assert.match(html, /id="confirmation"[^>]*hidden/i);
  assert.doesNotMatch(html, /id="checkout-form"[^>]*hidden/i);
});

test("TC-CHK-16: confirmation links to the order detail page", () => {
  assert.match(html, /id="view-order"/i);
  assert.match(html, /id="order-id"/i);
});

test("TC-CHK-17: responsive CSS collapses the summary for mobile", () => {
  assert.match(css, /@media[^{]*\(max-width:[^)]*\)/i);
  assert.match(css, /\.checkout__grid/i);
});

/* ---------------- C. Pricing & cart rules ---------------- */

test("TC-CHK-18: catalog and commerce rules share the same numbers", () => {
  assert.equal(FREE_SHIPPING, COMMERCE.freeShippingThreshold);
  assert.equal(COD_FEE, COMMERCE.codFee);
  assert.equal(COD_CAP, COMMERCE.codCap);
  assert.equal(GST_RATE, COMMERCE.gstRate);
});

test("TC-CHK-19: below ₹999 shipping is charged, at/above it is free", () => {
  const below = totals([{ id: "magnesium", qty: 1 }]);
  assert.equal(below.subtotal, 899);
  assert.equal(below.shipping, SHIPPING_FEE);
  assert.equal(below.codFee, COD_FEE);
  assert.equal(below.total, 899 + SHIPPING_FEE + COD_FEE);

  const at = totals([{ id: "bundle-basics", qty: 1 }]);
  assert.equal(at.subtotal, 1249);
  assert.equal(at.shipping, 0);
  assert.equal(at.total, 1249 + COD_FEE);
});

test("TC-CHK-20: quantity multiplies line price and subtotal", () => {
  const cart = [
    { id: "magnesium", qty: 2 },
    { id: "biotin", qty: 1 },
  ];
  const bill = totals(cart);
  assert.equal(bill.subtotal, 899 * 2 + 749);
  assert.equal(bill.shipping, 0);
  assert.equal(bill.total, 899 * 2 + 749 + COD_FEE);
});

test("TC-CHK-21: an order above the COD cap is blocked by the rules", () => {
  const bill = totals([{ id: "probiotic", qty: 2 }]);
  assert.ok(bill.total > COD_CAP);
  assert.equal(codEligibility({ total: bill.total, pincode: "400001" }).eligible, false);
  assert.equal(codEligibility({ total: bill.total, pincode: "400001" }).reason, "above_cap");
  assert.equal(codEligibility({ total: 987, pincode: "400001" }).eligible, true);
});

test("TC-CHK-22: readCart drops unknown products, zero quantities and bad JSON", () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };

  store.set("verda_cart", JSON.stringify([
    { id: "magnesium", qty: 2 },
    { id: "ghost", qty: 1 },
    { id: "biotin", qty: 0 },
    { id: "d3k2", qty: 3 },
  ]));
  assert.deepEqual(readCart(), [
    { id: "magnesium", qty: 2 },
    { id: "d3k2", qty: 3 },
  ]);

  store.set("verda_cart", "{not json");
  assert.deepEqual(readCart(), []);

  store.set("verda_cart", JSON.stringify({ id: "magnesium" }));
  assert.deepEqual(readCart(), []);

  delete globalThis.localStorage;
});

test("TC-CHK-23: every catalog product has a positive price and a name", () => {
  for (const [id, item] of Object.entries(CATALOG)) {
    assert.ok(item.name?.trim(), `${id} has no name`);
    assert.ok(Number.isFinite(item.price) && item.price > 0, `${id} price invalid`);
  }
});

/* ---------------- D. Checkout script behaviour ---------------- */

test("TC-CHK-24: validation rules match the documented formats", () => {
  assert.match(js, /\^\[6-9\]\\d\{9\}\$/, "phone must be a 10-digit Indian mobile");
  assert.match(js, /\^\[1-9\]\\d\{5\}\$/, "PIN must be 6 digits and not start with 0");
  assert.match(js, /length >= 10/, "address must be at least 10 characters");
  assert.ok(js.includes("v === \"\" || /^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/"), "email must be optional");
});

test("TC-CHK-25: invalid fields get aria-invalid and a human message", () => {
  assert.match(js, /setAttribute\("aria-invalid", "true"\)/);
  assert.match(js, /removeAttribute\("aria-invalid"\)/);
  assert.match(js, /field\.error\.textContent = field\.message/);
});

test("TC-CHK-26: submit is blocked until validation and terms pass", () => {
  assert.match(js, /event\.preventDefault\(\)/);
  assert.match(js, /if \(!\$\("#terms"\)\.checked\)/);
  assert.match(js, /Please accept the terms and returns policy/);
  assert.match(js, /document\.querySelector\('\[aria-invalid="true"\]'\)\?\.focus\(\)/);
});

test("TC-CHK-27: over-cap orders disable the submit button and explain why", () => {
  assert.match(js, /const overCap = money\.total > COD_CAP/);
  assert.match(js, /cod-note"\)\.hidden = !overCap/);
  assert.match(js, /place-order"\)\.disabled = overCap/);
});

test("TC-CHK-28: order payload carries items, money, customer and idempotent status", () => {
  assert.match(js, /collection\(db, "orders"\)/);
  for (const key of ["items", "subtotal", "shipping", "codFee", "total", "paymentMethod", "status", "customer", "uid", "source", "createdAt"]) {
    assert.match(js, new RegExp(`\\b${key}\\s*:`), `order payload missing ${key}`);
  }
  assert.match(js, /paymentMethod: "cod"/);
  assert.match(js, /status: "placed"/);
  assert.match(js, /createdAt: serverTimestamp\(\)/);
});

test("TC-CHK-29: success clears the cart, shows the order id and purchases only with consent", () => {
  assert.match(js, /clearCart\(\)/);
  assert.match(js, /#order-id"\)\.textContent = ref\.id/);
  assert.match(js, /\/order\/\?id=\$\{encodeURIComponent\(ref\.id\)\}/);
  assert.match(js, /consent\?\.analytics/);
  assert.match(js, /track\("purchase"/);
});

test("TC-CHK-30: failures leave the cart intact and re-enable the button", () => {
  const catchBlock = js.slice(js.lastIndexOf("} catch (error) {"));
  assert.match(catchBlock, /Could not place the order/);
  assert.match(catchBlock, /button\.disabled = false/);
  assert.doesNotMatch(catchBlock, /clearCart/);
});

test("TC-CHK-31: phone and PIN strip non-digits while typing", () => {
  assert.match(js, /\[\"#phone\", \"#pincode\"\]/);
  assert.match(js, /replace\(\/\\D\/g, ""\)\.slice\(0, input\.maxLength\)/);
});

test("TC-CHK-32: state dropdown lists all 36 states and union territories", () => {
  const block = js.slice(js.indexOf("const STATES = ["), js.indexOf("];", js.indexOf("const STATES = [")) + 2);
  const states = [...block.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  assert.equal(states.length, 36, `found ${states.length} states`);
  for (const state of ["Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry", "West Bengal"]) {
    assert.ok(states.includes(state), `missing ${state}`);
  }
  assert.equal(new Set(states).size, states.length, "duplicate state entries");
});

test("TC-CHK-33: empty cart hides the form and points to bestsellers", () => {
  assert.match(js, /if \(!cart\.length\)/);
  assert.match(js, /empty-cart"\)\.hidden = false/);
  assert.match(js, /checkout-form"\)\.hidden = true/);
  assert.match(html, /href="\/#bestsellers"/i);
});

test("TC-CHK-34: signed-in shoppers get their saved profile prefilled without overwriting input", () => {
  assert.match(js, /onAuthStateChanged\(auth/);
  assert.match(js, /if \(!\$\("#name"\)\.value\)/);
  assert.match(js, /lastAddress/);
  assert.match(js, /STATES\.includes\(last\.state\)/);
});

/* ---------------- E. Live page (optional) ---------------- */

test(
  "TC-CHK-35: live checkout page responds and renders the form",
  { skip: !process.env.CHECKOUT_URL && "set CHECKOUT_URL to run against a deployed checkout page" },
  async () => {
    const response = await fetch(process.env.CHECKOUT_URL, { redirect: "follow" });
    assert.equal(response.status, 200, `${process.env.CHECKOUT_URL} did not return 200`);
    const live = await response.text();
    assert.match(live, /id="checkout-form"/i);
    assert.match(live, /id="place-order"/i);
    assert.match(live, /noindex,nofollow/i);
  },
);
