/**
 * E2E suite — Policies (5), 404 and About.
 *
 * Run: node --test tests/e2e-policies-about.test.mjs
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

const POLICIES = [
  { slug: "shipping", title: "Shipping policy" },
  { slug: "returns", title: "Returns and refunds" },
  { slug: "privacy", title: "Privacy policy" },
  { slug: "terms", title: "Terms of service" },
  { slug: "disclaimer", title: "Product disclaimer" },
];

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
  const response = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  return { context, page, errors, response };
}

const text = (page, selector) => page.locator(selector).innerText();

/* ---------------- Policies ---------------- */

for (const policy of POLICIES) {
  test(`policy ${policy.slug}: renders heading, date and sections`, opts, async () => {
    const { context, page } = await open(`/policies/${policy.slug}/`);
    assert.equal((await text(page, "h1")).trim(), policy.title);
    assert.match(await text(page, ".policy-updated"), /Last updated: 25 October 2026/);
    const sections = await page.locator("main section").count();
    assert.ok(sections >= 5, `${policy.slug}: only ${sections} sections`);
    assert.match(await page.title(), new RegExp(policy.title.split(" ")[0], "i"));
    await context.close();
  });

  test(`policy ${policy.slug}: canonical and all-policy links`, opts, async () => {
    const { context, page } = await open(`/policies/${policy.slug}/`);
    const canonical = await page.getAttribute('link[rel="canonical"]', "href");
    assert.equal(canonical, `${process.env.SITE_URL ?? "https://fir-479b9.web.app"}/policies/${policy.slug}/`);

    const hrefs = await page.locator(".policy-links a").evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")));
    assert.equal(hrefs.length, 5);
    assert.ok(hrefs.every((href) => href.startsWith("/policies/")));
    assert.deepEqual([...hrefs].sort(), POLICIES.map((item) => `/policies/${item.slug}/`).sort());
    await context.close();
  });

  test(`policy ${policy.slug}: no placeholder text and no console errors`, opts, async () => {
    const { context, page, errors } = await open(`/policies/${policy.slug}/`);
    const body = (await page.locator("body").innerText()).toLowerCase();
    assert.ok(!body.includes("lorem ipsum"), "lorem found");
    assert.ok(!body.includes("todo:"), "todo found");
    assert.deepEqual(errors, [], errors.join(" | "));
    await context.close();
  });

  test(`policy ${policy.slug}: no overflow at 360px`, opts, async () => {
    const { context, page } = await open(`/policies/${policy.slug}/`, { width: 360, height: 800 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(overflow, false);
    await context.close();
  });
}

test("policy pages link to each other and every link resolves", opts, async () => {
  const { context, page } = await open("/policies/privacy/");
  const hrefs = await page.locator(".policy-links a").evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")));

  for (const href of hrefs) {
    const status = await page.evaluate(async (path) => (await fetch(path)).status, href);
    assert.ok(status < 400, `${href} → ${status}`);
  }
  await context.close();
});

test("home footer links to all five policies", opts, async () => {
  const { context, page } = await open("/");
  const hrefs = await page.locator('.footer a[href^="/policies/"]').evaluateAll((nodes) =>
    nodes.map((n) => n.getAttribute("href")),
  );
  assert.equal(new Set(hrefs).size, 5, hrefs.join(","));
  await context.close();
});

/* ---------------- 404 ---------------- */

test("unknown URL returns a custom 404 page", opts, async () => {
  const { context, page, response } = await open("/definitely-not-a-page");
  assert.ok(response);
  assert.equal(response.status(), 404);
  assert.match(await text(page, "h1"), /This page took a rest day/i);
  assert.match(await text(page, ".notfound__code"), /404/);
  assert.match(await text(page, "#where"), /\/definitely-not-a-page/);
  await context.close();
});

test("404 page offers recovery links", opts, async () => {
  const { context, page } = await open("/definitely-not-a-page");
  const hrefs = await page.locator(".notfound__actions a").evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")));
  assert.deepEqual(hrefs, ["/", "/#bestsellers", "/account/"]);
  assert.equal(await page.getAttribute('meta[name="robots"]', "content"), "noindex,follow");
  await context.close();
});

test("404 page has no unexpected console errors", opts, async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(`${BASE}/missing-in-action`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);

  const unexpected = errors.filter((line) => !/Failed to load resource/i.test(line));
  assert.deepEqual(unexpected, [], unexpected.join(" | "));
  await context.close();
});

test("404 page has no overflow at 360px", opts, async () => {
  const { context, page } = await open("/missing-at-360", { width: 360, height: 800 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert.equal(overflow, false);
  await context.close();
});

/* ---------------- About ---------------- */

test("about page tells the story with four rules", opts, async () => {
  const { context, page } = await open("/about/");
  assert.match(await text(page, "h1"), /Supplements that show their work/i);
  assert.equal(await page.locator(".about-values article").count(), 4);
  assert.match(await text(page, ".about-values"), /Clinically dosed/);
  assert.match(await text(page, ".about-values"), /Third-party tested/);
  await context.close();
});

test("about page shows the verification checklist", opts, async () => {
  const { context, page } = await open("/about/");
  assert.equal(await page.locator(".about-check li").count(), 4);
  assert.match(await text(page, ".about-check"), /FSSAI licence number/i);
  await context.close();
});

test("about CTAs point to shop, concerns and contact", opts, async () => {
  const { context, page } = await open("/about/");
  const hrefs = await page.locator(".page-cta a").evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")));
  assert.deepEqual(hrefs, ["/#bestsellers", "/#concerns", "/contact/"]);
  await context.close();
});

test("about page has no overflow at 360px", opts, async () => {
  const { context, page } = await open("/about/", { width: 360, height: 800 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert.equal(overflow, false);
  await context.close();
});

test("about page has no console errors", opts, async () => {
  const { context, page, errors } = await open("/about/");
  assert.deepEqual(errors, [], errors.join(" | "));
  await context.close();
});
