/**
 * E2E suite — Search modal and result links.
 *
 * Covers opening/closing, matching, zero results, hrefs, navigation and the
 * consent-gated `search_submit` event.
 *
 * Run: node --test tests/e2e-search.test.mjs
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

async function open(viewport = { width: 1280, height: 900 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  return { context, page, errors };
}

const text = (page, selector) => page.locator(selector).innerText();
const hrefs = (page) =>
  page.locator("#search-results a").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));

async function search(page, query) {
  await page.click("#search-open");
  await page.fill("#search-input", query);
  await page.waitForTimeout(350);
}

/* ---------------- Open / close ---------------- */

test("search button opens the modal and focuses the input", opts, async () => {
  const { context, page } = await open();
  await page.click("#search-open");
  assert.equal(await page.locator("#search-modal").isVisible(), true);
  assert.equal(await page.evaluate(() => document.activeElement?.id), "search-input");
  await context.close();
});

test("search modal closes with Escape", opts, async () => {
  const { context, page } = await open();
  await search(page, "sleep");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#search-modal").isHidden(), true);
  await context.close();
});

test("short queries show a hint instead of results", opts, async () => {
  const { context, page } = await open();
  await search(page, "s");
  assert.match(await text(page, ".search-empty"), /at least two letters/i);
  assert.equal(await page.locator("#search-results a").count(), 0);
  await context.close();
});

/* ---------------- Matching ---------------- */

test("typing 'sleep' finds the magnesium product", opts, async () => {
  const { context, page } = await open();
  await search(page, "sleep");
  assert.equal(await page.locator("#search-results a").count(), 1);
  assert.match(await text(page, "#search-results"), /Magnesium Glycinate 200 mg/);
  await context.close();
});

test("result links point to the product page", opts, async () => {
  const { context, page } = await open();
  await search(page, "sleep");
  assert.deepEqual(await hrefs(page), ["/products/magnesium/"]);
  await context.close();
});

test("matching is case-insensitive", opts, async () => {
  const { context, page } = await open();
  await search(page, "SLEEP");
  assert.deepEqual(await hrefs(page), ["/products/magnesium/"]);
  await context.close();
});

test("tag search finds a product by concern", opts, async () => {
  const { context, page } = await open();
  await search(page, "gut");
  assert.deepEqual(await hrefs(page), ["/products/probiotic/"]);
  await context.close();
});

test("a broad query returns multiple valid product links", opts, async () => {
  const { context, page } = await open();
  await search(page, "immunity");
  const links = await hrefs(page);
  assert.ok(links.length >= 2, links.join(","));
  assert.ok(links.every((href) => href.startsWith("/products/")));
  await context.close();
});

test("no match shows the zero-result state", opts, async () => {
  const { context, page } = await open();
  await search(page, "zzzzzz");
  assert.match(await text(page, ".search-empty"), /No products match/i);
  assert.equal(await page.locator("#search-results a").count(), 0);
  await context.close();
});

test("bundles never appear in search results", opts, async () => {
  const { context, page } = await open();
  await search(page, "bundle");
  const links = await hrefs(page);
  assert.ok(!links.some((href) => href.includes("bundle")), links.join(","));
  await context.close();
});

test("results are capped at six", opts, async () => {
  const { context, page } = await open();
  await search(page, "i");
  await page.fill("#search-input", "in");
  await page.waitForTimeout(350);
  assert.ok((await page.locator("#search-results a").count()) <= 6);
  await context.close();
});

/* ---------------- Navigation ---------------- */

test("clicking a result navigates to the product page", opts, async () => {
  const { context, page } = await open();
  await search(page, "sleep");
  await page.locator("#search-results a").first().click();
  await page.waitForURL("**/products/magnesium/");
  assert.equal(new URL(page.url()).pathname, "/products/magnesium/");
  assert.match(await text(page, "h1"), /Magnesium Glycinate/);
  await context.close();
});

test("clicking a result closes the modal", opts, async () => {
  const { context, page } = await open();
  await search(page, "biotin");
  await page.locator("#search-results a").first().click();
  await page.waitForURL("**/products/biotin/");
  await page.goBack({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  assert.equal(await page.locator("#search-modal").isHidden(), true);
  await context.close();
});

/* ---------------- Analytics ---------------- */

test("no search event is sent before consent", opts, async () => {
  const { context, page } = await open();
  await search(page, "sleep");
  const events = await page.evaluate(() => (window.dataLayer ?? []).map((entry) => entry.event));
  assert.ok(!events.includes("search_submit"));
  await context.close();
});

test("consent unlocks the search_submit event with a result count", opts, async () => {
  const { context, page } = await open();
  await page.click("#consent-accept");
  await search(page, "sleep");
  const entry = await page.evaluate(() => (window.dataLayer ?? []).find((item) => item.event === "search_submit"));
  assert.ok(entry, "search_submit missing");
  assert.equal(entry.query, "sleep");
  assert.equal(entry.results_count, 1);
  await context.close();
});

/* ---------------- Layout ---------------- */

test("search modal fits a 360px viewport without overflow", opts, async () => {
  const { context, page } = await open({ width: 360, height: 800 });
  await search(page, "immunity");
  const box = await page.locator("#search-modal .modal__panel").boundingBox();
  assert.ok(box.width <= 360, `panel width ${box.width}`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert.equal(overflow, false);
  await context.close();
});

test("search produces no console errors", opts, async () => {
  const { context, page, errors } = await open();
  await search(page, "sleep");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  assert.deepEqual(errors, [], errors.join(" | "));
  await context.close();
});
