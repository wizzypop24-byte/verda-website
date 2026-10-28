/**
 * E2E suite — Account and Checkout policy footers.
 *
 * Run: node --test tests/e2e-footers.test.mjs
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

const POLICIES = ["/policies/shipping/", "/policies/returns/", "/policies/privacy/", "/policies/terms/", "/policies/disclaimer/"];

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
  await page.waitForTimeout(500);
  return { context, page, errors };
}

const policyLinks = (page, scope) =>
  page.locator(`${scope} a[href^="/policies/"]`).evaluateAll((nodes) =>
    nodes.map((node) => ({ href: node.getAttribute("href"), label: node.textContent.trim() })),
  );

function assertAllPolicies(links) {
  const hrefs = links.map((link) => link.href);
  assert.equal(new Set(hrefs).size, 5, `expected 5 unique policies, got ${hrefs.join(",")}`);
  for (const policy of POLICIES) {
    assert.ok(hrefs.includes(policy), `missing ${policy}`);
  }
}

/* ---------------- Account footer ---------------- */

test("account footer links to all five policies", opts, async () => {
  const { context, page } = await open("/account/");
  const links = await policyLinks(page, ".account__foot");
  assertAllPolicies(links);
  await context.close();
});

test("account footer keeps policy order and readable labels", opts, async () => {
  const { context, page } = await open("/account/");
  const links = await policyLinks(page, ".account__foot");
  assert.deepEqual(links.map((link) => link.href), POLICIES);
  for (const link of links) assert.ok(link.label.length >= 4, `empty label for ${link.href}`);
  await context.close();
});

test("account footer links all resolve", opts, async () => {
  const { context, page } = await open("/account/");
  const links = await policyLinks(page, ".account__foot");
  for (const link of links) {
    const status = await page.evaluate(async (href) => (await fetch(href)).status, link.href);
    assert.ok(status < 400, `${link.href} → ${status}`);
  }
  await context.close();
});

test("account footer link navigates to the policy page", opts, async () => {
  const { context, page } = await open("/account/");
  await page.locator('.account__foot a[href="/policies/shipping/"]').click();
  await page.waitForURL("**/policies/shipping/");
  assert.match(await page.locator("h1").innerText(), /Shipping policy/i);
  await context.close();
});

test("account footer is usable at 360px", opts, async () => {
  const { context, page } = await open("/account/", { width: 360, height: 800 });
  const links = await policyLinks(page, ".account__foot");
  assert.equal(links.length, 5);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert.equal(overflow, false);
  assert.equal(await page.locator('.account__foot a[href="/policies/returns/"]').isVisible(), true);
  await context.close();
});

test("account footer has no console errors", opts, async () => {
  const { context, page, errors } = await open("/account/");
  assert.deepEqual(errors, [], errors.join(" | "));
  await context.close();
});

/* ---------------- Checkout footer ---------------- */

test("checkout footer links to all five policies", opts, async () => {
  const { context, page } = await open("/checkout/");
  const links = await policyLinks(page, ".checkout__foot");
  assertAllPolicies(links);
  await context.close();
});

test("checkout footer keeps policy order and readable labels", opts, async () => {
  const { context, page } = await open("/checkout/");
  const links = await policyLinks(page, ".checkout__foot");
  assert.deepEqual(links.map((link) => link.href), POLICIES);
  for (const link of links) assert.ok(link.label.length >= 4, `empty label for ${link.href}`);
  await context.close();
});

test("checkout footer links all resolve", opts, async () => {
  const { context, page } = await open("/checkout/");
  const links = await policyLinks(page, ".checkout__foot");
  for (const link of links) {
    const status = await page.evaluate(async (href) => (await fetch(href)).status, link.href);
    assert.ok(status < 400, `${link.href} → ${status}`);
  }
  await context.close();
});

test("checkout footer link navigates to the policy page", opts, async () => {
  const { context, page } = await open("/checkout/");
  await page.locator('.checkout__foot a[href="/policies/returns/"]').click();
  await page.waitForURL("**/policies/returns/");
  assert.match(await page.locator("h1").innerText(), /Returns and refunds/i);
  await context.close();
});

test("checkout footer is usable at 360px", opts, async () => {
  const { context, page } = await open("/checkout/", { width: 360, height: 800 });
  const links = await policyLinks(page, ".checkout__foot");
  assert.equal(links.length, 5);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert.equal(overflow, false);
  assert.equal(await page.locator('.checkout__foot a[href="/policies/privacy/"]').isVisible(), true);
  await context.close();
});

test("checkout footer has no console errors", opts, async () => {
  const { context, page, errors } = await open("/checkout/");
  assert.deepEqual(errors, [], errors.join(" | "));
  await context.close();
});

/* ---------------- Consistency ---------------- */

test("account and checkout expose the same policy set", opts, async () => {
  const account = await open("/account/");
  const accountLinks = (await policyLinks(account.page, ".account__foot")).map((link) => link.href);
  await account.context.close();

  const checkout = await open("/checkout/");
  const checkoutLinks = (await policyLinks(checkout.page, ".checkout__foot")).map((link) => link.href);
  await checkout.context.close();

  assert.deepEqual(accountLinks, checkoutLinks);
});

test("footer links are real anchors, not JavaScript handlers", opts, async () => {
  for (const path of ["/account/", "/checkout/"]) {
    const { context, page } = await open(path);
    const scope = path === "/account/" ? ".account__foot" : ".checkout__foot";
    const hrefs = await page.locator(`${scope} a`).evaluateAll((nodes) =>
      nodes.filter((node) => node.getAttribute("href")?.startsWith("/policies/")).map((node) => node.getAttribute("href")),
    );
    assert.equal(hrefs.length, 5);
    await context.close();
  }
});
