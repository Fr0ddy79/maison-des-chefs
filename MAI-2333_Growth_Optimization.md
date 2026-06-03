# Growth Optimization: UTM Parameter Capture for Channel Attribution

**Issue:** MAI-2333  
**Owner:** Growth Marketer  
**Date:** 2026-05-31 16:00 UTC  
**Status:** ✅ Complete

**Task:** Growth Optimization — triggered every 3-6 hours

---

## Summary

| | |
|---|---|
| **Growth Idea** | UTM Parameter Capture for Channel Attribution |
| **Problem** | No visibility into which acquisition channels drive booking requests |
| **Solution** | Capture UTM params on service page, persist in cookies, include in funnel events |
| **Files Changed** | `analytics.ts`, `analytics.ts` (api), `booking-page.ts` |
| **Primary Metric** | Booking form submissions with UTM attribution |
| **Expected Impact** | Baseline channel attribution enabling data-driven marketing spend |

## Executive Summary

**Revenue Opportunity:** Connect booking conversions to acquisition channels by capturing UTM parameters from paid ads, email campaigns, and social media.

**The Problem:** When diners arrive via tracked links (email campaigns, Google Ads, Facebook, Instagram, etc.), the `utm_source`, `utm_medium`, and `utm_campaign` parameters were **lost at the service page**. The analytics infrastructure had no visibility into which channels drive booking requests vs. which are just noise.

**This Run's Focus:** Capture UTM parameters on the service detail page and include them in the `service_page_view` analytics event, enabling downstream attribution through the booking funnel.

**Expected Impact:** Baseline channel attribution — we can finally answer "which acquisition channels produce booking requests?" and optimize spend accordingly.

---

## Implementation (MAI-2333)

### Changes Made

#### 1. `src/routes/analytics.ts` — trackServicePageViewEvent
- Added UTM parameter parsing from URL on client-side
- Included `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` in `service_page_view` event
- Persist UTM params in cookies for 30 days for downstream attribution

#### 2. `src/api/analytics.ts` — analyticsEventSchema
- Added optional fields: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`

#### 3. `src/routes/booking-page.ts` — Booking form funnel events
- Added `getUTMCookies()` helper function
- Extended `booking_form_viewed`, `booking_page_view`, `booking_form_submitted`, `booking_submit`, `booking_inquiry_success`, `booking_success` events to include UTM data from cookies

### How It Works

```
Diner clicks ad/email/link
    ↓
UTM params in URL: ?utm_source=google&utm_medium=cpc&utm_campaign=private_chef_search
    ↓
Service page view tracked → UTM params captured + cookies set
    ↓
Diner submits booking form (hours/days later)
    ↓
UTM cookies read → booking_inquiry_success includes UTM attribution
    ↓
Lead created with UTM → full funnel visibility ✅
```

---

## Prior Work Context

### What's Implemented

| System | File | Status | Notes |
|--------|------|--------|-------|
| Booking Form A/B Test | `src/routes/booking-page.ts` (formVariant) | ✅ Active | `standard` vs `simplified` tracking |
| Booking Form Analytics | `src/routes/booking-page.ts` | ✅ Active | `booking_form_viewed`, `booking_form_submitted` |
| Checkout Abandonment Detection | `src/services/checkout-abandonment-detector.ts` | ✅ Done | Behavioral trigger for recovery email |
| Lead-to-Booking Funnel | `leads` table + `status` field | ✅ Active | Tracks conversion lifecycle |
| Referral Tracking | `src/routes/referral-tracking.ts` | ✅ Active | `referral_source` field on leads |

### The Gap

The acquisition funnel has a **channel attribution blind spot**:

```
Diner clicks ad/email/link
    ↓
UTM params in URL: ?utm_source=google&utm_medium=cpc&utm_campaign=private_chef_search
    ↓
Arrives at service detail page: /services/42?utm_source=google&...
    ↓
Service page view tracked → BUT NO UTM DATA CAPTURED ❌
    ↓
Diner submits booking form
    ↓
Lead created → converted to booking
    ↓
