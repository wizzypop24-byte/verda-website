# E2E Test Report — Contact + Home

**Project:** Verda storefront
**Suite:** `tests/e2e-contact-home.test.mjs`
**Date:** 27 October 2026
**Result:** **23 passed · 0 failed · 0 skipped**
**Duration:** ~48 seconds
**Target:** local dev server (`http://localhost:5173`)

---

## 1. What was tested

### Home

| Area | Coverage |
|---|---|
| Hero | H1, both CTAs, trust line |
| Navigation | 7 concern cards, mega menu, mobile drawer |
| Consent | Analytics blocked before consent, unlocked on accept, stays off on reject |
| Quiz | 5 steps, recommendations, add-all to cart |
| Search | Match results and zero-result state |
| FAQ | Accordion + `faq_open` event |
| Newsletter | Invalid email, consent required, valid signup saved |
| Layout | 360 px overflow, console errors |

### Contact

| Area | Coverage |
|---|---|
| Render | H1, form, support email |
| Validation | Required fields, invalid email, short message |
| Consent | Required before sending |
| Submit | Firestore write + success state + form reset |
| Layout | 360 px overflow, console errors |

---

## 2. Results

| # | Test | Result |
|---|---|---|
| 1 | Hero, CTAs and trust line render | PASS |
| 2 | Seven concern cards link to collections | PASS |
| 3 | Mega menu opens with seven concerns | PASS |
| 4 | Mobile navigation drawer opens | PASS |
| 5 | Analytics empty before consent | PASS |
| 6 | Accept consent unlocks analytics | PASS |
| 7 | Reject consent keeps analytics off | PASS |
| 8 | Quiz runs five steps and recommends products | PASS |
| 9 | Quiz add-all puts products in cart | PASS |
| 10 | Search match + zero-result state | PASS |
| 11 | FAQ opens and emits `faq_open` | PASS |
| 12 | Newsletter rejects invalid email | PASS |
| 13 | Newsletter requires consent | PASS |
| 14 | Newsletter saves a valid signup | PASS |
| 15 | Home no overflow at 360 px | PASS |
| 16 | Home no console errors | PASS |
| 17 | Contact renders support details | PASS |
| 18 | Contact validates required fields | PASS |
| 19 | Contact rejects bad email and short message | PASS |
| 20 | Contact requires consent | PASS |
| 21 | Contact saves a valid message | PASS |
| 22 | Contact no overflow at 360 px | PASS |
| 23 | Contact no console errors | PASS |

---

## 3. Test data created

| Collection | Row | Note |
|---|---|---|
| `newsletter` | `home.e2e@verda.in` | Source `home` |
| `messages` | `contact.e2e@verda.in` | Topic `product` |
| `consent` | browser client id | From consent tests |
| `quiz_results` | one document | From quiz tests |

Clean these from **Firebase Console** after a run, or use a dedicated test
project for this suite.

---

## 4. Defect found and fixed (test-only)

**First run: 22 pass, 1 fail.**

- **Test:** "contact page renders support details".
- **Cause:** the assertion looked for "Send a message" inside `#contact-form`,
  but that heading lives outside the form (`#form-title`).
- **Fix:** assert against `#form-title`.

No product bug was found.

---

## 5. How to run

```powershell
npm run test:home

# against the deployed site
$env:E2E_BASE = "https://fir-479b9.web.app"; npm run test:home
```

---

## 6. Not covered

| Gap | Reason |
|---|---|
| Contact rate limiting / spam protection | Not implemented |
| Newsletter double opt-in email | Email provider not connected |
| Quiz result persistence visible to admin | Admin has no quiz tab |
| Analytics payload validation | Covered by requirement tests |
