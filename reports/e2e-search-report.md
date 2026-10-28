# E2E Test Report — Search Result Links

**Project:** Verda storefront
**Suite:** `tests/e2e-search.test.mjs`
**Date:** 28 October 2026
**Result:** **17 passed · 0 failed · 0 skipped**
**Duration:** ~38 seconds
**Target:** local dev server (`http://localhost:5173`)

---

## 1. What was tested

| Area | Coverage |
|---|---|
| Open / close | Button opens and focuses input, Escape closes |
| Input rules | Fewer than 2 characters shows a hint, no results |
| Matching | Name match, tag match, case-insensitive |
| Result links | Every href points to `/products/<slug>/` |
| Navigation | Clicking a result opens the product page and closes the modal |
| Zero results | "No products match" message |
| Scope | Bundles never appear |
| Cap | Never more than 6 results |
| Analytics | No event before consent; `search_submit` carries `query` + `results_count` after consent |
| Layout | Modal fits 360 px, no overflow |
| Console | No errors |

---

## 2. Results

| # | Test | Result |
|---|---|---|
| 1 | Button opens modal and focuses input | PASS |
| 2 | Escape closes the modal | PASS |
| 3 | Short query shows a hint | PASS |
| 4 | "sleep" finds Magnesium | PASS |
| 5 | Result href is `/products/magnesium/` | PASS |
| 6 | Matching is case-insensitive | PASS |
| 7 | Tag search "gut" finds Probiotic | PASS |
| 8 | "immunity" returns multiple valid links | PASS |
| 9 | No match shows the zero-result state | PASS |
| 10 | Bundles never appear | PASS |
| 11 | Results capped at six | PASS |
| 12 | Clicking a result navigates to the product page | PASS |
| 13 | Modal is closed after navigating back | PASS |
| 14 | No `search_submit` before consent | PASS |
| 15 | Consent unlocks `search_submit` with count | PASS |
| 16 | Modal fits 360 px without overflow | PASS |
| 17 | No console errors | PASS |

---

## 3. Regression coverage for the fix

The gap fixed earlier was that result links pointed to `#bestsellers`.
Tests **5, 7, 8 and 12** now lock the behaviour: every result href must match
`/products/<slug>/`, and a click must land on the product page.

If someone reverts that change, these tests fail.

---

## 4. Data created

Test 15 accepts cookies, which writes one `consent` document. Everything else is
read-only.

---

## 5. Defects found

**None.** All 17 passed on the first run.

---

## 6. How to run

```powershell
npm run test:search

# against the deployed site
$env:E2E_BASE = "https://fir-479b9.web.app"; npm run test:search
```

---

## 7. Not covered

| Gap | Reason |
|---|---|
| Full search results page | Only a modal exists |
| Fuzzy matching / spelling tolerance | Not implemented |
| Search analytics on the product page | Search lives on home only |
