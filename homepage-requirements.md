# Home Page Requirements — Health Supplements Website

**Document type:** Home page PRD (v1.0)
**Prepared for:** Verda (working name) — D2C health supplements store
**Status:** Draft for review

---

## 1. Purpose & Goals

The home page must do four jobs in the first 5 seconds:

1. **Explain** what the brand sells and for whom.
2. **Build trust** — supplements are a "high-suspicion" category; proof beats promises.
3. **Route** visitors to the right product in ≤ 2 clicks.
4. **Convert** first-time visitors into buyers or email/WhatsApp subscribers.

### 1.1 Primary business goals

| # | Goal | Target (first 90 days) |
|---|------|------------------------|
| G1 | Home → Product Page CTR (sessions that view a PDP) | ≥ 35% of sessions |
| G2 | Home page conversion rate | ≥ 1.8% |
| G3 | Email/WhatsApp signup from home | ≥ 4% of sessions |
| G4 | Bounce rate | < 55% |
| G5 | Mobile LCP | < 2.5 s on 4G |
| G6 | Quick-add rate (diagnostic, not a launch gate) | 8–12% of sessions |

**KPI measurement rules**

- **G1 is destination-based:** a session counts when it produces a `page_view` with `page_type: "pdp"`. The click that led there is not counted.
- **`quick_add` is excluded from G1.** Direct add-to-cart skips the PDP by design; counting it would inflate CTR and break funnel math. It is tracked separately as G6.
- **G6 is diagnostic only** — a high quick-add rate with a lower G1 is a healthy sign (shorter path), not a failure. Never gate launch on G6.
- Compare G1 against an order-based metric (G2) before judging home page health; either alone can mislead.

### 1.2 Non-goals (v1)

- No full account dashboard on home.
- No multi-vendor marketplace UI.
- No blog listing beyond a 3-card teaser.
- No international shipping / multi-currency selector.

---

## 2. Target Audience

| Persona | Profile | What they need from home |
|---|---|---|
| **The Fixer** (30–45) | Has a specific issue (sleep, energy, hair, joints). Searches symptom-first. | Clear "shop by concern" paths, ingredient evidence, dosage clarity. |
| **The Optimizer** (22–35) | Gym/fitness, already takes supplements. | Third-party testing badges, protein/creatine specs, lab reports, subscription discount. |
| **The Gifter / Family buyer** (35–60) | Buys for parents or spouse. | Simple bundles, doctor/pharmacist credibility, easy returns, COD. |

**Market decision — LOCKED 2026-10-20**
- India only · importer & reseller model (own brand, imported stock)
- Currency INR · UPI + cards + netbanking + COD (capped)
- FSSAI **Central License (Importer category)** — not a State license
- GST **5%** on nutraceuticals (since 22 Sep 2025)
- Launch scale: **~800 orders/month**, max **4 SKUs** (import lead time 10–13 weeks)
- These are locked; any change reopens checkout, compliance and audience tests.

### 2.1 Persona → home page coverage

Every persona must be reachable in one click and provable through analytics.

| Persona | Primary entry (1 click) | Sections that serve them | Tracking signals | Owning KPI |
|---|---|---|---|---|
| The Fixer | HM-05 Shop by concern | HM-03, HM-05, HM-07, HM-08, HM-10 | `concern_card_click`, `lab_report_click`, `faq_open` | G1 |
| The Optimizer | HM-06 Bestsellers | HM-03, HM-04, HM-06, HM-07, HM-08, HM-09, HM-11 | `product_card_click`, `quick_add`, `lab_report_click` | G6 |
| The Gifter / Family buyer | HM-11 Bundles | HM-03, HM-04, HM-09, HM-11, HM-12, HM-16 | `bundle_click`, `purchase`, `faq_open` | G2 |

**Rules**

- A persona may not depend on a single section (minimum 3 supporting sections).
- A core commerce section (HM-03 … HM-12) must serve at least one persona — otherwise it is scope creep.
- The owning KPI is how we know the page worked for that persona; it is not a separate goal.
- G6 is diagnostic, so the Optimizer's `quick_add` signal is watched but never gates launch.

---

## 3. Brand & Tone

