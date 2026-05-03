# Product Opportunity Discovery — MAI-1005

**Issue:** 75d30c5c-9ab7-4758-ad70-28a2d30c194b
**Date:** 2026-05-03 00:00 UTC
**Status:** ✅ Complete
**Analyst:** Product Manager Agent (Max)
**Model:** MiniMax-M2.7

---

## Executive Summary

Revenue feature (MAI-993) is now specced with 4 tasks spawned. Critical gap identified: `POST /api/analytics/event` endpoint does NOT persist events to JSONL files despite MAI-997 task existing — the task targets `src/api/analytics.ts` but the tracking code in `analytics.ts` are client-side helpers calling the API, which only console-logs. Three opportunities remain from prior POD cycles, now upgraded to reflect recent context.

---

## Current Platform State

### Recently Completed ✅ (Last 24h)

| Module | Status | Issue |
|--------|--------|-------|
| Revenue Feature Spec | ✅ Specced | MAI-993 |
| Multi-Chef Inquiry Validation | 🟡 Uncommitted | MAI-948 |

### Spawned Tasks (from MAI-993 Revenue Feature)

| ID | Title | Priority | Status | Blocker |
|----|-------|----------|--------|---------|
| MAI-1000 | DB Migration (revenue fields) | P1 | Ready | None |
| MAI-1001 | Pricing Display (checkout) | P1 | Ready | MAI-1000 |
| MAI-1002 | Fee Calculation | P1 | Ready | MAI-1000 |
| MAI-1003 | Stripe Payment Flow | P1 | 🔴 Blocked | Fred: STRIPE_SECRET_KEY |

### Critical Blockers 🔴 (Fred Must Resolve)

| Blocker | Impact | Days Pending |
|---------|--------|---------------|
| `STRIPE_SECRET_KEY = empty` | Payment processing + revenue blocked | 23+ days |
| `RESEND_API_KEY = re_placeholder` | All transactional emails blocked | 23+ days |
| Vercel OIDC token expired | Cannot deploy | Unknown |

**No agent can unblock these. Fred is the only owner.**

---

## 1. Analytics Event Persistence — Verification Gap (P1)

### Problem Statement

MAI-997 task exists to add event persistence to `src/api/analytics.ts`. However, upon inspection:

1. **The task targets the wrong file** — MAI-997 says "modify `src/api/analytics.ts`" but the analytics API endpoint (`POST /api/analytics/event`) only console-logs events — it doesn't call any file persistence
2. **Tracking functions in `analytics.ts` are client-side helpers** — they log to console for development but never call the API to persist
3. **JSONL files exist but aren't written to** — `data/analytics_events.jsonl` has 27 lines from older manual writes; `data/ab_test_events.jsonl` has 61 lines

The actual fix needs to be in the `POST /api/analytics/event` endpoint to persist the body to JSONL, not in the client-side tracking functions.

### Current State

**API Endpoint** (`src/api/analytics.ts`):
```typescript
server.post('/event', async (request, reply) => {
  const body = analyticsEventSchema.parse(request.body);
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Analytics]', JSON.stringify(body));
  }
  // In production, this would forward to an analytics service
  return reply.status(202).send({ success: true });
});
```

No `appendFileSync` call exists. No persistence to `data/analytics_events.jsonl`.

**Client-side tracking** (`src/routes/analytics.ts`):
```typescript
export function trackServicePageViewEvent(data) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Analytics] Service page view:', data);
  }
  // TODO: Forward to analytics service
}
```

These are helper functions that just console-log. They don't call `POST /api/analytics/event`.

### Root Cause

The MAI-997 task was written correctly (targeting `POST /api/analytics/event`) but someone may have confused it with the client-side `analytics.ts` tracking functions.

### Scope

**In:**
- Add `appendFileSync` to `POST /api/analytics/event` endpoint
- Persist to `data/analytics_events.jsonl`
- Graceful degradation if write fails (fire-and-forget)
- Preserve existing console.log behavior

**Out:**
- A/B test event persistence (separate file, separate endpoint — see P3 below)

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | POST /api/analytics/event appends body to data/analytics_events.jsonl |
| AC2 | File created if it doesn't exist |
| AC3 | No error thrown if write fails (fire-and-forget) |
| AC4 | Existing console.log behavior preserved |

### Dependencies

None.

---

## 2. Opportunity: Booking Timeline Journey (P2)

**Status: Not started since MAI-998 (16h ago)**

### Problem Statement

The booking status page shows the current status but not the expected timeline or what happens next. After submitting an inquiry, diners have no clarity on expected wait times, what each status means, or what to do if no response.

### User Story

> **As a** diner who submitted an inquiry,
> **I want to** see a clear step-by-step timeline of the booking process with expected wait times,
> **so that** I know exactly where I am and what to expect next.

### Scope

