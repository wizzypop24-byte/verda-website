# E2E Test Report — Account / Checkout Footers

**Project:** Verda storefront
**Suite:** `tests/e2e-footers.test.mjs`
**Date:** 28 October 2026
**Result:** **14 passed · 0 failed · 0 skipped**
**Duration:** ~20 seconds
**Target:** local dev server (`http://localhost:5173`)

---

## 1. What was tested

The gap fixed earlier was that the Account and Checkout footers had no policy
links while every other page did. This suite locks the fix.

| Check | Rule |
|---|---|
| Link count | Exactly 5 policy links, no duplicates |
| Coverage | Shipping, Returns, Privacy, Terms, Disclaimer |
| Order | Same order on both pages |
| Labels | Every link has readable text (≥ 4 chars) |
| Resolution | Every href returns `< 400` |
| Navigation | Clicking opens the correct policy page |
| Mobile | 5 links visible at 360 px, no overflow |
| Console | No errors |
| Consistency | Account and Checkout expose the same set |

---

## 2. Results

### Account footer

| # | Test | Result |
|---|---|---|
| 1 | Links to all five policies | PASS |
| 2 | Order and labels correct | PASS |
| 3 | All five resolve | PASS |
| 4 | Click → Shipping policy | PASS |
| 5 | Usable at 360 px | PASS |
| 6 | No console errors | PASS |

### Checkout footer

| # | Test | Result |
|---|---|---|
| 7 | Links to all five policies | PASS |
| 8 | Order and labels correct | PASS |
| 9 | All five resolve | PASS |
| 10 | Click → Returns page | PASS |
| 11 | Usable at 360 px | PASS |
| 12 | No console errors | PASS |

### Consistency

| # | Test | Result |
|---|---|---|
| 13 | Same policy set on both pages | PASS |
| 14 | Real anchors, not JS handlers | PASS |

---

## 3. Defects found

**None.** All 14 passed on the first run.

---

## 4. How to run

```powershell
npm run test:footers

# against the deployed site
$env:E2E_BASE = "https://fir-479b9.web.app"; npm run test:footers
```

No auth required, no Firestore writes — safe to run repeatedly.

---

## 5. Not covered

| Gap | Reason |
|---|---|
| Legal accuracy of linked policies | CA/lawyer review |
| Footer links on other pages | Covered by the policies suite |