- **Tone:** Clinical but warm. "Lab-backed, not hype-backed."
- **Avoid:** "miracle", "cure", "guaranteed results", before/after body photos, fake urgency timers.
- **Visual direction:** Clean white/off-white base, one accent color per product category, real product photography, ingredient macro shots, no stock "happy gym model" clichés.
- **Typography:** 1 display + 1 body font, max 2 weights each.
- **Voice example:** "Magnesium glycinate, 200 mg. Third-party tested. No fillers." (not "Unlock your best sleep ever!!")

---

## 4. Page Structure (top → bottom)

```
[ Announcement bar ]
[ Header / Nav ]
[ 1. Hero ]
[ 2. Trust strip ]
[ 3. Shop by concern ]
[ 4. Bestsellers ]
[ 5. Why us / differentiation ]
[ 6. Ingredient transparency ]
[ 7. Social proof / reviews ]
[ 8. Supplement quiz CTA ]
[ 9. Bundles & subscription ]
[ 10. Expert / founder credibility ]
[ 11. Blog teaser ]
[ 12. FAQ ]
[ 13. Newsletter / WhatsApp opt-in ]
[ Footer ]
```

### 4.1 Announcement bar — HM-01

- Rotating messages (max 3), 4 s each, pause on hover.
- Examples: "Free shipping above ₹999" · "Extra 10% off on subscriptions" · "FSSAI-licensed & third-party tested".
- Dismissible; remember dismissal for 7 days (localStorage).
- Height ≤ 40 px desktop / 32 px mobile. Must not cause layout shift.

### 4.2 Header / Navigation — HM-02

- Logo (left), primary nav (center/left), utility icons (right): Search, Account, Cart (with item count).
- Primary nav: **Shop All · By Concern · Bundles · Our Science · About · Blog**.
- "By Concern" opens a mega-menu with icon + label grid (Sleep, Energy, Immunity, Gut, Hair & Skin, Joints, Fitness).
- Sticky on scroll (compact height), hide-on-scroll-down / show-on-scroll-up on mobile.
- Cart icon shows badge count; opens side drawer, not a page reload.
- Mobile: hamburger → full-screen drawer with accordion sub-menus.
- Keyboard accessible; `Esc` closes menus; focus trap inside drawers.

### 4.3 Hero — HM-03

- **Type:** Split layout (copy left / product or lifestyle image right) on desktop; stacked on mobile.
- **Must contain:**
  - H1 with the core promise + category (SEO-friendly, one per page).
  - Sub-headline: 1 line on who it's for + what makes it different.
  - Primary CTA: "Shop Bestsellers" (solid button).
  - Secondary CTA: "Take the 60-sec Quiz" (text/outline button).
  - Micro-trust line under CTA: "Free shipping over ₹999 · 30-day returns · COD available".
- No autoplay video with sound. If video, muted + poster + play control, `preload="none"`.
- Image must not be text-baked (text must be real HTML for SEO/a11y).
- Hero LCP image: `fetchpriority="high"`, responsive `srcset`, AVIF/WebP.

### 4.4 Trust strip — HM-04

- 4–5 items, icon + 2–4 word label:
  - FSSAI Licensed · Third-Party Lab Tested · GMP Certified · 30-Day Money Back · 50,000+ Customers.
