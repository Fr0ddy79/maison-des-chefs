# Growth Optimization — MAI-1055

**Date:** 2026-05-04 04:00 UTC  
**Owner:** Growth Marketer  
**Status:** ✅ Complete

---

## Executive Summary

Analyzed current analytics infrastructure and identified a **critical gap in referral share tracking**. The `referral_share` events are being fired from the frontend checkout page but are NOT being persisted to `analytics_events.jsonl`. This means the A/B test data collected since MAI-1036 (Referral Share Analytics) is not available for analysis.

---

## Funnel Analysis

### Current Analytics Events (last 7 days of data available)

| Event Type | Count | Notes |
|-----------|-------|-------|
| `service_page_view` | 27 | ✅ Persisted |
| `ab_test` variants | 61 | ✅ Persisted (premium, experiential, directBooking) |
| `booking_created` | 11 | ✅ Persisted |
| `review_submitted` | 8 | ✅ Persisted |
| `referral_share` | **0** | ❌ **NOT PERSISTED** — tracking exists but data missing |
| `cta_click` | ~20+ | ⚠️ Mixed — some in ab_test_events, some only console logged |

### Analytics Infrastructure

**Working components:**
- `/api/analytics/event` endpoint — receives events, returns 202
- `analytics_events.jsonl` — persists all non-AB test events
- `ab_test_events.jsonl` — persists events with `variant` field
- `appendFileSync` persistence in `src/api/analytics.ts`

**Broken component:**
- `referral_share` event has `channel` field but the Zod schema only has `channel: z.enum(['copy', 'email', 'whatsapp']).optional()` — this should work, but events are 0

---

## Growth Idea

### 🎯 Problem: Referral Share Tracking Gap

**MAI-1036** was completed (backend tracking spec + frontend trackReferralShare function exists), but `referral_share` events are NOT appearing in `analytics_events.jsonl`.

**Why it matters:**
- Referral program is a key growth channel (share CTA shows on checkout success page for converted bookings)
- Cannot measure which channels (copy/email/whatsapp) drive most shares
- Cannot calculate referral conversion rate
- Cannot optimize acquisition based on data

**Impact if fixed:**
- Measure referral channel effectiveness → shift budget to top-performing channels
- Calculate true referral program ROI
- Identify drop-off in referral funnel (share → click → signup → booking)

---

## Experiment Plan

### Fix Required Before Experiment

The tracking is implemented but not persisting. This is a **data quality issue**, not an A/B test. Fix first:

1. **Debug `referral_share` event flow:**
   - Verify `sendBeacon` is firing (check browser network tab)
   - Verify `/api/analytics/event` is receiving and not silently failing
   - Check if `channel` enum validation is rejecting events

2. **Expected behavior after fix:**
   ```
   {"event":"referral_share","channel":"copy","code":"ABC12345","auth_status":"guest","timestamp":"2026-05-04T04:00:00Z"}
   ```

### A/B Test (Post-Fix)

Once data is flowing, run a simple experiment:

| Variant | CTA Text | Goal |
|---------|----------|------|
| **Control** | "Copy Link" | Baseline share rate |
| **Incentive** | "Copy & Earn $25" | Increase share rate by >15% |

**Hypothesis:** Explicit monetary incentive ("Earn $25") will increase referral share rate vs generic "Copy Link"

**Metrics to track:**
- `referral_share` event count per variant
- `referral_share` → `referral_click` conversion (via `/referral/track` redirects)
- Downstream: `booking_created` attributed to referral code

**Sample size needed:** ~200 shares per variant (assuming 5% baseline conversion, 80% power, detecting 15% improvement)

---

## Metrics to Track

| Metric | Current | Target | Notes |
|--------|---------|--------|-------|
| `referral_share` events | 0 (broken) | 50/week | Fix data pipeline first |
| Share → Click conversion | unknown | >15% | Need fix + 2 weeks data |
| Referral → Booking conversion | unknown | >2% | Downstream revenue metric |
| Share by channel (copy/email/whatsapp) | unknown | Copy >50% | Informs channel prioritization |
| Referral program CAC | unknown | Track | Calculate true cost of acquisition |

---

## Recommendations

1. **Immediate:** Debug why `referral_share` events aren't persisting — check enum validation in `src/api/analytics.ts`
2. **This week:** Fix the tracking, verify data flowing
3. **Next week:** Run incentive vs control CTA A/B test
4. **Ongoing:** Weekly review of referral funnel metrics

---

## Files Analyzed

- `src/routes/analytics.ts` — tracking functions (trackServicePageViewEvent, trackReferralShareEvent)
- `src/api/analytics.ts` — persistence layer (appendFileSync to jsonl)
- `src/routes/checkout-page.ts` — referral share CTA with trackReferralShare() calls
- `src/routes/referral-tracking.ts` — referral click tracking
- `data/analytics_events.jsonl` — 27 events, 0 referral_share
- `data/ab_test_events.jsonl` — 61 events, various A/B test variants

---

*Growth Optimization — MAI-1055 — 2026-05-04 04:00 UTC*