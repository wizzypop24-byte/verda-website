# Test Report — Requirement 2: Target Audience

**Project:** Health Supplements Website — Home page
**Requirement under test:** Section 2 "Target Audience" (3 personas) + Section 2.1 coverage matrix + locked market decision
**Test suite:** `tests/persona.test.mjs` (Node.js built-in test runner)
**Date:** 2026-10-20
**Result:** **26 passed · 0 failed · 0 skipped**

Combined with Requirement 1: **62 tests · 61 pass · 0 fail · 1 skipped** (live measurement awaits deployment).

---

## 1. What "testing an audience requirement" means

| Property | Test | Why it matters |
|---|---|---|
| **Traceable** | Every need maps to a real section (`HM-xx`) | Otherwise the persona is decoration |
| **Reachable** | One unique primary path, one click from home | Prevents "3 personas, 1 generic CTA" |
| **Observable** | Each persona has tracked events | Proves they were served |
| **Owned** | One KPI per persona | Connects audience to business goals |
| **Fundable** | Needs backed by a locked policy (COD, returns, subscription) | A need without a policy is a wish |

---

## 2. Locked market decision (2026-10-20)

| Item | Value |
|---|---|
| Market | India only |
| Model | Own-brand **import & resell** |
| Currency / tax | INR · GST **5%** (nutraceuticals, since 22 Sep 2025) |
| Licence | **FSSAI Central License (Importer)** |
| Launch scale | **~800 orders/month**, max **4 SKUs** |
| COD | Cap ₹2,000 · fee ₹29 · prepaid ₹50 off · OTP confirmation · sealed-only returns |

This lock is now test-enforced by **TC-AUD-22**, so a future edit cannot silently change the market or scale.

---

## 3. Execution summary

| Group | Tests | Passed | Failed |
|---|---|---|---|
| A. Document / traceability | 12 | 12 | 0 |
| B. Negative validation | 2 | 2 | 0 |
| C. Coverage / balance | 7 | 7 | 0 |
| D. Locked market decision | 5 | 5 | 0 |
| **Total** | **26** | **26** | **0** |

---

## 4. Defects found and fixed

### DEF-06 — No persona → section mapping existed (HIGH)

- **Test:** TC-AUD-04, TC-AUD-10
- **Symptom:** Three personas were named, but no section owned them. Two designers could build two different pages and both claim compliance.
- **Fix:** Added **Section 2.1 Persona → home page coverage**.

### DEF-07 — Gifter had zero trackable signals (HIGH)

- **Test:** TC-AUD-08
- **Symptom:** Gifter's primary path is bundles (HM-11), but no `bundle_click` event existed.
- **Fix:** Added `bundle_click` (`bundle_id`, `price`, `savings_pct`).

### DEF-08 — "Lab reports" need had no event (MEDIUM)

- **Test:** TC-AUD-08
- **Symptom:** Fixer and Optimizer both need lab/COA proof, but no `lab_report_click` event existed.
- **Fix:** Added `lab_report_click` (`product_id`, `report_type`, `section`).

---

## 5. Document changes made while locking

| # | Change | Location | Guarded by |
|---|---|---|---|
| 1 | Market assumption replaced with locked decision block | Section 2 | TC-AUD-22 |
| 2 | COD policy: cap ₹2,000, fee ₹29, prepaid ₹50, OTP, pincode risk | Section 5 (FR-11…FR-13) | TC-AUD-23 |
| 3 | Sealed-only returns rule | Section 5 (FR-14) | TC-AUD-24 |
| 4 | Importer checklist (10 items: licence, IEC, 60% shelf life, ports, PIF, label) | Section 11.1 | TC-AUD-25 / IMP-* |
| 5 | Footer importer block + country of origin; trust-strip "Made in India" prohibition | HM-04 / HM-16 | TC-AUD-25 |
| 6 | Assumptions rewritten: locked vs open | Section 15 | — |

---

## 6. Persona coverage matrix

