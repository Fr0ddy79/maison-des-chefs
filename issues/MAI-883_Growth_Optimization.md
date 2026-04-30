# MAI-883: Growth Optimization — 10:00 UTC Cycle

**Issue:** f7857539-cfc9-490f-b308-ad171531dfd1
**Created:** 2026-04-30 10:00 UTC
**Status:** ✅ Analyzed
**Owner:** Growth Marketer

---

## 1. Funnel Analysis

### Current State

| Page/Step | Status | Notes |
|-----------|--------|-------|
| Homepage (`/`) | ✅ Live | Hero + stats bar + search form |
| Chef Discovery (`/chefs`) | ✅ Live | Filters by cuisine, dietary, price |
| Services catalog (`/services`) | ✅ Live | Cards with demand badges |
| Service detail page (`/services/:id`) | ✅ Live | Price/person, guest selector, urgency messaging |
| Booking form (`/book/:serviceId`) | ✅ Live | Cookie pre-fill, trust messaging |
| Checkout page (Stripe) | ✅ Live | Upsell A/B test (MAI-875) |
| Inquiry confirmation email | ✅ Live | Sent immediately on submission |
| Quote reminder email (diner nudge) | ✅ Live | 48h after quote if no response |
| Booking status page | ✅ Live | Referral CTA + Book Again CTA (MAI-881) |
| Post-booking "book again" shortcut | ✅ Live | MAI-881 — just committed |

### Funnel Flow

```
Homepage Hero Search → Services Catalog → Service Detail → Booking Form → Confirmation Email
                                         ↓
                              ┌──────────┴───────────┐
                              ↓                      ↓
                    Chef responds (quote ✅)    Chef silent >48h
                              ↓                      ↓
                      Quote email sent         Stale lead email ✅
                              ↓                      ↓
                      Diner pays → Booking confirmed ✅
                              ↓
                      Referral CTA ✅ + Book Again CTA ✅
                              ↓
                      [Upsell A/B test live]
```

### What's Already Optimized (Recent Cycles)

| Feature | Issue | Status |
|---------|-------|--------|
| Pre-checkout upsell A/B test | MAI-875 | ✅ Done |
| Book Again CTA on booking status | MAI-881 | ✅ Done (just committed) |
| Quote reminder email (diner nudge) | MAI-795 | ✅ Done |
| Stale lead alert (chef dashboard) | MAI-841 | ✅ Done |
| Stripe checkout flow | MAI-850 | ✅ Done |
| Booking status page (token-based) | MAI-805 | ✅ Done |
| Post-booking referral CTA | MAI-823 | ✅ Done |
| Homepage launch | MAI-800 | ✅ Done |
| Service detail urgency + demand badge | MAI-768 | ✅ Done |
| Booking page trust messaging | MAI-834 | ✅ Done |
| Price calculator on service pages | MAI-854 | ✅ Done |

---

## 2. Growth Idea: Homepage Search — Add "What's the Occasion?" Dropdown

### Problem Identified

The homepage hero has a search form with **date**, **guests**, and **event type** — but critically **missing a cuisine filter**. Users browsing for "Italian private chef for birthday" must:
1. Search without specifying cuisine
2. Browse all chefs and services
3. Manually filter for Italian

This adds friction at the highest-intent moment (homepage search). The services catalog has quick-filter pills for cuisine, but the homepage hero — where first impressions form — doesn't.

### The Opportunity

Add a **cuisine dropdown** to the homepage hero search form. This creates a "search-ready" experience that filters results on the services page.

**Why this works:**
- Homepage is the #1 entry point for direct traffic
- First-time visitors use search to self-qualify; cuisine is a primary filter
- Matching the hero search to the services catalog UX reduces cognitive load
- No backend changes required — just a `<select>` dropdown + pass as query param

**Implementation (Low Effort, ~20 min)**

**File to modify:** `src/routes/pages.ts` — `buildHomePage()` function

**Changes:**
1. Add `<select name="cuisine">` to hero search form
2. Options: All Cuisines, French, Italian, Japanese, Mexican, Mediterranean, Latin American, French Fusion
3. Form already submits to `/services` as GET — cuisine param will be picked up by existing filter

**Current hero search form fields:**
- When is your event? (date) ✅
- Number of guests (guests) ✅
- Event type (type) ✅
- **Missing:** Cuisine type ❌

