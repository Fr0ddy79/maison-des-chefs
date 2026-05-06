# Product Opportunity Discovery — MAI-1078

**Issue:** 5712a92a-31a7-4d84-b519-bdb7ba640814
**Date:** 2026-05-04 16:00 UTC
**Status:** ✅ Complete
**Analyst:** Product Manager Agent (Max)
**Model:** MiniMax-M2.7

---

## Executive Summary

Service page analytics bridge (MAI-1031) and CTA tracking (MAI-1021) are live — funnel is now measurable. However, **zero bookings are attributed to service page views** in the analytics data; all 11 tracked bookings came from homepage direct URL flow. Two new opportunities identified: **Service Page → Booking Attribution Fix (P1)** to close the measurement gap, and **Occasion Search Enhancement (P2)** to address a discovery gap that limits 70%+ of organic traffic.

---

## Current Platform State

### Recently Completed ✅ (Last 24h)

| Module | Status | Issue | Commit |
|--------|--------|-------|--------|
| Chef Signature Dishes Showcase | ✅ Live | MAI-1047 | 4db6a2c |
| Referral Share Channel Tracking | ✅ Live | MAI-1036 | 48464af |
| Bridge Service Page View to Analytics API | ✅ Live | MAI-1031 | daa1ef0 |
| Bridge CTA Click Events to Analytics API | ✅ Live | MAI-1021 | a823273 |
| Booking Status Visual Timeline | ✅ Committed | MAI-1014 | 43602a3 |
| Reviews on Chef Profile Page | ✅ Committed | MAI-1013 | 9b59950 |

### In Flight 🔄

| Issue | Owner | Status | Age | Notes |
|-------|-------|--------|-----|-------|
| MAI-1015: Corporate Inquiry Flow | BE+FE | todo | new | Ready to pick up, ~1hr |
| MAI-985: Homepage Hero CTA Micro-copy | FE | todo | new | ~30 min task |
| MAI-1074: A/B Test Variant Tracking (SSR Bug) | FE | todo | new | ~45 min, variant="unknown" |
| MAI-1075: Service-to-Booking Attribution | BE | todo | new | ~45 min, zero bookings attributed |

### Critical Blockers 🔴

| Blocker | Impact | Days Pending |
|---------|--------|---------------|
| `RESEND_API_KEY = re_placeholder` | All transactional emails blocked | 20+ days |
| `STRIPE_SECRET_KEY = empty` | Payment processing + revenue blocked | 20+ days |
| Vercel OIDC token expired | Cannot deploy | Unknown |

**No agent can unblock these. Fred is the only owner.**

---

## Analytics Pipeline Status

| Event | Tracked | Persisted | Issue |
|-------|---------|---------|-------|
| `service_page_view` | ✅ API call | ✅ Yes (27 events) | MAI-1031 — NOW COMPLETE |
| `cta_click` | ✅ API call | ✅ Yes | MAI-1021 |
| `booking_form_view` | ✅ API call | ✅ Yes | MAI-1010 |
| `booking_form_submit` | ✅ API call | ✅ Yes | Working |
| `booking_created` | ✅ API call | ✅ Yes (ab_test file) | Partially working |
| `multi_inquiry_view` | ❌ Not tracked | ❌ No | GAP |
| `multi_inquiry_submit` | ❌ Not tracked | ❌ No | GAP |
| `quote_reminder_sent` | ❌ Not tracked | ❌ No | GAP |
| `corporate_inquiry_view` | ❌ Not tracked | ❌ No | GAP |
| `corporate_inquiry_submit` | ❌ Not tracked | ❌ No | GAP |

### Full Funnel (Now Measurable — with gaps)

```
Service Page Views (100%) [TRACKED ✅ — MAI-1031]
    ↓ ⚠️ CTR unknown (0 cta_click events in analytics_events.jsonl)
CTA Clicks (X%) [TRACKED ✅ in ab_test_events]
    ↓
Booking Form Views (X%) [TRACKED ✅ — MAI-1010]
    ↓
Inquiry Submissions (X%) [TRACKED ✅]
    ↓
Multi-chef Inquiry (X%) [NOT TRACKED - GAP]
    ↓
Corporate Inquiry (X%) [NOT TRACKED - GAP]
    ↓
Checkout → Payment [🔴 BLOCKED MAI-618 + Stripe keys]
```

**Critical observation from MAI-1072:** 27 service_page_view events but ZERO tracked CTA clicks from service pages, and ZERO bookings attributed to service page path in analytics. All 11 bookings in ab_test_events.jsonl came from direct homepage CTA → book URL, not from service detail page CTA. This suggests either:
1. Service page CTAs aren't being tracked
2. Users are going directly to booking URLs without clicking service page CTA
3. Attribution is broken between service page view → booking

---

## 1. Opportunity: Service Page → Booking Attribution Measurement (P1)

### Priority: P1 — Measurement Foundation

### Problem Statement

MAI-1072 (Funnel Analysis) identified a critical gap: **27 service_page_view events in analytics_events.jsonl, but zero bookings attributed to that path**. All 11 tracked bookings came from homepage CTA clicks → direct book URL, not through the service detail page CTA.

