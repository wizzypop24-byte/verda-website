/**
 * E2E suite — Product pages + Collection pages.
 *
 * No auth required. Covers render, pricing, JSON-LD, breadcrumbs, cart,
 * related products, coming-soon states and mobile layout.
 *
 * Run: node --test tests/e2e-products-collections.test.mjs
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

const PRODUCTS = [
  { slug: "magnesium", name: "Magnesium Glycinate 200 mg", price: 899, mrp: 1199, concern: "Sleep", collection: "sleep" },
  { slug: "probiotic", name: "Probiotic 10B CFU", price: 1099, mrp: 1399, concern: "Gut", collection: "gut" },
  { slug: "d3k2", name: "Vitamin D3 + K2", price: 649, mrp: 849, concern: "Immunity", collection: "immunity" },
  { slug: "biotin", name: "Biotin 10,000 mcg", price: 749, mrp: 999, concern: "Hair & Skin", collection: "hair-skin" },
];

const COLLECTIONS = [
  { slug: "sleep", name: "Sleep", live: true, products: 1 },
  { slug: "immunity", name: "Immunity", live: true, products: 1 },
  { slug: "gut", name: "Gut", live: true, products: 1 },
  { slug: "hair-skin", name: "Hair & Skin", live: true, products: 1 },
  { slug: "energy", name: "Energy", live: false, products: 0 },
  { slug: "joints", name: "Joints", live: false, products: 0 },
  { slug: "fitness", name: "Fitness", live: false, products: 0 },
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
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  return { context, page, errors };
}

const text = (page, selector) => page.locator(selector).innerText();
const digits = async (page, selector) => Number((await text(page, selector)).replace(/[^\d]/g, ""));

/* ---------------- Product pages ---------------- */

for (const product of PRODUCTS) {
  test(`product ${product.slug}: renders title, price and discount`, opts, async () => {
    const { context, page } = await open(`/products/${product.slug}/`);
    assert.equal(await text(page, "#product-title"), product.name);
    assert.equal(await digits(page, ".pdp-price .price__now"), product.price);
    assert.equal(await digits(page, ".pdp-price .price__mrp"), product.mrp);
    const off = Math.round((1 - product.price / product.mrp) * 100);
    assert.match(await text(page, ".pdp-price .price__off"), new RegExp(`${off}%`));
    assert.match(await page.title(), new RegExp(product.name.split(" ")[0], "i"));
    await context.close();
  });

  test(`product ${product.slug}: JSON-LD has Product, Offer and rating`, opts, async () => {
    const { context, page } = await open(`/products/${product.slug}/`);
    const graph = await page.evaluate(() =>
      JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)["@graph"],
    );
    const types = graph.map((node) => node["@type"]);
    assert.ok(types.includes("Product"), types.join(","));
    assert.ok(types.includes("BreadcrumbList"));
    assert.ok(types.includes("FAQPage"));
    const productNode = graph.find((node) => node["@type"] === "Product");
    assert.equal(productNode.offers.price, String(product.price));
    assert.equal(productNode.offers.priceCurrency, "INR");
    assert.ok(productNode.aggregateRating.ratingValue);
    await context.close();
  });

  test(`product ${product.slug}: breadcrumb links to its collection`, opts, async () => {
    const { context, page } = await open(`/products/${product.slug}/`);
    const hrefs = await page.locator(".crumbs a").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
    assert.equal(hrefs[0], "/");
    assert.equal(hrefs[1], `/collections/${product.collection}/`);
    await context.close();
  });

  test(`product ${product.slug}: add to cart works`, opts, async () => {
    const { context, page } = await open(`/products/${product.slug}/`);
    await page.click(".pdp-buy button[type=submit]");
    assert.equal(await text(page, "#cart-count"), "1");
    const cart = await page.evaluate(() => JSON.parse(localStorage.getItem("verda_cart")));
    assert.deepEqual(cart, [{ id: product.slug, qty: 1 }]);
    await context.close();
  });
}

