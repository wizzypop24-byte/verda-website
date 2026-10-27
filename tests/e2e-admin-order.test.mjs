/**
 * E2E suite — Admin + Order detail.
 *
 * Both areas require an authenticated owner session. Signed-out gates and
 * invalid states are automated; authenticated actions are manual (skipped).
 *
 * Run: node --test tests/e2e-admin-order.test.mjs
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
const noLogin = "requires the owner Google session (manual step)";
const opts = { timeout: 60000 };
const ORDER_ID = "orC2Z1TzF7uekZeQaY8h";

let browser;

before(async () => {
  if (playwright) browser = await playwright.chromium.launch();
});
after(async () => {
  await browser?.close();
});

async function open(path, viewport = { width: 1280, height: 900 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  return { context, page, errors };
}

const text = (page, selector) => page.locator(selector).innerText();

/* ---------------- Order detail (signed out) ---------------- */

test("order page shows the sign-in gate", opts, async () => {
  const { context, page } = await open(`/order/?id=${ORDER_ID}`);
  assert.equal(await page.locator("#signed-out").isVisible(), true);
  assert.match(await text(page, "#signed-out h1"), /Sign in to see this order/i);
  await context.close();
});

test("order sign-in link preserves the order id", opts, async () => {
  const { context, page } = await open(`/order/?id=${ORDER_ID}`);
  const href = await page.getAttribute("#signin-link", "href");
  assert.match(href, /^\/auth\/\?next=/);
  assert.match(decodeURIComponent(href), new RegExp(`/order/\\?id=${ORDER_ID}`));
  await context.close();
});

test("missing or malformed order id shows the not-found state", opts, async () => {
  const { context, page } = await open("/order/?id=short");
  assert.equal(await page.locator("#not-found").isVisible(), true);
  assert.match(await text(page, "#not-found h1"), /Order ID missing/i);
  assert.equal(await page.locator("#signed-out").isHidden(), true);
  assert.equal(await page.locator("#order-view").isHidden(), true);
  await context.close();
});

test("order page shows no order data before sign-in", opts, async () => {
  const { context, page } = await open(`/order/?id=${ORDER_ID}`);
  assert.equal(await page.locator("#order-view").isHidden(), true);
  assert.equal(await text(page, "#order-id"), "#—");
  assert.equal(await text(page, "#order-address"), "");
  await context.close();
});

test("order page has no overflow at 360px", opts, async () => {
  const { context, page } = await open(`/order/?id=${ORDER_ID}`, { width: 360, height: 800 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert.equal(overflow, false);
  await context.close();
});

test("order page has no console errors while signed out", opts, async () => {
  const { context, page, errors } = await open(`/order/?id=${ORDER_ID}`);
  assert.deepEqual(errors, [], errors.join(" | "));
  await context.close();
});

/* ---------------- Admin (signed out) ---------------- */

test("admin shows the sign-in gate", opts, async () => {
  const { context, page } = await open("/admin/");
  assert.equal(await page.locator("#signed-out").isVisible(), true);
  assert.match(await text(page, "#signed-out h2"), /Sign in required/i);
  assert.equal(await page.locator("#app").isHidden(), true);
  await context.close();
});

test("admin hides the denied state for a fresh visitor", opts, async () => {
  const { context, page } = await open("/admin/");
  assert.equal(await page.locator("#denied").isHidden(), true);
  assert.equal(await text(page, "#admin-who"), "Not signed in.");
  await context.close();
});

test("admin tabs and stats are not rendered", opts, async () => {
  const { context, page } = await open("/admin/");
  assert.equal(await page.locator("#tab-orders").isHidden(), true);
  assert.equal(await page.locator("#tab-leads").isHidden(), true);
  assert.equal(await page.locator("#tab-messages").isHidden(), true);
  assert.equal(await page.locator("#stat-orders").isHidden(), true);
  await context.close();
});

test("admin refresh and sign-out stay hidden", opts, async () => {
  const { context, page } = await open("/admin/");
  assert.equal(await page.locator("#refresh").isHidden(), true);
  assert.equal(await page.locator("#signout").isHidden(), true);
  await context.close();
});

test("admin sign-in link returns to the admin page", opts, async () => {
  const { context, page } = await open("/admin/");
  assert.equal(await page.getAttribute("#signed-out a", "href"), "/auth/?next=/admin/");
  await context.close();
});

test("admin has no overflow at 360px", opts, async () => {
  const { context, page } = await open("/admin/", { width: 360, height: 800 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert.equal(overflow, false);
  await context.close();
});

test("admin has no console errors while signed out", opts, async () => {
  const { context, page, errors } = await open("/admin/");
  assert.deepEqual(errors, [], errors.join(" | "));
  await context.close();
});

/* ---------------- Authenticated (manual) ---------------- */

test("owner sees orders, stats and status controls", { ...opts, skip: noLogin }, async () => {});
test("status change persists to Firestore", { ...opts, skip: noLogin }, async () => {});
test("leads tab lists newsletter emails", { ...opts, skip: noLogin }, async () => {});
test("messages tab lists contact submissions", { ...opts, skip: noLogin }, async () => {});
test("non-owner account sees access denied", { ...opts, skip: noLogin }, async () => {});
test("owner can open their own order detail", { ...opts, skip: noLogin }, async () => {});
test("another account cannot open someone else's order", { ...opts, skip: noLogin }, async () => {});
test("a guest order stays private", { ...opts, skip: noLogin }, async () => {});
