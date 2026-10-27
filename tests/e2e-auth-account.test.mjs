/**
 * E2E suite — Auth + Account (and auth-gated pages).
 *
 * Google sign-in needs a real Google account, which automation cannot supply.
 * Signed-out behaviour is fully tested; authenticated flows are marked skipped
 * with a manual checklist in the report.
 *
 * Run: node --test tests/e2e-auth-account.test.mjs
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
const noLogin = "requires a Google test account (manual step)";
const opts = { timeout: 60000 };

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
  await page.waitForTimeout(700);
  return { context, page, errors };
}

const text = (page, selector) => page.locator(selector).innerText();

/* ---------------- Auth page ---------------- */

test("auth page loads with Google button", opts, async () => {
  const { context, page } = await open("/auth/");
  assert.match(await page.title(), /Sign in/);
  assert.equal(await page.locator("#google-btn").isVisible(), true);
  assert.match(await text(page, "#google-btn"), /Continue with Google/);
  await context.close();
});

test("auth page has a working back-to-store link", opts, async () => {
  const { context, page } = await open("/auth/");
  assert.equal(await page.getAttribute("a.back", "href"), "/");
  await context.close();
});

test("auth legal links point to the policy pages", opts, async () => {
  const { context, page } = await open("/auth/");
  const hrefs = await page.locator(".legal a").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  assert.ok(hrefs.includes("/policies/terms/"), hrefs.join(","));
  assert.ok(hrefs.includes("/policies/privacy/"), hrefs.join(","));
  await context.close();
});

test("Google button opens the OAuth popup and handles cancellation", opts, async () => {
  const { context, page } = await open("/auth/");

  const popupPromise = context.waitForEvent("page", { timeout: 20000 });
  await page.click("#google-btn");
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded").catch(() => {});
  await popup.waitForURL(/accounts\.google\.com/, { timeout: 15000 }).catch(() => {});

  assert.match(popup.url(), /accounts\.google\.com|firebaseapp\.com\/__\/auth\/handler/);
  await popup.close();

  await page.waitForFunction(
    () => document.getElementById("status").textContent.trim().length > 0,
    { timeout: 25000 },
  );
  assert.match(await text(page, "#status"), /cancelled/i);
  assert.equal(await page.locator("#google-btn").isEnabled(), true);
  await context.close();
});

test("auth page has no horizontal overflow at 360px", opts, async () => {
  const { context, page } = await open("/auth/", { width: 360, height: 800 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert.equal(overflow, false);
  await context.close();
});

/* ---------------- Account page ---------------- */

test("account page shows the sign-in gate when signed out", opts, async () => {
  const { context, page } = await open("/account/");
  assert.equal(await page.locator("#signed-out").isVisible(), true);
  assert.match(await text(page, "#signed-out h2"), /Sign in to see your orders/i);
  assert.equal(await page.locator("#signed-in").isHidden(), true);
  await context.close();
});

test("sign out button is hidden while signed out", opts, async () => {
  const { context, page } = await open("/account/");
  assert.equal(await page.locator("#signout").isHidden(), true);
  await context.close();
});

test("account sign-in link returns to the account page", opts, async () => {
  const { context, page } = await open("/account/");
  assert.equal(await page.getAttribute("#signed-out a", "href"), "/auth/?next=/account/");
  await context.close();
});

test("account page does not leak profile data when signed out", opts, async () => {
  const { context, page } = await open("/account/");
  assert.equal(await text(page, "#profile-name"), "");
  assert.equal(await text(page, "#profile-email"), "");
  assert.equal(await page.locator("#address-card").isHidden(), true);
  await context.close();
});

test("account page has no horizontal overflow at 360px", opts, async () => {
  const { context, page } = await open("/account/", { width: 360, height: 800 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert.equal(overflow, false);
  await context.close();
});

/* ---------------- Auth-gated pages ---------------- */

test("order page asks for sign-in when signed out", opts, async () => {
  const { context, page } = await open("/order/?id=orC2Z1TzF7uekZeQaY8h");
  assert.equal(await page.locator("#signed-out").isVisible(), true);
  const href = await page.getAttribute("#signin-link", "href");
  assert.match(href, /^\/auth\/\?next=/);
  assert.match(decodeURIComponent(href), /\/order\/\?id=orC2Z1TzF7uekZeQaY8h/);
  await context.close();
});

test("order page rejects a malformed order id", opts, async () => {
  const { context, page } = await open("/order/?id=short");
  assert.equal(await page.locator("#not-found").isVisible(), true);
  assert.match(await text(page, "#not-found h1"), /Order ID missing/i);
  assert.equal(await page.locator("#signed-out").isHidden(), true);
  await context.close();
});

test("admin page shows the sign-in gate when signed out", opts, async () => {
  const { context, page } = await open("/admin/");
  assert.equal(await page.locator("#signed-out").isVisible(), true);
  assert.equal(await page.locator("#app").isHidden(), true);
  assert.equal(await page.locator("#denied").isHidden(), true);
  assert.match(await text(page, "#signed-out h2"), /Sign in required/i);
  await context.close();
});

test("admin panel is not rendered without a session", opts, async () => {
  const { context, page } = await open("/admin/");
  assert.equal(await page.locator("#tab-orders").isHidden(), true);
  assert.equal(await page.locator("#stat-orders").isHidden(), true);
  await context.close();
});

/* ---------------- Console hygiene ---------------- */

test("no console errors on auth, account, order and admin", opts, async () => {
  const pages = ["/auth/", "/account/", "/order/?id=orC2Z1TzF7uekZeQaY8h", "/admin/"];
  for (const path of pages) {
    const { context, page, errors } = await open(path);
    assert.deepEqual(errors, [], `${path}: ${errors.join(" | ")}`);
    await context.close();
  }
});

/* ---------------- Authenticated flows (manual) ---------------- */

test("Google login redirects to home", { ...opts, skip: noLogin }, async () => {});

test("login with next=/account/ lands on the account page", { ...opts, skip: noLogin }, async () => {});

test("account shows only the signed-in user's orders", { ...opts, skip: noLogin }, async () => {});

test("phone number saves to the user profile", { ...opts, skip: noLogin }, async () => {});

test("saved address appears after an order", { ...opts, skip: noLogin }, async () => {});

test("owner email opens the admin panel", { ...opts, skip: noLogin }, async () => {});

test("a non-owner account is denied admin access", { ...opts, skip: noLogin }, async () => {});

test("order detail opens for the owning account only", { ...opts, skip: noLogin }, async () => {});
