# Growth Optimization: Diner Re-Engagement via Post-Booking Upsell

**Issue:** MAI-1101  
**Owner:** Growth Marketer  
**Date:** 2026-05-05  
**Status:** Complete

---

## 1. Strategy Summary

The diner conversion funnel reveals that booking conversion is already happening (11 bookings from the A/B test data), but post-booking monetization is underdeveloped. The data shows 4 reviews submitted from 11 bookings (36.4% review rate), and notably **userId=4 booked twice in one session** — suggesting either a re-booking pattern or multi-user session activity. The key opportunity is **converting recent diners into repeat bookings or upsells before they leave the platform**, rather than focusing solely on top-of-funnel acquisition.

**Core Growth Idea:** Implement a post-booking re-engagement flow targeting diners within 24-48 hours of their booking, offeringChef Credits, add-on services, or referral incentives — turning one-time bookers into repeat customers.

---

## 2. Funnel Breakdown

### 2a. Booking Funnel (A/B Test Data)

| Stage | Volume | Rate |
|-------|--------|------|
| Page Views | 40 | 100% |
| CTA Clicks | 2 | 5.0% |
| Bookings Created | 11 | 27.5% (from clicks) / 2.5% (from views) |
| Reviews Submitted | 4 | 36.4% (from bookings) |

### 2b. Booking Details

| Metric | Value |
|--------|-------|
| Total Bookings | 11 |
| Bookings with userId | 2 (both userId=4) |
| Guest counts | 2, 2, 2, 2, 4, 3, 4, 2, 4, 2, 2 |
| Most common party size | 2 (63.6%) |
| Services booked | serviceId=1 (all) |

### 2c. Review Data

| Metric | Value |
|--------|-------|
| Reviews Submitted | 4 |
| 5-star ratings | 3 (75%) |
| 4-star ratings | 1 (25%) |
| Avg Rating | **4.75 / 5** |

### 2d. Key Observation: Repeat User Behavior

```
userId=4 made 2 bookings in rapid succession:
  - bookingId=10 at 14:16:50 (guestCount: 2)
  - bookingId=12 at 14:17:31 (guestCount: 3, 11 seconds later)
```

This suggests either:
- User accidentally created duplicate bookings (UX issue OR)
- User is actively comparing/reserving multiple options (cross-selling opportunity)

---

## 3. Top Improvement Opportunity

### 🟢 Opportunity: Post-Booking Re-Engagement Flow

**The Problem:**
- 11 bookings generated, but only 2 diners (userId=4) are identifiable in the data
- No evidence of re-engagement campaigns, upsell flows, or follow-up offers
- High satisfaction (4.75 avg rating) but no repeat booking incentive
- Diners who completed booking likely have high intent — they're the **warmest audience** for additional offers

**The Insight:**
Diners who've just booked are:
1. **In payment mode** — credit card is already on file or top-of-mind
2. **High satisfaction** (review data shows 75% 5-star)
3. **Familiar with the product** — no longer need education
4. **Warm audience** — lower acquisition cost than cold traffic

**Recommendation:** Add a post-booking confirmation page with upsell + re-engagement hooks:

1. **"Book Another Chef" CTA** — cross-sell to different chef/cuisine
2. **Chef Credits offer** — "Get $25 credit when you refer a friend"
3. **Add-on services** — wine pairing, multi-course extension, special occasion packages
4. **Loyalty nudge** — "You're now Silver Member — book 3 more to unlock Gold"

---

## 4. Experiment Plan

### A/B Test: Post-Booking Upsell vs. Standard Confirmation

**Hypothesis:** Showing a targeted upsell on the booking confirmation page will increase repeat booking rate and AOV.

**Control:** Standard booking confirmation (no upsell)  
**Treatment:** Booking confirmation + upsell carousel (add-on services, refer-a-friend, next booking credit)

**Targeting:** All diners who complete booking_created event

**Implementation:**
- On `booking_created` event, serve variant
- Control: standard confirmation page
- Treatment: confirmation page + "Enhance Your Experience" carousel

**Metrics:**
| Metric | Current | Target |
|--------|---------|--------|
| Repeat booking rate | Unknown (baseline) | +10-15% |
| Upsell conversion | N/A | 3-5% |
| Referral opt-in | N/A | 5-8% |
| Confirmation page停留时间 | — | Monitor not to increase bounce |

**Expected Impact:**
- If 5% of diners accept a $50 add-on, that's +$2.50 per booking
- Referral credit cost: $25 per referred booking, but new diner LTV likely >$200
- **Estimated incremental revenue: +$5-8 per booking on average**

---

## 5. Metrics to Track

| Metric | Current | Target | Notes |
|--------|---------|--------|-------|
| Repeat booking rate | Unknown | Track baseline | New event: `second_booking_created` |
| Upsell acceptance | N/A | 3-5% | New event: `upsell_clicked` |
| Referral submissions | N/A | 5-8% | New event: `referral_shared` |
| Post-booking churn | Unknown | Reduce by 10% | Diners who don't return within 30 days |
| Customer LTV | Unknown | Establish baseline | Track cohort over 90 days |

### Events to Implement:
- `booking_confirmed_viewed` — confirmation page rendered
- `upsell_displayed` — upsell carousel shown
- `upsell_clicked` — user clicks upsell offer
- `upsell_purchased` — add-on actually purchased
- `referral_shared` — diner shares referral link

---

## 6. Related Findings from Prior Briefs

| Brief | Finding | Relevance |
|-------|---------|------------|
| MAi-1084 | "experiential" variant has 0% booking conversion despite 60% of traffic | Top-of-funnel still needs fixing, but re-engagement works regardless |
| GROWTH_BRIEF_DINER_CONVERSION | Cross-sell mechanism works in directBooking variant | Use similar pattern for post-booking upsell |
| Both briefs | 4.75 avg rating, 36% review rate | High satisfaction = receptive to upsell offers |

---

## 7. Next Steps

1. **Implement post-booking upsell flow** on confirmation page
2. **Add tracking events** for upsell views and conversions
3. **Create referral program** with $25 credit mechanism
4. **A/B test** upsell vs. control over 2-week period
5. **Monitor** repeat booking rate by cohort

---

*Report generated: 2026-05-05*  
*Data period: April 17-27, 2026*  
*Confidence: Medium — data shows opportunity but needs conversion tracking implemented*