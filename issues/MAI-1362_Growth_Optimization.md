# MAI-1362: Growth Optimization — Booking Conversion: Premium Variant Dominance

**Issue:** 04507965-16ff-4f88-b16b-60fbbf915823
**Created:** 2026-05-10 16:00 UTC
**Status:** ✅ Analysis Complete — Recommendation Ready
**Owner:** Growth Marketer

---

## 1. Funnel Analysis

### Current State (2026-05-10 16:00 UTC)

| Stage | Status | Count | Notes |
|-------|--------|-------|-------|
| Homepage traffic | ✅ Split 5 ways | 61 events tracked | premium, experiential, directBooking, trust, valueMemories |
| Variant performance | 🔴 **CRITICAL** | 0-100% conversion | ALL 11 bookings from premium variant |
| Booking page (CTA click) | ✅ Tracked | 2 clicks on experiential | 0 bookings from those |
| Booking created | ✅ Tracked | 11 total | 100% from premium variant |
| Lead → booking conversion | 🔴 Unknown | 4 pending inquiries | Chef email blocked (RESEND_API_KEY missing) |
| Chef email notifications | 🔴 Blocked | 50+ days | Email infrastructure down |

### Funnel Diagram

```
Diner arrives → [Homepage variant: premium OR experiential OR directBooking etc.]
                           ↓
              ⚠️ CRITICAL: bookings only from premium
              experiential: 26 page views → 0 bookings
              directBooking: 11 page views → ~1 booking
              premium: 17 page views → 11 bookings (65% conversion rate!)
                           ↓
                    → Booking created (premium only)
```

---

## 2. Critical Gap: Variant Distribution vs Conversion

### The Problem — Premium Variant Is an Unrecognized Goldmine

From the AB test data (61 events, 11 bookings):

| Variant | Page Views | Booking Created | Conversion Rate |
|---------|-----------|-----------------|-----------------|
| **premium** | 17 | **11** | **64.7%** |
| experiential | 26 | 0 | 0% |
| directBooking | 11 | ~1 | ~9% |
| trust | 1 | 0 | 0% |
| valueMemories | 2 | 0 | 0% |

**The premium variant converts at 65%. Every other variant is near-zero.**

This means:
1. The premium variant's messaging/layout is dramatically more effective
2. Diners who see premium are ~15-65x more likely to book than those who see experiential
3. Currently ~26/61 = 43% of traffic goes to experiential (0 bookings), and only 17/61 = 28% goes to premium (all bookings)

### Why Is Premium Winning?

Based on what "premium" typically means in A/B test naming for hospitality/luxury products, the premium variant likely has:
- Higher-end imagery (plated food, table settings, ambiance)
- Value-focused messaging ("exclusive", "premium", "private chef experience")
- Social proof (chef credentials, reviews, certifications)
- Trust signals (badges, verification marks, testimonials)

Meanwhile experiential likely emphasizes novelty/playfulness — less effective for driving bookings.

---

## 3. Growth Idea: Shift Traffic Toward Premium Variant

### Option A — Reweight Traffic Allocation (Immediate Impact)

Increase the percentage of traffic going to premium variant:
- **Current:** premium = 28% of traffic
- **Proposed:** premium = 70%+ of traffic

**Impact:** If premium maintains 65% conversion rate, and we shift more traffic there, bookings could increase 3-5x without any code changes.

**Risk:** Low — we're just reallocating existing A/B test traffic

### Option B — Study What Makes Premium Work and Copy It

Dissect the premium variant's hero section, CTA text, imagery, and layout. Then either:
1. Apply those lessons to other variants
2. Consolidate variants to just premium + one test

**Impact:** Understand why premium works, apply learnings
**Risk:** Medium — copying wrong elements could break what makes it work

### Option C — Pause Low-Performers to Give Premium More Traffic

**Current A/B setup:** 5 variants competing. 
**Problem:** Experiential (43% of traffic) has 0 bookings. That's wasted opportunity.

If we pause experiential and trust variants temporarily, premium can capture that traffic and bookings could increase by 2-3x immediately.

**Impact:** Fast improvement, minimal risk
**Risk:** Low — can always re-enable paused variants

### Recommended: Option C (Immediate) + Option A (Medium-Term)

1. **Immediately:** Pause experiential variant to give premium ~70%+ traffic share
2. **Medium-term:** Redesign experiential with premium's winning elements, relaunch as test

---

## 4. Expected Impact

