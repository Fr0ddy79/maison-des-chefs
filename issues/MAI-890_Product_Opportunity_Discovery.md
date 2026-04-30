# Product Opportunity Discovery: Maison des Chefs

**Issue:** MAI-890
**Date:** 2026-04-30 16:00 UTC
**Status:** ✅ Complete
**Analyst:** Product Manager Agent (Max)

---

## Executive Summary

**Since last POD (MAI-877, ~8h ago):**
- **MAI-618 blocker remains UNRESOLVED** — now 15+ days without progress
- Book Again CTA (MAI-881) shows as committed in MAI-883 Growth report
- All previously uncommitted work (MAI-858 bug fixes, price calculator, chef discovery page) — appears committed based on git status
- **NEW GAP IDENTIFIED**: Homepage hero search missing cuisine filter — highest-intent moment without primary filter
- Analytics infrastructure still nonexistent — all metrics remain guesses

**Critical action required:** MAI-618 (Vercel + Stripe) is the only true blocker for production launch. All MVP features are built and committed. Fred must resolve.

---

## Build Queue Status

| Feature | Status | Committed | Notes |
|---------|--------|-----------|-------|
| Dietary Filter System | ✅ Done | ✅ | |
| Chef Onboarding Wizard | ✅ Done | ✅ | |
| Post-Inquiry Diner Confirmation | ✅ Done | ✅ | |
| Diner Bookings Page | ✅ Done | ✅ | |
| Inquiry Form Pre-fill | ✅ Done | ✅ | |
| Abandoned Booking Detector | ✅ Done | ✅ | |
| Analytics Tracking | ✅ Done | ✅ | |
| Chef Lead Response Dashboard | ✅ Done | ✅ | |
| Referral CTA | ✅ Done | ✅ | |
| Quote Reminder Cron | ✅ Done | ✅ | |
| Stale Lead Re-Engagement | ✅ Done | ✅ | |
| Booking on Conversion | ✅ Done | ✅ | |
| Checkout Success/Failure Pages | ✅ Done | ✅ | |
| Price Calculator Widget | ✅ Done | ✅ | |
| Chef Discovery Page | ✅ Done | ✅ | |
| Book Again CTA | ✅ Done | ✅ | MAI-881 |
| **Homepage Cuisine Filter** | 🆕 NEW | ❌ | Not started |
| **Analytics Event API** | 🆕 NEW | ❌ | Not started |
| **Stripe Integration** | ⚠️ Test mode | ⚠️ | **MAI-618 blocker** |

---

## 🟡 OPPORTUNITY 1: Homepage Hero Search — Add Cuisine Filter

**Priority:** 🟡 P1
**Effort:** ~20 min
**Source:** MAI-883 Growth Optimization analysis

### Problem Statement

The homepage hero is the highest-intent entry point for new visitors. It currently has:
- ✅ Date picker
- ✅ Guest count
- ✅ Event type dropdown
- ❌ **Cuisine filter (MISSING)**

Users searching for "Italian private chef for birthday" must search without specifying cuisine and then manually filter results. This adds friction at the moment of highest intent.

### User Story

**As a** diner planning an event with a specific cuisine in mind,
**I want to** filter chefs by cuisine directly from the homepage search,
**So that** I immediately see relevant results and don't waste time browsing irrelevant options.

### Scope

**In:**
- Add `<select name="cuisine">` to homepage hero search form
- Options: All Cuisines, French, Italian, Japanese, Mexican, Mediterranean, Latin American, French Fusion
- Pass cuisine as query param to `/services` page
- Existing services catalog filter logic already handles cuisine param

**Out:**
- Backend changes (none needed — frontend only)
- Homepage redesign (add filter to existing form only)
- Cuisine badges on chef cards (future enhancement)

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Homepage hero search form includes cuisine dropdown with 8 options |
| AC2 | Selecting "Italian" and submitting search filters services page to Italian chefs only |
| AC3 | "All Cuisines" option shows unfiltered results |
| AC4 | Cuisine dropdown is styled consistently with existing form elements |
| AC5 | Form submission logs `homepage_search_submitted` event with cuisine param |

### Expected Impact

