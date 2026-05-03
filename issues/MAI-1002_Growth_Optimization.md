# MAI-1002: Growth Optimization — 22:00 UTC Cycle

**Issue:** 5babd709-cc58-4182-a97e-7bb4488ecc56
**Created:** 2026-05-02 22:00 UTC
**Status:** ✅ Analyzed
**Owner:** Growth Marketer

---

## 1. Funnel Analysis

### Current System State

| Page/Step | Status | Notes |
|-----------|--------|-------|
| Homepage (`/`) | ✅ Live | Hero CTAs + stats bar + search micro-copy (MAI-973) |
| Services catalog (`/services`) | ✅ Live | Compare bar for 1+ chefs (MAI-959) |
| Service detail page (`/services/:id`) | ✅ Live | CTA A/B test (MAI-917) — 5 variants |
| Booking form (`/book/:serviceId`) | ✅ Live | Trust messaging + analytics |
| Checkout / Stripe | 🔴 Blocked | MAI-618: Stripe keys not provided |
| Email system | ⚠️ Stubbed | RESEND_API_KEY not configured |
| Post-booking referral | ✅ Live | Shareable referral code |
| Booking status page | ✅ Live | Token-based lookup |
| Reviews | ✅ Live | MAI-940 implemented |

### Funnel Flow

```
Homepage → Services Catalog → Service Detail → Booking Form → Checkout → Payment
   ✅              ✅               ✅              ✅          🔴 BLOCKED
```

### Analytics State

| Event Type | Tracked | Persisted |
|------------|---------|-----------|
| `service_page_view` | ✅ | ✅ (historical) |
| `cta_click` (service detail) | ✅ console | ❌ Not persisted |
| `booking_form_submit` | ✅ | ❌ Not persisted |
| `booking_inquiry_success` | ✅ | ❌ Not persisted |
| `page_view` (homepage) | ✅ console | ❌ Not persisted |

**Key Issue:** Analytics events only go to console. No persistence to JSONL despite historical data existing.

---

## 2. Growth Idea: Add Homepage CTA Click Tracking

### Problem Identified

The homepage has **two hero CTAs** that drive traffic to the services catalog:
- Primary: "Browse Chefs & Services" → `/services`
- Secondary: "🔥 See Most Popular" → `/services?sort=popular`

These CTAs have **no click tracking**. We can't answer:
1. Which CTA variant gets more clicks?
2. What's the homepage → services catalog CTR?
3. Do users who click CTAs convert better than search form users?

### The Opportunity

Adding `cta_click` tracking on the homepage CTA buttons enables:
1. Homepage CTA CTR measurement (clicks / homepage sessions)
2. Comparison of primary vs. secondary CTA performance
3. Funnel analysis: Homepage CTA click → service page view → booking form view → inquiry

### Implementation

**Change:** In `src/routes/pages.ts`, homepage CTA buttons (lines ~1275-1290):

```html
<!-- Primary CTA -->
<a href="/services" class="hero-cta-primary" 
   onclick="trackHomepageCTAClick('primary', this)">Browse Chefs & Services</a>

<!-- Secondary CTA -->
<a href="/services?sort=popular" class="hero-cta-secondary"
   onclick="trackHomepageCTAClick('secondary', this)">🔥 See Most Popular</a>
```

**Add JS function:**
```javascript
function trackHomepageCTAClick(ctaType, btn) {
  const data = {
    event: 'homepage_cta_click',
    cta_type: ctaType,  // 'primary' or 'secondary'
    url: btn.href,
    timestamp: Date.now()
  };
  console.log('[Analytics] Homepage CTA click:', data);
  // Also send via sendBeacon to /api/analytics/event
  navigator.sendBeacon && navigator.sendBeacon('/api/analytics/event', JSON.stringify(data));
}
```

### Expected Impact

| Metric | Current | Expected | Notes |
|--------|---------|----------|-------|
| Homepage CTA CTR | ❌ Unknown | ✅ Trackable | Clicks / homepage sessions |
| Primary vs. Secondary CTA performance | ❌ Unknown | ✅ Measurable | Optimize copy/placement |
| Funnel: CTA click → service page → booking | ❌ No link | ✅ Joinable | Via service_id in session |

---

## 3. Experiment Plan

### Test: Homepage Primary vs. Secondary CTA Copy

**Hypothesis:** Testing alternative copy for the primary CTA will improve homepage → services catalog click-through rate.

**Variants:**
- Control: "Browse Chefs & Services" (primary) / "🔥 See Most Popular" (secondary)
- Variant A: "Find Your Private Chef" (primary) / "🔥 Most Popular Services" (secondary)
- Variant B: "Explore Chef Experiences" (primary) / "🔥 Trending Now" (secondary)

**Track:**
- `homepage_cta_click` by cta_type and variant
- `service_page_view` via existing tracking
- `booking_form_view` (once MAI-998 implemented)

**Success Criteria:**
- Homepage CTA CTR ≥ 5% (clicks / homepage sessions)
- Winner shows ≥10% lift over control
- Statistical significance: p < 0.05, min 200 clicks per variant

**Duration:** 7 days or until 500+ CTA clicks per variant

---

## 4. Blocked Work

| Item | Blocker | Status |
|------|---------|--------|
| Checkout / payment | MAI-618: Stripe keys not provided | 🔴 Fred |
| Email system | RESEND_API_KEY not configured | 🔴 Fred |
| Analytics persistence | MAI-997: Implementation exists but not persisted | 🔄 BE |
| Booking form view event | MAI-998: Not implemented | 🔄 FE |

---

## 5. Metrics to Track

| Metric | How to Measure | Target |
|--------|---------------|--------|
| `homepage_cta_click_rate` | CTA clicks / homepage sessions | >5% baseline |
| `primary_cta_vs_secondary` | Primary / secondary click ratio | 60/40 or better |
| `homepage_to_services_cvr` | Service page views from homepage / homepage sessions | >15% |
| `cta_click_to_booking_cvr` | Booking form views / CTA clicks | Establish baseline |

---

## 6. Related Prior Work

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-917 | Service detail CTA A/B test | ✅ Live (5 variants) |
| MAI-973 | Homepage search micro-copy | ✅ Implemented |
| MAI-959 | Compare bar single-chef enable | ✅ Implemented |
| MAI-997 | Analytics persistence | 🔄 BE (task done, code pending) |
| MAI-998 | Booking form view event | 🔄 FE (not started) |

---

## 7. Definition of Done

- [x] Funnel analyzed (all steps mapped with status)
- [x] 1 improvement identified (homepage CTA click tracking)
- [x] Experiment plan documented (A/B test for homepage CTAs)
- [x] Expected impact estimated
- [x] Metrics to track defined
- [x] Blocked work noted

---

*Growth Optimization — MAI-1002 — Growth Marketer — 2026-05-02 22:00 UTC*