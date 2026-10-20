# Test Report — Requirement 10: Accessibility (WCAG 2.2 AA)

**Project:** Health Supplements Website — Home page
**Requirement under test:** Section 10 "Accessibility (WCAG 2.2 AA)"
**Test suite:** `tests/a11y.test.mjs` (+ `lib/a11y.mjs`)
**Date:** 2026-10-20
**Result:** **34 passed · 0 failed · 0 skipped**

---

## 1. What was tested

| Layer | Question |
|---|---|
| **A. Document** | Are the WCAG 2.2 AA commitments stated? |
| **B. Components** | Do focus, names, skip link, carousel, forms, video and landmarks behave correctly? |
| **C. Aggregate** | Does a full page pass — and does a broken page report everything? |

`lib/a11y.mjs` provides one validator per failure mode, plus `auditPage()` which aggregates them and separates blocking **errors** from advisory **warnings**.

---

## 2. Execution summary

| Group | Tests | Passed |
|---|---|---|
| A. Document | 10 | 10 |
| B. Components | 20 | 20 |
| C. Aggregate | 4 | 4 |
| **Total** | **34** | **34** |

---

## 3. Defects found and fixed

### DEF-25 — Page language and title were not required (HIGH)

- **Test:** TC-A11Y-09
- **Symptom:** Section 10 covered keyboard, ARIA, carousel, forms and video, but not **WCAG 3.1.1 Language of Page** or **2.4.2 Page Titled** — two of the most common audit failures. A screen reader would pronounce English content with the wrong voice.
- **Fix:** Added `<html lang="en-IN">` and a unique descriptive `<title>` requirement.

### DEF-26 — Sticky header could hide keyboard focus (MEDIUM)

- **Test:** TC-A11Y-10
- **Symptom:** The header is sticky (HM-02) and there was no **scroll-padding**. Tab focus can land under the fixed bar — a **WCAG 2.2 · 2.4.11 Focus Not Obscured** failure that is new in 2.2 and easy to miss in visual QA.
- **Fix:** Added `scroll-padding-top` ≥ header height requirement.

### Test correction

TC-A11Y-01 searched for "WCAG 2.2 AA" inside the section body, but the phrase lives in the **heading**, which the parser strips. The assertion now checks the document heading directly.

---

## 4. Test case detail

### A. Document

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-A11Y-01 | WCAG 2.2 AA declared | Heading | PASS (test fix) |
| TC-A11Y-02 | Keyboard + focus indicator | Both | PASS |
| TC-A11Y-03 | Skip link | Required | PASS |
| TC-A11Y-04 | ARIA labels on icon buttons | Required | PASS |
| TC-A11Y-05 | Carousel rules | Pause, arrows, ≤5 s | PASS |
| TC-A11Y-06 | Form errors announced | aria-live | PASS |
| TC-A11Y-07 | Video + flash limit | Captions, transcript, 3 Hz | PASS |
| TC-A11Y-08 | Screen-reader testing | VoiceOver / TalkBack / NVDA | PASS |
| TC-A11Y-09 | Page language | `<html lang>` | PASS (after DEF-25) |
| TC-A11Y-10 | Focus not obscured | scroll-padding | PASS (after DEF-26) |

### B. Components

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-A11Y-11 | Accessible name sources | text / label / labelledby | PASS |
| TC-A11Y-12 | Unnamed icon button | Fails | PASS |
| TC-A11Y-13 | Labelled icon button | Passes | PASS |
| TC-A11Y-14 | Positive tabindex | Fails | PASS |
| TC-A11Y-15 | No focus indicator | Fails | PASS |
| TC-A11Y-16 | Skip link target + order + visibility | 3 issues when broken | PASS |
| TC-A11Y-17 | Skip link hidden on focus | Fails | PASS |
| TC-A11Y-18 | Carousel 5000 vs 5001 ms | Boundary | PASS |
| TC-A11Y-19 | Auto-advance without pause | Fails | PASS |
| TC-A11Y-20 | Static carousel | No pause needed | PASS |
| TC-A11Y-21 | No keyboard controls | Fails | PASS |
| TC-A11Y-22 | Form error wiring | live + describedby | PASS |
| TC-A11Y-23 | Missing fix suggestion | Warning only | PASS |
| TC-A11Y-24 | Captions + transcript | Both required | PASS |
| TC-A11Y-25 | Flashing | 3 pass, 4 fail | PASS |
| TC-A11Y-26 | Autoplay with sound | Rejected | PASS |
| TC-A11Y-27 | Four landmarks | 3 missing reported | PASS |
| TC-A11Y-28 | lang + title validation | Invalid lang fails | PASS |
| TC-A11Y-29 | Sticky header + scroll padding | Boundary | PASS |
| TC-A11Y-30 | Duplicate ids | Detected | PASS |

### C. Aggregate

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-A11Y-31 | Compliant page | 0 errors | PASS |
| TC-A11Y-32 | Broken page | ≥12 issues across categories | PASS |
| TC-A11Y-33 | Warnings only | Does not block | PASS |
| TC-A11Y-34 | Empty audit | Valid | PASS |

---

## 5. How to re-run

```powershell
node --test tests/a11y.test.mjs
npm test
```

---

## 6. Verdict

| Question | Answer |
|---|---|
| Are the core WCAG 2.2 AA rules covered? | **Yes** — 10 documented, 24 executable |
| Can a11y regressions be caught pre-browser? | **Yes** — component validators |
| Are new 2.2 criteria handled? | **Yes** — focus not obscured |
| Do warnings block a release? | **No** — errors do |
| Ready for an axe/manual audit? | **Yes** — this is the pre-check layer |