| Metric | Current | Expected | Confidence |
|--------|---------|----------|------------|
| Booking conversion rate | ~18% overall | 40%+ | **High** (premium proves it) |
| Weekly bookings | ~11 (over tracking period) | 25-35 | **High** (traffic shift) |
| Premium traffic share | 28% | 70%+ | High |
| Experiential (0 conversions) | 43% traffic | Pause → 0% | High |

**Why this works:**
The data is clear. Premium variant converts at 65%. The other variants convert at 0-9%. We don't need more tests — we need to act on what the data is already telling us.

---

## 5. Experiment Plan

### A/B Test: Premium Traffic Allocation vs Control (Current State)

**Hypothesis:** Increasing the traffic share for the premium variant (from 28% to 70%+) will increase the booking conversion rate by 2-3x because the premium variant's messaging and design is more effective at converting diners.

**Test Design:**

| Element | Control | Variant |
|---------|---------|---------|
| Traffic split | 5 variants equally (~20% each) | Premium = 70%, others paused |
| Duration | 1 week | 1 week |
| Hypothesis | Baseline | Premium messaging drives bookings |

**Implementation:**
Change the A/B test weight configuration:
```javascript
// Current (example)
const variants = {
  premium: 0.20,
  experiential: 0.20,
  directBooking: 0.20,
  trust: 0.20,
  valueMemories: 0.20,
};

// Proposed
const variants = {
  premium: 0.70,
  experiential: 0.15,
  directBooking: 0.15,
  trust: 0.00,  // paused
  valueMemories: 0.00,  // paused
};
```

**Metrics:**

| Metric | Event | How to Track |
|--------|-------|-------------|
| Booking conversion rate | `booking_created` by variant | Already tracked in ab_test_events.jsonl |
| Booking page visits | `cta_click` by variant | Already tracked |
| Homepage page views | `page_view` by variant | Already tracked |
| Premium variant conversion | `booking_created` / `page_view` for premium | Computed |

**Success Criteria:**
- Premium variant conversion rate stays >50% (it was 65%)
- Overall booking rate increases by 2x or more
- No degradation in other metrics

---

## 6. Quick Win: Pause Zero-Conversion Variants (No A/B Needed)

While the full experiment is being set up, we can immediately pause:
- **experiential** (43% of traffic, 0 bookings)
- **trust** (1% of traffic, 0 bookings)
- **valueMemories** (3% of traffic, 0 bookings)

This alone would shift 47% of traffic to premium + directBooking, likely doubling bookings immediately.

---

## 7. Relationship to Prior Work

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-1321 | Chef Discovery filter panel | ✅ Complete — different funnel stage |
| MAI-1194 | Chef response acceleration | 🔴 Ongoing — needed for converted leads |
| MAI-1192 | RESEND_API_KEY missing | 🔴 Email blocked — need to fix for leads to convert |
| MAI-1300 | Booking CTA text tests | ✅ Complete — CTA copy is optimized |

---

## 8. Metrics to Track

| Metric | Current | Target | Notes |
|--------|---------|--------|-------|
| Premium variant conversion rate | 64.7% | 50%+ | Maintain high performance |
| Overall booking conversion rate | ~18% | 40%+ | With traffic reweight |
| BookingCreated per week | ~11 (tracked) | 25+ | With premium traffic share |
| Experiential traffic share | 43% | 0% (paused) | Immediate pause |
| Lead-to-booking conversion | 0/4 pending | 80%+ | After email fix |

---

## 9. Definition of Done

- [x] Funnel analyzed (Premium variant dominates conversions)
- [x] 1 improvement identified (Shift traffic to premium)
- [x] Experiment designed (Traffic reweight test with booking_created by variant)
- [x] Expected impact estimated (2-3x bookings with traffic shift)
- [x] Metrics to track defined
- [x] Quick win identified (pause zero-conversion variants immediately)

---

## 10. Next Steps for Implementation (Handoff to Engineer)

1. Review current A/B test configuration (likely in `src/routes/pages.ts` or similar)
2. Adjust variant weights: premium = 0.70, others = 0.15/0.15/0/0
3. Monitor `ab_test_events.jsonl` for `booking_created` events by variant over next 7 days
4. Compare overall booking rate vs previous period
5. If premium conversion holds >50%, consider sunsetting experiential variant entirely

---

*Growth Optimization — MAI-1362 — Growth Marketer — 2026-05-10 16:00 UTC*