**In:**
- Add visual "Booking Journey" timeline to booking status page:
  - Step 1: ✅ Inquiry Sent
  - Step 2: ⏳ Awaiting Response — "Chef typically responds within 4-12 hours"
  - Step 3: 💰 Quote Received
  - Step 4: 💳 Payment
  - Step 5: 🍽️ Confirmed
- Current step highlighted
- Each step shows expected duration
- If >12h with no response: show "What if no response?" section with:
  - "Send a follow-up" button (triggers `diner-stale-lead-email.ts`)
  - "Browse other chefs" CTA

**Out:**
- Real-time push notifications
- Automatic follow-up emails

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Timeline shows 5 steps with current step highlighted |
| AC2 | Each step shows expected duration |
| AC3 | >12h with no response shows "What if no response?" section |
| AC4 | "Send follow-up" button triggers stale lead email (idempotent) |
| AC5 | Responsive on mobile (min 320px) |

### Success Metrics

| Metric | Target |
|--------|--------|
| Support tickets about "where's my quote?" | -30% |
| Follow-up email click rate | >20% |
| Booking status page → quote acceptance rate | +5% |

### Effort

~1.5h (frontend timeline component + follow-up email integration)

### Dependencies

- `diner-stale-lead-email.ts` already exists (MAI-845)

---

## 3. Opportunity: Multi-Chef Funnel Attribution (P2→P3)

**Status: Not started since MAI-987**

### Problem Statement

Multi-chef inquiry (MAI-948) is committed but we have no way to measure its effectiveness. We don't know conversion rates, which chefs get the most multi-chef inquiries, or attribution when a diner books.

### User Story

> **As a** platform operator,
> **I want to** understand multi-chef inquiry conversion patterns,
> **so that** I can optimize the feature and measure its ROI.

### Scope

**In:**
- Add `multi_inquiry_view` analytics event when diner views multi-chef compare bar
- Add `multi_inquiry_submit` event when multi-inquiry submitted
- Add `multi_inquiry_id` and `inquiry_type` to booking form view event
- Chef leads dashboard: show multi-chef inquiry count badge
- Backend: GET `/api/chefs/:id` includes `multiInquiryCount` (last 30 days)

**Out:**
- Automatic winner selection
- Multi-chef ranking/recommendation

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Multi-chef inquiry views tracked with analytics event |
| AC2 | Multi-chef inquiry submissions tracked |
| AC3 | Lead attribution by inquiry type visible in chef dashboard |
| AC4 | Conversion rates calculable for multi vs single inquiry |

### Success Metrics

| Metric | Target |
|--------|--------|
| Multi-chef → booking conversion rate | Establish baseline |
| Multi-chef vs single-chef CVR | Compare within 30 days |
| Average chefs per multi-inquiry | 2-4 range expected |

### Effort

~1h (analytics events + dashboard badge)

### Dependencies

- P1 (Analytics Event Persistence) — needed to actually store the events

---

## Open Questions

| # | Question | Priority | Owner | Status |
|---|----------|----------|-------|--------|
| 1 | ETA for Stripe keys + Resend key? | 🔴 Critical | Fred | 23+ days pending |
| 2 | MAI-997 task — should implementer know to target API endpoint, not client-side helper? | 🟡 High | BE | Clarification needed |
| 3 | Should MAI-948 multi-chef be verified before P3 attribution work? | 🟡 Medium | FE | Recommend verification first |
| 4 | Should we show response time expectations per chef? | 🟡 Medium | Product | Related to MAI-930 |

---

## Recommended Priority

| Priority | Task | Rationale |
|----------|------|------------|
| **P1** | Verify MAI-997 targets correct location (API endpoint) | Task exists but may be misunderstood |
| **P1** | MAI-1000 DB Migration (revenue fields) | Unblocks entire revenue feature |
| **P2** | Booking Timeline Journey | High everyday user impact |
| **P3** | Multi-Chef Funnel Attribution | Needs P1 first (event storage) |

---

## Prior POD Reference

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-998 (May 2 20:00) | Growth Optimization — funnel analytics gap, booking timeline, multi-chef attribution | ✅ Complete |
| MAI-987 (May 2 16:00) | Diner competition indicator, pre-booking messaging, chef market rate benchmark | ✅ Complete |
| MAI-977 (May 2 12:00) | Prior POD — various opportunities | ✅ Complete |

---

## Definition of Done

- [x] Platform state analyzed (active tasks, blockers, in-flight work)
- [x] Prior POD opportunities reviewed (still valid or superseded)
- [x] 3 opportunities identified with user stories, scope, and acceptance criteria
- [x] Priority recommendation provided
- [x] Dependencies and effort estimated
- [x] Open questions documented

---

_Generated by Product Manager Agent (Max) on 2026-05-03 00:00 UTC as part of MAI-1005 Product Opportunity Discovery_