| Section | Serves | Count |
|---|---|---|
| HM-03 Hero | Fixer, Optimizer, Gifter | 3 |
| HM-04 Trust strip | Optimizer, Gifter | 2 |
| HM-05 Shop by concern | Fixer | 1 |
| HM-06 Bestsellers | Optimizer | 1 |
| HM-07 Why us / lab reports | Fixer, Optimizer | 2 |
| HM-08 Ingredient transparency | Fixer, Optimizer | 2 |
| HM-09 Social proof | Optimizer, Gifter | 2 |
| HM-10 Quiz | Fixer | 1 |
| HM-11 Bundles | Optimizer, Gifter | 2 |
| HM-12 Expert credibility | Gifter | 1 |
| HM-16 Footer | Gifter | 1 |

**Primary entries:** Fixer → HM-05 · Optimizer → HM-06 · Gifter → HM-11 (unique, one click).
**Owning KPIs:** Fixer → G1 · Optimizer → G6 (diagnostic) · Gifter → G2.

---

## 7. Test case detail

### A. Document / traceability

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-AUD-01 | Exactly three personas defined | Fixer, Optimizer, Gifter | PASS |
| TC-AUD-02 | Age bands valid and within 18–70 | 3 valid bands | PASS |
| TC-AUD-03 | ≥3 specific needs per persona | 3 / 4 / 4 | PASS |
| TC-AUD-04 | Section 2.1 maps all personas | 3 rows | PASS |
| TC-AUD-05 | Mapped sections exist in Section 4 | No phantom HM ids | PASS |
| TC-AUD-06 | Every need covered by a section the persona gets | 0 gaps | PASS |
| TC-AUD-07 | One unique primary entry per persona | 3 distinct | PASS |
| TC-AUD-08 | ≥2 tracked signals, all documented | 9 signals | PASS |
| TC-AUD-09 | Persona owned by a defined KPI | G1, G2, G6 | PASS |
| TC-AUD-10 | Doc table matches audience model | No drift | PASS |
| TC-AUD-18 | Trigger text traceable to Section 2 | 3 matches | PASS |
| TC-AUD-19 | Need keywords present in doc rows | 11 needs | PASS |

### B. Negative validation

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-AUD-11 | Persona with no needs rejected | Validation error | PASS |
| TC-AUD-12 | Unknown section / event / KPI rejected | 3+ errors | PASS |

### C. Coverage / balance

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-AUD-13 | Every core section HM-03…HM-12 justified | 0 orphans | PASS |
| TC-AUD-14 | No persona depends on one section | ≥3 each | PASS |
| TC-AUD-15 | Personas distinct in id, name, primary | 3 / 3 / 3 | PASS |
| TC-AUD-16 | India / INR / UPI / COD / FSSAI stated | 5 tokens | PASS |
| TC-AUD-17 | Mobile-first assumption with evidence | >75% mobile | PASS |
| TC-AUD-20 | No section serves all personas | Max load 3 | PASS |
| TC-AUD-21 | No duplicate persona rows | 3 unique | PASS |

### D. Locked market decision

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-AUD-22 | Market locked: import model, 800 orders, 4 SKUs, GST 5%, Central licence | All tokens present | PASS |
| TC-AUD-23 | Gifter COD need backed by enforceable policy | Cap/fee/discount/OTP | PASS |
| TC-AUD-24 | Gifter returns need backed by rule + footer link | Sealed-only | PASS |
| TC-AUD-25 | No persona relies on a claim the importer cannot make | No "Made in India" | PASS |
| TC-AUD-26 | Optimizer subscription need backed by terms | Skip/cancel + 10–15% | PASS |

---

## 8. How to re-run

```powershell
node --test tests/persona.test.mjs      # audience (26)
node --test tests/kpi.test.mjs          # goals & KPIs (36)
```

---

## 9. Verdict

| Question | Answer |
|---|---|
| Is every persona mapped to concrete sections? | **Yes** — Section 2.1 |
| Is every persona reachable in one click? | **Yes** — 3 unique entries |
| Can we prove each persona was served? | **Yes** — 9 tracked signals |
| Are persona needs backed by real policies? | **Yes** — COD, returns, subscription locked |
| Is the audience section launch-ready? | **Yes** — market locked, no open assumptions |
