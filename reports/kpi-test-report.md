# Test Report — Requirement 1: Goals & KPIs

**Project:** Health Supplements Website — Home page
**Requirement under test:** Section 1.1 Primary business goals (G1–G6)
**Test suite:** `tests/kpi.test.mjs` (Node.js built-in test runner)
**Date:** 2026-10-20
**Result:** **35 passed · 0 failed · 1 skipped** (live measurement skipped — no deployed page yet)

---

## 1. What was tested

Because the home page is not built yet, "running tests" here means two things:

1. **Specification tests** — are the KPI targets measurable, consistent, and backed by tracked events?
2. **Calculation tests** — does the KPI engine compute the right number when given traffic data?

Both are prerequisites for the targets to mean anything after launch.

---

## 2. Test execution summary

| Group | Tests | Passed | Failed |
|---|---|---|---|
| A. Specification (targets, events, consistency) | 8 | 8 | 0 |
| B. KPI calculation (G1–G5 formulas) | 11 | 11 | 0 |
| C. Thresholds, safety, simulation | 9 | 9 | 0 |
| D. Reporting, diagnostics, sessions | 7 | 7 | 0 |
| E. Live measurement (opt-in) | 1 | 0 | 0 (skipped) |
| **Total** | **36** | **35** | **0** |

---

## 3. Defects found and fixed

### DEF-01 — Conversion KPI had no tracking event (HIGH)

- **Test:** TC-SPEC-04
- **Symptom:** G2 required a `purchase` event, but Section 12 had none. G2 was unmeasurable.
- **Fix:** Added `purchase` with `order_id`, `value`, `currency`, `items`, `payment_method`.

### DEF-02 — LCP KPI had no tracking event (HIGH)

- **Test:** TC-SPEC-04
- **Symptom:** G5 had no `web_vitals` event.
- **Fix:** Added `web_vitals` with `metric`, `value`, `page`.

### DEF-03 — Quick-add polluted PDP CTR (HIGH — decision)

- **Test:** TC-G1-03, TC-G1-04
- **Symptom:** G1 counted any product click, so `quick_add` (direct add-to-cart from home) inflated CTR even though the shopper never saw a product page.
- **Fix:** G1 is now **destination-based** — a session counts only if it emits `page_view` with `page_type: "pdp"`. `quick_add` moved to a new diagnostic **G6** (8–12% band), which never gates launch.

### DEF-04 — Zero-traffic report could show false PASS (MEDIUM)

- **Test:** TC-SAFE-01, TC-G6-02
- **Symptom:** With no sessions, bounce rate computed to `0`, which satisfied `< 55%` and showed **PASS** on an empty dataset.
- **Fix:** All ratio KPIs now return `NOT MEASURED` when `sessions === 0`.

### DEF-05 — Float precision in target comparison (LOW, test-only)

- **Test:** TC-SPEC-03
- **Symptom:** `1.8 / 100` produced `0.018000000000000002`, breaking exact equality.
- **Fix:** 1e-9 tolerance.

---

## 4. KPI status (simulated 10,000-session traffic)

Simulation validates the measurement model only — it is **not** live performance.

| ID | KPI | Target | Simulated | Status |
|---|---|---|---|---|
| G1 | Home → Product Page CTR (PDP views) | ≥ 35.00% | 35.42% | **PASS** |
| G2 | Home page conversion rate | ≥ 1.80% | 2.05% | **PASS** |
| G3 | Email/WhatsApp signup rate | ≥ 4.00% | 4.88% | **PASS** |
| G4 | Bounce rate | < 55.00% | 45.02% | **PASS** |
| G5 | Mobile LCP (p75) | ≤ 2.50 s | 2.18 s | **PASS** |
| G6 | Quick-add rate (diagnostic) | 8–12% | 11.01% | **IN BAND** |

**Funnel:** 10,000 sessions → 3,542 PDP views → 205 orders → 488 signups → 4,502 bounced.
**Quick-add:** 1,101 sessions used direct add-to-cart (G6), excluded from G1 by design.

---

## 5. Test case detail

### A. Specification tests

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-SPEC-01 | All five goals exist in Section 1.1 | G1–G5 found | PASS |
| TC-SPEC-02 | Every KPI has a numeric target | 6 rows (5 goals + G6) | PASS |
| TC-SPEC-03 | Doc targets == engine targets | No drift | PASS |
| TC-SPEC-04 | Each KPI backed by a Section 12 event | All events documented | PASS |
| TC-SPEC-05 | Measurement window stated | "90 days" present | PASS |
| TC-SPEC-06 | Funnel sanity (CR < CTR, bounce < 100%) | No contradictions | PASS |
| TC-SPEC-07 | Validator rejects impossible targets | ≥4 issues raised | PASS |
| TC-SPEC-08 | Quick-add exclusion + G6 documented | Rules present | PASS |

