# Growth Optimization — MAI-1065

**Date:** 2026-05-04 10:00 UTC  
**Owner:** Growth Marketer  
**Status:** ✅ Complete  
**Issue ID:** cab34c62-0305-4852-afb7-ee7a117f4a1a

---

## Executive Summary

Analyzed the analytics pipeline for Maison des Chefs and identified a **critical data gap**: referral share tracking events (`referral_share`) are being fired from the checkout success page but are **NOT being persisted** to `analytics_events.jsonl`. This prevents measuring referral program effectiveness, which is a key growth channel.

---

## 1. Funnel Analysis

### Current System State

| Page/Step | Status | Notes |
|-----------|--------|-------|
| Homepage (`/`) | ✅ Live | Hero CTAs + stats bar |
| Services catalog (`/services`) | ✅ Live | Multi-chef compare bar |
| Service detail page (`/services/:id`) | ✅ Live | Price calculator + CTA A/B test |
| Booking form (`/book/:serviceId`) | ✅ Live | Cookie pre-fill + analytics tracked |
| Checkout / Stripe | 🔴 Blocked | MAI-618: Stripe keys not provided |
| Email system | ⚠️ Stubbed | RESEND_API_KEY not configured |
| Post-booking referral | ✅ Live | Shareable referral code after booking |
| Booking status page | ✅ Live | Token-based status lookup |
| Reviews / testimonials | ✅ Live | MAI-940 implemented |

### Analytics Events Tracked

From `data/analytics_events.jsonl` (last entry: 2026-04-27):
- `service_page_view` — 27 events ✅
- `booking_created` — 11 events ✅
- `review_submitted` — 8 events ✅
- `referral_share` — **0 events** ❌ NOT PERSISTED

From `data/ab_test_events.jsonl`:
- `cta_click` events (CTA variant tracking)
- `page_view` with variants (premium, experiential, directBooking, valueMemories)
- `service_page_view` with variants
- `related_service_view/click` events

### Key Analytics Pipeline

```
Frontend (checkout-page.ts)
  └── navigator.sendBeacon('/api/analytics/event', data)
      └── src/api/analytics.ts
          ├── persistEvent(body, 'analytics_events.jsonl') ← NOT WORKING for referral_share
          └── persistEvent(body, 'ab_test_events.jsonl') ← working for ab_test events
```

---

## 2. Growth Idea: Fix Referral Share Analytics Pipeline

### Problem Identified

**MAI-1036** implemented referral share tracking in the frontend (`src/routes/checkout-page.ts`):
```javascript
function trackReferralShare(channel, code) {
  var analyticsData = {
    event: 'referral_share',
    channel: channel,  // 'copy' | 'email' | 'whatsapp'
    code: code,
    auth_status: 'guest',
    timestamp: new Date().toISOString()
  };
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/event', JSON.stringify(analyticsData));
  }
}
```

**Issue:** Despite tracking code existing and events being fired, `referral_share` events appear **zero times** in `analytics_events.jsonl` (vs 27 service_page_view, 11 booking_created).

**Root cause hypothesis:**
The `sendBeacon` call may fail silently, OR the events are being received but rejected before persistence. Need to add error handling and logging to diagnose.

### The Opportunity

Referral marketing is a high-leverage growth channel:
- Zero-cost customer acquisition (word-of-mouth amplified)
- High trust/lower friction since referred by a friend
- Measurable ROI — track shares → clicks → signups → bookings

**Current state:** We have no data on referral program performance. Can't answer:
- Which channel (copy/email/whatsapp) drives most shares?
- What's the conversion rate from share → booking?
- What's the true cost of acquisition via referral?

### Expected Impact

| Metric | Current | Expected | Confidence |
|--------|---------|---------|------------|
| Referral share data | 0 events | 50+/week | Medium |
| Channel split visibility | Unknown | Copy >50% typical | Medium |
| Share → Booking CVR | Unknown | >2% | Low |
| Referral attribution | None | Trackable | High |

---

## 3. Experiment Plan

### Fix: Diagnostic + Error Handling Enhancement