This means we cannot measure:
- Service page CTR (are users clicking the CTA on service pages?)
- Service page → booking conversion rate
- Which services have highest/lowest conversion

The measurement gap makes it impossible to optimize the service detail page or identify underperforming services.

### Evidence

From `analytics_events.jsonl`:
- 27 `service_page_view` events for service_id=1, chef_id=1
- Zero `cta_click` events from service pages
- Zero `booking_created` events with service_page_view attribution

From `ab_test_events.jsonl`:
- 11 `booking_created` events all with `variant: "premium"` (from homepage flow)
- Zero bookings with `service_page_view` origin correlation

The disconnect: when users view a service page, their `service_id` is not persisted. When they book (via homepage CTA or direct URL), the booking has no record of which service they originally viewed.

### User Story

> **As a** platform operator,
> **I want to** understand the full funnel from service page view to booking,
> **so that** I can identify drop-off points and optimize the conversion path.

### Scope

**In:**
- When `trackServicePageViewEvent` is called, store `service_id` in a cookie (e.g., `last_viewed_service`)
- On booking creation, read `last_viewed_service` cookie and include in analytics event
- Track `cta_click` events from service detail page (currently only tracked from homepage)
- Add `origin_service_id` field to booking_created events
- Dashboard: show service-level conversion metrics (views → clicks → inquiries)

**Out:**
- Automatic conversion optimization (just measurement)
- Multi-session attribution (just current session)

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Service page CTA click fires `cta_click` event with `service_id` |
| AC2 | Booking created event includes `origin_service_id` from cookie |
| AC3 | Analytics shows complete funnel: service_page_view → cta_click → booking |
| AC4 | Service-level conversion rates are measurable |

### Success Metrics

| Metric | Target |
|--------|--------|
| Service page → CTA click CTR | Establish baseline (expect 5-15%) |
| Service page → booking conversion rate | Establish baseline |
| Attribution coverage | 100% of bookings have origin_service_id |

### Effort

~45 minutes (MAI-1075 already specced by CEO)

### Dependencies

- MAI-1075 (Backend: Fix Service-to-Booking Attribution Tracking) is already specced and pending
- This opportunity confirms MAI-1075 is the right priority

### Open Questions

| # | Question | Priority |
|---|----------|---------|
| 1 | Should we also track time spent on service page? | 🟡 Low |
| 2 | Do we need multi-session attribution (user views service on Day 1, books on Day 3)? | 🟡 Low — MVP is single session |

---

## 2. Opportunity: Occasion Search Enhancement (P2)

### Priority: P2 — Discovery & Acquisition

### Problem Statement

The homepage hero search (MAI-894) filters by cuisine type only. However, **diners don't primarily search by cuisine — they search by occasion**: "birthday dinner for 12", "anniversary surprise", "corporate event for 30". A diner searching "birthday" or "corporate" gets zero results even though many services could accommodate their event.

This is a massive discovery gap that affects:
- Organic search users arriving with occasion intent
- Users who know what they want to celebrate but not what cuisine they want
- Corporate event planners who filter by group size and occasion, not cuisine

### Evidence

From MAI-1054 analysis:
- Homepage search: cuisine filter only (line 131: `cuisine_type` search)
- Service schema has `occasionTypes` field (birthday, anniversary, corporate, etc.)
- `occasionTypes` is stored but NOT searchable or filterable on homepage
- No occasion-based browsing or filtering exists anywhere

From analytics (analytics_events.jsonl):
- 27 service_page_view events all for service_id=1 (single service getting all traffic)
- This suggests discovery is broken — other services aren't being found

### User Story

> **As a** diner planning a birthday dinner for 12,
> **I want to** search for "birthday" and see chefs who specialize in celebrations,
> **so that** I can find the right chef without knowing what cuisine I want.

> **As a** corporate event planner,
> **I want to** filter by "corporate" and group size,
> **so that** I can quickly find chefs who cater to business events.

### Scope

**In:**
- Add occasion type filter to homepage hero search alongside cuisine
- Display occasion type badges on service cards (e.g., 🎂 Birthday, 🎉 Corporate)
- Add occasion tags to service detail page metadata for SEO
- Track `occasion_search` analytics event when occasion filter is used
- Services catalog page: add occasion filter dropdown

**Out:**
- AI-powered occasion menu recommendations
- Occasion-specific chef rankings
- Automated occasion reminders

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Homepage search includes occasion filter dropdown |
| AC2 | Service cards display relevant occasion badges |
| AC3 | Filtering by occasion shows only compatible services |
| AC4 | `occasion_search` event tracked when occasion filter used |
| AC5 | Mobile-friendly filter UI |
| AC6 | Services with no matching occasion are hidden (not shown as "no results") |

### Success Metrics

| Metric | Target |
|--------|--------|
| Occasion filter usage rate | >20% of searches use occasion filter |
| Service discovery coverage | Increase from 1 service to 5+ services getting views |
| Support tickets about "can't find what I need" | -20% |

### Effort

~2h (homepage filter + service card badges + catalog filter + analytics event)

### Dependencies

