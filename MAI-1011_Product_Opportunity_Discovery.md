# Product Opportunity Discovery — MAI-1011

**Issue:** 52c072b7-68bd-43d4-a4df-e58e6c5da365
**Date:** 2026-05-03 04:00 UTC
**Status:** ✅ Complete
**Analyst:** Product Manager Agent (Max)
**Model:** MiniMax-M2.7

---

## Executive Summary

MAI-997/MAI-1008 (Analytics Event Persistence) committed. Multi-chef inquiry system live. MAI-618 (Stripe/Resend keys) remains Fred's sole critical blocker at 23+ days. Three opportunities identified: Booking Status Visual Timeline (P2), Reviews Display on Chef Profile (P2), and Corporate Inquiry Flow (P3).

---

## Current Platform State

### Recently Completed ✅ (Last 24h)

| Module | Status | Issue |
|--------|--------|-------|
| Analytics Event Persistence | ✅ Committed (f0e1f73) | MAI-1008 |
| CTA Click Tracking for A/B Test | ✅ Committed (a201e23) | MAI-995 |
| avgResponseMinutes in API | ✅ Committed (eaa37f2) | MAI-994 |
| Multi-Chef Inquiry System | ✅ Live | MAI-948 |
| Reviews Table Schema + API | ✅ Committed | MAI-940 |
| Chef Photo Upload MVP | ✅ Committed | MAI-921 |

### Revenue Tasks — Blocked 🔴

| Issue | Title | Blocker |
|-------|-------|---------|
| MAI-1000 | DB Migration (revenue fields) | None — Ready |
| MAI-1001 | Pricing Display (checkout) | MAI-1000 |
| MAI-1002 | Fee Calculation | MAI-1000 |
| MAI-1003 | Stripe Payment Flow | MAI-618 Fred |

### Critical Blockers 🔴

| Blocker | Impact | Days Pending |
|---------|--------|---------------|
| `STRIPE_SECRET_KEY = empty` | Payment processing + revenue blocked | 23+ days |
| `RESEND_API_KEY = re_placeholder` | All transactional emails blocked | 23+ days |
| Vercel OIDC token expired | Cannot deploy | Unknown |

**No agent can unblock these. Fred is the only owner.**

---

## 1. Opportunity: Booking Status Visual Timeline (P2)

### Priority: P2 — User Clarity

### Problem Statement

The booking status page (`/booking-status/:token`) shows the current status and text-based "next steps" but lacks:
- A visual timeline of all booking stages
- Expected wait time per stage
- What to do if chef doesn't respond

After submitting an inquiry, diners have no clarity on expected timelines or next actions. This generates support questions like "when will I hear back?" and reduces quote acceptance rate.

### Evidence

Current `getNextSteps()` in `booking-status-page.ts` returns text arrays:
```typescript
case 'new':
case 'pending':
  return [
    'Chef will review your request within 24 hours',
    'You\'ll receive an email when chef responds',
    'Feel free to browse other services in the meantime',
  ];
```

No visual timeline component exists. No follow-up button for stale leads. No expected duration display per stage.

### User Story

> **As a** diner who submitted an inquiry,
> **I want to** see a clear visual timeline of my booking journey with expected wait times,
> **so that** I know exactly where I am, what comes next, and what to do if no response.

### Scope

**In:**
- Visual "Booking Journey" timeline with 5 stages:
  - Step 1: ✅ Inquiry Sent
  - Step 2: ⏳ Awaiting Response — "Chef typically responds within 4–12 hours"
  - Step 3: 💰 Quote Received
  - Step 4: 💳 Payment
  - Step 5: 🍽️ Confirmed
- Current step highlighted with distinct styling
- Each step shows expected duration range
- If status is `new`/`pending` and >12h elapsed: show "What if no response?" section with:
  - "Send a follow-up" button (calls `POST /api/lead/:id/follow-up` — idempotent)
  - "Browse other chefs" CTA
- Responsive on mobile (min 320px)

**Out:**
- Push notifications or real-time WebSocket updates
- Automatic follow-up email scheduling
- Payment processing guidance on timeline

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Timeline shows 5 stages with current stage highlighted |
| AC2 | Each stage shows expected duration or range |
| AC3 | >12h elapsed on `new`/`pending` shows "What if no response?" section |
| AC4 | "Send follow-up" button triggers idempotent stale lead re-engagement email |
| AC5 | Responsive layout (mobile-friendly at 320px) |

### Success Metrics

| Metric | Target |
|--------|--------|
| Support tickets: "where's my quote?" | -30% |
| Follow-up button click rate | >20% |
| Quote acceptance rate from status page | +5% |

### Effort

~1.5h (frontend timeline component + existing follow-up email integration)

### Dependencies

- `src/automations/diner-stale-lead-email.ts` already exists (MAI-845)
- Booking status page already renders lead status

### Notes

- The existing `getNextSteps()` function provides text guidance — this supplements it with visual timeline, not replaces it
- Stale lead detection: compare `lead.createdAt` with current time, show follow-up CTA if >12h and status still `new`/`pending`

---

## 2. Opportunity: Reviews Display on Chef Profile (P2)

### Priority: P2 — Trust Signal

### Problem Statement

The reviews table schema (MAI-940) is committed, the API endpoint (`GET /api/services/:id/reviews`) exists, but **reviews are not displayed anywhere on the platform**. Chef profiles and service pages show no social proof from past diners. This is a significant trust gap for a service-based marketplace.

### Evidence

- `drizzle/0003_mai_940_reviews.sql` — reviews table created
- `src/api/reviews.ts` — reviews API endpoint exists with full CRUD
- `src/routes/pages.ts` — chef profile page exists
- `chef-profile-page.ts` — renders chef info, services, lead counts — **no reviews rendered**