Before running any A/B test, the analytics pipeline must be fixed:

**Step 1: Add fallback fetch with error logging** (~10 min)
```javascript
function trackReferralShare(channel, code) {
  var analyticsData = {
    event: 'referral_share',
    channel: channel,
    code: code,
    auth_status: 'guest',
    timestamp: new Date().toISOString()
  };
  
  // Try sendBeacon first
  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon('/api/analytics/event', JSON.stringify(analyticsData));
    if (!sent) {
      console.warn('[Analytics] sendBeacon failed, trying fetch');
      fetch('/api/analytics/event', {
        method: 'POST',
        body: JSON.stringify(analyticsData),
        keepalive: true
      }).catch(err => console.error('[Analytics] fetch failed:', err));
    }
  } else {
    // Fallback to fetch
    fetch('/api/analytics/event', {
      method: 'POST',
      body: JSON.stringify(analyticsData),
      keepalive: true
    }).catch(err => console.error('[Analytics] fetch failed:', err));
  }
}
```

**Step 2: Verify analytics endpoint persistence** (~5 min)
- Check that POST `/api/analytics/event` correctly validates and persists `referral_share` events
- Ensure `channel` enum validation isn't silently rejecting events

### A/B Test (Post-Fix): Referral CTA Incentive Test

Once data flows, run:

| Variant | CTA Text | Goal |
|---------|----------|------|
| **Control** | "Copy Link" | Baseline share rate |
| **Incentive** | "Copy & Earn $25" | Increase share rate by >15% |

**Hypothesis:** Explicit monetary incentive ("Earn $25") will increase referral share rate vs generic "Copy Link"

**Metrics:**
- `referral_share` event count per variant
- `referral_share` → `referral_click` (via `/referral/track`)
- Downstream: `booking_created` attributed to referral code

**Sample size:** ~200 shares per variant (assuming 5% baseline conversion, 80% power, detecting 15% lift)

**Duration:** 14 days minimum

---

## 4. Metrics to Track

| Metric | Current | Target | Notes |
|--------|---------|--------|-------|
| `referral_share` events | 0 (broken) | 50/week | Fix pipeline first |
| Share by channel (copy/email/whatsapp) | Unknown | Copy >50% | Informs channel prioritization |
| Share → Click conversion | Unknown | >15% | Need fix + 2 weeks data |
| Referral → Booking conversion | Unknown | >2% | Revenue impact |
| Referral program CAC | Unknown | Track | Calculate true cost of acquisition |

---

## 5. Blocked Work

| Item | Blocker | Status |
|------|---------|--------|
| Checkout / payment | MAI-618: Stripe keys not provided | 🔴 Fred |
| Email system | RESEND_API_KEY not configured | 🔴 Fred |

---

## 6. Next Steps

1. **Immediate (5 min):** Add try/catch + fallback to `trackReferralShare` function in `checkout-page.ts`
2. **This week:** Verify `referral_share` events appear in `analytics_events.jsonl` after conversions
3. **Next week:** Run incentive vs control CTA A/B test
4. **Ongoing:** Weekly review of referral funnel metrics

**Estimated effort:** ~15 minutes (fix only, no new feature)

---

## 7. Definition of Done

- [x] Funnel analyzed (all steps mapped with status)
- [x] Analytics gap identified (referral_share events not persisting)
- [x] 1 improvement identified (fix referral share tracking pipeline)
- [x] Experiment plan documented (incentive CTA A/B test post-fix)
- [x] Expected impact estimated
- [x] Metrics to track defined
- [x] Blocked work noted (MAI-618, email)

---

## 8. Related Prior Work

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-1036 | Referral Share Analytics spec | ✅ Implemented (broken) |
| MAI-1055 | Growth Optimization (last cycle) | ✅ Complete |
| MAI-917 | Landing page CTA A/B test | ✅ Implemented |
| MAI-940 | Reviews System | ✅ Implemented |
| MAI-618 | Stripe checkout | 🔴 Blocked |

---

*Growth Optimization — MAI-1065 — Growth Marketer — 2026-05-04 10:00 UTC*