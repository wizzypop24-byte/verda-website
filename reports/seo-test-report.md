# Test Report — Requirement 9: SEO Requirements

**Project:** Health Supplements Website — Home page
**Requirement under test:** Section 9 "SEO Requirements"
**Test suite:** `tests/seo.test.mjs` (+ `lib/seo.mjs`)
**Date:** 2026-10-20
**Result:** **32 passed · 0 failed · 0 skipped**

---

## 1. What was tested

Everything here is checkable before deploy — no crawler required.

| Layer | Question |
|---|---|
| **A. Document** | Are all seven SEO rule groups stated in a checkable way? |
| **B. On-page** | Title, description, headings, OG/Twitter, canonical |
| **C. Structured data** | Required blocks, Product fields, FAQ parity |
| **D. Crawl** | robots.txt, sitemap, indexation, alt text |

`lib/seo.mjs` exposes validators for each rule, so a build can fail on a 61-character title instead of discovering it in Search Console three weeks later.

---

## 2. Execution summary

| Group | Tests | Passed |
|---|---|---|
| A. Document | 9 | 9 |
| B. On-page | 10 | 10 |
| C. Structured data | 6 | 6 |
| D. Crawl | 7 | 7 |
| **Total** | **32** | **32** |

---

## 3. Defects found and fixed

### DEF-22 — Canonical URL rules were incomplete (MEDIUM)

- **Test:** TC-SEO-03
- **Symptom:** The document said "canonical URL" without saying it must be **absolute**, **self-referencing**, or **free of tracking parameters**. A relative canonical or one carrying `?utm_source=` splits ranking signals.
- **Fix:** Section 9 now states: absolute https, self-referencing, no query/tracking parameters.

### DEF-23 — Product schema fields were undefined (HIGH)

- **Test:** TC-SEO-05
- **Symptom:** "`Product` + `AggregateRating` on cards where valid" gave no required fields. A `Product` block without `price` or `availability` is invalid for Google rich results and earns no stars.
- **Fix:** `Product` must include **name, image, price, availability, url**; rating only with real reviews.

### DEF-24 — Structured-data format was unspecified (LOW)

- **Test:** TC-SEO-06
- **Symptom:** The document never said JSON-LD. Microdata or inline RDFa would technically satisfy "structured data" but is harder to validate and maintain.
- **Fix:** All structured data is now explicitly **JSON-LD in `<head>`**.

### Test correction

TC-SEO-27 used a case-sensitive `/Sitemap/` match against the message "…must reference an absolute sitemap URL." — test bug, not a document bug. Now case-insensitive.

---

## 4. Test case detail

### A. Document

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-SEO-01 | Seven rule groups | 7/7 | PASS |
| TC-SEO-02 | Title / description / canonical limits | 60 / 155 / present | PASS |
| TC-SEO-03 | Canonical complete | absolute + self + no params | PASS (after DEF-22) |
| TC-SEO-04 | Five schema types | All listed | PASS |
| TC-SEO-05 | Product fields | 5 fields | PASS (after DEF-23) |
| TC-SEO-06 | JSON-LD | Explicit | PASS (after DEF-24) |
| TC-SEO-07 | robots + sitemap | Stated | PASS |
| TC-SEO-08 | Non-indexable patterns | cart/search/filter | PASS |
| TC-SEO-09 | Alt-text policy | Content vs decorative | PASS |

### B. On-page

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-SEO-10 | Title 60 vs 61 | Boundary | PASS |
| TC-SEO-11 | Empty title | Rejected | PASS |
| TC-SEO-12 | Description 155 vs 156 | Boundary | PASS |
| TC-SEO-13 | One H1, clean hierarchy | Pass | PASS |
| TC-SEO-14 | 0 or 2 H1 | Fail | PASS |
| TC-SEO-15 | H1 → H3 jump | Fail | PASS |
| TC-SEO-16 | Complete OG | Pass | PASS |
| TC-SEO-17 | Missing / relative OG image | Fail | PASS |
| TC-SEO-18 | Twitter card type | summary_large_image | PASS |
| TC-SEO-19 | Canonical absolute/clean/self | 4 cases | PASS |

### C. Structured data

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-SEO-20 | All blocks complete | Pass | PASS |
| TC-SEO-21 | Missing FAQPage | Reported | PASS |
| TC-SEO-22 | Incomplete Product | Reports missing image | PASS |
| TC-SEO-23 | Non-JSON-LD | Rejected | PASS |
| TC-SEO-24 | FAQ parity match | Pass | PASS |
| TC-SEO-25 | FAQ count/content mismatch | Fail | PASS |

### D. Crawl

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-SEO-26 | Correct robots.txt | Pass | PASS |
| TC-SEO-27 | Missing blocks + sitemap | 4 issues | PASS |
| TC-SEO-28 | Sitemap home + absolute | Boundary | PASS |
| TC-SEO-29 | cart/checkout/search | Not indexable | PASS |
| TC-SEO-30 | Filtered vs clean collection | filter blocked, clean allowed | PASS |
| TC-SEO-31 | Home + product | Indexable | PASS |
| TC-SEO-32 | Alt-text policy | Both directions | PASS |

---

## 5. How to re-run

```powershell
node --test tests/seo.test.mjs
npm test
```

---

## 6. Verdict

| Question | Answer |
|---|---|
| Are SEO limits enforceable pre-deploy? | **Yes** — 32 validators |
| Can rich results fail silently? | **No** — Product fields enforced |
| Is the crawl policy explicit? | **Yes** — robots + sitemap + index rules |
| Is structured data consistent with visible content? | **Yes** — FAQ parity check |
| Ready for launch checklist? | **Yes** |