No `renderReviewsSection()` or equivalent exists in chef profile page.

### User Story

> **As a** diner researching a chef,
> **I want to** see reviews from past diners,
> **so that** I can make an informed booking decision based on real experiences.

### Scope

**In:**
- Fetch and display reviews on chef profile page (`src/routes/chef-profile-page.ts`)
- Show star rating (average + count), reviewer name (first name only), date, comment
- Display on service detail page as well
- "No reviews yet" graceful placeholder
- Sort by newest first, show max 10 most recent (pagination optional)
- Aggregate rating: show "★ 4.8 (23 reviews)" on service card and profile header

**Out:**
- Review submission UI (already exists via `POST /api/reviews/`)
- Photo reviews
- Review verification badges

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Chef profile page displays reviews with star rating, name, date, comment |
| AC2 | Average star rating + count shown on profile header |
| AC3 | "No reviews yet" placeholder when service has no reviews |
| AC4 | Reviews sorted by newest first, max 10 shown |
| AC5 | Responsive layout |

### Success Metrics

| Metric | Target |
|--------|--------|
| Reviews displayed on chef profiles | >50% within 1 week |
| Booking uplift on profiles with vs without reviews | +15% |

### Effort

~1h (frontend display component + API fetch for chef profile page)

### Dependencies

- `src/api/reviews.ts` — API endpoint already exists and returns review data
- `chef-profile-page.ts` — already renders chef info, needs reviews section added

### Notes

- Reviews API endpoint was committed with MAI-940 (bdf84b2) but frontend display was never built
- This is a pure frontend task — API is ready
- Consider star rating aggregate display on chef discovery page cards as future enhancement

---

## 3. Opportunity: Corporate Inquiry Flow (P3)

### Priority: P3 — Segment Discovery

### Problem Statement

The platform is optimized for small group bookings (2–20 guests). Corporate events (50+ guests) have distinct needs: menu customization, multiple courses, on-site staffing, invoicing. There's no dedicated path for these inquiries. Current max guest count of 10 in schema prevents large party inquiries from being submitted at all.

### Evidence

- `services.maxGuests` — likely capped at 10 based on checkout page references to "6+ guests for corporate"
- No corporate-specific fields (company name, event type, budget range, PO number)
- Checkout upsell card mentions corporate context but actual threshold is unclear

### User Story

> **As a** corporate event planner,
> **I want to** submit an inquiry for 50+ guests with specific requirements,
> **so that** I can get a customized proposal for a business event.

### Scope

**In:**
- Increase `maxGuests` validation to 200 (via DB migration)
- Add "Corporate Event" toggle on inquiry form
- When guest count > 30 OR corporate toggle active: reveal additional fields:
  - Company name
  - Event type (dropdown: Dinner, Lunch, Cocktail Reception, Breakfast, Other)
  - Budget range (dropdown: Under $1,000 / $1,000–$5,000 / $5,000–$15,000 / $15,000+)
- Separate "Corporate Inquiry" subject line in chef notification email
- Show "Corporate" badge on lead cards in chef dashboard

**Out:**
- Invoice generation (stub only, no full accounting)
- Corporate payment processing (different Stripe flow)
- Custom menu builder UI

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Guest count can exceed 10 (up to 200) |
| AC2 | Corporate toggle reveals company name + event type fields |
| AC3 | Corporate leads show "Corporate" badge in chef dashboard |
| AC4 | Corporate inquiry email uses separate subject line |

### Success Metrics

| Metric | Target |
|--------|--------|
| Corporate inquiry volume | Establish baseline |
| Corporate to booking conversion | Establish baseline |

### Effort

~1h (DB migration + form fields + email template update + dashboard badge)

### Dependencies

- None — can be built independently

---

## Open Questions

| # | Question | Priority | Owner | Status |
|---|----------|----------|-------|--------|
| 1 | ETA for Stripe keys + Resend key? | 🔴 Critical | Fred | 23+ days pending |
| 2 | Should booking timeline component replace or supplement `getNextSteps()`? | 🟡 Medium | FE | Recommend supplement |
| 3 | Are there any existing reviews in the database to display? | 🟡 Medium | Data | Check before building |
| 4 | Should corporate threshold be 30 or 50 guests? | 🟡 Medium | CEO | Decision needed |

---

## Recommended Tasks

| Priority | Task | Owner | Effort | Dependencies |
|----------|------|-------|--------|--------------|
| P2 | Booking Status Visual Timeline | Frontend | ~1.5h | Stale lead email exists |
| P2 | Reviews Display on Chef Profile | Frontend | ~1h | Reviews API ready |
| P3 | Corporate Inquiry Flow | BE + FE | ~1h | None |

---

## Prior POD Reference

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-1005 (May 3 00:00) | Analytics persistence, booking timeline, multi-chef attribution | ✅ Complete |
| MAI-998 (May 2 20:00) | Funnel analytics gap, booking timeline, multi-chef attribution | ✅ Complete |
| MAI-993 (May 2 13:00) | Revenue Feature Spec (booking fee) | ✅ Specced |

---

## Definition of Done

- [x] Platform state analyzed (recently completed, blockers, in-flight work)
- [x] Prior POD opportunities reviewed (still valid or superseded)
- [x] 3 opportunities identified with user stories, scope, and acceptance criteria
- [x] Priority recommendation provided
- [x] Dependencies and effort estimated
- [x] Open questions documented

---

_Generated by Product Manager Agent (Max) on 2026-05-03 04:00 UTC as part of MAI-1011 Product Opportunity Discovery_