- Static, no carousel. Links (where applicable) open policy pages.
- Every claim must be verifiable — no unsubstantiated numbers.
- **Import wording:** "GMP Certified" / "Third-Party Tested" allowed (manufacturer's facility). **"Made in India" is prohibited** — products are imported. Preferred: "Imported · FSSAI Licensed · Lab Tested".

### 4.5 Shop by concern — HM-05

- Grid of 6–8 concern cards: image/icon, concern name, 1-line benefit, product count ("12 products").
- Concerns without stock show **"Coming soon — notify me"** instead of a product count.
- Use the **same concern taxonomy** as the HM-02 mega-menu (single source of truth — 7 concerns).
- Click → filtered collection page with that concern preselected.
- Hover: subtle lift + arrow. Focus ring visible.

### 4.6 Bestsellers — HM-06

- 4 products desktop / 1.2 cards visible mobile (horizontal scroll with snap).
- Each card: image, name, key ingredient + potency, rating (stars + count), price + MRP strikethrough + % off, "Add to cart" quick action, badge (Bestseller / New / Subscribe & Save).
- Quick-add must not navigate away; show toast + open cart drawer.
- Out-of-stock: disabled button + "Notify me".
- Data source: CMS-selected collection (manual order), fallback to top-selling by 30-day revenue.

### 4.7 Why us / differentiation — HM-07

- 3–4 value props with icon + heading + 2 lines:
  - Clinically dosed (no proprietary blends)
  - Third-party tested (link to lab reports)
  - No unnecessary fillers / added sugar
  - Made in GMP-certified facility
- Include a "View lab reports" link (PDF per batch) — major trust signal.

### 4.8 Ingredient transparency — HM-08

- Interactive ingredient table or accordion: Ingredient · Dose · Form · Why it's included · Evidence link.
- At least 1 real product label image so users can zoom and read.
- Must be readable on mobile without horizontal scroll.

### 4.9 Social proof — HM-09

- Aggregate rating (e.g., 4.7/5 from 2,300+ reviews) + 3 review cards (name, verified badge, star, 2–3 lines, product).
- Photo/video reviews optional but preferred.
- Link: "Read all reviews".
- Reviews must be real and moderated; mark incentivized reviews.

### 4.10 Supplement quiz CTA — HM-10

- Banner: "Not sure what you need? Answer 5 questions."
- Quiz entry captures email *after* results (not before).
- Result page recommends 1–3 products with "Add all to cart".

### 4.11 Bundles & subscription — HM-11

- 2–3 curated bundles (e.g., "Sleep + Stress Kit") with savings % and "what's inside".
- Subscribe & Save explainer: 10–15% off, skip/cancel anytime, delivery frequency.
- Clearly show per-day cost where possible ("₹18/day").

### 4.12 Expert / founder credibility — HM-12

- Short founder note or "Formulated with [Dr. Name, qualification]" with photo, 1–2 line bio, link to full page.
- Optional: 30–60 s founder video (muted autoplay banned; click-to-play only).

### 4.13 Blog teaser — HM-13

- 3 latest articles: image, category tag, title, read time.
- Must not push main CTA below the fold on mobile.

### 4.14 FAQ — HM-14

- 6–8 questions, accordion, first one open.
- Topics: safety, dosage, interactions, shipping, returns, subscription cancellation, lab testing.
- FAQ content mirrors `FAQPage` structured data (no mismatch).

### 4.15 Newsletter / WhatsApp — HM-15

- Single field (email or phone toggle), consent checkbox with link to privacy policy.
- Incentive: "Get ₹100 off your first order".
- Inline validation, success + error states, double opt-in for email.
- No pre-checked consent (GDPR/DPDP compliance).

### 4.16 Footer — HM-16

- Columns: Shop · Learn · Support · Company.
- Policies: Shipping, Returns, Privacy, Terms, Disclaimer.
- Contact: email, phone, address, support hours.
- Social links, payment icons (UPI, Visa, Mastercard, COD).
- **Importer block (legal, mandatory):** "Imported by: [legal entity + registered address]", country of origin, customer-care email/phone.
- Compliance block: FSSAI license number (linked), "Not for medicinal use. Consult a physician…" disclaimer.
- Copyright + GSTIN; invoice shows GST 5%.

---

## 5. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Global search with instant suggestions (products, concerns, articles); zero-result state suggests concerns instead of a dead end | Must |
| FR-02 | Cart drawer with qty edit, free-shipping progress bar, upsell row | Must |
| FR-03 | Wishlist (local for guests, synced on login) | Could |
| FR-04 | Product quick-view modal: image, price, key ingredient specs, add-to-cart | Should |
| FR-05 | Currency: INR only (v1) | Must |
| FR-06 | Sticky mobile "Add to cart" is product-page only, not home | Must |
| FR-07 | Cookie/consent banner with granular analytics/marketing toggles | Must |
| FR-08 | Locale: English (IN); Hindi toggle as v1.1 | Should |
| FR-09 | Server-side rendered home page (no client-only content for SEO) | Must |
| FR-10 | CMS-editable: hero, banners, bestseller collection, testimonials, FAQ | Must |
| FR-11 | COD available with cap **₹2,000**, fee **₹29**, prepaid discount **₹50** | Must |
| FR-12 | COD orders require WhatsApp/OTP confirmation before dispatch | Must |
| FR-13 | COD disabled for high-risk pincodes and unverified addresses | Should |
| FR-14 | Returns accepted only for **sealed/unopened** products (supplement safety) | Must |
| FR-15 | Checkout shows per-day cost and prepaid savings clearly | Should |

### 5.1 Commerce constants (single source of truth)

Every price rule appears once here; UI copy and cart logic read from this table.

| Constant | Value | Used by |
|---|---|---|
| Free-shipping threshold | ₹999 | HM-01, HM-03, FR-02 |
| COD order cap | ₹2,000 | FR-11, FR-13 |
| COD fee | ₹29 | FR-11 |
| Prepaid discount | ₹50 | FR-11, FR-15 |
| Return window | 30 days | HM-04, FR-14 |
| GST rate | 5% | IMP-09 |

---

## 6. Content Requirements

| Section | Content owner | Word count / limit |
|---|---|---|
| Hero H1 + sub | Marketing | H1 ≤ 12 words, sub ≤ 20 words |
| Trust strip | Compliance + Marketing | ≤ 4 words per item |
| Concern cards | Category manager | ≤ 10 words each |
| Product cards | Catalog team | Name ≤ 60 chars |
| Reviews | Community manager | 2–3 lines each |
| FAQ | Support + Compliance | 60–120 words per answer |
| Announcement bar | Marketing | ≤ 8 words per message |
| Blog teaser titles | Content editor | Title ≤ 60 chars |
| Bundle names | Merchandising | Name ≤ 40 chars |
| Quiz copy | Marketing | Question ≤ 12 words, option ≤ 4 words |

**Assets needed before build:** 1 hero image (desktop 2400×1200, mobile 1080×1350, AVIF/WebP with descriptive alt text), 8 concern images, 8–12 product photos (2–3 angles each for the **4 launch SKUs**), 5 trust icons (SVG), 3 review photos, 1 founder photo, 1 label close-up, OG image (1200×630).

**Until photography exists:** use branded SVG placeholders at the exact sizes above, flagged `data-placeholder="true"`. No stock photos and no AI product shots — showing a product that does not exist is a misrepresentation risk.

---

## 7. Design & Responsive Rules

- **Breakpoints:** 360 / 768 / 1024 / 1280 / 1440 px.
- **Grid:** 12-col desktop, 8-col tablet, 4-col mobile; gutter 24 / 16 / 16 px.
- **Max content width:** 1280 px.
- **Type scale:** mobile base 16 px; desktop base 16–18 px; H1 clamp(32px → 56px).
- **Tap targets:** ≥ 44×44 px.
- **Contrast:** body text ≥ 4.5:1; large text (≥24 px, or ≥19 px bold) and UI components / focus rings ≥ 3:1.
- **Motion:** 150–250 ms ease-out; respect `prefers-reduced-motion`.
- **No text inside images** for every image (headings and CTAs included) — all text must be real HTML.

---

## 8. Performance Budget

| Metric | Budget |
|---|---|
| LCP (mobile, 4G) | ≤ 2.5 s |
| INP | ≤ 200 ms |
| CLS | ≤ 0.1 |
| TTFB (mobile, 4G) | ≤ 800 ms |
| Total JS (initial) | ≤ 200 KB gzipped |
| Total CSS (initial) | ≤ 50 KB gzipped |
| Hero image | ≤ 180 KB (AVIF/WebP) |
| Fonts | ≤ 2 families, ≤ 4 files, `font-display: swap`, self-hosted |
| Third-party scripts | ≤ 6, all deferred |

Requirements: lazy-load everything below the fold, explicit width/height on all images, no layout-shifting banners, critical CSS inlined.

**4G profile (reproducible):** Lighthouse mobile defaults — 1.6 Mbps down, 150 ms RTT, 4× CPU slowdown. Every budget above is measured under this profile, not on office Wi-Fi.

---

## 9. SEO Requirements

- One `<h1>`; logical H2/H3 hierarchy.
- Title ≤ 60 chars, meta description ≤ 155 chars. Canonical URL must be **absolute https, self-referencing**, and contain **no query or tracking parameters**.
- Open Graph + Twitter card tags.
- Structured data, emitted as **JSON-LD in `<head>`**:
  - `Organization` (logo, social, contact)
  - `WebSite` + `SearchAction`
  - `ItemList` for bestsellers
  - `Product` + `AggregateRating` on cards where valid — `Product` must include **name, image, price, availability, url**; rating only with real reviews
  - `FAQPage` matching visible FAQ
- `robots.txt` + XML sitemap; home included.
- No indexation of cart/search/filter URLs.
- Clean URLs, semantic HTML, descriptive alt text (empty alt for decorative).

---

## 10. Accessibility (WCAG 2.2 AA)

- Full keyboard navigation; visible focus indicators.
- Skip-to-content link.
- ARIA labels on icon-only buttons (cart, search, menu).
- Carousels: pause control, keyboard arrows, no auto-advance beyond 5 s.
- Form errors announced with `aria-live`.
- Video: captions/transcript; no flashing content.
- Screen-reader tested on mobile (VoiceOver / TalkBack) and desktop (NVDA).
- `<html lang="en-IN">` on every page; each page has a unique, descriptive `<title>`.
- Focus must never be hidden behind the sticky header — `scroll-padding-top` ≥ header height (WCAG 2.2 · 2.4.11).

---

## 11. Compliance & Claims (critical)

> Supplements are a regulated category. Non-compliance is a legal risk, not a design preference.

- Display **FSSAI license number** in footer; link to license status page.
- No disease/cure/treatment claims. Use structure-function language only ("supports", "helps maintain").
- Mandatory disclaimer near claims and in footer: *"This product is not intended to diagnose, treat, cure, or prevent any disease. Not for medicinal use. Consult a qualified healthcare professional before use, especially if pregnant, nursing, or on medication."*
- No before/after body transformations; no weight-loss guarantees.
- Age note: "For adults 18+".
- Each product page: full ingredient list, allergen info, dosage, storage.
- Testimonials labeled as individual experiences, not typical results.
- Data privacy: consent banner, privacy policy, DPDP Act 2023 compliant data collection.
- Marketing consent must be **opt-in with stored proof** (timestamp + source) — DPDP Act 2023.

### 11.1 Importer checklist — LOCKED (own-brand import model)

| # | Requirement | Why it matters |
|---|---|---|
| IMP-01 | **FSSAI Central License (Importer)** at head office; number displayed in footer | State license is invalid for imports |
| IMP-02 | **IEC** (DGFT) + **AD code** with bank | Customs cannot clear without these |
| IMP-03 | Consignment shelf life **≥ 60% (or 3 months, whichever is less)** at import | FSS (Import) Regulations 2017 — top cause of port rejection |
| IMP-04 | Supplier contract: **≥ 18 months remaining shelf life at dispatch** | Protects IMP-03 |
| IMP-05 | Import only via **designated ports** (high-risk food category) | Non-designated port = refused consignment |
| IMP-06 | **PIF (Product Information File)** per SKU: formulation, ingredients per Schedule IV, CoA, shelf-life data, test methods | Nutra Regulations 2022 requirement |
| IMP-07 | Label: "Imported by" + registered address, country of origin, FSSAI logo + license no., "HEALTH SUPPLEMENT", "NOT FOR MEDICINAL USE", dosage, allergen, veg/non-veg mark, MRP, net qty, batch number, best before (month/year), consumer care | Legal Metrology + FSSAI labelling |
| IMP-08 | NABL lab test + FSSAI **NOC** per consignment before sale | Clearance gate |
| IMP-09 | GST **5%** applied and shown on invoice | Rate change effective 22 Sep 2025 |
| IMP-10 | **No "Made in India"** claim; "Imported" disclosure in footer and product page | Consumer protection / false claim risk |

---

## 12. Analytics & Tracking

| Event | Trigger | Key params |
|---|---|---|
| `view_home` | Page load | `referrer`, `utm_*` |
| `page_view` | Any page view after leaving home | `page_type` (`home`/`collection`/`pdp`/`cart`), `path` |
| `hero_cta_click` | CTA click | `cta_label`, `position` |
| `concern_card_click` | Card click | `concern_name`, `index` |
| `product_card_click` | Card click | `product_id`, `list_name`, `position` |
| `quick_add` | Add-to-cart from home | `product_id`, `value`, `currency` |
| `add_to_cart` | Add-to-cart on a product page | `product_id`, `value`, `currency` |
| `lab_report_click` | Lab report / COA link opened | `product_id`, `report_type`, `section` |
| `bundle_click` | Bundle or subscription CTA clicked | `bundle_id`, `price`, `savings_pct` |
| `quiz_start` / `quiz_complete` | Quiz flow | `step`, `result_products` |
| `newsletter_submit` | Form success | `channel` (email/whatsapp) |
| `faq_open` | Accordion open | `question` |
| `search_submit` | Search form submitted | `query`, `results_count` |
| `scroll_depth` | 25/50/75/100% | `percent` |
| `purchase` | Order confirmation page loads | `order_id`, `value`, `currency`, `items`, `payment_method` |
| `web_vitals` | LCP/CLS/INP reported before page hide | `metric`, `value`, `page` |

> `purchase` and `web_vitals` are required to measure G2 (conversion) and G5 (LCP). Without them those KPIs cannot be calculated.
> `page_view.page_type` is required to measure G1 (destination-based PDP CTR) and to keep G6 (quick-add) separate.

Tools: GA4 + Meta Pixel + server-side events (if budget allows). All gated behind consent.

- **No PII in event params** — never send email, phone, name or address; use a hashed user id (`user_id`) instead.

---

## 13. Integrations

| Need | Suggested |
|---|---|
| Storefront | Shopify (fastest) or Next.js + Commerce API |
| Payments | Razorpay / Stripe (UPI, cards, netbanking, COD) |
| Shipping | Shiprocket / Delhivery |
| Reviews | Judge.me / Loox / Yotpo |
| Email + WhatsApp | Klaviyo / Wati |
| Analytics | GA4 + GTM + Meta CAPI |
| CMS content | Shopify metafields or Sanity/Contentful |
| Support | WhatsApp widget + helpdesk (Freshdesk) |

**Integration security (required):** every webhook must be verified with an **HMAC signature** and be **idempotent** — retries must never double-charge or double-ship. API **secrets stay server-side** and are never shipped in the client bundle. Critical integrations (payments, shipping, messaging, analytics) each need a configured fallback or a documented degradation path.

---

## 14. Acceptance Criteria (QA checklist)

- [ ] All 16 sections render correctly at 360, 768, 1024, 1280, 1440 px.
- [ ] No horizontal scroll on any breakpoint.
- [ ] Lighthouse mobile: Performance ≥ 85, Accessibility ≥ 95, SEO ≥ 95, Best Practices ≥ 95.
- [ ] Core Web Vitals on throttled 4G: LCP ≤ 2.5 s (hero image/text), CLS ≤ 0.1, INP ≤ 200 ms.
- [ ] Cart badge updates without reload; drawer opens/closes via keyboard.
- [ ] All links resolve (no 404 from home).
- [ ] Every claim on the page has a source or is removed.
- [ ] Disclaimer + FSSAI number visible in footer.
- [ ] Consent banner blocks analytics until accepted.
- [ ] Structured data validates in Rich Results Test.
- [ ] Screen-reader pass: no unlabeled buttons, headings in order.
- [ ] CMS editor can change hero, bestsellers, FAQ without developer help.

---

## 15. Assumptions & Open Questions

**Locked (confirmed 2026-10-20)**
- India only · own-brand **import & resell** · INR · GST 5% on nutraceuticals.
- **FSSAI Central License (Importer)**; IEC + AD code; designated-port imports.
- Launch scale **~800 orders/month**, max **4 SKUs**.
- COD: cap ₹2,000, fee ₹29, prepaid discount ₹50, sealed-only returns, OTP confirmation.
- **Brand:** *Verda* (working name — trademark search pending before packaging). Tagline "Lab-backed. Not hype-backed."
- **Palette:** deep green `#17724A`, cream `#F6F7F4`, ink `#16211A`.
- **Typography:** Manrope (display) + DM Sans (body), two weights each, self-hosted.
- **Launch catalogue (4 SKUs):**
  | SKU | Concern | Format |
  |---|---|---|
  | Magnesium Glycinate 200 mg | Sleep | 60 capsules |
  | Probiotic 10B CFU | Gut | 30 capsules |
  | Vitamin D3 + K2 | Immunity | 60 tablets |
  | Biotin 10,000 mcg | Hair & Skin | 60 tablets |
- Energy, Joints and Fitness remain **"Coming soon"** concern cards.
- **Subscription:** Subscribe & Save **12%**, monthly, skip/cancel anytime.
- **Language:** English (IN) for v1; Hindi in v1.1.
- **Content:** build team drafts all copy, founder approves; **reviews are never fabricated** — empty "be the first to review" state until 20 real reviews exist.
- **Imagery:** branded SVG placeholders at spec sizes until real photography; no stock or AI product shots.

**Deferred (not blockers for the build)**
- Real product photography — required before public launch.
- Hindi translation (v1.1).
- Energy / Joints / Fitness catalogues.

**Assumptions (unchanged)**
- Single-brand D2C store; mobile traffic > 75%; Shopify vs Next.js decided at build time.

---

## 16. Suggested Build Milestones

| Phase | Deliverable | Duration |
|---|---|---|
| 1 | Content + assets + this PRD signed off | 3–4 days |
| 2 | Wireframe + design (desktop + mobile) | 4–5 days |
| 3 | Build (home + header/footer + cart drawer) | 6–8 days |
| 4 | QA + performance + accessibility + compliance review | 2–3 days |
| 5 | Launch | 1 day |

---

## 17. Authentication — Login / Sign up (v1)

> Reference pattern audited with **playwright-cli** on 20 Oct 2026 (practice e-commerce login page): social login on top, email + password with reveal toggle, "or use" divider, visible forgot-password and register links, required-field asterisks, inline validation. We keep the same clarity but lead with **phone OTP**, because Indian supplement buyers expect it and passwords are the #1 drop-off in checkout.

### 17.1 Principles

- **Guest-first:** nobody is forced to create an account to buy.
- **Phone-first:** mobile number + OTP is the primary identity in India; email is optional.
- **Password optional:** only needed if the user wants email login.
- **One identity per phone:** no duplicate accounts for the same number.
- **18+ only:** supplements are adult products.
- **Explicit consent:** no pre-ticked marketing boxes (DPDP Act 2023).

### 17.2 Flows

| Flow | Entry point | Steps | Result |
|---|---|---|---|
| Guest checkout | Cart → Checkout | Phone + address → pay | Order placed, account **not** created |
| Save after purchase | Order confirmation | "Save my details" → OTP | Account created, order linked |
| Sign up | Header / checkout | Phone → OTP → name (optional) | Logged in |
| Login | Header "Account" | Phone → OTP (default) **or** email + password | Logged in |
| Social login | Login screen | Google OAuth | Logged in |
| Forgot password | Login screen | Email → reset link (60 min) | New password set |
| Guest order claim | Login with same phone/email | OTP verify | Past guest orders appear in account |

### 17.3 Screens & fields

| Screen | Fields | Notes |
|---|---|---|
| Login | Phone (default tab) / Email + password tab, "Continue with Google" | Tab switch keeps entered value |
| Sign up | Phone, OTP, Name (optional), consent checkbox | No password at signup |
| OTP | 6-digit input, resend timer, "change number" | Auto-advance, paste supported |
| Forgot password | Email | Same success message for unknown email (no enumeration) |
| Account | Orders, addresses, subscriptions, returns, profile, logout all devices | Only after login |

### 17.4 Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| AUTH-01 | Guest checkout available on every order; no login wall | Must |
| AUTH-02 | Phone + OTP is the default login/signup method | Must |
| AUTH-03 | OTP: 6 digits, valid **5 minutes**, resend after **30 s**, max **5 attempts** then 15-min lock | Must |
| AUTH-04 | Email + password login available for users who set a password | Should |
| AUTH-05 | "Continue with Google" on login and signup | Should |
| AUTH-06 | Password rules: min 8 chars, show/hide toggle, strength hint, no forced complexity | Must |
| AUTH-07 | Forgot-password via email link, expires in 60 minutes, single use | Must |
| AUTH-08 | Duplicate phone: resolve silently — send OTP as normal, then log in to the existing account after verification; never reveal existence before verification | Must |
| AUTH-09 | Merge guest orders when the same phone verifies | Should |
| AUTH-10 | Post-purchase "Save my details" prompt (skippable) | Should |
| AUTH-11 | Email verification optional; unverified email cannot receive invoices | Could |
| AUTH-12 | Session persists 30 days (rolling), "logout all devices" available | Must |
| AUTH-13 | Account deletion + data export request, fulfilled within 30 days | Must |
| AUTH-14 | Marketing consent separate from terms consent, unticked by default | Must |
| AUTH-15 | Age confirmation "I am 18+" at signup | Must |
| AUTH-16 | All auth screens mobile-first, works at 360 px | Must |
| AUTH-17 | Full keyboard + screen-reader support; errors announced via `aria-live` | Must |
| AUTH-18 | Inline validation on blur, not on every keystroke | Should |
| AUTH-19 | No user enumeration: identical response for unknown phone/email | Must |
| AUTH-20 | Auth state reflected in header (Account / name / logout) | Must |
| AUTH-21 | Wishlist and cart merge on login (guest cart preserved) | Should |
| AUTH-22 | Rate limiting: 5 OTP requests per phone per hour, 20 per IP per hour | Must |

### 17.5 Validation & error copy

| Case | Message |
|---|---|
| Invalid phone | "Enter a valid 10-digit mobile number" |
| Wrong OTP | "That code is incorrect. 4 attempts left." |
| Expired OTP | "This code has expired. Send a new one." |
| Rate limited | "Too many attempts. Try again in 15 minutes." |
| Network failure | "Couldn't connect. Your details are safe — try again." |
| Duplicate account | After OTP verification only: "Welcome back — we found your account." (never reveal existence before verification) |

- Phone input: `+91` prefix fixed, 10 digits, numeric keypad, autofill (`autocomplete="tel-national"`).
- OTP input: `inputmode="numeric"`, `autocomplete="one-time-code"`.

### 17.6 Security

| Item | Requirement |
|---|---|
| Transport | HTTPS only, HSTS enabled |
| Passwords | Argon2id (or bcrypt cost ≥ 12), never logged |
| OTP storage | Hashed, single-use, expires 5 min, invalidated after success |
| Sessions | `HttpOnly`, `Secure`, `SameSite=Lax`, rotate on login |
| CSRF | Token on all auth mutations |
| Enumeration | Constant response time + generic copy |
| Bot protection | Captcha/risk check after 3 failed attempts |
| Audit | Login events with IP + user agent, retained 90 days |

### 17.7 Compliance (DPDP Act 2023)

- Consent screen lists purpose: order fulfilment / marketing / analytics — separate toggles, **unticked by default**.
- Privacy policy linked at the point of collection, not only in footer.
- Data minimisation: phone + address only; no gender/DOB unless needed.
- Grievance officer contact in footer and account page.
- Deletion/export request flow (AUTH-13) with SLA.
- No dark patterns: "Skip" and "Not now" have equal visual weight to "Save".

### 17.8 Analytics events (add to Section 12 on build)

| Event | Trigger | Key params |
|---|---|---|
| `auth_started` | Auth screen opened | `method` (otp/email/google), `entry_point` |
| `otp_requested` | OTP sent | `channel`, `attempt` |
| `otp_verified` | OTP accepted | `method` |
| `auth_completed` | Session created | `method`, `is_new_account` |
| `auth_failed` | Verification failed | `reason`, `attempt` |
| `guest_checkout_selected` | "Continue as guest" | `cart_value` |
| `account_created` | Signup finished | `method`, `source` |
| `logout` | User logs out | `all_devices` (bool) |

> These are auth-owned events. They do not replace `purchase` (G2) — conversion is still measured on order confirmation.

### 17.9 Acceptance criteria

- [ ] A first-time buyer can complete checkout without creating an account.
- [ ] OTP arrives within 10 seconds; resend works after 30 s.
- [ ] Expired/wrong OTP shows the exact copy in 17.5.
- [ ] Duplicate phone routes to login, never creates a second account.
- [ ] Guest order appears in the account after verification.
- [ ] Password reveal toggle works with keyboard only.
- [ ] Google login creates/links the same account as phone OTP.
- [ ] Session survives a browser restart and expires after 30 days.
- [ ] "Logout all devices" invalidates other sessions immediately.
- [ ] No auth screen reveals whether a phone/email exists.
- [ ] Marketing consent is unticked by default and not required to order.
- [ ] All screens pass WCAG 2.2 AA (labels, focus, contrast, error announcement).
- [ ] Account deletion removes personal data within 30 days (order records retained as legally required).

### 17.10 Out of scope (v1)

- Authenticator-app 2FA, SSO/SAML, multi-user business accounts.
- Social logins other than Google.
- Passwordless email magic-link login (reset link only).

---

*Next step: approve sections 1–4, answer the open questions, and I can produce the mobile/desktop wireframe and starter HTML prototype.*
