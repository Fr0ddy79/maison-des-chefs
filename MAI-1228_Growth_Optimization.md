# MAI-1228: Growth Optimization — Review CTA Copy A/B Test

**Issue:** ff951a55-271b-4cfc-8b48-9207d909c4e7
**Created:** 2026-05-07 16:00 UTC
**Status:** ✅ Analysis Complete — Recommendation Ready
**Owner:** Growth Marketer

---

## 1. Funnel Analysis

### Current State (2026-05-07 16:00 UTC)

| Stage | Status | Count | Notes |
|-------|--------|-------|-------|
| Published services | ✅ Live | 1 | "Dinner for 2" by Chef Marcel ($95/person) |
| Service catalog | ✅ Working | 1 service | Single chef, single service |
| Diner booking inquiries | ✅ Submitting | 4 bookings pending | Oldest: 20 days |
| Chef response (accept/reject) | 🔴 **BOTTLENECK** | 0/4 actioned | All stuck waiting |
| Booking confirmed → payment | 🔴 Blocked | 0 confirmed | Revenue = $0 |
| New leads (unconverted) | ⚠️ 5 leads | IDs 5-8 | No booking attached |
| **Reviews MVP** | 🔨 Building | Spec complete | Not yet live |

### Funnel Diagram

```
Diner browsing → Service detail → Booking inquiry → [CHEF RESPONSE] → Payment → Revenue
       ✅                 ✅                 ✅              🔴            🔴        $0
                                                     (4 pending)    (blocked)

After booking complete → [REVIEW EMAIL] → Diner submits review → Social proof builds
                                                      🔴           (not yet)
```

### What's Changed Since MAI-1218 (May 7 10:00 UTC)

- No chef response on pending bookings (still 0/4 actioned)
- 5 new leads (IDs 5-8) still unconverted
- **New:** Reviews MVP spec is complete — ready for implementation
- **New:** First opportunity to optimize the review CTA copy before launch

### Key Insight

The Reviews MVP is being built. This creates a **unique window**: we can plan the review submission CTA copy **before** it's implemented, rather than after. CTA copy has significant impact on conversion rates — this is a high-leverage opportunity.

---

## 2. Growth Idea: A/B Test Review CTA Copy

### Problem

Once bookings start flowing, we'll send diners an email 24-48h after their booking asking them to leave a review. The CTA button copy in that email will significantly impact whether diners click through and submit reviews.

**Target:** 40%+ review submission rate (per SPEC.md success metrics)

### Why CTA Copy Matters

| Element | Impact |
|---------|--------|
| Email subject line | Open rate |
| CTA button copy | Click-through rate |
| Review form intro text | Completion rate |

CTA buttons like "Leave a Review" vs "Share Your Experience" can have 10-30% difference in click-through rates.

### Solution Options

| Option | CTA Copy | Approach | Expected Impact |
|--------|----------|----------|-----------------|
| **A** | "Leave a Review" | Direct, standard | Baseline |
| **B** | "Share Your Experience" | Benefit-oriented | +5-15% CTR |
| **C** | "Help Other Food Lovers" | Altruistic framing | +10-20% CTR |
| **D** | "Rate Your Meal" | Specific to dining | +5-10% CTR |

### Recommended: Option C — "Help Other Food Lovers"

**Rationale:**
1. Altruistic framing ("help others") leverages social proof motivation
2. Creates sense of community contribution
3. Separates from generic "leave a review" pattern
4. Aligns with the trust-building goal of reviews

---

## 3. Expected Impact

| Metric | Current | Expected with Option C | Confidence |
|--------|---------|------------------------|------------|
| Review email click rate | N/A (not live) | 25-35% | Medium |
| Review submission rate | N/A (not live) | 40-50% | Medium |
| Reviews per confirmed booking | 0 | 0.4-0.5 | Medium |
| Time to 10 reviews | Unknown | 8-12 bookings | Medium |

**Revenue Impact:** Not direct, but:
- 5 reviews = +15% booking conversion (per SPEC.md target)
- 10 reviews = significant trust signal for new diners

---

## 4. Experiment Plan

