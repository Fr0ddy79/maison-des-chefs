# Growth Brief: Diner Conversion Funnel Study
**Issue:** MAI-1099  
**Author:** Growth Marketer  
**Date:** 2025-05-05  
**Data:** `maison-des-chefs/data/analytics_events.jsonl` + `ab_test_events.jsonl`

---

## 1. Strategy Summary

The diner conversion funnel has **two critical drop-off points**: low CTA engagement and a broken checkout path. The "experiential" variant drives the most traffic (24 page views, 60% of total) but converts at 0% to booking. Meanwhile, the "directBooking" variant shows a cross-selling opportunity that isn't being leveraged.

---

## 2. Funnel Breakdown

### 2a. A/B Test Funnel (ab_test_events.jsonl)

| Stage | Volume | Conversion Rate |
|-------|--------|------------------|
| Page Views | 40 | — |
| CTA Clicks | 2 | **5.0%** (page view → click) |
| Bookings Created | 11 | **0%** (click → book) |
| Reviews Submitted | 4 | **36.4%** (book → review) |

### 2b. Variant Performance

| Variant | Page Views | CTA Clicks | Bookings | Conv. Rate |
|---------|-----------|------------|----------|------------|
| experiential | 24 | 2 | **0** | 0% |
| directBooking | 8 | 0 | **0** | 0% |
| premium | 5 | 0 | **11** | 220%* |
| valueMemories | 2 | 0 | 0 | 0% |
| trust | 1 | 0 | 0 | 0% |

*\*Premium "220% conversion" is anomalous — likely pre-existing bookings attributed to variant, not genuine funnel conversion.*

### 2c. Analytics Data (analytics_events.jsonl)

- **27 service page views** — all for service_id=1 (French cuisine, $100-150/person)
- **Zero booking events captured** in this dataset
- Suggests service page traffic isn't being tracked through to checkout

---

## 3. Top Improvement Opportunities

### 🔴 Opportunity #1: Experiential CTA Click → Booking Drop-off (CRITICAL)

**The Problem:**
- "Experiential" variant generates 60% of all page views
- 2 CTA clicks on "Book Your Private Chef" / "Discover Chefs Near You"
- **0 bookings** from 2 clicks = 100% drop-off at checkout
- This suggests the CTA links are broken, lead to wrong page, or there's no actual booking flow

**Evidence:**
```
04/19 03:00 - cta_click - "Book Your Private Chef"
04/27 03:21 - cta_click - "Discover Chefs Near You"
(0 bookings followed either click)
```

**Recommended Fix:**
1. Audit CTA button destinations — verify they land on functional booking flow
2. Add `booking_started` event tracking on the page the CTA links to
3. Test placing booking form directly on the experiential landing page

---

### 🟡 Opportunity #2: DirectBooking Cross-Sell Not Converting

**The Problem:**
- Variant shows related service upsell working (1 view → 1 click)
- BUT 8 page views + 1 service_page_view + 0 bookings = no checkout progress
- Cross-selling works; the problem is what happens *after*

**Evidence:**
```
related_service_view: "Displaying 2 services [2,3] from service_detail_page"
related_service_click: "Clicked service_id=2, position 1"
service_page_view: serviceId=1 (premier service)
(0 bookings)
```

**Recommended Fix:**
1. Add "Book Now" CTA after related service clicks
2. Track `checkout_started` event to isolate where users abandon
3. Test "Frequently Bought Together" bundle offer on service page

---

## 4. Recommended Experiment

### A/B Test: Simplify Checkout Path for Experiential Variant

**Hypothesis:** Removing friction between CTA click and booking form will increase conversions.

**Control:** Current flow — CTA → service detail page → booking  
**Treatment:** CTA → inline booking form on same page (no page change)

**Why:** 0% conversion from 2 CTA clicks suggests broken or high-friction flow. If CTAs are working but checkout isn't, reducing steps should improve conversion.

**Metrics:**
- Primary: booking_created per page view
- Secondary: time_to_booking, checkout_abandonment_rate

**Expected Impact:** +15-25% conversion rate on experiential variant if flow is the barrier.

---

## 5. Metrics to Track

| Metric | Current | Target | Source |
|--------|---------|--------|--------|
| Page View → CTA Click | 5.0% | 8%+ | ab_test_events |
| CTA Click → Booking | 0% | 20%+ | ab_test_events |
| Checkout Completion Rate | — | 60%+ | New event needed |
| Booking → Review | 36.4% | 50%+ | ab_test_events |
| Avg Time to Book | Unknown | Measure baseline | New event needed |

### New Events to Implement:
- `checkout_started` — user begins checkout flow
- `booking_form_viewed` — booking form is displayed
- `booking_abandoned` — user leaves during checkout (with step indicator)
- `payment_initiated` — user reaches payment step

---

## 6. Key Findings Summary

1. **Experiential has highest traffic (60%) but 0% booking conversion** — likely broken CTA or checkout flow
2. **Cross-sell mechanism works** (directBooking variant) — users click related services, but no follow-through to booking
3. **Analytics + AB test data are disconnected** — analytics show service views but no booking trail; AB test shows bookings under "premium" with anomalous conversion rate
4. **36% of diners leave a review** — post-booking engagement is healthy; focus on pre-booking conversion

---

*Next Steps: Audit CTA destinations for experiential variant, implement checkout abandonment tracking, run simplified checkout A/B test.*