# Smoke Test Report — 25 Pages

**Project:** Verda storefront
**Suite:** `tests/smoke.test.mjs`
**Date:** 27 October 2026
**Result:** **25 passed · 0 failed · 0 skipped**
**Duration:** ~78 seconds

---

## 1. What the smoke suite checks

For every page, in a real Chromium browser:

| Check | Rule |
|---|---|
| **HTTP status** | Expected code (200, or 404 for the not-found page) |
| **Console errors** | Zero (404 page's own resource error excluded) |
| **Failed requests** | Zero network failures |
| **Horizontal overflow** | None at **1280 px** |
| **Horizontal overflow** | None at **360 px** |
| **Title** | Non-empty |
| **H1** | At least one |
| **Broken images** | Zero (images with a `src`) |

---

## 2. Results

| # | Page | Status | Result |
|---|---|---|---|
| 1 | Home | 200 | PASS |
| 2 | Auth | 200 | PASS |
| 3 | Account (signed out) | 200 | PASS |
| 4 | Checkout (empty) | 200 | PASS |
| 5 | Order detail (signed out) | 200 | PASS |
| 6 | Admin (signed out) | 200 | PASS |
| 7 | Product — Magnesium | 200 | PASS |
| 8 | Product — Probiotic | 200 | PASS |
| 9 | Product — D3 + K2 | 200 | PASS |
| 10 | Product — Biotin | 200 | PASS |
| 11 | Collection — Sleep | 200 | PASS |
| 12 | Collection — Immunity | 200 | PASS |
| 13 | Collection — Gut | 200 | PASS |
| 14 | Collection — Hair & Skin | 200 | PASS |
| 15 | Collection — Energy (soon) | 200 | PASS |
| 16 | Collection — Joints (soon) | 200 | PASS |
| 17 | Collection — Fitness (soon) | 200 | PASS |
| 18 | Policy — Shipping | 200 | PASS |
| 19 | Policy — Returns | 200 | PASS |
| 20 | Policy — Privacy | 200 | PASS |
| 21 | Policy — Terms | 200 | PASS |
| 22 | Policy — Disclaimer | 200 | PASS |
| 23 | About | 200 | PASS |
| 24 | Contact | 200 | PASS |
| 25 | 404 page | 404 | PASS |

---

## 3. Defect found and fixed (test-only)

**First run: 23 pass, 2 fail** — Auth and Account reported one broken image each.

- **Cause:** the avatar `<img id="user-photo">` has no `src` while signed out, so `naturalWidth` is 0 even though nothing is broken.
- **Fix:** the test now ignores images without a `src` attribute.

This was a false positive in the test, not a site bug.

---

## 4. How to run

```powershell
npm run test:smoke

# against the local server
$env:SMOKE_BASE = "http://localhost:5173"; npm run test:smoke
```

The suite needs `playwright-core`. It resolves a global install automatically; if missing, tests are skipped rather than failing.

---

## 5. What this suite does **not** cover

| Not covered | Where it belongs |
|---|---|
| Signed-in account, admin and order views | Auth-gated E2E suite |
| Cart → checkout → order creation | Checkout E2E suite |
| Form validation and Firestore writes | Feature E2E tests |
| Visual regression | Screenshot comparison |
| Lighthouse / axe scores | Periodic audit |

Smoke proves the pages **render and load cleanly**. It does not prove the flows work.
