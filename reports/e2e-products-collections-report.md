# E2E Test Report — Products + Collections

**Project:** Verda storefront
**Suite:** `tests/e2e-products-collections.test.mjs`
**Date:** 27 October 2026
**Result:** **39 passed · 0 failed · 0 skipped**
**Duration:** ~48 seconds
**Target:** local dev server (`http://localhost:5173`)

---

## 1. What was tested

### Product pages (4)

| Area | Coverage |
|---|---|
| Content | Title, H1, price, MRP, discount %, document title |
| Structured data | `Product`, `Offer` (INR), `AggregateRating`, `BreadcrumbList`, `FAQPage` |
| Navigation | Breadcrumb → home and matching collection |
| Cart | Add to cart, badge, localStorage |
| Trust | Lab report feedback toast |
| Related | Exactly 3 products, none self-referencing |
| FAQ | 3 items, accordion opens |
| Mobile | No overflow at 360 px |
| Console | No errors |

### Collection pages (7)

| Area | Coverage |
|---|---|
| Render | H1 equals concern name |
| Live pages | Correct product count, `index,follow` |
| Coming soon | Empty state visible, `noindex,follow`, "Notify me" |
| Cards | Link to product pages, add to cart |
| Cross-links | 6 other concerns, no self-link |
| Mobile | No overflow at 360 px for all 7 |
| Console | No errors across all 7 |

---

## 2. Results

### Products — 4 tests each (16)

| Test | Passed |
|---|---|
| Renders title, price, discount | 4/4 |
| JSON-LD Product + Offer + rating | 4/4 |
| Breadcrumb links to collection | 4/4 |
| Add to cart | 4/4 |

### Products — shared (4)

| Test | Result |
|---|---|
| Lab report toast | PASS |
| Three related products | PASS |
| Three FAQ items open | PASS |
| No overflow at 360 px | PASS |
| No console errors | PASS |

### Collections — 2 tests each (14)

| Test | Passed |
|---|---|
| Heading + live/coming-soon state + robots | 7/7 |
| No overflow at 360 px | 7/7 |

### Collections — shared (5)

| Test | Result |
|---|---|
| Cards link to products + add to cart | PASS |
| Six other concerns, no self-link | PASS |
| Coming-soon CTA → newsletter | PASS |
| No console errors on all 7 | PASS |

> Total: **39 tests**.

---

## 3. Defect found and fixed (test-only)

**First run: 38 pass, 1 fail.**

- **Test:** "lab report link shows feedback".
- **Cause:** the link lives inside a collapsed `<details>`, so Playwright waited
  30 s for a non-visible element.
- **Fix:** open the "Lab reports" accordion first, then click the link.

No product bug was found.

---

## 4. How to run

```powershell
npm run test:catalog

# against the deployed site
$env:E2E_BASE = "https://fir-479b9.web.app"; npm run test:catalog
```

No auth required and no Firestore writes — this suite is safe to run repeatedly.

---

## 5. Not covered

| Gap | Reason |
|---|---|
| Product page reviews | Empty state by design |
| Lab report PDFs | Not published yet |
| Collection pagination | Only one product per concern |
| Product image quality | Demo images |
