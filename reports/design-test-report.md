# Test Report — Requirement 7: Design & Responsive Rules

**Project:** Health Supplements Website — Home page
**Requirement under test:** Section 7 "Design & Responsive Rules"
**Test suite:** `tests/design.test.mjs` (+ `lib/design.mjs`)
**Date:** 2026-10-20
**Result:** **24 passed · 0 failed · 0 skipped**

---

## 1. What was tested

Design rules are easy to write and easy to ignore. This suite makes them executable:

| Layer | Question |
|---|---|
| **A. Document** | Are the eight rules present and numeric? |
| **B. Layout maths** | Do breakpoints, columns, gutters and container width behave at the edges? |
| **C. Accessibility** | Are tap targets, motion and WCAG contrast actually enforced? |
| **D. Images** | Is baked text blocked and alt text required? |

`lib/design.mjs` exports the grid model, `contrastRatio()` (WCAG maths), `validateTapTarget()`, `validateMotion()` and `validateImage()`.

---

## 2. Execution summary

| Group | Tests | Passed |
|---|---|---|
| A. Document | 10 | 10 |
| B. Layout maths | 4 | 4 |
| C. Accessibility | 7 | 7 |
| D. Image rules | 3 | 3 |
| **Total** | **24** | **24** |

---

## 3. Defects found and fixed

### DEF-18 — Contrast rule covered only body text (MEDIUM)

- **Test:** TC-DSGN-08
- **Symptom:** The document required 4.5:1 for body text but said nothing about large text or UI elements. WCAG 1.4.3 and 1.4.11 also require **3:1** for large text, borders, icons and focus rings. A 3.2:1 hero headline or an invisible focus ring would have passed review.
- **Fix:** Section 7 now states: body text ≥ 4.5:1; large text (≥24 px, or ≥19 px bold) and UI components / focus rings ≥ 3:1.

### DEF-19 — "No text in images" applied only to headings/CTAs (LOW)

- **Test:** TC-DSGN-10
- **Symptom:** Baked text in body images (ingredient labels, comparison graphics) could still ship, breaking SEO, translation and screen readers.
- **Fix:** Rule now applies to **every image**, with all text required to be real HTML.

### Test fixture correction

TC-DSGN-20 used `#767676` on white, which measures 4.54:1 — technically a body-text pass, so it could not demonstrate the 3:1 large-text threshold. Fixture changed to `#888888` (≈3.54:1).

---

## 4. Test case detail

### A. Document

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-DSGN-01 | Eight rules present | 8/8 | PASS |
| TC-DSGN-02 | Breakpoints | 360/768/1024/1280/1440 | PASS |
| TC-DSGN-03 | Grid columns | 12 / 8 / 4 | PASS |
| TC-DSGN-04 | Gutters | 24 / 16 / 16 | PASS |
| TC-DSGN-05 | Max width | 1280 px | PASS |
| TC-DSGN-06 | Type scale | 16 / 16–18 / clamp 32→56 | PASS |
| TC-DSGN-07 | Tap target | 44 × 44 | PASS |
| TC-DSGN-08 | Contrast | 4.5:1 + 3:1 | PASS (after DEF-18) |
| TC-DSGN-09 | Motion | 150–250 ms + reduced motion | PASS |
| TC-DSGN-10 | No text in images | Every image | PASS (after DEF-19) |

### B. Layout maths

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-DSGN-11 | Breakpoint boundaries | 767→mobile, 768→tablet, 1024→desktop | PASS |
| TC-DSGN-12 | Columns per device | 4 / 8 / 12 | PASS |
| TC-DSGN-13 | Container width | 1440→1280, 360→360 | PASS |
| TC-DSGN-14 | Invalid viewport | RangeError | PASS |

### C. Accessibility

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-DSGN-15 | Tap target | 44 pass, 43 fail | PASS |
| TC-DSGN-16 | Motion window | 150/250 pass, 149/251 fail | PASS |
| TC-DSGN-17 | Contrast extremes | black/white = 21, symmetric | PASS |
| TC-DSGN-18 | Brand ink + muted on white | Both ≥ 4.5:1 | PASS |
| TC-DSGN-19 | Light grey on white | Fails 4.5:1 | PASS |
| TC-DSGN-20 | Large-text threshold | 3:1 rule works | PASS |
| TC-DSGN-21 | Invalid hex | Throws | PASS |

### D. Image rules

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-DSGN-22 | Baked text rejected | Fails | PASS |
| TC-DSGN-23 | Content image needs alt | Fails without | PASS |
| TC-DSGN-24 | Decorative image needs empty alt | Both directions | PASS |

---

## 5. How to re-run

```powershell
node --test tests/design.test.mjs
npm test
```

---

## 6. Verdict

| Question | Answer |
|---|---|
| Are all design rules numeric? | **Yes** — 8 rules, no vague adjectives |
| Can layout be checked without a browser? | **Yes** — breakpoint/column maths |
| Is contrast verifiable? | **Yes** — WCAG ratio function + palette checks |
| Are image rules enforceable? | **Yes** — baked text and alt text |
| Ready for design handoff? | **Yes** |
