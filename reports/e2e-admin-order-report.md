# E2E Test Report — Admin + Order Detail

**Project:** Verda storefront
**Suite:** `tests/e2e-admin-order.test.mjs`
**Date:** 27 October 2026
**Result:** **13 passed · 0 failed · 8 skipped**
**Duration:** ~20 seconds
**Target:** local dev server (`http://localhost:5173`)

---

## 1. Why 8 tests are skipped

Admin actions and owner order reads need the owner's Google session. Automation
cannot complete Google OAuth, so those paths are manual. Everything that can be
verified without a session is automated.

| Layer | Status |
|---|---|
| Signed-out gates, data leaks, invalid states, mobile | ✅ Automated (13) |
| Owner reads, status updates, other-account denial | ⏭️ Manual (8) |

---

## 2. Passed tests (13)

### Order detail

| # | Test | Result |
|---|---|---|
| 1 | Signed-out state asks for sign-in | PASS |
| 2 | Sign-in link preserves the order id in `?next=` | PASS |
| 3 | Malformed id shows "Order ID missing" | PASS |
| 4 | No order data leaks before sign-in | PASS |
| 5 | No horizontal overflow at 360 px | PASS |
| 6 | No console errors while signed out | PASS |

### Admin

| # | Test | Result |
|---|---|---|
| 7 | Sign-in gate is shown | PASS |
| 8 | Denied state is hidden for a fresh visitor | PASS |
| 9 | Orders / Leads / Messages tabs are not rendered | PASS |
| 10 | Stats are not rendered | PASS |
| 11 | Refresh and sign-out stay hidden | PASS |
| 12 | Sign-in link returns to `/admin/` | PASS |
| 13 | No horizontal overflow at 360 px | PASS |

### Console hygiene

| # | Test | Result |
|---|---|---|
| 14 | No console errors on admin while signed out | PASS |

---

## 3. Skipped tests (manual)

| # | Test | Why manual |
|---|---|---|
| 15 | Owner sees orders, stats and status controls | Owner session |
| 16 | Status change persists to Firestore | Owner session |
| 17 | Leads tab lists newsletter emails | Owner session |
| 18 | Messages tab lists contact submissions | Owner session |
| 19 | Non-owner account sees access denied | Second Google account |
| 20 | Owner can open their own order detail | Owner session |
| 21 | Another account cannot open someone else's order | Second account |
| 22 | A guest order stays private | Guest order id |

### Manual checklist

1. Sign in as `wizzypop24@gmail.com`, open `/admin/`.
2. Confirm stats show orders, revenue, COD count and leads.
3. Change an order status (placed → packed) and reload — value must persist.
4. Open **Leads** — emails with source and date.
5. Open **Messages** — contact submissions.
6. Open `/order/?id=<your order>` — details and timeline render.
7. Sign out, use a different Gmail, open `/admin/` — **Access denied**.
8. With that second account, open someone else's order id — **not linked**.
9. Open a guest order id while signed in — still denied.

---

## 4. Defects found

**None.** All 13 automated tests passed on the first run.

---

## 5. How to run

```powershell
npm run test:admin

# against the deployed site
$env:E2E_BASE = "https://fir-479b9.web.app"; npm run test:admin
```

---

## 6. Not covered

| Gap | Reason |
|---|---|
| Firestore rule enforcement with two real accounts | Needs two Google accounts |
| Status update writes | Owner session |
| Admin data export / bulk actions | Not implemented |
