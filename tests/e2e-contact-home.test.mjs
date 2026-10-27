/**
 * E2E suite — Contact + Home.
 *
 * Contact submits a real message and Home newsletter submits a real lead.
 * Clean the test rows from Firestore after a run.
 *
 * Run: node --test tests/e2e-contact-home.test.mjs
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
  await page.waitForTimeout(700);
  return { context, page, errors };
}

const text = (page, selector) => page.locator(selector).innerText();
const events = (page) => page.evaluate(() => (window.dataLayer ?? []).map((entry) => entry.event));

/* ---------------- Home — structure ---------------- */

test("home hero, CTAs and trust line render", opts, async () => {
  const { context, page } = await open("/");
  assert.match(await text(page, "h1"), /Supplements that show their work/i);
  assert.equal(await page.locator(".hero__cta a").count(), 1);
  assert.equal(await page.locator("#hero-quiz").count(), 1);
  assert.match(await text(page, ".hero__trust"), /Free shipping over ₹999/);
  await context.close();
});

test("home has seven concern cards linking to collections", opts, async () => {
  const { context, page } = await open("/");
  const cards = page.locator("[data-concern-card]");
  assert.equal(await cards.count(), 7);
  const hrefs = await cards.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
  assert.equal(hrefs.filter((href) => href.startsWith("/collections/")).length, 7);
  await context.close();
});

test("mega menu opens with seven concerns", opts, async () => {
  const { context, page } = await open("/");
  await page.click("#concern-menu-btn");
  assert.equal(await page.locator("#concern-menu a").count(), 7);
  assert.equal(await page.getAttribute("#concern-menu-btn", "aria-expanded"), "true");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#concern-menu").isHidden(), true);
  await context.close();
});

test("mobile navigation drawer opens", opts, async () => {
  const { context, page } = await open("/", { width: 390, height: 800 });
  await page.click("#nav-open");
  assert.equal(await page.locator("#mobile-nav").isVisible(), true);
  assert.equal(await page.locator(".mobile-nav__list a").count(), 7);
  await page.click("#nav-close");
  assert.equal(await page.locator("#mobile-nav").isHidden(), true);
  await context.close();
});

/* ---------------- Home — consent and analytics ---------------- */

test("analytics stay empty before consent", opts, async () => {
  const { context, page } = await open("/");
  assert.equal(await page.locator("#consent").isVisible(), true);
  assert.deepEqual(await events(page), []);
  await context.close();
});

test("accepting consent unlocks analytics", opts, async () => {
  const { context, page } = await open("/");
  await page.click("#consent-accept");
  await page.waitForTimeout(400);
  assert.equal(await page.locator("#consent").isHidden(), true);
  assert.ok((await events(page)).includes("view_home"));
  await context.close();
});

test("rejecting consent keeps analytics off", opts, async () => {
  const { context, page } = await open("/");
  await page.click("#consent-reject");
  await page.waitForTimeout(400);
  assert.equal(await page.locator("#consent").isHidden(), true);
  assert.deepEqual(await events(page), []);
  await context.close();
});

/* ---------------- Home — quiz ---------------- */

test("quiz runs five steps and recommends products", opts, async () => {
  const { context, page } = await open("/");
  await page.click("#consent-accept");
  await page.click("#quiz-open");
  assert.match(await text(page, ".quiz-progress"), /Question 1 of 5/);

  for (let step = 0; step < 5; step += 1) {
    await page.locator(".quiz-opts button").first().click();
    await page.waitForTimeout(150);
  }

  assert.equal(await page.locator(".quiz-result").count(), 1);
  const picks = await page.locator(".quiz-result li").count();
  assert.ok(picks >= 1 && picks <= 3, `unexpected picks: ${picks}`);
  await context.close();
});

test("quiz add-all puts products in the cart", opts, async () => {
  const { context, page } = await open("/");
  await page.click("#consent-accept");
  await page.click("#quiz-open");
  for (let step = 0; step < 5; step += 1) {
    await page.locator(".quiz-opts button").first().click();
    await page.waitForTimeout(150);
  }
  const picks = await page.locator(".quiz-result li").count();
  await page.click("#quiz-add");
  const badge = Number(await text(page, "#cart-badge"));
  assert.equal(badge, picks);
  await context.close();
});

/* ---------------- Home — search, FAQ, newsletter ---------------- */

test("search returns a match and a zero-result state", opts, async () => {
  const { context, page } = await open("/");
  await page.click("#consent-accept");
  await page.click("#search-open");
  await page.fill("#search-input", "sleep");
  await page.waitForTimeout(300);
  assert.ok((await page.locator("#search-results a").count()) >= 1);

  await page.fill("#search-input", "zzzzzz");
  await page.waitForTimeout(300);
  assert.match(await text(page, ".search-empty"), /No products match/i);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#search-modal").isHidden(), true);
  await context.close();
});

