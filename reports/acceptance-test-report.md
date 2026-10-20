# Test Report — Requirement 14: Acceptance Criteria

**Project:** Health Supplements Website — Home page
**Requirement under test:** Section 14 "Acceptance Criteria (QA checklist)"
**Test suite:** `tests/acceptance.test.mjs` (+ `lib/acceptance.mjs`)
**Date:** 2026-10-20
**Result:** **30 passed · 0 failed · 0 skipped**

---

## 1. What was tested

A checklist that cannot fail is not a gate. This suite turns the 12 items into **one pass/fail decision**:

| Layer | Question |
|---|---|
| **A. Document** | Are all 12 items present and consistent with Sections 7, 8 and 11? |
| **B. Gate** | Does each criterion fail exactly at its threshold? |
| **C. Release** | Can the gate approve, block, and explain why? |

`evaluateAcceptance()` returns `{ ok, passed[], failed[], summary }`, with each failure naming the criterion and the measured value.

---

## 2. Execution summary

| Group | Tests | Passed |
|---|---|---|
| A. Document | 11 | 11 |
| B. Gate | 15 | 15 |
| C. Release behaviour | 4 | 4 |
| **Total** | **30** | **30** |

---

## 3. Defects found and fixed

### DEF-34 — Acceptance skipped the 1024 px breakpoint (MEDIUM)

- **Test:** TC-ACPT-03
- **Symptom:** Section 7 defines five breakpoints (360/768/1024/1280/1440), but acceptance tested only four — **1024 px was never checked**, exactly where the 8→12 column switch happens.
- **Fix:** Acceptance now lists all five widths.

### DEF-35 — Only LCP was in the vitals check (MEDIUM)

- **Test:** TC-ACPT-05
- **Symptom:** Section 8 budgets LCP, INP and CLS; acceptance checked only LCP. A page could ship with CLS 0.4 (layout jumping) and still pass.
- **Fix:** The item now reads **LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms**.

### DEF-36 — LCP operator disagreed with Sections 1 and 8 (LOW)

- **Test:** TC-ACPT-16
- **Symptom:** Sections 1 and 8 use **≤ 2.5 s**, acceptance used **< 2.5 s**. A page measuring exactly 2.5 s passed the KPI and failed acceptance — two teams, two verdicts on the same page.
- **Fix:** Acceptance aligned to **≤ 2.5 s**, matching the KPI and the performance budget.

---

## 4. Test case detail

### A. Document

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-ACPT-01 | 12 checklist items | 12 | PASS |
| TC-ACPT-02 | All items are checkboxes | 12 | PASS |
| TC-ACPT-03 | Five breakpoints | 360…1440 | PASS (after DEF-34) |
| TC-ACPT-04 | Lighthouse thresholds | 85 / 95 / 95 / 95 | PASS |
| TC-ACPT-05 | LCP + CLS + INP | All three | PASS (after DEF-35/36) |
| TC-ACPT-06 | Footer disclaimer + FSSAI | Both | PASS |
| TC-ACPT-07 | Consent gate | Present | PASS |
| TC-ACPT-08 | Rich Results validation | Present | PASS |
| TC-ACPT-09 | Screen-reader labels + headings | Both | PASS |
| TC-ACPT-10 | CMS without developer | Present | PASS |
| TC-ACPT-11 | No 404s + sourced claims | Both | PASS |

### B. Gate

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-ACPT-12 | Full pass approved | 12/12 | PASS |
| TC-ACPT-13 | One section missing at 768 | Blocked | PASS |
| TC-ACPT-14 | Horizontal scroll | Blocked | PASS |
| TC-ACPT-15 | Lighthouse 85/95 boundaries | ±1 point | PASS |
| TC-ACPT-16 | LCP 2500 / 2501 | Boundary | PASS (after DEF-36) |
| TC-ACPT-17 | CLS 0.1 / 0.11 | Boundary | PASS |
| TC-ACPT-18 | INP 200 / 201 | Boundary | PASS |
| TC-ACPT-19 | Cart badge / keyboard drawer | Blocked | PASS |
| TC-ACPT-20 | Broken link named | Blocked | PASS |
| TC-ACPT-21 | Unsourced claim | Blocked | PASS |
| TC-ACPT-22 | Disclaimer / FSSAI missing | Blocked | PASS |
| TC-ACPT-23 | Analytics before consent | Blocked | PASS |
| TC-ACPT-24 | Invalid schema | Blocked | PASS |
| TC-ACPT-25 | Unlabeled buttons / heading order | Blocked | PASS |
| TC-ACPT-26 | 4 vs 5 CMS blocks | Boundary | PASS |

### C. Release behaviour

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-ACPT-27 | Empty results fail closed | ≥10 failures | PASS |
| TC-ACPT-28 | Multiple failures reported | All present | PASS |
| TC-ACPT-29 | Passed list + summary accurate | 11/12 | PASS |
| TC-ACPT-30 | Failures name criterion + measurement | Both | PASS |

---

## 5. How to re-run

```powershell
node --test tests/acceptance.test.mjs
npm test
```

---

## 6. Verdict

| Question | Answer |
|---|---|
| Is the checklist complete? | **Yes** — 12 verifiable items |
| Does it agree with Sections 7/8/11? | **Yes** — after DEF-34/35/36 |
| Can it block a release mechanically? | **Yes** — `evaluateAcceptance()` |
| Does it fail closed? | **Yes** — missing data = failure |
| Ready to use as the launch gate? | **Yes** |
