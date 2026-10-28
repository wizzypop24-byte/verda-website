/**
 * E2E suite — Blog index and three articles.
 *
 * Run: node --test tests/e2e-blog.test.mjs
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
const SITE = "https://fir-479b9.web.app";
const skip = !playwright && "playwright-core not found";
const opts = { timeout: 60000 };

const POSTS = [
  { slug: "magnesium-forms", title: "Magnesium forms, explained", tag: "Ingredients", readTime: "6 min read", date: "2026-10-28" },
  { slug: "third-party-testing", title: "What third-party testing checks", tag: "Testing", readTime: "5 min read", date: "2026-10-28" },
  { slug: "supplement-label", title: "Reading a supplement label in 60 seconds", tag: "Labels", readTime: "4 min read", date: "2026-10-28" },
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

/* ---------------- Blog index ---------------- */

test("blog index lists three articles", opts, async () => {
  const { context, page, response } = await open("/blog/");
  assert.equal(response.status(), 200);
  assert.match(await text(page, "h1"), /Read before you buy/i);
  assert.equal(await page.locator(".blog-card").count(), 3);

  const hrefs = await page.locator(".blog-card").evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")));
  assert.deepEqual([...hrefs].sort(), POSTS.map((post) => `/blog/${post.slug}/`).sort());
  await context.close();
});

test("blog index cards show images, tags and read time", opts, async () => {
  const { context, page } = await open("/blog/");
  const broken = await page.locator(".blog-card img").evaluateAll((nodes) =>
    nodes.filter((img) => img.complete && img.naturalWidth === 0).length,
  );
  assert.equal(broken, 0);
  assert.equal(await page.locator(".blog-card__tag").count(), 3);
  const meta = await page.locator(".blog-card__meta").allInnerTexts();
  assert.ok(meta.every((value) => /min read/.test(value)), meta.join(","));
  await context.close();
});

test("blog index has Blog JSON-LD with three posts", opts, async () => {
  const { context, page } = await open("/blog/");
  const data = await page.evaluate(() =>
    JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent),
  );
  assert.equal(data["@type"], "Blog");
  assert.equal(data.blogPost.length, 3);
  await context.close();
});

test("blog index has no overflow at 360px", opts, async () => {
  const { context, page } = await open("/blog/", { width: 360, height: 800 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert.equal(overflow, false);
  await context.close();
});

test("blog index has no console errors", opts, async () => {
  const { context, page, errors } = await open("/blog/");
  assert.deepEqual(errors, [], errors.join(" | "));
  await context.close();
});

/* ---------------- Articles ---------------- */

for (const post of POSTS) {
  test(`blog ${post.slug}: renders heading, meta and seven sections`, opts, async () => {
    const { context, page, response } = await open(`/blog/${post.slug}/`);
    assert.equal(response.status(), 200);
    assert.equal(await text(page, "h1"), post.title);
    const meta = await text(page, ".article__meta");
    assert.match(meta, /28 October 2026/);
    assert.match(meta, new RegExp(post.readTime));
    assert.equal(await page.locator(".article section").count(), 6);
    await context.close();
  });

  test(`blog ${post.slug}: breadcrumb and canonical are correct`, opts, async () => {
    const { context, page } = await open(`/blog/${post.slug}/`);
    const hrefs = await page.locator(".crumbs a").evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")));
    assert.deepEqual(hrefs, ["/", "/blog/"]);
    const canonical = await page.getAttribute('link[rel="canonical"]', "href");
    assert.equal(canonical, `${SITE}/blog/${post.slug}/`);
    await context.close();
  });

  test(`blog ${post.slug}: BlogPosting JSON-LD is complete`, opts, async () => {
    const { context, page } = await open(`/blog/${post.slug}/`);
    const graph = await page.evaluate(() =>
      JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)["@graph"],
    );
    const types = graph.map((node) => node["@type"]);
    assert.ok(types.includes("BlogPosting"), types.join(","));
    assert.ok(types.includes("BreadcrumbList"));
    const article = graph.find((node) => node["@type"] === "BlogPosting");
    assert.equal(article.headline, post.title);
    assert.equal(article.datePublished, post.date);
    assert.ok(article.image.startsWith(SITE));
    await context.close();
  });

  test(`blog ${post.slug}: image and related posts render`, opts, async () => {
    const { context, page } = await open(`/blog/${post.slug}/`);
    const image = page.locator(".article__image");
    assert.equal(await image.count(), 1);
    assert.ok(await image.evaluate((img) => img.naturalWidth > 0), "hero image not loaded");

    assert.equal(await page.locator(".article__related .blog-card").count(), 2);
    const hrefs = await page.locator(".article__related .blog-card").evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute("href")),
    );
    assert.ok(hrefs.every((href) => href.startsWith("/blog/") && href !== `/blog/${post.slug}/`));
    await context.close();
  });

  test(`blog ${post.slug}: no overflow at 360px`, opts, async () => {
    const { context, page } = await open(`/blog/${post.slug}/`, { width: 360, height: 800 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(overflow, false);
    await context.close();
  });

  test(`blog ${post.slug}: no console errors`, opts, async () => {
    const { context, page, errors } = await open(`/blog/${post.slug}/`);
    assert.deepEqual(errors, [], errors.join(" | "));
    await context.close();
  });
}

/* ---------------- Links ---------------- */

test("home blog cards link to the three articles", opts, async () => {
  const { context, page } = await open("/");
  const hrefs = await page.locator(".post h3 a").evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")));
  assert.deepEqual([...hrefs].sort(), POSTS.map((post) => `/blog/${post.slug}/`).sort());
  await context.close();
});

test("footer links from an article resolve", opts, async () => {
  const { context, page } = await open("/blog/magnesium-forms/");
  const hrefs = await page.locator(".page-foot a").evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")));
  for (const href of hrefs) {
    const status = await page.evaluate(async (path) => (await fetch(path)).status, href);
    assert.ok(status < 400, `${href} → ${status}`);
  }
  await context.close();
});

test("related post links resolve", opts, async () => {
  const { context, page } = await open("/blog/magnesium-forms/");
  const hrefs = await page.locator(".article__related .blog-card").evaluateAll((nodes) =>
    nodes.map((n) => n.getAttribute("href")),
  );
  for (const href of hrefs) {
    const status = await page.evaluate(async (path) => (await fetch(path)).status, href);
    assert.ok(status < 400, `${href} → ${status}`);
  }
  await context.close();
});

test("sitemap includes the blog index and articles", opts, async () => {
  const { context, page } = await open("/blog/");
  const xml = await page.evaluate(async () => (await fetch("/sitemap.xml")).text());
  assert.ok(xml.includes("/blog/"), "blog index missing");
  for (const post of POSTS) assert.ok(xml.includes(`/blog/${post.slug}/`), `${post.slug} missing`);
  await context.close();
});
