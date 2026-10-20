# Test Report — Requirement 17: Authentication (Login / Sign up)

**Project:** Health Supplements Website — Authentication
**Requirement under test:** Section 17 "Authentication — Login / Sign up (v1)"
**Test suite:** `tests/auth.test.mjs` (Node.js built-in test runner)
**Date:** 2026-10-20
**Result:** **31 passed · 0 failed · 1 skipped** (live page check — nothing deployed yet)

---

## 1. What was verified

Authentication is the highest-risk flow on the site: it touches revenue, security and personal data. The suite checks four things:

| Axis | Question |
|---|---|
| **Completeness** | Are all 22 requirements, 7 flows, 5 screens and 6 error cases written? |
| **Specificity** | Are OTP, session, rate-limit and password rules quantified, or vague? |
| **Security** | Are hashing, cookies, CSRF, enumeration and audit defined? |
| **Internal consistency** | Do the promises contradict each other or the rest of the PRD? |

---

## 2. Execution summary

| Group | Tests | Passed | Failed |
|---|---|---|---|
| A. Structure | 3 | 3 | 0 |
| B. Core behaviour | 13 | 13 | 0 |
| C. Security | 3 | 3 | 0 |
| D. Compliance (DPDP) | 5 | 5 | 0 |
| E. Analytics contract | 3 | 3 | 0 |
| F. Acceptance / scope / consistency | 4 | 4 | 0 |
| G. Live check (opt-in) | 1 | 0 | 0 (skipped) |
| **Total** | **32** | **31** | **0** |

---

## 3. Defects found and fixed

### DEF-09 — Duplicate-account message leaked account existence (HIGH)

- **Test:** TC-AUTH-31
- **Symptom:** AUTH-19 required "no user enumeration", but the error copy for a duplicate account said *"This number already has an account. Log in instead?"* — shown **before** OTP verification. Anyone could test numbers and learn which ones are customers.
- **Fix:**
  - AUTH-08 rewritten: resolve silently — send OTP as normal, log in to the existing account after verification, never reveal existence beforehand.
  - Error copy changed to post-verification only: *"Welcome back — we found your account."*

### DEF-10 — DPDP consent defaults were not stated in the compliance section (MEDIUM)

- **Test:** TC-AUTH-21
- **Symptom:** AUTH-14 said "unticked by default", but Section 17.7 only said "separate toggles". Two teams could implement different defaults — a DPDP violation risk.
- **Fix:** Section 17.7 now states **"unticked by default"**.

---

## 4. Test case detail

### A. Structure

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-AUTH-01 | Section 17 with all 10 sub-sections | 10 headings | PASS |
| TC-AUTH-02 | 22 requirements, sequential IDs | AUTH-01…AUTH-22 | PASS |
| TC-AUTH-03 | Every requirement has a valid priority | Must/Should/Could | PASS |

### B. Core behaviour

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-AUTH-04 | Guest checkout allowed, priority Must | Required | PASS |
| TC-AUTH-05 | OTP quantified: 6 digits, 5 min, 30 s, 5 tries, 15-min lock | All present | PASS |
| TC-AUTH-06 | Password rules: 8+, reveal toggle, no forced complexity | All present | PASS |
| TC-AUTH-07 | Reset link 60 min, single use | All present | PASS |
| TC-AUTH-08 | Duplicate accounts resolved, not duplicated | Documented | PASS |
| TC-AUTH-09 | No user enumeration | Documented | PASS |
| TC-AUTH-10 | Rate limits 5/phone/hour, 20/IP/hour | All present | PASS |
| TC-AUTH-11 | Session 30 days + logout all devices | All present | PASS |
| TC-AUTH-12 | Seven flows documented | 7 rows | PASS |
| TC-AUTH-13 | Guest order claim uses same phone/email + OTP | Documented | PASS |
| TC-AUTH-14 | Five screens specified | 5 rows | PASS |
| TC-AUTH-15 | Six critical error cases covered | 6/6 | PASS |
| TC-AUTH-16 | Accessibility: keyboard, aria-live, WCAG 2.2 AA | All present | PASS |
| TC-AUTH-17 | Mobile-first at 360 px | Required | PASS |

### C. Security

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-AUTH-18 | HTTPS/HSTS, Argon2id/bcrypt, hashed single-use OTP | All present | PASS |
| TC-AUTH-19 | HttpOnly/SameSite cookies, CSRF, rotation on login | All present | PASS |
| TC-AUTH-20 | Bot protection + audit log retained 90 days | All present | PASS |

### D. Compliance (DPDP Act 2023)

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-AUTH-21 | Marketing consent separate + unticked | Both stated | PASS |
| TC-AUTH-22 | Privacy policy at point of collection | Required | PASS |
| TC-AUTH-23 | Deletion/export with 30-day SLA | Required | PASS |
| TC-AUTH-24 | Grievance officer contact | Required | PASS |
| TC-AUTH-25 | 18+ age gate | Required | PASS |

### E. Analytics contract

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-AUTH-26 | Eight auth events defined | 8/8 | PASS |
| TC-AUTH-27 | Auth events don't replace `purchase` / KPI inputs | No overlap | PASS |
| TC-AUTH-28 | Section 12 merge flagged | Note present | PASS |

### F. Acceptance, scope, consistency

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-AUTH-29 | ≥12 acceptance checks incl. guest checkout + duplicate phone | 13 checks | PASS |
| TC-AUTH-30 | Out-of-scope explicit (2FA/SSO) | Documented | PASS |
| TC-AUTH-31 | Duplicate copy leaks nothing before verification | Post-verification only | PASS (after DEF-09) |

### G. Live check

| ID | Case | Result |
|---|---|---|
| TC-AUTH-32 | Fetch deployed auth page, assert 200 + form | **SKIPPED** (`AUTH_URL` not set) |

---

## 5. Requirement → test coverage

| Requirement group | IDs | Covered by |
|---|---|---|
| Guest & identity | AUTH-01, 08, 09, 19 | TC-AUTH-04, 08, 09, 31 |
| OTP | AUTH-02, 03, 22 | TC-AUTH-05, 10 |
| Passwords & social | AUTH-04, 05, 06, 07 | TC-AUTH-06, 07, 12 |
| Session | AUTH-11, 12, 20, 21 | TC-AUTH-11, 27 |
| Consent & privacy | AUTH-13, 14, 15 | TC-AUTH-21…25 |
| UX & a11y | AUTH-16, 17, 18 | TC-AUTH-16, 17 |
| Post-purchase | AUTH-09, 10 | TC-AUTH-12, 13 |
| Analytics | 17.8 | TC-AUTH-26…28 |

---

## 6. How to re-run

```powershell
node --test tests/auth.test.mjs
$env:AUTH_URL = "https://your-domain.com/login"; node --test tests/auth.test.mjs   # live check
```

---

## 7. Verdict

| Question | Answer |
|---|---|
| Is the requirement implementable as written? | **Yes** — every rule is quantified |
| Is it internally consistent? | **Yes** — enumeration conflict fixed |
| Can QA test it without guessing? | **Yes** — 6 error cases, 13 acceptance checks |
| Is it DPDP-safe? | **Yes** — separate consent, deletion SLA, grievance officer |
| Is it ready to build? | **Yes**, pending brand-level UI design |

**Known gap (by design):** auth events are documented in 17.8 and must be merged into Section 12 before the analytics dashboard is built.
