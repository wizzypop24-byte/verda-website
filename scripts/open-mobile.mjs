/**
 * Opens the live store in a Chromium window emulating an iPhone.
 * All 25 pages open as tabs; the window stays open until closed.
 *
 * Run: node scripts/open-mobile.mjs
 */
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
    throw new Error("playwright-core not found");
  }
}

const { chromium, devices } = loadPlaywright();

const URLS = [
  "https://fir-479b9.web.app/",
  "https://fir-479b9.web.app/auth/",
  "https://fir-479b9.web.app/account/",
  "https://fir-479b9.web.app/checkout/",
  "https://fir-479b9.web.app/order/?id=dqPRlkDzbpMKViuFKs53",
  "https://fir-479b9.web.app/admin/",
  "https://fir-479b9.web.app/products/magnesium/",
  "https://fir-479b9.web.app/products/probiotic/",
  "https://fir-479b9.web.app/products/d3k2/",
  "https://fir-479b9.web.app/products/biotin/",
  "https://fir-479b9.web.app/collections/sleep/",
  "https://fir-479b9.web.app/collections/immunity/",
  "https://fir-479b9.web.app/collections/gut/",
  "https://fir-479b9.web.app/collections/hair-skin/",
  "https://fir-479b9.web.app/collections/energy/",
  "https://fir-479b9.web.app/collections/joints/",
  "https://fir-479b9.web.app/collections/fitness/",
  "https://fir-479b9.web.app/policies/shipping/",
  "https://fir-479b9.web.app/policies/returns/",
  "https://fir-479b9.web.app/policies/privacy/",
  "https://fir-479b9.web.app/policies/terms/",
  "https://fir-479b9.web.app/policies/disclaimer/",
  "https://fir-479b9.web.app/about/",
  "https://fir-479b9.web.app/contact/",
  "https://fir-479b9.web.app/koi-galat-page",
];

const browser = await chromium.launch({
  headless: false,
  args: ["--window-size=430,940", "--window-position=80,40"],
});

const context = await browser.newContext({
  ...devices["iPhone 13"],
  viewport: { width: 390, height: 844 },
});

const first = await context.newPage();
await first.goto(URLS[0], { waitUntil: "domcontentloaded" });

for (const url of URLS.slice(1)) {
  const tab = await context.newPage();
  await tab.goto(url, { waitUntil: "domcontentloaded" }).catch(() => {});
}

await first.bringToFront();
console.log(`Mobile emulation open — ${URLS.length} tabs (iPhone 13, 390×844).`);
console.log("Close the window to stop.");

setInterval(() => {}, 60_000);