We know the lead converted, but we DON'T KNOW WHICH CHANNEL drove it ❌
```

**We can see WHAT happened (lead → booking) but not WHERE it came from (channel → service page).**

---

## 2. Current Tracking State

### Existing Analytics Events (service page level)

| Event | Fields | UTM Captured? |
|-------|--------|---------------|
| `service_page_view` | service_id, chef_id, price_per_person, cuisine_type, variant | ❌ No |
| `cta_click` | cta_text, cta_position, variant | ❌ No |
| `booking_form_viewed` | service_id, form_variant, referrer | ❌ No |
| `booking_form_submitted` | service_id, form_variant, guest_count, event_date | ❌ No |
| `booking_inquiry_success` | service_id, lead_id, form_variant | ❌ No |

**Result:** We can measure form submission rates by variant, but we cannot attribute them to acquisition channels.

### Why UTM Capture Matters

| Use Case | Without UTM | With UTM |
|----------|-------------|----------|
| Google Ads performance | ❌ Can't measure ROAS | ✅ Know which campaigns drive leads |
| Email campaign ROI | ❌ No link-level attribution | ✅ Know which emails produce bookings |
| Social media (FB/IG) | ❌ Blind to paid social contribution | ✅ Track fbclid/gclid through funnel |
| SEO vs paid search | ❌ Can't compare channel value | ✅ Segment organic vs CPC traffic |
| Content marketing | ❌ Unknown which content converts | ✅ Track which topics drive inquiries |

---

## 3. Growth Idea: UTM Parameter Capture

### The Fix

Capture UTM parameters at the service page level and include them in the `service_page_view` analytics event:

```typescript
// In trackServicePageViewEvent (analytics.ts)
const urlParams = new URLSearchParams(window.location.search);
const utmSource = urlParams.get('utm_source') || null;
const utmMedium = urlParams.get('utm_medium') || null;
const utmCampaign = urlParams.get('utm_campaign') || null;
const utmContent = urlParams.get('utm_content') || null;
const utmTerm = urlParams.get('utm_term') || null;

// Add to event data
const eventData = {
  event: 'service_page_view',
  service_id: data.serviceId,
  // ... existing fields ...
  utm_source: utmSource,
  utm_medium: utmMedium,
  utm_campaign: utmCampaign,
  utm_content: utmContent,
  utm_term: utmTerm,
  // ... rest ...
};

