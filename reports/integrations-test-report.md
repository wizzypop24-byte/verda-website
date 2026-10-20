# Test Report — Requirement 13: Integrations

**Project:** Health Supplements Website — Home page
**Requirement under test:** Section 13 "Integrations"
**Test suite:** `tests/integrations.test.mjs` (+ `lib/integrations.mjs`)
**Date:** 2026-10-20
**Result:** **30 passed · 0 failed · 0 skipped**

---

## 1. What was tested

Integrations fail in production, not in design review. The suite checks the map and the failure modes:

| Layer | Question |
|---|---|
| **A. Document** | Are all eight services named, with vendors and payment methods? |
| **B. Registry** | Do capabilities, fallbacks and coverage line up? |
| **C. Security** | Webhook signatures, idempotency, secrets, retries |

`lib/integrations.mjs` holds the registry plus a real HMAC verifier, an idempotency guard and a secret scanner.

---

## 2. Execution summary

| Group | Tests | Passed |
|---|---|---|
| A. Document | 10 | 10 |
| B. Registry | 9 | 9 |
| C. Security | 11 | 11 |
| **Total** | **30** | **30** |

---

## 3. Defects found and fixed

### DEF-32 — No webhook signature or idempotency requirement (HIGH)

- **Test:** TC-INTG-08, TC-INTG-23
- **Symptom:** Payments and shipping were listed as vendors only. Nothing required **HMAC verification** on incoming webhooks or **idempotent handling**. A forged webhook could mark an order paid; a provider retry could double-ship.
- **Fix:** Added a required security block: HMAC signature verification + idempotency, with the explicit rule that retries must never double-charge or double-ship.

### DEF-33 — Secrets had no placement rule (HIGH)

- **Test:** TC-INTG-09, TC-INTG-25
- **Symptom:** No statement about where API keys live. A Razorpay secret key in the client bundle is a full account compromise.
- **Fix:** Added: **secrets stay server-side**, never in the client bundle.

### A deliberate non-defect

`scanForSecrets()` does **not** flag the Firebase web API key. Firebase web keys are public identifiers protected by Authorized Domains and security rules — flagging them would train the team to ignore the scanner (TC-INTG-26).

---

## 4. Test case detail

### A. Document

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-INTG-01 | Eight integration needs | 8/8 | PASS |
| TC-INTG-02 | Vendor suggestion per row | 8/8 | PASS |
| TC-INTG-03 | UPI / cards / netbanking / COD | All present | PASS |
| TC-INTG-04 | Email + WhatsApp | Klaviyo + Wati | PASS |
| TC-INTG-05 | GA4 / GTM / Meta CAPI | All present | PASS |
| TC-INTG-06 | CMS: Shopify + headless | Both | PASS |
| TC-INTG-07 | Support: WhatsApp + helpdesk | Both | PASS |
| TC-INTG-08 | Webhook security | Signature + idempotency | PASS (after DEF-32) |
| TC-INTG-09 | Secrets server-side | Required | PASS (after DEF-33) |
| TC-INTG-10 | Critical fallbacks | All have 2+ vendors | PASS |

### B. Registry

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-INTG-11 | Eight categories once | Pass | PASS |
| TC-INTG-12 | Duplicate category | Rejected | PASS |
| TC-INTG-13 | Payments capabilities | 7/7 | PASS |
| TC-INTG-14 | Shipping capabilities | 4/4 | PASS |
| TC-INTG-15 | Missing capability | Rejected | PASS |
| TC-INTG-16 | Full capability set | Pass | PASS |
| TC-INTG-17 | Unknown category | Rejected | PASS |
| TC-INTG-18 | Capability coverage | 0 gaps | PASS |
| TC-INTG-19 | Uncovered capability | Reported | PASS |

### C. Security

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-INTG-20 | Valid signature | Pass | PASS |
| TC-INTG-21 | Tampered payload | Fail | PASS |
| TC-INTG-22 | No secret | Fail closed | PASS |
| TC-INTG-23 | Replay | Ignored | PASS |
| TC-INTG-24 | Retry backoff | 1s→30s cap | PASS |
| TC-INTG-25 | Live secrets detected | rzp_live / sk_live | PASS |
| TC-INTG-26 | Public keys allowed | Firebase key not flagged | PASS |
| TC-INTG-27 | Full stack audit | 0 issues | PASS |
| TC-INTG-28 | Missing critical service | Reported | PASS |
| TC-INTG-29 | Unverified hooks + leak | Both reported | PASS |
| TC-INTG-30 | Fallback per critical | 2+ vendors | PASS |

---

## 5. How to re-run

```powershell
node --test tests/integrations.test.mjs
npm test
```

---

## 6. Verdict

| Question | Answer |
|---|---|
| Are all eight services mapped? | **Yes** |
| Can a vendor be chosen without a required capability? | **No** — validator blocks it |
| Are webhooks safe against forgery and replay? | **Yes** — HMAC + idempotency |
| Can secrets leak into the client? | **Blocked by rule + scanner** |
| Ready to start integration work? | **Yes** |
