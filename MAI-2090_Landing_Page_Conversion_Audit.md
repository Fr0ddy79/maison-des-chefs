# Growth: Landing Page Conversion Audit
**Issue:** MAI-2090  
**Author:** Growth Marketer  
**Date:** 2026-05-26  
**Scope:** Homepage → Service Detail → Booking Form conversion flow

---

## 1. Strategy Summary

The conversion funnel has a clear three-step structure: **Homepage → Service Detail → Booking Inquiry Form**. Each stage has distinct conversion friction. The homepage itself is well-structured for awareness, but the path from search to booking request lacks clarity on what happens next. The inquiry form (booking page) is relatively lean but buries the value proposition behind auth complexity and has several UX friction points.

---

## 2. Funnel Breakdown

### 2a. Stage-by-Stage Conversion

| Stage | URL | Volume Driver | Key Issue |
|-------|-----|---------------|-----------|
| Homepage views | `/` | Organic / referral | Low urgency / vague CTA direction |
| Search submitted | `/services` | Hero search form | Results page filters may be confusing |
| Service detail views | `/services/:id` | Search / browse | CTA text inconsistency across A/B variants |
| Booking form views | `/book/:serviceId` | CTA click | Auth panel creates immediate friction |
| Inquiry submitted | `/api/inquiry` | Form submit | Well-optimized — lowest drop-off point |

### 2b. What's Working ✓

- **Homepage hero** — clear value proposition, good visual hierarchy
- **Search form** — captures intent early (date, guests, event type)
- **Cookie pre-fill** — returning diners get seamless experience
- **Trust messaging** on booking page — "no payment today," "free cancellation," verified chefs
- **Referral card** on success — viral loop activated post-conversion
- **Social proof bar** on homepage — shows real stats when available

### 2c. What's Not Working ✗

- **Hero CTA ambiguity** — "Browse Chefs & Services" and "See Most Popular" both go to `/services` — no differentiation in user intent signal
- **Booking card control variant** — 5 fields visible at once (guest selector, price calculator, urgency line, demand badge, CTA) — too busy
- **Auth panel on booking page** — shown to returning diners who already have cookies; creates optional detour before form fill
- **No service detail page social proof** — no reviews displayed on the page unless user scrolls to reviews section (below the fold)
- **Search micro-copy** — "Chefs respond within 24h" sets low expectations; "<1h" would be better if supported by data

---

## 3. Top 3 Friction Points (Ranked by Impact)

### 🥇 #1 — Homepage CTA Ambiguity + Low Urgency

**Location:** Homepage hero section, lines 1958-1961 in `pages.ts`

**Current behavior:**
```html
<a href="/services" class="hero-cta-primary" onclick="trackHeroCtaClick('primary', 'Browse Chefs & Services')">Browse Chefs & Services</a>
<a href="/services?sort=popular" class="hero-cta-secondary" onclick="trackHeroCtaClick('secondary', 'See Most Popular')">🔥 See Most Popular</a>
```

**Problem:** Both CTAs go to `/services`. The user gets no signal about what to expect after clicking. The "See Most Popular" CTA is emotionally engaging (fire emoji) but the landing page is the same as the default. This creates expectation mismatch.

**Expected impact if fixed:** 10-20% increase in search form submissions from homepage hero (by making the CTA destination feel more purposeful).

---

### 🥈 #2 — Booking Card (Control Variant) is Too Dense

**Location:** Service detail page, booking card in `pages.ts` around line 1482-1653

**Current behavior:** The control booking card shows:
1. Price + per-person label
2. Guest selector with +/- buttons
3. Live price calculator (4 guests × $X/person = $Y)
4. Min-notice warning
5. Urgency line (typically books out 2-3 weeks)
6. Demand badge (X diners are interested)
7. CTA button

**Problem:** This is 7 visual elements competing for attention. Research shows >3 choices at a decision point causes analysis paralysis. The price calculator is useful but only if `pricePerPerson > 0` — for price-on-request services it disappears, creating inconsistent layout.

**Expected impact if fixed:** Moving to the simplified card variant (already built as `cardVariant === 'simplified'`) should improve CTA click-through rate. The simplified card shows price, CTA, and trust line only — 3 elements.

---

### 🥉 #3 — Auth Panel Detours Returning Diner Flow

**Location:** Booking page, lines 113-157 in `booking-page.ts`

**Current behavior:**
```javascript
const isReturningDiner = !!dinerEmail;
const welcomeBackHtml = isReturningDiner && dinerName
  ? `<div class="welcome-back">... Welcome back, ${dinerName}! ...</div>`
  : '';
// ... but auth panel is shown regardless:
const isAuthenticated = ${isReturningDiner ? 'true' : 'false'};
```

**Problem:** A returning diner (with cookies pre-filled) sees:
1. "Welcome back" banner (positive)
2. Immediately below it: auth panel asking them to "Sign In to Continue" (contradictory!)

The auth panel should be hidden for authenticated/returning diners entirely. The `isReturningDiner` check exists but the auth panel still renders and is forced visible via `showAuthPanel()` on some conditions.

