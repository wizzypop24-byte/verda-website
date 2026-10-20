# Test Report — Requirement 11: Compliance & Claims

**Project:** Health Supplements Website — Home page
**Requirement under test:** Section 11 "Compliance & Claims" + 11.1 Importer checklist
**Test suite:** `tests/compliance.test.mjs` (+ `lib/compliance.mjs`)
**Date:** 2026-10-20
**Result:** **34 passed · 0 failed · 0 skipped**

---

## 1. What was tested

This is the section that can stop a launch — customs rejections, payment-gateway freezes and legal notices all live here.

| Layer | Question |
|---|---|
| **A. Document** | Are the claims policy and the 10-item importer checklist complete? |
| **B. Rules** | Do disclaimer, label, shelf life, ports, PIF, GST and origin checks work? |
| **C. Trust** | Testimonials, age gate, privacy and the footer importer block |
| **D. Integration** | Does the brand linter actually block every claim this section bans? |

`lib/compliance.mjs` holds the 17 mandatory label fields, the exact disclaimer, and `auditCompliance()` for a pre-launch sweep.

---

## 2. Execution summary

| Group | Tests | Passed |
|---|---|---|
| A. Document | 12 | 12 |
| B. Rules | 12 | 12 |
| C. Trust & footer | 8 | 8 |
| D. Linter integration | 2 | 2 |
| **Total** | **34** | **34** |

---

## 3. Defects found and fixed

### DEF-27 — Label spec omitted batch number and best-before (HIGH)

- **Test:** TC-COMP-09
- **Symptom:** IMP-07 listed FSSAI logo, licence number, MRP, net quantity — but **no batch number and no best-before date**. Both are mandatory under Legal Metrology (Packaged Commodities) Rules; without them a consignment can be stopped and a product cannot be recalled.
- **Fix:** IMP-07 now requires **batch number** and **best before (month/year)**.

### DEF-28 — Marketing consent had no proof requirement (MEDIUM)

- **Test:** TC-COMP-10
- **Symptom:** Section 11 required a consent banner but never said marketing opt-in must be **provable**. Under DPDP Act 2023 the controller must be able to demonstrate consent — "we had a banner" is not evidence.
- **Fix:** Added **opt-in with stored proof (timestamp + source)**.

---

## 4. Test case detail

### A. Document

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-COMP-01 | Six claim prohibitions | All present | PASS |
| TC-COMP-02 | FSSAI number + status link | Required | PASS |
| TC-COMP-03 | Exact disclaimer text | Present | PASS |
| TC-COMP-04 | Product-page safety fields | 4/4 | PASS |
| TC-COMP-05 | Testimonial labelling | Individual experience | PASS |
| TC-COMP-06 | Privacy names DPDP | Required | PASS |
| TC-COMP-07 | IMP-01…IMP-10 sequential | 10 items | PASS |
| TC-COMP-08 | Each item has a rationale | 10/10 | PASS |
| TC-COMP-09 | Batch + best-before on label | Required | PASS (after DEF-27) |
| TC-COMP-10 | Marketing proof of consent | Required | PASS (after DEF-28) |
| TC-COMP-11 | Central (importer) licence | Stated | PASS |
| TC-COMP-12 | Shelf life 60% or 3 months | Stated | PASS |

### B. Rules

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-COMP-13 | Full disclaimer passes | 0 issues | PASS |
| TC-COMP-14 | Partial disclaimer fails | Each missing clause | PASS |
| TC-COMP-15 | Complete label passes | 0 issues | PASS |
| TC-COMP-16 | Missing fields reported | 2 issues | PASS |
| TC-COMP-17 | Licence is 14 digits | Reject short | PASS |
| TC-COMP-18 | Shelf life OR logic | 60% or 3 months | PASS |
| TC-COMP-19 | Below both thresholds | Fail | PASS |
| TC-COMP-20 | Supplier 18-month clause | Required | PASS |
| TC-COMP-21 | Designated ports only | JNPT pass, Goa fail | PASS |
| TC-COMP-22 | PIF five documents | Required | PASS |
| TC-COMP-23 | GST 5% only | 12%/18% fail | PASS |
| TC-COMP-24 | Origin claim | "Imported" pass, "Made in India" fail | PASS |

### C. Trust & footer

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-COMP-25 | Testimonial label | Required | PASS |
| TC-COMP-26 | Incentivized disclosure | Required | PASS |
| TC-COMP-27 | Age gate | 18+ | PASS |
| TC-COMP-28 | Product page blocks | 4/4 | PASS |
| TC-COMP-29 | Privacy (banner, policy, DPDP, opt-in) | 4/4 | PASS |
| TC-COMP-30 | Footer importer block | 6 facts | PASS |
| TC-COMP-31 | Full compliant page | 0 issues | PASS |
| TC-COMP-32 | Multi-breach page | ≥6 issues | PASS |

### D. Linter integration

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-COMP-33 | Every banned claim blocked | cure, miracle, guaranteed, weight-loss, before/after | PASS |
| TC-COMP-34 | Structure-function copy allowed | "supports" passes | PASS |

---

## 5. How to re-run

```powershell
node --test tests/compliance.test.mjs
npm test
```

---

## 6. Verdict

| Question | Answer |
|---|---|
| Is the claims policy enforceable? | **Yes** — linter integration tests prove it |
| Is the label spec complete? | **Yes** — 17 fields incl. batch + best-before |
| Is the import path defined? | **Yes** — licence, ports, shelf life, PIF, NOC |
| Is the footer legally sufficient? | **Yes** — importer, origin, FSSAI, care contact |
| Ready for legal/consultant review? | **Yes** — this is the checklist to hand them |
