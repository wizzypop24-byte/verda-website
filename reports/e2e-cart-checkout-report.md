# E2E Test Report — Cart + Checkout

**Project:** Verda storefront
**Suite:** `tests/e2e-cart-checkout.test.mjs`
**Date:** 27 October 2026
**Result:** **22 passed · 0 failed · 0 skipped**
**Duration:** ~45 seconds
**Target:** local dev server (`http://localhost:5173`), same Firebase project

---

## 1. What was tested

Real Chromium, real clicks, real Firestore writes.

| Area | Coverage |
|---|---|
| **Cart** | Add, increment, remove, qty controls, badge, persistence, drawer keyboard |
| **Totals** | Subtotal, ₹59 shipping, ₹29 COD, free-shipping threshold |
| **Checkout** | Empty state, validation, COD cap, consent, order placement |
| **Cross-page** | Product page → buy now, collection → cart |
| **Responsive** | 360 px overflow |
| **Console** | No errors during the whole flow |

---

## 2. Results

### Cart

| # | Test | Result |
|---|---|---|
| 1 | Cart starts empty | PASS |
| 2 | Add to cart updates badge and storage | PASS |
| 3 | Adding the same product increments quantity | PASS |
| 4 | Free shipping message below threshold (₹100 more) | PASS |
| 5 | Free shipping unlocks at ₹999 | PASS |
| 6 | Quantity controls update subtotal (₹1,798 → ₹899) | PASS |
| 7 | Removing the last item empties the cart | PASS |
| 8 | Cart survives a reload | PASS |
| 9 | Cart drawer closes with Escape | PASS |
| 10 | Add to cart from a collection page | PASS |
| 11 | Product quantity stepper respects 1–10 | PASS |
| 12 | Buy now adds qty and opens checkout | PASS |

### Checkout

| # | Test | Result |
|---|---|---|
| 13 | Empty checkout hides form and summary | PASS |
| 14 | Totals ₹899 + ₹59 + ₹29 = ₹987 (desktop + mobile) | PASS |
| 15 | COD blocked above ₹2,000 (₹2,926) | PASS |
| 16 | State select starts empty ("Select state") | PASS |
| 17 | Empty submit → 6 field errors, focus on name | PASS |
| 18 | Invalid phone and PIN rejected | PASS |
| 19 | Terms consent required | PASS |
| 20 | Valid COD order placed, cart cleared, detail link set | PASS |
| 21 | No horizontal overflow at 360 px | PASS |
| 22 | No console errors during the flow | PASS |

---

## 3. Data created by the suite

Test 20 creates **one real order**:

```
name:   Automation Test
phone:  9000000001
email:  automation@verda.in
items:  Magnesium Glycinate × 1
total:  ₹987
```

Delete it from **Firebase Console → Firestore → orders** after a run, or filter by `customer.name == "Automation Test"`.

> Future improvement: run this suite against a dedicated test Firebase project so production data stays clean.

---

## 4. How to run

```powershell
npm run test:e2e

# against the deployed site (still writes to production)
$env:E2E_BASE = "https://fir-479b9.web.app"; npm run test:e2e
```

Needs the local server (`node scripts/dev-server.mjs`) unless `E2E_BASE` is set.

---

## 5. Defects found

**None.** All 22 passed on the first run.

---

## 6. Not covered here

| Gap | Where it belongs |
|---|---|
| Logged-in checkout (uid on order, address prefill) | Auth E2E suite |
| Admin status change | Admin E2E suite |
| Razorpay / prepaid payment | Not implemented |
| Order confirmation email/WhatsApp | Not implemented |
| Analytics `purchase` event | Consent-dependent; separate test |
