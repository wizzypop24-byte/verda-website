# E2E Test Report — Policies, 404 and About

**Project:** Verda storefront
**Suite:** `tests/e2e-policies-about.test.mjs`
**Date:** 27 October 2026
**Result:** **31 passed · 0 failed · 0 skipped**
**Duration:** ~29 seconds
**Target:** local dev server (`http://localhost:5173`)

---

## 1. What was tested

### Policies (5 pages × 4 tests)

| Check | Rule |
|---|---|
| Heading | Matches the policy title |
| Last updated | 25 October 2026 |
| Sections | At least 5 per page |
| Canonical | Absolute URL for that policy |
| All-policies nav | Exactly 5 links, no duplicates |
| Placeholders | No "lorem ipsum" and no "TODO:" |
| Console | Zero errors |
| Mobile | No overflow at 360 px |

### Policy navigation

| Check | Result |
|---|---|
| Cross-links resolve | All 5 return `< 400` |
| Home footer | Links to all 5 policies |

### 404

| Check | Result |
|---|---|
| Status code | **404** |
| Custom copy | "This page took a rest day" |
| Requested path shown | Yes |
| Recovery links | `/`, `/#bestsellers`, `/account/` |
| Robots | `noindex,follow` |
| Console | Only the expected document 404 |
| Mobile | No overflow at 360 px |

### About

| Check | Result |
|---|---|
| H1 | "Supplements that show their work" |
| Four rules | 4 cards, clinically dosed + tested present |
| Verification checklist | 4 items, includes FSSAI |
| CTAs | Shop, concerns, contact |
| Mobile | No overflow at 360 px |
| Console | Zero errors |

---

## 2. Results summary

| Group | Tests | Passed |
|---|---|---|
| Policy pages (5 × 4) | 20 | 20 |
| Policy cross-links + footer | 2 | 2 |
| 404 page | 4 | 4 |
| About page | 5 | 5 |
| **Total** | **31** | **31** |

---

## 3. Defects found

**None.** All 31 passed on the first run.

---

## 4. How to run

```powershell
npm run test:legal

# against the deployed site
$env:E2E_BASE = "https://fir-479b9.web.app"; npm run test:legal
```

No auth required, no Firestore writes.

---

## 5. Cumulative E2E status

| Suite | Passed | Failed | Skipped |
|---|---|---|---|
| Smoke (25 pages) | 25 | 0 | 0 |
| Cart + Checkout | 22 | 0 | 0 |
| Auth + Account | 15 | 0 | 8 |
| Admin + Order detail | 13 | 0 | 8 |
| Contact + Home | 23 | 0 | 0 |
| Products + Collections | 39 | 0 | 0 |
| Policies + 404 + About | 31 | 0 | 0 |
| **Total** | **168** | **0** | **16** |

Skipped tests require a real Google session and are listed in their reports as a
manual checklist.

---

## 6. Not covered

| Gap | Reason |
|---|---|
| Legal accuracy of policy text | Needs a CA/lawyer review |
| Real importer name, address and FSSAI number | Placeholders |
| Translation (Hindi) | Not built |
