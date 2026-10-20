# Test Report — Requirement 3: Brand & Tone

**Project:** Health Supplements Website — Home page
**Requirement under test:** Section 3 "Brand & Tone"
**Test suite:** `tests/tone.test.mjs` (+ `lib/tone.mjs` rules engine)
**Date:** 2026-10-20
**Result:** **34 passed · 0 failed · 0 skipped**

---

## 1. What was tested

A style guide is only real if it can be enforced. This suite does two things:

| Layer | Question |
|---|---|
| **A. Document** | Does Section 3 define tone, bans, visuals, typography and a voice example concretely? |
| **B. Linter** | Can the rules be executed against copy — and do they catch real violations without false positives? |

The linter (`lib/tone.mjs`) turns the prose into 16 banned terms, 7 urgency patterns, 3 result-claim patterns, 7 hype patterns and a typography contract.

---

## 2. Execution summary

| Group | Tests | Passed |
|---|---|---|
| A. Document / traceability | 9 | 9 |
| B. Claims (medical, safety) | 6 | 6 |
| C. Pressure tactics | 6 | 6 |
| D. Voice, false positives, edge cases | 10 | 10 |
| E. Typography contract | 3 | 3 |
| **Total** | **34** | **34** |

---

## 3. Defect found and fixed

### DEF-11 — Linter crashed on every pattern rule (HIGH, implementation)

- **Test:** TC-TONE-27 (and 20 others failed at once)
- **Symptom:** `TypeError: String.prototype.matchAll called with a non-global RegExp`. The urgency/hype/result patterns were authored with only the `i` flag; `matchAll` requires `g`. Result: **the linter threw instead of returning violations** — a failing copy check would have looked like a tooling error, not a blocked claim.
- **Fix:** every pattern is compiled with a guaranteed `g` flag before `matchAll`.
- **Why it matters:** a compliance linter that errors out silently lets banned copy ship.

---

## 4. Test case detail

### A. Document / traceability

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-TONE-01 | All five dimensions present (tone, avoid, visual, type, voice) | 5/5 | PASS |
| TC-TONE-02 | Tone stated as a position | "clinical but warm", "lab-backed, not hype-backed" | PASS |
| TC-TONE-03 | Avoid-list covers 5 risk categories | 5/5 | PASS |
| TC-TONE-04 | Every banned word in the doc is enforced in code | miracle, cure, guaranteed, urgency, before/after | PASS |
| TC-TONE-05 | Visual direction is art-directable | base, accent, real photography, macros, no stock gym | PASS |
| TC-TONE-06 | Typography quantified | 1+1 families, max 2 weights | PASS |
| TC-TONE-07 | Good **and** bad voice examples present | Both | PASS |
| TC-TONE-08 | Approved example passes linter | 0 violations | PASS |
| TC-TONE-09 | Anti-example is caught | hype + punctuation | PASS |

### B. Claims

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-TONE-10 | "cures" is an **error** | Blocked | PASS |
| TC-TONE-11 | "miracle" blocked | Blocked | PASS |
| TC-TONE-12 | "guaranteed" blocked | Blocked | PASS |
| TC-TONE-13 | "clinically proven" = warning only | Warning, publish allowed | PASS |
| TC-TONE-14 | "100% safe", "no side effects", "FDA approved" | All errors | PASS |
| TC-TONE-15 | "treats" blocked | Error | PASS |

### C. Pressure tactics

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-TONE-16 | "Only 3 left" | Blocked | PASS |
| TC-TONE-17 | hurry / last chance / today only / limited time / expires in | All blocked | PASS |
| TC-TONE-18 | "42 people are viewing" | Blocked | PASS |
| TC-TONE-19 | before & after / before/after | Blocked | PASS |
| TC-TONE-20 | "Lose 5 kg in 2 weeks" | Blocked | PASS |
| TC-TONE-21 | "30% faster than other brands" | Blocked | PASS |

### D. Voice, false positives, edge cases

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-TONE-22 | Compliant, specific copy | 0 violations | PASS |
| TC-TONE-23 | Case-insensitive matching | "MIRACLE" blocked | PASS |
| TC-TONE-24 | No false positives in secure / manicure / procure | 0 violations | PASS |
| TC-TONE-25 | "Amazing energy!!!" | Punctuation warning | PASS |
| TC-TONE-26 | All-caps shouting | Shouting warning | PASS |
| TC-TONE-27 | Empty copy | OK, no crash | PASS |
| TC-TONE-28 | Violations carry reason + suggestion + index | Present | PASS |
| TC-TONE-29 | Legal disclaimer may say "treat"/"cure" | Not flagged | PASS |
| TC-TONE-30 | Same words outside the disclaimer | Blocked | PASS |
| TC-TONE-31 | Audit mode disables disclaimer exemption | Flags it | PASS |

### E. Typography

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-TONE-32 | 2 families × 2 weights | Valid | PASS |
| TC-TONE-33 | 3rd font family | Rejected | PASS |
| TC-TONE-34 | 3rd weight on one family | Rejected | PASS |

---

## 5. Design decision worth noting

**The mandatory FSSAI disclaimer must be able to say "treat" and "cure".**
A naive linter would block the legally required sentence *"not intended to diagnose, treat, cure, or prevent any disease"*. The linter now strips the approved disclaimer before checking, while `allowDisclaimer: false` keeps an audit mode that exposes it (TC-TONE-29…31).

---

## 6. How to re-run

```powershell
node --test tests/tone.test.mjs
```

---

## 7. Verdict

| Question | Answer |
|---|---|
| Is the tone guide concrete? | **Yes** — 5 dimensions, examples both ways |
| Are the bans enforceable? | **Yes** — executable linter |
| Does it catch claims without breaking the legal disclaimer? | **Yes** — exemption + audit mode |
| False positives on ordinary words? | **No** — verified secure/manicure/procure |
| Ready to use on real copy? | **Yes** — run `lintCopy()` before publishing |

**Next natural step:** run `lintCopy()` over the home-page copy once it exists, and add the same check to CI so a banned claim can never be deployed.
