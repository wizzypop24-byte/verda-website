/**
 * Page-level smoke suite for the deployed store.
 *
 * For every page: expected HTTP status, no console errors, no horizontal
 * overflow at 360 px and 1280 px, one H1, no broken images.
 *
 * Run: node --test tests/smoke.test.mjs
 * Base URL override: SMOKE_BASE=http://localhost:5173
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
    for (const path of candidates) {
      if (existsSync(path)) return require(path);
    }
    return null;
  }
}

const playwright = loadPlaywright();
const BASE = (process.env.SMOKE_BASE ?? "https://fir-479b9.web.app").replace(/\/$/, "");

const PAGES = [
  { name: "home", path: "/", status: 200 },
  { name: "auth", path: "/auth/", status: 200 },
  { name: "account (signed out)", path: "/account/", status: 200 },
  { name: "checkout (empty)", path: "/checkout/", status: 200 },
  { name: "order detail (signed out)", path: "/order/?id=orC2Z1TzF7uekZeQaY8h", status: 200 },
  { name: "admin (signed out)", path: "/admin/", status: 200 },
  { name: "product magnesium", path: "/products/magnesium/", status: 200 },
  { name: "product probiotic", path: "/products/probiotic/", status: 200 },
  { name: "product d3k2", path: "/products/d3k2/", status: 200 },
  { name: "product biotin", path: "/products/biotin/", status: 200 },
  { name: "collection sleep", path: "/collections/sleep/", status: 200 },
  { name: "collection immunity", path: "/collections/immunity/", status: 200 },
  { name: "collection gut", path: "/collections/gut/", status: 200 },
  { name: "collection hair-skin", path: "/collections/hair-skin/", status: 200 },
  { name: "collection energy (soon)", path: "/collections/energy/", status: 200 },
  { name: "collection joints (soon)", path: "/collections/joints/", status: 200 },
  { name: "collection fitness (soon)", path: "/collections/fitness/", status: 200 },
  { name: "policy shipping", path: "/policies/shipping/", status: 200 },
  { name: "policy returns", path: "/policies/returns/", status: 200 },
  { name: "policy privacy", path: "/policies/privacy/", status: 200 },
  { name: "policy terms", path: "/policies/terms/", status: 200 },
  { name: "policy disclaimer", path: "/policies/disclaimer/", status: 200 },
  { name: "about", path: "/about/", status: 200 },
  { name: "contact", path: "/contact/", status: 200 },
  { name: "404", path: "/definitely-not-a-real-page", status: 404 },
];

let browser;

before(async () => {
  if (!playwright) return;
  browser = await playwright.chromium.launch();
});

after(async () => {
  await browser?.close();
});

for (const item of PAGES) {
  test(`smoke: ${item.name} (${item.path})`, { skip: !playwright && "playwright-core not found" }, async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const consoleErrors = [];
    const failedRequests = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("requestfailed", (request) => {
      failedRequests.push(`${request.url()} — ${request.failure()?.errorText ?? "failed"}`);
    });

    const response = await page.goto(`${BASE}${item.path}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    assert.ok(response, `${item.name}: no response`);
    assert.equal(response.status(), item.status, `${item.name}: status ${response.status()}`);

    await page.waitForTimeout(1200);

    const desktop = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      h1: document.querySelectorAll("h1").length,
      title: document.title.trim(),
      brokenImages: [...document.images].filter(
        (img) => img.getAttribute("src") && img.complete && img.naturalWidth === 0,
      ).length,
    }));

    assert.equal(desktop.overflow, false, `${item.name}: horizontal overflow at 1280`);
    assert.ok(desktop.title.length > 0, `${item.name}: empty title`);
    assert.ok(desktop.h1 >= 1, `${item.name}: no H1`);
    assert.equal(desktop.brokenImages, 0, `${item.name}: ${desktop.brokenImages} broken image(s)`);

    await page.setViewportSize({ width: 360, height: 800 });
    await page.waitForTimeout(400);
    const mobile = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      width: window.innerWidth,
    }));
    assert.equal(mobile.overflow, false, `${item.name}: horizontal overflow at 360`);
    assert.equal(mobile.width, 360);

    // A 404 document legitimately logs a resource error for itself.
    const relevantErrors = consoleErrors.filter(
      (text) => !(item.status === 404 && /Failed to load resource/i.test(text) && !text.includes("favicon")),
    );
    assert.deepEqual(relevantErrors, [], `${item.name}: console errors → ${relevantErrors.join(" | ")}`);
    assert.deepEqual(failedRequests, [], `${item.name}: failed requests → ${failedRequests.join(" | ")}`);

    await context.close();
  });
}