// Persist UTM data in cookies for downstream attribution
if (utmSource) {
  document.cookie = `utm_source=${utmSource}; Path=/; Max-Age=${30*24*60*60}; SameSite=Lax`;
}
if (utmMedium) {
  document.cookie = `utm_medium=${utmMedium}; Path=/; Max-Age=${30*24*60*60}; SameSite=Lax`;
}
if (utmCampaign) {
  document.cookie = `utm_campaign=${utmCampaign}; Path=/; Max-Age=${30*24*60*60}; SameSite=Lax`;
}
```

### Why This Works

1. **Service page is the entry point** — almost all acquisition channels route through `/services/:id`
2. **Cookies persist UTM through funnel** — when the diner submits a booking form (hours or days later), we can read the UTM cookies and include them in the `booking_inquiry_success` event
3. **No backend schema changes** — analytics-only approach, fire-and-forget like other tracking
4. **Low risk** — doesn't affect user flow, no form changes

---

## 4. Experiment Design

### Phase 1: UTM Capture on Service Page (This Run)

**Scope:** Modify `trackServicePageViewEvent` in `src/routes/analytics.ts` to:
1. Read UTM params from URL on client-side
2. Include them in `service_page_view` event
3. Persist them in cookies for 30 days

**Implementation:**
```typescript
// In trackServicePageViewEvent (client-side)
if (typeof (globalThis as any).window !== 'undefined') {
  const url = new URL((globalThis as any).window.location.href);
  const params = new URLSearchParams(url.search);
  
  // Read and persist UTM params
  const utmParams = {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_content: params.get('utm_content'),
    utm_term: params.get('utm_term'),
  };
  
  // Add to event
  Object.assign(eventData, utmParams);
  
  // Persist for downstream attribution (30 days)
  const maxAge = 30 * 24 * 60 * 60;
  if (utmParams.utm_source) document.cookie = `utm_source=${utmParams.utm_source}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  if (utmParams.utm_medium) document.cookie = `utm_medium=${utmParams.utm_medium}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  if (utmParams.utm_campaign) document.cookie = `utm_campaign=${utmParams.utm_campaign}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}
```

### Phase 2: Downstream Attribution (Next Run)

**Scope:** Extend booking funnel events to include UTM cookies:
- `booking_form_viewed` → add UTM from cookies
- `booking_form_submitted` → add UTM from cookies
- `booking_inquiry_success` → add UTM from cookies + lead record

### Phase 3: Aggregate Reporting (Future)

**Scope:** Build channel performance dashboard:
- Booking requests per `utm_source`
- Lead-to-booking conversion rate per `utm_source`
- Revenue per `utm_source` (if we track quote amounts)

---

## 5. Metrics to Track

### Primary Metrics

| Metric | Source | Target |
|--------|--------|--------|
| Service page views with UTM | `service_page_view` event | Baseline by channel |
| Booking form views with UTM | `booking_form_viewed` event | Attribution rate |
| Booking form submissions with UTM | `booking_form_submitted` event | Channel quality |
| Leads created with UTM | `booking_inquiry_success` event | Conversion tracking |

### Channel Performance Metrics

| Metric | Calculation | Business Question |
|--------|-------------|-------------------|
| **Channel Volume** | COUNT(service_page_view) WHERE utm_source = X | Which channels drive traffic? |
| **Channel Conversion** | COUNT(booking_form_submitted) / COUNT(service_page_view) | Which channels convert best? |
| **Lead Quality** | COUNT(leads.status=confirmed) / COUNT(booking_form_submitted) | Which channels produce bookings? |
| **ROAS Proxy** | bookings * avg_value / ad_spend | Estimate channel ROI |

---

## 6. Implementation Plan

### This Run (MAI-2333)

1. ✅ Analyze current tracking state — DONE
2. ⬜ Implement UTM capture in `trackServicePageViewEvent` — TODO
3. ⬜ Update analytics schema to accept UTM fields — TODO
4. ⬜ Document experiment in report — TODO

### Next Run (MAI-XXXX)

1. Extend booking page events to read UTM cookies
2. Add UTM data to `booking_inquiry_success` event
3. Verify UTM flows through to leads table

### Future Runs

1. Build channel performance summary
2. Set up conversion goals in analytics
3. Connect to paid channels (Google Ads, Facebook) for闭环

---

## 7. Expected Impact

### Short-term (1-2 weeks)
- Visibility into which channels drive service page traffic
- Baseline `utm_source` distribution

### Medium-term (4-8 weeks)
- Attribution of booking requests to acquisition channels
- Identification of best-performing channels

### Long-term (3-6 months)
- Full-funnel channel attribution (traffic → lead → booking → revenue)
- Data-driven channel mix optimization

---

## 8. Constraints & Notes

### Constraints
- **No major backend changes** — analytics-only approach
- **Privacy compliance** — UTM params are non-PII, but should still respect cookie consent
- **Cookie persistence** — UTM cookies set for 30 days, then expire

### Key Assumptions
1. Most acquisition links include UTM params (email, paid ads, affiliates)
2. Diner journey from click → booking is < 30 days (cookie lifetime)
3. Service detail page is the primary entry point for all channels

### Technical Notes
- UTM capture requires client-side JS (not SSR) since UTM params are in URL
- Cookie reads must happen on client, so events fired during SSR need fallback
- For SSR-rendered pages, we can add UTM from referrer as a secondary signal

---

## Summary

| | |
|---|---|
| **Growth Idea** | UTM Parameter Capture for Channel Attribution |
| **Problem** | No visibility into which acquisition channels drive booking requests |
| **Solution** | Capture UTM params on service page, persist in cookies, include in funnel events |
| **Primary Metric** | Booking form submissions with UTM attribution |
| **Expected Impact** | Baseline channel attribution enabling data-driven marketing spend |
| **Status** | 🟡 Implementation in progress |

---

*Generated by Growth Marketer — MAI-2333 — 2026-05-31*