# Test Report — Requirement 4: Page Structure

**Project:** Health Supplements Website — Home page
**Requirement under test:** Section 4 "Page Structure" (HM-01 … HM-16)
**Test suite:** `tests/structure.test.mjs` (+ `lib/structure.mjs`)
**Date:** 2026-10-20
**Result:** **28 passed · 0 failed · 0 skipped**

---

## 1. What was tested

Page structure is the contract between design, content and engineering. The suite checks three things:

| Axis | Question |
|---|---|
| **Order** | Are the 16 sections in the documented render order? |
| **Specificity** | Can each section be built without guessing (counts, states, fields)? |
| **Consistency** | Do shared taxonomies (nav, concerns) stay in sync? |

`lib/structure.mjs` holds the component tree (`AnnouncementBar`, `SiteHeader`, `Hero` … `SiteFooter`) so the document and the future build share one source of truth.

---

## 2. Execution summary

| Group | Tests | Passed |
|---|---|---|
| A. Structure & order | 6 | 6 |
| B. Per-section content rules | 16 | 16 |
| C. Shared taxonomy | 2 | 2 |
| D. Validator (negative) | 4 | 4 |
| **Total** | **28** | **28** |

---

## 3. Defect found and fixed

### DEF-12 — Concern taxonomy was defined twice, with no link (MEDIUM)

- **Test:** TC-STRUCT-07
- **Symptom:** HM-02 listed 7 concerns for the mega-menu; HM-05 said "grid of 6–8 concern cards" but never said the two sets must match. A designer could ship 7 menu items and 8 cards, or different names in each — confusing navigation and broken filters.
- **Fix:** HM-05 now states it uses the **same taxonomy as HM-02** (single source of truth, 7 concerns). `CONCERNS` is exported once in the model.

---

## 4. Test case detail

### A. Structure & order

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-STRUCT-01 | Exactly 16 sections | 16 | PASS |
| TC-STRUCT-02 | IDs sequential HM-01…HM-16 | 16 unique | PASS |
| TC-STRUCT-03 | Model matches document (ids, names) | No drift | PASS |
| TC-STRUCT-04 | Render order follows the flow diagram | 13 numbered blocks in order, footer last | PASS |
| TC-STRUCT-05 | ≥2 concrete rules per section | All 16 | PASS |
| TC-STRUCT-06 | Component names unique | 16/16 | PASS |

### B. Per-section content rules

| ID | Section | Verified |
|---|---|---|
| TC-HM01 | Announcement bar | max 3 messages, 4 s, dismiss 7 days, 40/32 px, no CLS |
| TC-HM02 | Header / Nav | 6 nav items, 7 concerns, sticky, drawer, Esc, focus trap |
| TC-HM03 | Hero | H1, 2 CTAs, trust line, `fetchpriority`, `srcset`, no sound autoplay |
| TC-HM04 | Trust strip | 4–5 items, static, verifiable, "Made in India" prohibited |
| TC-HM05 | Concern grid | 6–8 cards, filtered collection, focus ring |
| TC-HM06 | Bestsellers | 4/1.2 layout, 7 card fields, toast, Notify me, revenue fallback |
| TC-HM07 | Why us | 3–4 props, clinically dosed, GMP, lab-report PDF link |
| TC-HM08 | Ingredients | dose, form, evidence link, label image, no h-scroll |
| TC-HM09 | Reviews | aggregate rating, 3 cards, verified, incentivized labelling |
| TC-HM10 | Quiz | 5 questions, email after results, 1–3 products |
| TC-HM11 | Bundles | 2–3 bundles, 10–15%, skip/cancel, per-day cost |
| TC-HM12 | Expert | qualification, bio, photo, click-to-play video |
| TC-HM13 | Blog | 3 posts, read time, CTA not pushed below fold |
| TC-HM14 | FAQ | 6–8 questions, first open, FAQPage parity, 5 topics |
| TC-HM15 | Newsletter | single field, consent, double opt-in, no pre-check, ₹100 |
| TC-HM16 | Footer | 4 columns, 5 policies, importer block, FSSAI, UPI, GST 5% |

### C. Shared taxonomy

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-STRUCT-07 | Mega-menu and grid share one taxonomy | 7 concerns, single source | PASS (after DEF-12) |
| TC-STRUCT-08 | All 10 core sections present | HM-03…HM-12 | PASS |

### D. Validator (negative cases)

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-STRUCT-09 | Duplicate section ids rejected | Error | PASS |
| TC-STRUCT-10 | Out-of-order section rejected | Error names the order | PASS |
| TC-STRUCT-11 | Section with no required elements rejected | Error | PASS |
| TC-STRUCT-12 | Model/document drift detected | Error | PASS |

---

## 5. How to re-run

```powershell
node --test tests/structure.test.mjs
npm test        # all suites + proof
```

---

## 6. Verdict

| Question | Answer |
|---|---|
| Is the section order unambiguous? | **Yes** — 16 ids, flow diagram matches |
| Can each section be built from the doc alone? | **Yes** — counts, states and fields are explicit |
| Are shared taxonomies consistent? | **Yes** — single concern list |
| Can broken structure be caught before build? | **Yes** — validator returns issues |
| Ready for design? | **Yes** |
