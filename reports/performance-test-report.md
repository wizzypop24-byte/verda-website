# Test Report — Requirement 8: Performance Budgets

**Project:** Health Supplements Website — Home page
**Requirement under test:** Section 8 "Performance Budget"
**Test suite:** `tests/performance.test.mjs` (+ `lib/perf.mjs`)
**Date:** 2026-10-20
**Result:** **30 passed · 0 failed · 0 skipped**

---

## 1. What was tested

A budget only works if it fails loudly. This suite makes each threshold executable and tests it at the exact boundary.

| Layer | Question |
|---|---|
| **A. Document** | Is every budget numeric and reproducible? |
| **B. Boundaries** | Does the limit pass at the number and fail one unit over? |
| **C. Delivery** | Are lazy-loading, dimensions and critical CSS enforced? |

`lib/perf.mjs` exports `auditPerformance()`, `auditDelivery()` and `auditPage()`, each returning `{ ok, violations[] }` with a fix hint per violation.

---

## 2. Execution summary

| Group | Tests | Passed |
|---|---|---|
| A. Document | 10 | 10 |
| B. Budget boundaries | 14 | 14 |
| C. Delivery rules | 6 | 6 |
| **Total** | **30** | **30** |

---

## 3. Defects found and fixed

### DEF-20 — No TTFB budget and no CSS budget (HIGH)

- **Test:** TC-PERF-08, TC-PERF-09
- **Symptom:** LCP was capped at 2.5 s, but **TTFB had no budget** — a slow server would consume the entire LCP allowance invisibly. JavaScript was capped at 200 KB, but **CSS was uncapped**, so an unbounded stylesheet could ship.
- **Fix:** Added two rows: **TTFB ≤ 800 ms** and **Total CSS ≤ 50 KB gzipped**. `BUDGETS` now carries both.

### DEF-21 — "Mobile 4G" was not reproducible (MEDIUM)

- **Test:** TC-PERF-10
- **Symptom:** The LCP budget said "mobile, 4G" without a throttle profile. Two testers on different simulated networks would report different LCP for the same build, making the budget unenforceable.
- **Fix:** Documented the **Lighthouse mobile profile**: 1.6 Mbps down, 150 ms RTT, 4× CPU slowdown. `THROTTLE_PROFILE` is exported so CI can assert it.

### Test correction

TC-PERF-09 originally matched any occurrence of "CSS" — it passed on the phrase "critical CSS inlined" without a real budget row. The assertion now requires a numeric **Total CSS ≤ 50 KB** row, which is what exposed DEF-20.

---

## 4. Test case detail

### A. Document

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-PERF-01 | Core seven rows | All present | PASS |
| TC-PERF-02 | LCP / INP / CLS | 2500 ms / 200 ms / 0.1 | PASS |
| TC-PERF-03 | JS budget | 200 KB gzipped | PASS |
| TC-PERF-04 | Hero image | 180 KB, AVIF/WebP | PASS |
| TC-PERF-05 | Fonts | 2 families, 4 files, swap, self-hosted | PASS |
| TC-PERF-06 | Third-party | ≤ 6, deferred | PASS |
| TC-PERF-07 | Delivery rules | 4/4 | PASS |
| TC-PERF-08 | TTFB budget | ≤ 800 ms | PASS (after DEF-20) |
| TC-PERF-09 | CSS budget | ≤ 50 KB | PASS (after DEF-20) |
| TC-PERF-10 | 4G profile | 1.6 Mbps / 150 ms / 4× CPU | PASS (after DEF-21) |

### B. Budget boundaries

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-PERF-11 | Healthy page | 0 violations | PASS |
| TC-PERF-12 | LCP | 2500 pass, 2501 fail | PASS |
| TC-PERF-13 | INP | 200 pass, 201 fail | PASS |
| TC-PERF-14 | CLS | 0.1 pass, 0.11 fail | PASS |
| TC-PERF-15 | TTFB | 800 pass, 801 fail | PASS |
| TC-PERF-16 | JS | 200 KB pass, +1 byte fail | PASS |
| TC-PERF-17 | CSS | 50 KB pass, above fail | PASS |
| TC-PERF-18 | Hero image | 180 KB pass, above fail | PASS |
| TC-PERF-19 | 3rd font family | Fail | PASS |
| TC-PERF-20 | 5th font file | Fail | PASS |
| TC-PERF-21 | font-display / self-host | Both enforced | PASS |
| TC-PERF-22 | 6 vs 7 scripts | 6 pass, 7 fail | PASS |
| TC-PERF-23 | Blocking scripts | Fail under cap | PASS |
| TC-PERF-24 | Multiple breaches | All 3 reported | PASS |

### C. Delivery rules

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-PERF-25 | Compliant setup | 0 violations | PASS |
| TC-PERF-26 | Below-fold eager | Fail | PASS |
| TC-PERF-27 | Hero lazy | Fail | PASS |
| TC-PERF-28 | Missing dimensions | Fail | PASS |
| TC-PERF-29 | Critical CSS external | Fail | PASS |
| TC-PERF-30 | Combined audit | 2 issues reported | PASS |

---

## 5. How to re-run

```powershell
node --test tests/performance.test.mjs
npm test
```

---

## 6. Verdict

| Question | Answer |
|---|---|
| Is every budget numeric? | **Yes** — 9 metrics |
| Is the measurement reproducible? | **Yes** — fixed 4G profile |
| Can CI fail a bad build? | **Yes** — audit returns violations with hints |
| Are delivery rules enforced? | **Yes** — lazy, dimensions, critical CSS |
| Ready to gate deploys? | **Yes** — wire `auditPage()` into CI |