test("FAQ accordion opens and emits an event", opts, async () => {
  const { context, page } = await open("/");
  await page.click("#consent-accept");
  const first = page.locator("#faq details").first();
  await first.locator("summary").click();
  assert.equal(await first.evaluate((node) => node.open), true);
  await page.waitForTimeout(300);
  assert.ok((await events(page)).includes("faq_open"));
  await context.close();
});

test("newsletter rejects an invalid email", opts, async () => {
  const { context, page } = await open("/");
  await page.click("#consent-accept");
  await page.fill("#email", "not-an-email");
  await page.click("#newsletter-form button[type=submit]");
  assert.match(await text(page, "#newsletter-status"), /valid email/i);
  await context.close();
});

test("newsletter requires the consent checkbox", opts, async () => {
  const { context, page } = await open("/");
  await page.click("#consent-accept");
  await page.fill("#email", "consent.check@verda.in");
  await page.click("#newsletter-form button[type=submit]");
  assert.match(await text(page, "#newsletter-status"), /tick the consent box/i);
  await context.close();
});

test("newsletter saves a valid signup", opts, async () => {
  const { context, page } = await open("/");
  await page.click("#consent-accept");
  await page.fill("#email", "home.e2e@verda.in");
  await page.check("#marketing-consent");
  await page.click("#newsletter-form button[type=submit]");
  await page.waitForFunction(
    () => /Check your inbox/i.test(document.getElementById("newsletter-status").textContent),
    { timeout: 20000 },
  );
  assert.equal(await page.inputValue("#email"), "");
  await context.close();
});

test("home has no overflow at 360px", opts, async () => {
  const { context, page } = await open("/", { width: 360, height: 800 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert.equal(overflow, false);
  await context.close();
});

test("home has no console errors", opts, async () => {
  const { context, page, errors } = await open("/");
  await page.click("#consent-accept");
  await page.waitForTimeout(500);
  assert.deepEqual(errors, [], errors.join(" | "));
  await context.close();
});

/* ---------------- Contact ---------------- */

test("contact page renders support details", opts, async () => {
  const { context, page } = await open("/contact/");
  assert.match(await text(page, "h1"), /Contact us/i);
  assert.match(await text(page, "#form-title"), /Send a message/i);
  assert.match(await text(page, ".contact-list"), /care@verda\.in/);
  await context.close();
});

test("contact form validates required fields", opts, async () => {
  const { context, page } = await open("/contact/");
  await page.click("#contact-submit");
  const errors = await page.locator(".field-error").evaluateAll((nodes) =>
    nodes.filter((node) => node.textContent.trim().length > 0).length,
  );
  assert.ok(errors >= 2, `expected field errors, got ${errors}`);
  await context.close();
});

test("contact form rejects a bad email and short message", opts, async () => {
  const { context, page } = await open("/contact/");
  await page.fill("#c-name", "A");
  await page.fill("#c-email", "bad");
  await page.fill("#c-message", "short");
  await page.locator("#c-email").blur();
  await page.locator("#c-message").blur();

  assert.match(await text(page, "#email-error"), /valid email/i);
  assert.match(await text(page, "#message-error"), /at least 10/i);
  await context.close();
});

test("contact form requires consent", opts, async () => {
  const { context, page } = await open("/contact/");
  await page.fill("#c-name", "E2E Contact");
  await page.fill("#c-email", "contact.e2e@verda.in");
  await page.fill("#c-message", "This is an automated contact form test.");
  await page.click("#contact-submit");
  assert.match(await text(page, "#contact-status"), /consent box/i);
  await context.close();
});

test("contact form saves a valid message", opts, async () => {
  const { context, page } = await open("/contact/");
  await page.fill("#c-name", "E2E Contact");
  await page.fill("#c-email", "contact.e2e@verda.in");
  await page.selectOption("#c-topic", "product");
  await page.fill("#c-message", "This is an automated contact form test, please ignore.");
  await page.check("#c-consent");
  await page.click("#contact-submit");

  await page.waitForFunction(
    () => /Message sent/i.test(document.getElementById("contact-status").textContent),
    { timeout: 20000 },
  );
  assert.equal(await page.inputValue("#c-name"), "");
  await context.close();
});

test("contact has no overflow at 360px", opts, async () => {
  const { context, page } = await open("/contact/", { width: 360, height: 800 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert.equal(overflow, false);
  await context.close();
});

test("contact has no console errors", opts, async () => {
  const { context, page, errors } = await open("/contact/");
  assert.deepEqual(errors, [], errors.join(" | "));
  await context.close();
});