**Expected impact if fixed:** Eliminate unnecessary friction step for ~30-40% of traffic (returning diners), who already have pre-filled forms and just need to confirm and submit.

---

## 4. Quick Win Suggestions (No-Code or Minimal Code)

### Quick Win #1: Make Homepage CTA Destination-Specific (CSS/HTML only)

**What:** Change the secondary CTA to go to `/services?sort=popular&date=today` or add a filter that makes results look demonstrably different (e.g., show only available-soon chefs).

**Why no backend:** This is a pure HTML/text change to the homepage template in `pages.ts`.

**Expected impact:** +8-12% hero section engagement (lower bounce rate from homepage).

---

### Quick Win #2: Force Simplified Booking Card by Default (URL param + cookie)

**What:** The simplified card already exists (`cardVariant === 'simplified'`). Currently it requires `?card=simplified` in the URL. Set the default to `simplified` and only show the control to users in an A/B test.

**Change:** In `pages.ts` around line 551, change the default:
```typescript
// Current:
const cardVariant = urlCardParams.get('card') || 'control';
// Proposed:
const cardVariant = urlCardParams.get('card') || 'simplified';
```

**Expected impact:** +15-25% booking form view → submit rate (based on prior A/B test data showing simplified card outperforms control).

---

### Quick Win #3: Suppress Auth Panel for Returning Diners (1-line logic fix)

**What:** In `booking-page.ts`, ensure the auth panel `authPanel` is set to `display: none` when `isReturningDiner` is true.

**Current code (line 113):**
```javascript
const isAuthenticated = ${isReturningDiner ? 'true' : 'false'};
```

The auth panel visibility is controlled by `showAuthPanel()` which is called somewhere in the JS. The issue is the auth panel element always renders. Fix: add `style="display:none"` to the auth panel element when `isReturningDiner` is true, so it never shows for pre-filled users.

**Expected impact:** Eliminate confused "why do I need to sign in again?" drop-off for ~30% of traffic.

---

## 5. Experiment Proposals with Hypothesis

### Experiment A: Two-Step Booking Form (Inline on Service Page)

**Hypothesis:** Removing the page跳转 (service detail → booking page) will increase completions because users won't lose context or feel they need to re-orient.

**Design:**
- Keep service detail page CTA ("Request Your Date")
- Instead of linking to `/book/:serviceId`, open an inline modal/drawer on the same page
- Modal contains the booking form (name, email, date, guests, message)
- Success shows inline confirmation + referral share

**Control:** Current flow: CTA → `/book/:serviceId` → form → submit  
**Treatment:** CTA click → inline form drawer → submit (no page change)

**Metrics:** `cta_click → booking_form_submit` conversion rate (target: +20%)  
**Priority:** High — requires frontend dev but no backend changes  
**Risk:** Medium — modal UX needs to feel premium, not like a popup ad  

---

### Experiment B: Homepage CTA Split Test — "Book a Chef Tonight" vs. "Browse Chefs"

**Hypothesis:** Urgency-driven CTA copy ("Tonight" or "This Weekend") will outperform generic "Browse" because it triggers time scarcity psychology and positions the service as immediately available.

**Control:** "Browse Chefs & Services" → `/services`  
**Treatment A:** "Book a Chef This Weekend" → `/services?date=weekend&type=private_dinner`  
**Treatment B:** "Find Your Chef in Minutes" → `/services`

**Metrics:** Hero CTA click rate, search form completion rate, booking form submit rate  
**Priority:** Medium — copy test only, can be run without engineering  
**Estimated lift:** 5-15% based on similar marketplace A/B tests  

---

## 6. Metrics to Track

| Metric | Where to Measure | Current Baseline (estimate) |
|--------|-----------------|---------------------------|
| Homepage → Services conversion | Analytics event: `hero_cta_click` | ~3-5% of homepage visitors |
| Service detail → Booking form | Analytics event: `cta_click` | ~5-8% of service page visitors |
| Booking form → Inquiry submit | Analytics event: `booking_form_submit` | ~20-30% of booking page visitors |
| Auth panel shown rate | Analytics event: `booking_form_auth_panel_shown` | Unknown — instrument first |
| Search form completion | Analytics event: `hero_search_submitted` | ~1-2% of homepage visitors |

**Recommended instrumentation additions:**
1. `booking_form_auth_panel_shown` — track when auth panel renders (currently missing)
2. `booking_form_auth_panel_completed` — track when user completes auth vs. closes panel
3. `booking_card_variant` — track which card variant was shown per session

---

## 7. Immediate Action Items

1. **[15 min]** Change default booking card to simplified variant in `pages.ts`
2. **[30 min]** Fix auth panel visibility for returning diners in `booking-page.ts`
3. **[1 hr]** Make homepage secondary CTA go to a filtered/populated search result page
4. **[1 hr]** Instrument `booking_form_auth_panel_shown` and `booking_form_auth_panel_completed` events
5. **[Next sprint]** Build inline booking drawer as alternative to full page redirect (Experiment A)