**Example search form after change:**
```
┌──────────────────────────────────────────────────────────────┐
│  When?          Guests        Event type       Cuisine       │
│  [date input]   [number]      [dropdown]      [dropdown]   │
│                                   [Search Chefs ▶]          │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Experiment Plan

### Test: Homepage Search With vs. Without Cuisine Filter

**Hypothesis:** Adding a cuisine dropdown to the homepage hero search will increase the % of homepage visitors who click through to the services catalog and ultimately submit a booking inquiry.

**Variant A (Control):** Current homepage hero search — date, guests, event type only
**Variant B (Test):** Homepage hero search + cuisine dropdown

**Implementation:**
- Add cuisine `<select>` to hero search form in `buildHomePage()`
- Options: All Cuisines, French, Italian, Japanese, Mexican, Mediterranean, Latin American, French Fusion
- On form submit, cuisine param is passed to `/services` and picked up by existing filter logic
- No backend changes

**Track:**
- Homepage → Services page conversion rate (Google Analytics or console event)
- Services page → Booking form conversion rate
- Inquiry submission rate per homepage visitor

**Success Criteria:**
- Homepage → Services click-through increases by >10%
- No negative impact on overall homepage engagement (bounce rate flat or improved)
- At least 30 days for statistical significance given low traffic

**Duration:** 30 days minimum

---

## 4. Expected Impact

| Metric | Current | Expected | Confidence | Notes |
|--------|---------|----------|------------|-------|
| Homepage → Services CTR | Baseline (needs tracking) | +10-15% | Medium | Cuisine self-qualification reduces friction |
| Booking inquiry rate | Unknown | +5-10% | Low | Depends on traffic quality improvement |
| Bounce rate | Unknown | Neutral / slight improve | Medium | More relevant search = more engaged visitors |

**Rationale:** A cuisine filter on the hero is a low-effort, zero-risk change that signals "we have exactly what you're looking for." It pre-qualifies traffic before reaching the services catalog, reducing drop-off from irrelevant results.

---

## 5. Blocked Work

| Item | Blocker | Status |
|------|---------|--------|
| Homepage traffic analytics | GA4 or equivalent not configured | 🔴 TODO |
| A/B testing infrastructure | MAI-167 A/B test framework in progress | 🟡 In progress |
| Services page → booking form pre-fill | Guest count not passed via URL | 🔴 TODO |
| Review/testimonial system | No reviews table | 🔴 TODO |
| Chef response time SLA | Not tracked/displayed | 🔴 TODO |

---

## 6. Metrics to Track

| Metric | How to Measure | Target |
|--------|---------------|--------|
| Homepage → Services CTR | Console event on search submit | Establish baseline |
| Services → Booking form CTR | Console event on "Book" click | Establish baseline |
| Inquiry submission rate | Bookings/leads created per week | Establish baseline |
| Homepage bounce rate | Google Analytics | Reduce by >5% |
| Cuisine filter usage rate | % of searches using cuisine filter | >30% |

**Note:** Current analytics only log to console. Recommend implementing page-view event tracking (MAI-XXX) to establish funnel baselines across all pages.

---

## 7. Related Issues

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-875 | Pre-checkout upsell A/B test | ✅ Done |
| MAI-881 | Book Again CTA | ✅ Done |
| MAI-868 | Growth Optimization 04:00 UTC | ✅ Analyzed |
| MAI-697 | Abandoned booking recovery email | ✅ Analyzed |
| MAI-167 | A/B testing framework | 🔄 In progress |

---

## 8. Next Steps

1. **Builder adds cuisine dropdown** to homepage hero search form (~20 min)
2. **Add console event** to track homepage search submissions with cuisine param
3. **Monitor for 2 weeks** — measure homepage → services click-through lift
4. **If positive:** Add cuisine quick-filter as 4th hero field alongside date/guests/type
5. **If neutral:** Test event-specific CTAs ("Plan Your Birthday Dinner" vs generic "Book a Chef")

---

## 9. Definition of Done

- [x] Funnel analyzed (all steps mapped with status)
- [x] 1 improvement identified (homepage cuisine filter on hero search)
- [x] Experiment plan documented (with vs. without cuisine dropdown)
- [x] Expected impact estimated (10-15% homepage → services CTR lift)
- [x] Metrics to track defined
- [x] Blocked work noted

---

*Growth Optimization — MAI-883 — Growth Marketer — 2026-04-30 10:00 UTC*