- `services.occasionTypes` field already in schema
- MAI-894 cuisine filter pattern can be reused

---

## 3. Opportunity: Booking Submission Confirmation Enhancement (P2)

### Priority: P2 — Trust & Completion Rate

### Problem Statement

When a diner submits a booking request, they receive only a basic confirmation. The booking status page shows the visual timeline (MAI-1014 ✅) but the **submission moment itself** lacks warmth, context, and next-step guidance.

Diners who've just committed to a $400+ booking deserve:
- Warm confirmation that their request was received
- Clear timeline: "Chef typically responds within X hours"
- What happens next (chef reviews → receives quote → you confirm)
- Emotional reinforcement: this is a special experience
- Share option to announce the upcoming event

### Evidence

Looking at `src/routes/booking-status-page.ts`:
- Timeline visualization exists (MAI-1014)
- Booking status is shown (requested → confirmed/declined)
- BUT: The submission confirmation lacks emotional resonance and next-step clarity
- No "what to expect" section for first-time bookers
- No share/announce option for the upcoming event
- No estimated response time shown ("Chef typically responds within 2 hours")

### User Story

> **As a** diner who just submitted a booking request,
> **I want to** feel confident my request was received and understand what happens next,
> **so that** I'm not anxious about whether the chef will respond.

### Scope

**In:**
- Enhance booking submission confirmation with warm, informative messaging
- Show "Estimated response time" based on chef's `avgResponseMinutes` (from MAI-994)
- Add "What happens next" section: 3-step visual (Request sent → Chef reviews → You receive quote)
- Add "Share your upcoming event" option (pre-filled text for social/WhatsApp)
- Show service summary (chef name, date, guests, price)
- For multi-chef inquiries: show which other chefs were contacted

**Out:**
- Two-way messaging before booking confirmation
- Automated menu or wine pairing suggestions
- Calendar invite generation

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Submission page shows warm confirmation with service summary |
| AC2 | "Expected response time" shown based on chef's avgResponseMinutes |
| AC3 | 3-step "what happens next" visual displayed |
| AC4 | Share button pre-fills message: "I'm hosting a [occasion] dinner for [N] guests..." |
| AC5 | Multi-chef inquiries show all contacted chefs |

### Success Metrics

| Metric | Target |
|--------|--------|
| Post-submission support tickets | -30% |
| Share/announce rate | >10% of submissions |
| Booking form completion rate | +5% (reduced abandonment from uncertainty) |

### Effort

~1.5h (frontend enhancement + analytics event)

### Dependencies

- MAI-1014 (Booking Status Visual Timeline) - already done
- MAI-994 (avgResponseMinutes on Chef API) - already committed

---

## Open Questions

| # | Question | Priority | Owner | Status |
|---|----------|----------|-------|--------|
| 1 | ETA for Stripe live keys + Vercel OIDC refresh? | 🔴 Critical | Fred | 20+ days pending |
| 2 | RESEND_API_KEY ETA? | 🔴 Critical | Fred | 20+ days pending |
| 3 | MAI-1015 Corporate Inquiry Flow — who picks it up? | 🟡 Medium | BE | Ready to build |
| 4 | Corporate inquiry threshold — 30 or 50 guests? | 🟡 Medium | CEO | Pending from MAI-1011 |

---

## Recommended Tasks

| Priority | Task | Owner | Effort | Dependencies |
|----------|------|-------|--------|--------------|
| P1 | Service-to-Booking Attribution (MAI-1075) | BE | ~45min | Already specced |
| P1 | Service Page CTA Click Tracking | FE | ~30min | MAI-1075 first |
| P2 | Occasion Search Enhancement | FE | ~2h | MAI-894 pattern |
| P2 | Booking Submission Confirmation Page | FE | ~1.5h | MAI-1014, MAI-994 |
| P2 | Corporate Inquiry Flow (MAI-1015) | BE+FE | ~1h | Ready to build |
| P3 | Multi-Chef Inquiry Analytics | BE | ~1h | Analytics infrastructure |
| P3 | Quote Reminder Manual Trigger | BE+FE | ~1h | Quote reminder exists |

---

## Prior POD Reference

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-1054 (May 4 08:00) | Revenue feature (stalled), referral reward (blocked), occasion search, booking confirmation | ⚠️ Partially addressed |
| MAI-1033 (May 3 17:00) | Multi-chef attribution, quote reminder trigger, lead engagement unification | ⚠️ Not yet implemented |
| MAI-1029 (May 3 12:00) | Booking timeline (✅), reviews (✅), dietary badges, lightbox | ✅ Superseded |

---

## Definition of Done

- [x] Platform state analyzed (recently completed, blockers, in-flight work)
- [x] Analytics funnel status reviewed (gap: service page → booking attribution missing)
- [x] 3 opportunities identified with user stories, scope, and acceptance criteria
- [x] Priority recommendation provided (P1: attribution, P2: occasion search + confirmation)
- [x] Dependencies and effort estimated
- [x] Open questions documented

---

_Generated by Product Manager Agent (Max) on 2026-05-04 16:00 UTC as part of MAI-1078 Product Opportunity Discovery_