### B. Calculation tests

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-G1-01 | CTR = sessions with a PDP page view ÷ sessions | 40% | PASS |
| TC-G1-02 | Repeated PDP views in one session count once | 50% | PASS |
| TC-G1-03 | Click alone doesn't count; collection page doesn't count | 25% | PASS |
| TC-G1-04 | Quick-add never inflates CTR (regression) | 33.3% vs 66.7% ATC | PASS |
| TC-G2-01 | Multiple purchases in one session count once | 50% | PASS |
| TC-G2-02 | Guest + COD orders included | 100% | PASS |
| TC-G3-01 | Email and WhatsApp signups both counted | 50% | PASS |
| TC-G4-01 | Bounce = 1 page view, <10 s, no engagement | 25% | PASS |
| TC-G4-02 | 75% scroll = engaged, 25% = not | 50% | PASS |
| TC-G5-01 | LCP p75 computed in seconds | 3.0 s | PASS |
| TC-G5-02 | CLS/INP samples ignored for LCP | 1.8 s | PASS |

### C. Threshold, safety, simulation

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-THR-01 | `>=` inclusive, `<` exclusive (55% bounce = miss) | G4 fails at exactly 55% | PASS |
| TC-THR-02 | Below-target traffic returns FAIL for all 5 | 5 × FAIL | PASS |
| TC-THR-03 | Healthy traffic meets every target | 0 failures | PASS |
| TC-SAFE-01 | Zero sessions → all KPIs NOT MEASURED | 5 × NOT MEASURED | PASS |
| TC-SAFE-02 | Bot/Googlebot traffic excluded | 1 human session | PASS |
| TC-SAFE-03 | Malformed LCP/scroll values don't corrupt math | LCP n/a | PASS |
| TC-SIM-01 | 10k simulated sessions reproduce known probabilities | within ±2% | PASS |
| TC-SIM-02 | Same seed → identical output | deep equal | PASS |
| TC-SIM-03 | Simulated LCP p75 within budget | PASS | PASS |

### D. Reporting, diagnostics, sessions

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-REPORT-01 | Funnel numbers ordered and additive | 400 PDP → 20 orders | PASS |
| TC-REPORT-02 | Values format as `40.00%` / `2.46 s` / `n/a` | PASS | PASS |
| TC-REPORT-03 | Quick-add order can exceed PDP visits safely | 1 order, 0 PDP | PASS |
| TC-G6-01 | Quick-add rate computed separately | 50% | PASS |
| TC-G6-02 | Diagnostic band classification | BELOW / IN / ABOVE | PASS |
| TC-G6-03 | G6 never enters the launch gate | Gate = G1–G5 only | PASS |
| TC-SESSION-01 | Interleaved events group into stable sessions | 2 sessions | PASS |

### E. Live measurement

| ID | Case | Result |
|---|---|---|
| TC-LIVE-01 | Fetch deployed home page, assert 200 + `<h1|main>` | **SKIPPED** (`HOME_URL` not set) |

---

## 6. How to re-run

```powershell
# Full suite
node --test tests/kpi.test.mjs

# KPI status table (goals + diagnostics) from simulated traffic
node scripts/kpi-report.mjs

# Live check once the site is deployed
$env:HOME_URL = "https://your-domain.com"
node --test tests/kpi.test.mjs
```

---

## 7. Verdict

| Question | Answer |
|---|---|
| Are the KPI targets measurable? | **Yes** — `purchase`, `web_vitals`, and `page_view.page_type` are now defined. |
| Is the KPI math correct? | **Yes** — 20 calculation/safety tests pass. |
| Are the targets internally consistent? | **Yes** — CR < CTR, bounce < 100%. |
| Is G1 protected from quick-add inflation? | **Yes** — destination-based, with regression test TC-G1-04. |
| Can launch be considered successful? | **Only after live data** — run TC-LIVE-01 plus 2 weeks of real traffic. |

**Decision recorded:** `quick_add` is **not** a PDP visit. G1 counts PDP page views only; G6 tracks direct add-to-cart separately as a diagnostic.