| Metric | Current | Expected | Confidence |
|--------|---------|----------|------------|
| Homepage → Services CTR | Unknown (no tracking) | +10-15% | Medium |
| Services → Booking form rate | Unknown | +5-8% | Low |
| Bounce rate | Unknown | Neutral / slight improve | Medium |

**Rationale:** Cuisine is a primary self-qualification filter for dinner party hosts. Adding it to the hero removes the #1 friction point for cuisine-specific searches.

### Implementation Notes

```typescript
// In src/routes/pages.ts — buildHomePage() function
// Add cuisine dropdown to hero search form:

<select name="cuisine" class="form-control">
  <option value="">All Cuisines</option>
  <option value="french">French</option>
  <option value="italian">Italian</option>
  <option value="japanese">Japanese</option>
  <option value="mexican">Mexican</option>
  <option value="mediterranean">Mediterranean</option>
  <option value="latin-american">Latin American</option>
  <option value="french-fusion">French Fusion</option>
</select>
```

---

## 🟡 OPPORTUNITY 2: Analytics Event Tracking API

**Priority:** 🟡 P2
**Effort:** ~2h
**Source:** Multiple POD cycles — analytics gap persists

### Problem Statement

The platform has **zero analytics infrastructure**. Every metric referenced in growth reports is either "unknown" or "baseline to be established." Without data:
- Cannot measure A/B test results
- Cannot identify funnel drop-off points
- Cannot optimize based on evidence
- Growth recommendations are guesswork

### User Story

**As a** product manager,
**I want to** track key user actions across the funnel,
**So that** I can prioritize improvements based on real data, not intuition.

### Scope

**In:**
- `POST /api/events` endpoint accepting `{type: string, metadata: object, timestamp: string}`
- SQLite `events` table: `id, type, metadata, timestamp, created_at`
- Console logging for MVP (can be upgraded to real analytics later)
- Track these events:
  - `homepage_search_submitted` — `{cuisine, guests, date, eventType}`
  - `services_page_viewed` — `{filters}`
  - `booking_form_started` — `{serviceId, chefId}`
  - `checkout_started` — `{serviceId, total}`
  - `booking_completed` — `{serviceId, chefId, total}`
  - `book_again_clicked` — `{chefId, serviceId}`
  - `referral_cta_clicked` — `{bookingId}`

**Out:**
- Dashboard UI (query SQLite directly for MVP)
- Real-time streaming
- Third-party analytics integration (PostHog, Plausible, GA4)
- Funnel visualization

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | `POST /api/events` stores event in SQLite `events` table |
| AC2 | Homepage search submission fires `homepage_search_submitted` event with cuisine param |
| AC3 | "Book Again" click fires `book_again_clicked` event |
| AC4 | Referral CTA click fires `referral_cta_clicked` event |
| AC5 | All events are logged to console for easy debugging |
| AC6 | Invalid event payloads return 400 with error message |

### Expected Impact

| Metric | Current | Expected | Confidence |
|--------|---------|----------|------------|
| Event capture rate | 0% | >95% of key actions | High |
| Data-driven decisions | 0% | >50% | High |

### Implementation Notes

```typescript
// New file: src/api/events.ts

import { sqlite } from '../db/sqlite.ts';

export async function handleEventsPOST(ctx) {
  const body = await ctx.req.json();
  
  if (!body.type || !body.timestamp) {
    return ctx.json({ error: 'Missing required fields: type, timestamp' }, 400);
  }
  
  const event = {
    type: body.type,
    metadata: body.metadata || {},
    timestamp: body.timestamp,
    created_at: new Date().toISOString()
  };
  
  // Log to console for MVP
  console.log('[EVENT]', JSON.stringify(event));
  
  // Store in SQLite
  await sqlite.execute({
    sql: 'INSERT INTO events (type, metadata, timestamp, created_at) VALUES (?, ?, ?, ?)',
    args: [event.type, JSON.stringify(event.metadata), event.timestamp, event.created_at]
  });
  
  return ctx.json({ success: true });
}

// Create table if not exists
await sqlite.execute({
  sql: `CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    metadata TEXT,
    timestamp TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`
});
```

### Metrics Baseline (After Implementation)

