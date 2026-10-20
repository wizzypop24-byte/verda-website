# Test Report — Requirement 12: Analytics & Tracking

**Project:** Health Supplements Website — Home page
**Requirement under test:** Section 12 "Analytics & Tracking"
**Test suite:** `tests/analytics.test.mjs` (+ `lib/analytics.mjs`)
**Date:** 2026-10-20
**Result:** **33 passed · 0 failed · 0 skipped**

---

## 1. What was tested

The tracking plan is a contract between marketing, engineering and privacy. This suite checks three things:

| Layer | Question |
|---|---|
| **A. Document** | Does every event have a trigger and params, and cover every consumer? |
| **B. Validation** | Are required params, enums, currency and PII enforced? |
| **C. Consent** | Does anything leave the browser without permission? |

`lib/analytics.mjs` holds the 17-event registry, a PII scanner and `auditEventLog()` for data-layer tests.

---

## 2. Execution summary

| Group | Tests | Passed |
|---|---|---|
| A. Document | 11 | 11 |
| B. Validation | 12 | 12 |
| C. Consent | 6 | 6 |
| D. Integration | 4 | 4 |
| **Total** | **33** | **33** |

---

## 3. Defects found and fixed

### DEF-29 — No PII prohibition in the tracking plan (HIGH)

- **Test:** TC-ANLT-09, TC-ANLT-20
- **Symptom:** The plan said "gated behind consent" but never forbade sending email, phone or address in event params. Consent is not anonymisation — sending PII to GA4/Meta is a **DPDP** problem regardless of consent.
- **Fix:** Added an explicit **no-PII rule** and a scanner that detects emails, phone numbers and PII keys (hashed `user_id` allowed).

### DEF-30 — Search was unmeasurable (MEDIUM)

- **Test:** TC-ANLT-10
- **Symptom:** FR-01 defines global search and DEF-14 added a zero-result state, but no `search_submit` event existed. Search demand and failure rate were invisible.
- **Fix:** Added `search_submit` with `query`, `results_count`.

### DEF-31 — PDP add-to-cart was missing (MEDIUM)

- **Test:** TC-ANLT-11
- **Symptom:** Only `quick_add` (home) existed. The product-page funnel could not be built — no ATC → checkout drop-off analysis.
- **Fix:** Added `add_to_cart` with `product_id`, `value`, `currency`.

### Test corrections

- `findPii()` double-counted a PII key (key match + value match); now reports the location once.
- TC-ANLT-30 assumed every KPI has `requiresEvents`; the diagnostic G6 does not, so the test coerced `undefined` into the missing list. Fixed with `?? []`.

---

## 4. Test case detail

### A. Document

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-ANLT-01 | ≥17 events documented | Pass | PASS (after DEF-30/31) |
| TC-ANLT-02 | Trigger + params per row | All | PASS |
| TC-ANLT-03 | snake_case names | All | PASS |
| TC-ANLT-04 | page_type enum | home/collection/pdp/cart | PASS |
| TC-ANLT-05 | purchase params | 4/4 | PASS |
| TC-ANLT-06 | web_vitals params | 3/3 | PASS |
| TC-ANLT-07 | Consent gating | Stated | PASS |
| TC-ANLT-08 | Server-side | Stated | PASS |
| TC-ANLT-09 | PII forbidden | Stated | PASS (after DEF-29) |
| TC-ANLT-10 | Search event | Present | PASS (after DEF-30) |
| TC-ANLT-11 | PDP ATC event | Present | PASS (after DEF-31) |

### B. Validation

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-ANLT-12 | Valid purchase | Pass | PASS |
| TC-ANLT-13 | Unknown event | Rejected | PASS |
| TC-ANLT-14 | Missing params | 3 issues | PASS |
| TC-ANLT-15 | Enum values | Reject invalid | PASS |
| TC-ANLT-16 | Numeric value | Reject string | PASS |
| TC-ANLT-17 | Currency INR | Reject USD | PASS |
| TC-ANLT-18 | scroll_depth | 25/50/75/100 only | PASS |
| TC-ANLT-19 | web_vitals metric | LCP/CLS/INP only | PASS |
| TC-ANLT-20 | PII detection | flat + nested + free text | PASS |
| TC-ANLT-21 | Hashed user id | Allowed | PASS |
| TC-ANLT-22 | PII in valid event | Fails validation | PASS |
| TC-ANLT-23 | Newsletter channel | email/whatsapp only | PASS |

### C. Consent

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-ANLT-24 | No analytics consent | Dropped | PASS |
| TC-ANLT-25 | Analytics consent | Sent | PASS |
| TC-ANLT-26 | Ads destination | Needs marketing consent | PASS |
| TC-ANLT-27 | Invalid event with consent | Dropped | PASS |
| TC-ANLT-28 | Batch audit | Accepted vs dropped | PASS |
| TC-ANLT-29 | Clean batch | 0 violations | PASS |

### D. Integration

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-ANLT-30 | KPI inputs exist | 0 missing | PASS |
| TC-ANLT-31 | Persona signals exist | 0 missing | PASS |
| TC-ANLT-32 | Plan ↔ registry parity | No orphans | PASS |
| TC-ANLT-33 | Unknown names surfaced | Reported | PASS |

---

## 5. How to re-run

```powershell
node --test tests/analytics.test.mjs
npm test
```

---

## 6. Verdict

| Question | Answer |
|---|---|
| Can every KPI be computed from the plan? | **Yes** — all inputs documented |
| Is PII blocked by construction? | **Yes** — validator + scanner |
| Is consent enforced before sending? | **Yes** — analytics and ads separated |
| Can the data layer be tested pre-launch? | **Yes** — `auditEventLog()` |
| Ready for GTM implementation? | **Yes** |