test("product page: lab report link shows feedback", opts, async () => {
  const { context, page } = await open("/products/magnesium/");
  const lab = page.locator(".pdp-acc").filter({ hasText: "Lab reports" });
  await lab.locator("summary").click();
  await lab.locator("[data-lab-report]").click();
  await page.waitForTimeout(400);
  assert.match(await text(page, "#toast"), /Lab reports publish/i);
  await context.close();
});

test("product page: three related products", opts, async () => {
  const { context, page } = await open("/products/magnesium/");
  assert.equal(await page.locator(".pdp-related__card").count(), 3);
  const hrefs = await page.locator(".pdp-related__card").evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")));
  assert.ok(hrefs.every((href) => href.startsWith("/products/") && href !== "/products/magnesium/"));
  await context.close();
});

test("product page: three FAQ items open", opts, async () => {
  const { context, page } = await open("/products/magnesium/");
  assert.equal(await page.locator(".pdp-faq details").count(), 3);
  const first = page.locator(".pdp-faq details").first();
  await first.locator("summary").click();
  assert.equal(await first.evaluate((node) => node.open), true);
  await context.close();
});

test("product page: no overflow at 360px", opts, async () => {
  const { context, page } = await open("/products/magnesium/", { width: 360, height: 800 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert.equal(overflow, false);
  await context.close();
});

test("product page: no console errors", opts, async () => {
  const { context, page, errors } = await open("/products/magnesium/");
  assert.deepEqual(errors, [], errors.join(" | "));
  await context.close();
});

/* ---------------- Collection pages ---------------- */

for (const collection of COLLECTIONS) {
  test(`collection ${collection.slug}: renders heading and state`, opts, async () => {
    const { context, page } = await open(`/collections/${collection.slug}/`);
    assert.equal((await text(page, "h1")).trim(), collection.name);
    assert.equal(await page.locator(".collection-card").count(), collection.products);
    if (collection.live) {
      assert.equal(await page.locator(".collection-empty").count(), 0);
      assert.match(await page.getAttribute('meta[name="robots"]', "content"), /index/);
    } else {
      assert.equal(await page.locator(".collection-empty").isVisible(), true);
      assert.match(await page.getAttribute('meta[name="robots"]', "content"), /noindex/);
      assert.match(await text(page, ".collection-empty"), /Notify me/i);
    }
    await context.close();
  });

  test(`collection ${collection.slug}: no overflow at 360px`, opts, async () => {
    const { context, page } = await open(`/collections/${collection.slug}/`, { width: 360, height: 800 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(overflow, false);
    await context.close();
  });
}

test("live collection cards link to products and add to cart", opts, async () => {
  const { context, page } = await open("/collections/sleep/");
  const href = await page.getAttribute(".collection-card__media", "href");
  assert.equal(href, "/products/magnesium/");

  await page.click("[data-add='magnesium']");
  assert.equal(await text(page, "#cart-count"), "1");
  await context.close();
});

test("collection shows six other concerns", opts, async () => {
  const { context, page } = await open("/collections/gut/");
  assert.equal(await page.locator(".collection-others a").count(), 6);
  const hrefs = await page.locator(".collection-others a").evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")));
  assert.ok(hrefs.every((href) => href.startsWith("/collections/")));
  assert.ok(!hrefs.includes("/collections/gut/"));
  await context.close();
});

test("coming-soon collection links to the newsletter", opts, async () => {
  const { context, page } = await open("/collections/energy/");
  const href = await page.getAttribute(".collection-empty .btn", "href");
  assert.equal(href, "/#newsletter");
  await context.close();
});

test("collection pages have no console errors", opts, async () => {
  for (const collection of COLLECTIONS) {
    const { context, page, errors } = await open(`/collections/${collection.slug}/`);
    assert.deepEqual(errors, [], `${collection.slug}: ${errors.join(" | ")}`);
    await context.close();
  }
});