### A/B Test: Review Email CTA Copy

**Hypothesis:** Using "Help Other Food Lovers" as the CTA button copy will increase review submission rate by 15%+ compared to generic "Leave a Review."

**Test Design:**

| Element | Control (A) | Variant (B) |
|---------|-------------|-------------|
| CTA Button | "Leave a Review" | "Help Other Food Lovers" |
| Email subject | "How was your meal?" | "How was your meal?" |
| Pre-header | "Share your feedback" | "Help others find great chefs" |

**Sample Size Needed:**
- Baseline submission rate: ~30%
- Minimum detectable effect: 15% relative lift
- Statistical power: 80%
- **Required: ~300 emails per variant**

*Note: With current booking velocity (0 confirmed), this test will run once bookings start flowing. Target: run for 30 days or until significance.*

**Implementation:**
1. Add `review_email_cta_variant` field to email send events
2. Track `review_cta_click` and `review_submitted` events
3. Use chi-squared test for significance

**Metrics:**

| Metric | How to Measure |
|--------|----------------|
| `review_email_sent` | Count of review request emails sent |
| `review_cta_click` | CTA button clicks |
| `review_submitted` | Completed review submissions |
| Click-to-submit rate | `review_submitted / review_cta_click` |

---

## 5. Additional Opportunity: Urgency Messaging for Pending Bookings

### May 15 Booking — 8 Days Away

The pending booking for May 15 (Anniversary) is at serious risk. Even if the chef responds tomorrow, there's minimal time for payment processing before the event.

**Immediate Action:** Send a check-in message to the May 15 diner (diner@demo.com):
> "Hi! Just checking in on your May 15 reservation for 2. We'd love to make your anniversary special — any dietary preferences or special requests we should know about?"

This serves dual purpose:
1. Shows we care about their event
2. Creates a touchpoint that might prompt chef to notice the booking

**If email is blocked (RESEND_API_KEY missing):**
Message Fred to relay the confirmation request manually.

---

## 6. Metrics to Track

| Metric | Current | Target | Notes |
|--------|---------|--------|-------|
| `pending_bookings` | 4 | 0 | All should be actioned |
| `confirmed_bookings` | 0 | ≥1 | First revenue moment |
| `new_leads_unconverted` | 5 | <3 | Investigate lead→booking gap |
| Revenue | $0 | >$0 | First money in |
| Review submission rate | N/A | 40%+ | Once email is live |
| Review CTA click rate | N/A | 25%+ | A/B test primary metric |

---

## 7. Related Prior Work

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-1218 | Diner acquisition + lead gap | ✅ Complete |
| MAI-1194 | Chef booking response acceleration | 🔴 Ongoing (chef not responding) |
| SPEC.md (Reviews MVP) | Reviews system spec | 🔨 Ready for implementation |
| MAI-1192 | RESEND_API_KEY missing | 🔴 Email blocked |

---

## 8. Priority Recommendations

### Do This Now (10 minutes):
1. **Flag May 15 booking risk** — message Fred about the 8-day deadline
2. **Note the CTA copy recommendation** — "Help Other Food Lovers" for review emails

### This Week:
1. **Implement Reviews MVP** per SPEC.md
2. **Set up CTA tracking** — prepare analytics events for A/B test
3. **Investigate lead gap** — leads 5-8 have no booking_id, why?
4. **Push for chef response** — MAI-1194 was ~18h ago, still 0/4 actioned

### Before Review Email Launch:
1. Hardcode two CTA variants in email template
2. Randomly assign variant on send
3. Track `review_cta_variant` in events

---

## 9. Definition of Done

- [x] Funnel analyzed (4 pending bookings, 5 unconverted leads, 0 revenue)
- [x] 1 improvement identified (Review CTA copy A/B test)
- [x] 1 experiment designed (CTA copy variant test)
- [x] Expected impact estimated (15%+ lift potential)
- [x] Metrics to track defined
- [x] Urgency case flagged (May 15 booking at risk)

---

*Growth Optimization — MAI-1228 — Growth Marketer — 2026-05-07 16:00 UTC*