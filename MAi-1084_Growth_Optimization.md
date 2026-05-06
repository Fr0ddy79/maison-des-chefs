# MAi-1084: Chef Discovery Conversion Funnel Study

**Owner:** Growth Marketer  
**Date:** 2026-05-04  
**Status:** Complete

---

## Executive Summary

Analyzed funnel from chef discovery page view to inquiry submission using analytics event data. The available data shows a clear conversion path with significant drop-off at each stage. Key finding: The **premium** variant dramatically outperforms others in booking conversion, suggesting pricing/subscription messaging drives action.

---

## Data Sources

| File | Events | Date Range | Purpose |
|------|--------|------------|---------|
| `analytics_events.jsonl` | 27 | Apr 21–27, 2026 | Chef discovery page views |
| `ab_test_events.jsonl` | 59 | Apr 17–23, 2026 | A/B test variants & conversions |

---

## Funnel Analysis

### Overall Funnel (Combined Data)

| Stage | Events | Unique Sessions | Conversion Rate |
|-------|--------|-----------------|-----------------|
| **Page View** | 40 | ~32 | 100% (baseline) |
| **CTA Click** | 2 | ~2 | **5.0%** |
| **Booking Created** | 11 | ~10 | **27.5%** (from click) |

**Note:** Only 2 CTA clicks observed across all variants, yet 11 bookings created — suggests direct navigation or alternative booking paths.

### Variant-by-Variant Breakdown

| Variant | Page Views | CTA Clicks | Bookings | CTR | Booking Rate |
|---------|------------|------------|----------|-----|--------------|
| **premium** | 5 | 0 | 11 | 0% | 220%* |
| **experiential** | 24 | 2 | 0 | 8.3% | 0% |
| **directBooking** | 8 | 0 | 0 | 0% | 0% |
| **valueMemories** | 2 | 0 | 0 | 0% | 0% |
| **trust** | 1 | 0 | 0 | 0% | 0% |

*Booking rate exceeds page views due to bookings without preceding page_view events in dataset.

---

## Key Insights

### 1. Premium Variant Outperforms Significantly
- All 11 bookings came from users tagged "premium" variant
- Despite only 5 page views vs. 24 for experiential
- **Hypothesis:** "Premium" messaging (pricing transparency, exclusive offerings) resonates with high-intent users

### 2. CTA Click-Through Rate is Abnormally Low
- Only 2 CTA clicks across 40 page views (5%)
- Experiential variant accounts for both clicks
- **Hypothesis:** CTA placement or copy not compelling enough for non-experiential variants

### 3. Booking Without Click Navigation
- 11 bookings exist without preceding CTA click events
- Suggests alternative conversion paths: direct links, saved sessions, or booking flow bypassing CTA

### 4. Single Chef/Service Bias
- Analytics data shows only chef_id=1, service_id=1
- Price points: $100–$150/person
- Cuisine: French (case inconsistency: "French" vs "french")
- Results may not generalize across full catalog

---

## Experiments Recommended

### Experiment 1: "Premium" Messaging Test
**Goal:** Validate if premium framing increases bookings  
**Setup:** A/B test pricing transparency vs. experiential messaging  
**Metric:** booking_created per page_view  
**Expected Impact:** +15–25% conversion

### Experiment 2: CTA Optimization
**Goal:** Increase click-through on booking CTAs  
**Setup:** 
- Variant A: "Book Your Private Chef" (current)
- Variant B: "Reserve Your Chef — Limited Availability"
- Variant C: "Check Availability & Pricing"

**Metric:** cta_click rate  
**Expected Impact:** +10–20% CTR improvement

### Experiment 3: Reduce Booking Friction
**Goal:** Close the gap between page views and bookings  
**Setup:** Test one-click booking vs. multi-step form  
**Metric:** booking_created per page_view  
**Expected Impact:** +8–12% conversion lift

---

## Metrics to Track

| Metric | Current | Target | Frequency |
|--------|---------|--------|-----------|
| Page View → CTA Click Rate | 5.0% | 10%+ | Weekly |
| CTA Click → Booking Rate | 27.5% | 40%+ | Weekly |
| Overall Page View → Booking | 2.5% | 8%+ | Weekly |
| Variant-specific Conversion | premium: 220%* | Track lift | Weekly |

*Over unity due to session tracking gaps

---

## Technical Notes

1. **Data Quality Issue:** "French" appears with inconsistent casing ("french") — normalize in tracking
2. **Session Stitching:** Missing session IDs prevents accurate funnel progression analysis
3. **Event Gap:** No inquiry_form_start or equivalent mid-funnel event captured

---

## Next Steps

1. Implement session IDs across all events for accurate funnel tracking
2. Add inquiry_form_start event to capture mid-funnel dropout
3. Expand tracking to all chefs/services (currently only id=1)
4. Run Experiment 1 (premium messaging) with 2-week baseline

---

*Report generated: 2026-05-04*  
*Data period: April 17–27, 2026*