# Test Report — Requirement 6: Content Requirements

**Project:** Health Supplements Website — Home page
**Requirement under test:** Section 6 "Content Requirements"
**Test suite:** `tests/content.test.mjs` (+ `lib/content.mjs`)
**Date:** 2026-10-20
**Result:** **30 passed · 0 failed · 0 skipped**

---

## 1. What was tested

Content requirements protect layout and readability. Three layers:

| Layer | Question |
|---|---|
| **A. Document** | Does every copy block have an owner and a numeric limit? |
| **B. Validators** | Do the limits execute correctly at the boundaries? |
| **C. Assets** | Is the pre-build asset checklist complete and usable? |

`lib/content.mjs` exposes `checkHero`, `checkTrustItems`, `checkConcernCard`, `checkProductCard`, `checkReview`, `checkFaqAnswer` and an asset plan (`ASSETS`) with sizes and formats.

---

## 2. Execution summary

| Group | Tests | Passed |
|---|---|---|
| A. Document | 14 | 14 |
| B. Validators & boundaries | 12 | 12 |
| C. Asset plan | 4 | 4 |
| **Total** | **30** | **30** |

---

## 3. Defects found and fixed

### DEF-16 — Four copy blocks had no length limit (MEDIUM)

- **Test:** TC-CONT-10
- **Symptom:** Announcement bar, blog titles, bundle names and quiz copy had no word/character cap. An over-long announcement would break the 40 px bar; a long bundle name would break the HM-11 card.
- **Fix:** Added four rows to the content table:
  - Announcement bar — ≤ 8 words per message
  - Blog teaser titles — ≤ 60 chars
  - Bundle names — ≤ 40 chars
  - Quiz copy — question ≤ 12 words, option ≤ 4 words

### DEF-17 — Asset plan contradicted the four-SKU launch (LOW)

- **Test:** TC-CONT-13
- **Symptom:** "8–12 product photos (white bg + lifestyle)" did not say how many angles per SKU, and with only 4 launch SKUs the number was unverifiable. No format or alt-text requirement either.
- **Fix:** Assets now state **2–3 angles each for the 4 launch SKUs**, **AVIF/WebP**, and **descriptive alt text**.

### Test corrections (not product defects)

- TC-CONT-19 treated five trust items as invalid; the document allows **4–5**, so five must pass.
- TC-CONT-20 asserted a word-limit failure while the fixture also had too few items; the fixture now holds four valid items so the word limit is tested in isolation.

---

## 4. Test case detail

### A. Document

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-CONT-01 | Six original blocks in order | Hero → FAQ | PASS |
| TC-CONT-02 | Owner assigned | 10/10 rows | PASS |
| TC-CONT-03 | Numeric limit | 10/10 rows | PASS |
| TC-CONT-04 | Hero limits | H1 12 / sub 20 | PASS |
| TC-CONT-05 | Trust strip | ≤ 4 words | PASS |
| TC-CONT-06 | Concern cards | ≤ 10 words | PASS |
| TC-CONT-07 | Product names | ≤ 60 chars | PASS |
| TC-CONT-08 | Reviews | 2–3 lines | PASS |
| TC-CONT-09 | FAQ answers | 60–120 words | PASS |
| TC-CONT-10 | All copy blocks covered | 10/10 | PASS (after DEF-16) |
| TC-CONT-11 | Asset groups listed | 8 groups | PASS |
| TC-CONT-12 | Image dimensions | 2400×1200 / 1080×1350 / 1200×630 | PASS |
| TC-CONT-13 | Photo volume vs 4 SKUs | 8–12, 2–3 angles | PASS (after DEF-17) |
| TC-CONT-14 | Format + alt text | AVIF/WebP + alt | PASS |

### B. Validators & boundaries

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-CONT-15 | Word counting | ₹999=1, ampersand counted, em dash split | PASS |
| TC-CONT-16 | H1 12 pass / 13 fail | Boundary | PASS |
| TC-CONT-17 | Sub 20 pass / 21 fail | Boundary | PASS |
| TC-CONT-18 | Empty hero | 2 issues | PASS |
| TC-CONT-19 | Trust 4–5 items | 3 and 6 fail | PASS |
| TC-CONT-20 | Trust item 4 vs 5 words | Boundary | PASS |
| TC-CONT-21 | Concern 10 vs 11 | Boundary | PASS |
| TC-CONT-22 | Product name 60 vs 61 | Boundary | PASS |
| TC-CONT-23 | Ingredient line 8 vs 9 | Boundary | PASS |
| TC-CONT-24 | Review 1 / 4 lines | Both fail | PASS |
| TC-CONT-25 | FAQ 59 / 60 / 120 / 121 | Edges correct | PASS |
| TC-CONT-26 | Empty content rejected | Fails | PASS |

### C. Asset plan

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-CONT-27 | Nine asset groups valid | 9 | PASS |
| TC-CONT-28 | Photos cover 4 SKUs × 2 angles | ≥ 8 | PASS |
| TC-CONT-29 | Every asset has format + size | 9/9 | PASS |
| TC-CONT-30 | Incomplete plan rejected | 3 issue types | PASS |

---

## 5. How to re-run

```powershell
node --test tests/content.test.mjs
npm test
```

---

## 6. Verdict

| Question | Answer |
|---|---|
| Does every copy block have a limit? | **Yes** — 10 blocks |
| Can writers self-check? | **Yes** — validators return actionable issues |
| Are boundaries unambiguous? | **Yes** — 12/13, 20/21, 60/61 all tested |
| Is the asset list build-ready? | **Yes** — sizes, formats, angles, alt text |
| Ready for content production? | **Yes** |
