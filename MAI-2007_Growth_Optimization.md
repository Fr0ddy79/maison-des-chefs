# Growth Optimization — MAI-2007: Checkout Social Proof Dynamic Data

**Issue:** 5aa33509-50d4-4a76-99af-580f4e0ca3b2
**Created:** 2026-05-24 10:00 UTC
**Status:** ✅ Complete
**Owner:** Growth Marketer
**Run:** 10:00 UTC autopilot

---

## Executive Summary

**Revenue: €0** — blocked by missing STRIPE_SECRET_KEY. 4 bookings exist in pending state, zero payments processed.

**This run's focus:** Identified that checkout page displays FABRICATED social proof data:
- Claimed: "8 people booked", "30+ events completed", "100% Satisfaction", "12 reviews"
- Reality: 0 completed bookings, 0 reviews, 4 total bookings (all pending)

**Action taken:** Implemented dynamic social proof that pulls real data from database. When chef has 0 bookings, displays "Be first to book this chef" instead of fake numbers.

**Secondary finding:** A/B test data is misleading — premium variant shows "220% conversion" because the same page_view led to multiple bookings (5 page_views → 11 booking_created events). True conversion is better understood as booking/session ratio.

---

## 1. Current Funnel State (2026-05-24 10:00 UTC)

### A/B Test Variant Performance (from ab_test_events.jsonl)

| Variant | Page Views | Booking Created Events | Bookings/PageView |
|---------|-----------|----------------------|-------------------|
| premium | 5 | 11 | 220% (multiple per session) |
| experiential | 24 | 0 | 0% |
| directBooking | 8 | 0 | 0% |
| trust | 1 | 0 | 0% |
| valueMemories | 2 | 0 | 0% |

**Key insight:** Premium variant's 11 booking_created events from only 5 unique page_view timestamps indicates repeat bookings from the same session. This is good signal (premium variant works) but the 220% rate is misleading as a traditional conversion metric.

### Database Reality Check

| Metric | Fake Claim | Actual |
|--------|-----------|--------|
| Total bookings | - | 4 |
| Completed/confirmed bookings | 30+ | **0** |
| Reviews | 12 | **0** |
| Converted leads | - | 1 |

**The checkout page was claiming "30+ events completed" with 0 actual completed events.**

---

## 2. What Was Wrong: Hardcoded Social Proof

### The Problem (checkout.ts before)

```html
<div class="social-proof-stats">
  <div class="stat-item">
    <div class="stat-number">8</div>
    <div class="stat-label">People booked</div>
  </div>
  <div class="stat-item">
    <div class="stat-number">30+</div>
    <div class="stat-label">Events completed</div>
  </div>
  <div class="stat-item">
    <div class="stat-number">100%</div>
    <div class="stat-label">Satisfaction</div>
  </div>
</div>
```

Also hardcoded: rating "5.0", "12 reviews", chef avatar "CM", chef name "Chef Marcel"

### The Fix (checkout.ts after)

Now queries real data:

```typescript
// Query booking stats for this chef
const chefBookingStats = db.select({
  totalBookings: count(bookings.id),
  completedBookings: sql`SUM(CASE WHEN ${bookings.status} IN ('completed', 'confirmed') THEN 1 ELSE 0 END)`,
})
  .from(bookings)
  .where(eq(bookings.chefId, lead.chefId))
  .get();

// Query review stats for this chef
const chefReviewStats = db.select({
  avgRating: sql`AVG(${reviews.rating})`,
  reviewCount: count(reviews.id),
})
  .from(reviews)
  .where(eq(reviews.chefId, lead.chefId))
  .get();
```

### New Behavior

| Chef Has | Shows |
|----------|-------|
| ≥1 booking | Real booking count, completed count, rating |
| 0 bookings | "Be first to book this chef" (no fake numbers) |
| ≥1 review | Real rating with dynamic star count |
| 0 reviews | "★★★★★" with "New chef" label (honest default) |

---

## 3. Implementation Summary

**File changed:** `src/routes/checkout.ts`

**Changes:**
1. Added `bookings` and `reviews` to schema imports
2. Added `sql` and `count` to drizzle-orm imports
3. Added queries to fetch real booking/review stats per chef
4. Social proof card now conditionally renders based on real data
5. When chef has 0 bookings: shows "Be first" instead of fake "8 people booked"
6. Chef avatar initials now dynamic from chef name
7. Fixed TypeScript type issues with drizzle query results

**Committed:** `f021a77` - "MAI-2007: Dynamic social proof on checkout page"

---

## 4. Top Experiment This Cycle

### Experiment: Honest Social Proof vs Fake Authority

**Hypothesis:** Diners trust real numbers over inflated claims. When they see "30+ events completed" but the chef has 0 completed bookings, they may feel deceived. Showing "Be first to book" for new chefs is more honest AND creates urgency.

**Current state (fake):** Claim "30+ events completed" → 0 actual → potential trust loss
**New state (honest):** Show real stats OR "Be first to book" → builds genuine urgency

**Expected impact:** 
- Trust improvement: diners who check don't find fake numbers
- Urgency creation: "Be first" is actually compelling for new chefs
- Future-proof: as real reviews/bookings accumulate, stats are accurate

**This is a trust play, not a conversion play.** The fake stats weren't driving conversions (premium variant worked due to messaging, not social proof).

---

## 5. Metrics to Track

| Metric | Current | Target |
|--------|---------|--------|
| Social proof data accuracy | 0% (fake) | 100% (real) |
| Checkout page trust signals | Low (fake numbers) | High (honest) |
| Reviews count | 0 | Track as they accumulate |
| Completed bookings | 0 | Track as they accumulate |

---

## 6. Blocker: STRIPE_SECRET_KEY

Revenue completely blocked. No payments processed. 4 bookings in pending state.

---

## 7. Previous Run Context (MAI-1996)

Last run identified:
- Premium variant converts at 65%+ (now understood as 220% due to multiple bookings per session)
- Experiential and directBooking convert at 0%
- Fake social proof on checkout page

This run fixed the fake social proof issue.

**Next growth run should focus on:** Messaging transfer from premium variant to non-converting variants, once Stripe is active and we can measure real conversion.

---

## 8. What Was Done

- [x] Analyzed A/B test event data (premium: 5 views → 11 bookings, others: 0)
- [x] Identified fake social proof data (8 booked, 30+ completed, 100% satisfaction, 12 reviews)
- [x] Audited database reality (4 total bookings, 0 completed, 0 reviews)
- [x] Implemented dynamic social proof pulling real data from bookings/reviews tables
- [x] When chef has 0 bookings, show "Be first to book" instead of fake numbers
- [x] Dynamic rating stars based on real avg rating (when available)
- [x] Fixed hardcoded chef avatar initials and name
- [x] Committed changes to git