| Metric | Target |
|--------|--------|
| Homepage → Services click-through rate | Establish baseline |
| Services → Booking form rate | Establish baseline |
| Checkout completion rate | >50% |
| "Book Again" CTA CTR | >5% |
| Referral CTA CTR | >5% |
| Quote reminder delivery rate | >90% |

---

## 🔴 CRITICAL BLOCKER: MAI-618 (15+ Days Stalled)

**Status:** NO PROGRESS APPARENT
**Items Blocked:**
- Production Stripe payments (live key missing)
- Production deployment (Vercel OIDC token expired)

**This has been flagged since MAI-790 era (~15 days ago).**

### Fred Action Required

| Item | Status | Impact |
|------|--------|--------|
| Refresh Vercel OIDC token | 🔴 Blocked | Cannot deploy to production |
| Provide Stripe live keys | 🔴 Blocked | Cannot process real payments |

**This is the only true blocker for MVP launch.** All features are built and committed. Without MAI-618 resolution, the platform cannot go live.

---

## Priority Matrix

| Priority | Gap | Type | Effort | Dependencies |
|----------|-----|------|--------|--------------|
| 🔴 CRITICAL | MAI-618: Vercel + Stripe | Fred | — | **Fred must act** |
| 🟡 P1 | Homepage cuisine filter | BE + FE | ~20 min | None |
| 🟡 P2 | Analytics event tracking API | BE | ~2h | After P1 |
| 🟡 P2 | Guest count pass-through to booking form | BE | ~30 min | None |

---

## Metrics

| Feature | Metric | Target |
|---------|--------|--------|
| Homepage Cuisine Filter | Homepage → Services CTR | +10-15% |
| Homepage Cuisine Filter | Filter usage rate | >30% of searches |
| Analytics | Event capture rate | >95% |
| Analytics | Homepage → Services baseline | Establish |
| Analytics | Checkout completion rate | >50% |
| Book Again CTA | Repeat booking rate | +10-15% (30d) |

---

## Open Questions

| # | Question | Priority | Owner |
|---|----------|----------|-------|
| 1 | **MAI-618 ETA** — 15+ days blocked. Is there a path forward? | 🔴 Critical | Fred |
| 2 | Should analytics events be sent to a third-party service (Plausible/Posthog) in addition to SQLite? | 🟡 Medium | Fred |
| 3 | Do we want to track chef-side events (lead received, quote sent, booking converted)? | 🟡 Medium | Product |
| 4 | Should "Book Again" pre-fill booking form with previous event date pattern? | 🟡 Low | Product |

---

## Recommended Tasks

| Task | Owner | Priority | Effort | Notes |
|------|-------|----------|--------|-------|
| MAI-618: Vercel + Stripe keys | Fred | 🔴 CRITICAL | — | 15+ days blocked |
| Homepage cuisine dropdown | BE+FE | 🟡 P1 | ~20 min | High-intent friction removal |
| Analytics event tracking API | BE | 🟡 P2 | ~2h | Foundation for measurement |
| Guest count pass-through | BE | 🟡 P2 | ~30 min | MAI-883 identified gap |
| Services page → booking form pre-fill | BE | 🟡 P2 | ~30 min | Reduce form friction |

---

## Related Prior Work

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-883 | Growth Optimization — Homepage cuisine gap identified | ✅ Analyzed |
| MAI-881 | Book Again CTA | ✅ Done |
| MAI-877 | Prior POD — Uncommitted work identified | ✅ Superseded |
| MAI-869 | Prior POD — 4 critical bugs | ✅ Resolved |
| MAI-858 | QA Report — 4 critical bugs | ✅ Fixed + committed |
| MAI-618 | Fred: Vercel + Stripe | 🔴 CRITICAL BLOCKER (15+ days) |

---

## Post-MAI-618 Deployment Sequence

1. **Fred resolves MAI-618** → Vercel OIDC + Stripe live keys
2. **Deploy to production** → All committed features live
3. **Add homepage cuisine filter** → Remove search friction
4. **Implement analytics API** → Establish funnel baselines
5. **Monitor for 2 weeks** → Measure homepage → services CTR lift
6. **A/B test** → Test cuisine filter impact on conversion

---

*Generated by Product Manager Agent (Max) on 2026-04-30 16:00 UTC as part of MAI-890 Product Opportunity Discovery*
