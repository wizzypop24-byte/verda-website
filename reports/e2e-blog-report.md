# E2E Test Report — Blog

**Project:** Verda storefront
**Suite:** `tests/e2e-blog.test.mjs`
**Date:** 28 October 2026
**Result:** **27 passed · 0 failed · 0 skipped**
**Duration:** ~24 seconds
**Target:** local dev server (`http://localhost:5173`)

---

## 1. What was tested

| Area | Coverage |
|---|---|
| Blog index | 3 cards, hrefs, images, tags, read time, `Blog` JSON-LD |
| Articles (×3) | H1, date, read time, 6 sections, breadcrumb, canonical |
| Structured data | `BlogPosting` + `BreadcrumbList` with headline, date and image |
| Media | Hero image loads, 2 related posts, no self-link |
| Links | Home cards, footer links, related links all resolve |
| Sitemap | Blog index + 3 article URLs |
| Mobile | No overflow at 360 px |
| Console | No errors |

---

## 2. Results

### Index (5)

| # | Test | Result |
|---|---|---|
| 1 | Lists three articles with correct hrefs | PASS |
| 2 | Images load, tags and read time render | PASS |
| 3 | `Blog` JSON-LD with three posts | PASS |
| 4 | No overflow at 360 px | PASS |
| 5 | No console errors | PASS |

### Articles (3 × 6 = 18)

| Test | Passed |
|---|---|
| Heading, date, read time, 6 sections | 3/3 |
| Breadcrumb and canonical | 3/3 |
| `BlogPosting` JSON-LD complete | 3/3 |
| Hero image + 2 related posts | 3/3 |
| No overflow at 360 px | 3/3 |
| No console errors | 3/3 |

### Links (4)

| # | Test | Result |
|---|---|---|
| 1 | Home blog cards link to all three articles | PASS |
| 2 | Footer links from an article resolve | PASS |
| 3 | Related post links resolve | PASS |
| 4 | Sitemap includes blog index and articles | PASS |

> Total: **27 tests**.

---

## 3. Defect found and fixed (test-only)

**First run: 24 pass, 3 fail.**

- **Test:** "renders heading, meta and seven sections".
- **Cause:** each article has **6 content sections**; the seventh `<section>` on the page is "Read next", which sits outside the `<article>`.
- **Fix:** assert 6 sections inside `.article`.

No product bug was found.

---

## 4. How to run

```powershell
npm run test:blog

# against the deployed site
$env:E2E_BASE = "https://fir-479b9.web.app"; npm run test:blog
```

No auth and no Firestore writes.

---

## 5. Cumulative E2E status

| Suite | Passed | Failed | Skipped |
|---|---|---|---|
| Smoke (25 pages) | 25 | 0 | 0 |
| Cart + Checkout | 22 | 0 | 0 |
| Auth + Account | 15 | 0 | 8 |
| Admin + Order | 13 | 0 | 8 |
| Contact + Home | 23 | 0 | 0 |
| Products + Collections | 39 | 0 | 0 |
| Policies + 404 + About | 31 | 0 | 0 |
| Search | 17 | 0 | 0 |
| Account/Checkout footers | 14 | 0 | 0 |
| Blog | 27 | 0 | 0 |
| **Total** | **226** | **0** | **16** |

Requirement-level suites remain at **469 passed, 0 failed, 2 skipped**.

---

## 6. Not covered

| Gap | Reason |
|---|---|
| Blog CMS / authoring workflow | Content is generated from JSON |
| Comments | Not implemented |
| RSS feed | Not implemented |
| Real article images | Demo images |
