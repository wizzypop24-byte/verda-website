/**
 * E2E suite — Cart + Checkout.
 *
 * Runs a real Chromium against the local dev server (same Firebase project).
 * One test creates a real order marked "Automation Test" — clean it from the
 * Firestore console after a run.
 *
 * Run: node --test tests/e2e-cart-checkout.test.mjs
 */
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";

const require = createRequire(import.meta.url);

function loadPlaywright() {
  try {
    return require("playwright-core");
  } catch {
    const candidates = [
      `${process.env.APPDATA}/npm/node_modules/@playwright/cli/node_modules/playwright-core`,
      `${process.env.HOME}/.npm-global/lib/node_modules/@playwright/cli/node_modules/playwright-core`,
    ];
    for (const path of candidates) if (existsSync(path)) return require(path);
    return null;
  }
}

const playwright = loadPlaywright();
const BASE = (process.env.E2E_BASE ?? "http://localhost:5173").replace(/\/$/, "");
const skip = !playwright && "playwright-core not found";
const opts = { timeout: 60000 };

let browser;

before(async () => {
  if (playwright) browser = await playwright.chromium.launch();
});
after(async () => {
  await browser?.close();
});

async function open(path = "/", viewport = { width: 1280, height: 900 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  return { context, page, errors };
}

const text = (page, selector) => page.locator(selector).innerText();
const money = async (page, selector) => Number((await text(page, selector)).replace(/[^\d]/g, ""));

/* ---------------- Cart ---------------- */

test("cart starts empty", opts, async () => {
  const { context, page } = await open("/");
  assert.equal(await page.locator("#cart-badge").isHidden(), true);
  assert.equal(await page.evaluate(() => localStorage.getItem("verda_cart")), null);
  await context.close();
});

test("add to cart updates badge and storage", opts, async () => {
  const { context, page } = await open("/");
  await page.click("[data-add='magnesium']");
  assert.equal(await text(page, "#cart-badge"), "1");
  const cart = await page.evaluate(() => JSON.parse(localStorage.getItem("verda_cart")));
  assert.deepEqual(cart, [{ id: "magnesium", qty: 1 }]);
  await context.close();
});

test("adding the same product increments quantity", opts, async () => {
  const { context, page } = await open("/");
  await page.click("[data-add='magnesium']");
  await page.click("[data-add='magnesium']");
  assert.equal(await text(page, "#cart-badge"), "2");
  await context.close();
});

test("free shipping message below threshold", opts, async () => {
  const { context, page } = await open("/");
  await page.click("[data-add='magnesium']");
  await page.click("#cart-open");
  assert.match(await text(page, "#ship-text"), /Add ₹100 more/);
  assert.equal(await money(page, "#cart-subtotal"), 899);
  await context.close();
});

test("free shipping unlocks at the threshold", opts, async () => {
  const { context, page } = await open("/");
  await page.click("[data-add='d3k2']");
  await page.click("[data-add='d3k2']");
  await page.click("#cart-open");
  assert.match(await text(page, "#ship-text"), /Free shipping unlocked/);
  assert.equal(await money(page, "#cart-subtotal"), 1298);
  await context.close();
});

test("quantity controls update the subtotal", opts, async () => {
  const { context, page } = await open("/");
  await page.click("[data-add='magnesium']");
  await page.click("#cart-open");
  await page.click("[data-qty='1'][data-id='magnesium']");
  assert.equal(await money(page, "#cart-subtotal"), 1798);
  await page.click("[data-qty='-1'][data-id='magnesium']");
  assert.equal(await money(page, "#cart-subtotal"), 899);
  await context.close();
});

test("removing the last item empties the cart", opts, async () => {
  const { context, page } = await open("/");
  await page.click("[data-add='magnesium']");
  await page.click("#cart-open");
  await page.click("[data-remove='magnesium']");
  assert.equal(await page.locator("#cart-badge").isHidden(), true);
  assert.match(await text(page, ".cart-empty"), /cart is empty/i);
  await context.close();
});

test("cart survives a reload", opts, async () => {
  const { context, page } = await open("/");
  await page.click("[data-add='biotin']");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
  assert.equal(await text(page, "#cart-badge"), "1");
  await context.close();
});

test("cart drawer closes with Escape", opts, async () => {
  const { context, page } = await open("/");
  await page.click("#cart-open");
  assert.equal(await page.locator("#cart-drawer").isVisible(), true);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#cart-drawer").isHidden(), true);
  await context.close();
});

test("add to cart from a collection page", opts, async () => {
  const { context, page } = await open("/collections/gut/");
  await page.click("[data-add='probiotic']");
  assert.equal(await text(page, "#cart-count"), "1");
  await context.close();
});

test("product page quantity stepper respects 1–10", opts, async () => {
  const { context, page } = await open("/products/magnesium/");
  assert.equal(await page.inputValue("#qty"), "1");
  await page.click("#qty-minus");
  assert.equal(await page.inputValue("#qty"), "1");
  for (let i = 0; i < 12; i += 1) await page.click("#qty-plus");
  assert.equal(await page.inputValue("#qty"), "10");
  await context.close();
});

test("Buy now adds the selected quantity and opens checkout", opts, async () => {
  const { context, page } = await open("/products/d3k2/");
  await page.click("#qty-plus");
  await page.click("#buy-now");
  await page.waitForURL("**/checkout/");
  assert.equal(await page.locator(".summary-item").count(), 1);
  assert.equal(await money(page, "#sum-total"), 649 * 2 + 29);
  await context.close();
});

/* ---------------- Checkout ---------------- */

test("empty checkout hides the form", opts, async () => {
  const { context, page } = await open("/checkout/");
  assert.equal(await page.locator("#checkout-form").isHidden(), true);
  assert.equal(await page.locator("#empty-cart").isVisible(), true);
  assert.equal(await page.locator(".checkout__summary").isHidden(), true);
  await context.close();
});

test("totals: below threshold adds ₹59 shipping and ₹29 COD", opts, async () => {
  const { context, page } = await open("/");
  await page.click("[data-add='magnesium']");
  await page.goto(`${BASE}/checkout/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  assert.equal(await money(page, "#sum-subtotal"), 899);
  assert.equal(await money(page, "#sum-shipping"), 59);
  assert.equal(await money(page, "#sum-cod"), 29);
  assert.equal(await money(page, "#sum-total"), 987);
  assert.equal(await money(page, "#mobile-total"), 987);
  await context.close();
});

test("checkout blocks COD above ₹2,000", opts, async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() =>
    localStorage.setItem("verda_cart", JSON.stringify([{ id: "magnesium", qty: 2 }, { id: "probiotic", qty: 1 }])),
  );
  await page.goto(`${BASE}/checkout/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);

  assert.equal(await money(page, "#sum-total"), 2926);
  assert.equal(await page.locator("#cod-note").isVisible(), true);
  assert.equal(await page.locator("#place-order").isDisabled(), true);
  await context.close();
});

test("state select starts empty", opts, async () => {
  const { context, page } = await open("/checkout/");
  // Cart is empty here, but the select is still populated.
  assert.equal(await page.inputValue("#state"), "");
  assert.equal(await page.locator("#state option").first().innerText(), "Select state");
  await context.close();
});

test("empty submit shows field errors and focuses the first field", opts, async () => {
  const { context, page } = await open("/");
  await page.click("[data-add='magnesium']");
  await page.goto(`${BASE}/checkout/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await page.click("#place-order");

  const errors = await page.locator(".field-error").evaluateAll((nodes) =>
    nodes.filter((node) => node.textContent.trim().length > 0).length,
  );
  assert.equal(errors, 6);
  assert.equal(await page.evaluate(() => document.activeElement?.id), "name");
  await context.close();
});

test("invalid phone and PIN are rejected", opts, async () => {
  const { context, page } = await open("/");
  await page.click("[data-add='magnesium']");
  await page.goto(`${BASE}/checkout/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);

  await page.fill("#phone", "12345");
  await page.fill("#pincode", "123");
  await page.locator("#phone").blur();
  await page.locator("#pincode").blur();

  assert.match(await text(page, "#phone-error"), /valid 10-digit/);
  assert.match(await text(page, "#pincode-error"), /valid 6-digit/);
  await context.close();
});

test("terms are required", opts, async () => {
  const { context, page } = await open("/");
  await page.click("[data-add='magnesium']");
  await page.goto(`${BASE}/checkout/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);

  await page.fill("#name", "Automation Test");
  await page.fill("#phone", "9000000001");
  await page.fill("#address", "Automation test address, do not ship");
  await page.fill("#city", "Mumbai");
  await page.fill("#pincode", "400001");
  await page.selectOption("#state", "Maharashtra");
  await page.click("#place-order");

  assert.match(await text(page, "#order-status"), /accept the terms/i);
  await context.close();
});

test("valid COD order is placed and the cart is cleared", opts, async () => {
  const { context, page } = await open("/");
  await page.click("[data-add='magnesium']");
  await page.goto(`${BASE}/checkout/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);

  await page.fill("#name", "Automation Test");
  await page.fill("#phone", "9000000001");
  await page.fill("#email", "automation@verda.in");
  await page.fill("#address", "Automation test address, do not ship");
  await page.fill("#city", "Mumbai");
  await page.fill("#pincode", "400001");
  await page.selectOption("#state", "Maharashtra");
  await page.check("#terms");
  await page.click("#place-order");

  await page.waitForSelector("#confirmation:not([hidden])", { timeout: 30000 });
  const orderId = await text(page, "#order-id");
  assert.ok(orderId.length >= 10, `unexpected order id: ${orderId}`);
  assert.match(await page.getAttribute("#view-order", "href"), new RegExp(`/order/\\?id=${orderId}`));
  assert.equal(await page.evaluate(() => localStorage.getItem("verda_cart")), null);
  await context.close();
});

test("checkout has no horizontal overflow at 360px", opts, async () => {
  const { context, page } = await open("/", { width: 360, height: 800 });
  await page.click("[data-add='magnesium']");
  await page.goto(`${BASE}/checkout/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert.equal(overflow, false);
  await context.close();
});

test("no console errors during the cart and checkout flow", opts, async () => {
  const { context, page, errors } = await open("/");
  await page.click("[data-add='magnesium']");
  await page.click("#cart-open");
  await page.keyboard.press("Escape");
  await page.goto(`${BASE}/checkout/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  assert.deepEqual(errors, [], errors.join(" | "));
  await context.close();
});
