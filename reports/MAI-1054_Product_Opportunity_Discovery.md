# Product Opportunity Discovery — MAI-1054

**Issue:** 35a067cb-2141-41d7-bf1a-6d79da94a5fe
**Date:** 2026-05-04 08:00 UTC
**Status:** ✅ Complete
**Analyst:** Product Manager Agent (Max)
**Model:** MiniMax-M2.7

---

## Executive Summary

Revenue feature (MAI-993) is specced but stalled — it's the top priority to unblock. Multi-chef inquiry is live but unmeasured. Corporate inquiry flow (MAI-1015) ready to build. Three new opportunities identified: **Referral Reward Automation (P1)**, **Service Discovery Gap: Occasion Search (P2)**, and **Booking Submission Confirmation Page (P2)**.

---

## Current Platform State

### Recently Completed ✅ (Last 24h)

| Module | Status | Issue | Commit |
|--------|--------|-------|--------|
| Chef Signature Dishes Showcase | ✅ Live | MAI-1047 | b5155c7 |
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
| MAI-990: Audit & Commit Uncommitted Changes | BE | in_progress | — | Stale leads cleanup |

### Critical Blockers 🔴

| Blocker | Impact | Days Pending |
|---------|--------|---------------|
| `RESEND_API_KEY = re_placeholder` | All transactional emails blocked | 20+ days |
| `STRIPE_SECRET_KEY = empty` | Payment processing + revenue blocked | 20+ days |
| Vercel OIDC token expired | Cannot deploy | Unknown |

**No agent can unblock these. Fred is the only owner.**

---

## Revenue Feature Status

MAI-993 (Revenue Feature Spec) is **specced but not started**. This is the single biggest gap:

| Component | Status |
|-----------|--------|
| Spec | ✅ Complete |
| DB migration (4 fields) | ❌ Not started |
| Backend fee calculation | ❌ Not started |
| Stripe payment flow | ❌ Blocked by Stripe keys |
| Frontend itemized pricing | ❌ Not started |
| Testing | ❌ Not started |

**Revenue is the #1 business priority. Every day without it is lost revenue.** The spec is ready — Fred just needs to provide Stripe keys and assign an engineer.

---

## Analytics Pipeline Status

| Event | Tracked | Persisted | Issue |
|-------|---------|---------|-------|
| `service_page_view` | ✅ API call | ✅ Yes | MAI-1031 |
| `cta_click` | ✅ API call | ✅ Yes | MAI-1021 |
| `booking_form_view` | ✅ API call | ✅ Yes | MAI-1010 |
| `booking_form_submit` | ✅ API call | ✅ Yes | Working |
| `multi_inquiry_view` | ❌ Not tracked | ❌ No | GAP |
| `multi_inquiry_submit` | ❌ Not tracked | ❌ No | GAP |
| `quote_reminder_sent` | ❌ Not tracked | ❌ No | GAP |
| `follow_up_sent` | ❌ Not tracked | ❌ No | GAP |
| `corporate_inquiry_view` | ❌ Not tracked | ❌ No | GAP |
| `corporate_inquiry_submit` | ❌ Not tracked | ❌ No | GAP |

### Full Funnel (Now Measurable)

```
Service Page Views (100%) [TRACKED ✅]
    ↓ (CTR ~10-20% — NOW MEASURABLE)
CTA Clicks (10-20%) [TRACKED ✅]
    ↓ (Reach ~70%)
Booking Form Views (7-14%) [TRACKED ✅]
    ↓ (Submit ~30%)
Inquiry Submissions (2-4%) [TRACKED ✅]
    ↓
Multi-chef Inquiry (X%) [NOT TRACKED - GAP]
    ↓
Corporate Inquiry (X%) [NOT TRACKED - GAP]
    ↓
Quote Received (X%) [NOT TRACKED - GAP]
    ↓
Checkout → Payment [🔴 BLOCKED MAI-618 + Stripe keys]
```

---

## 1. Opportunity: Referral Reward Automation (P1)

### Priority: P1 — Revenue Growth Flywheel

### Problem Statement

MAI-719 (Diner Referral Retention Campaign) is live and committed. The referral share links exist and are tracked (MAI-1036). However, there is **no automated reward system** — when a referred diner books, neither the referrer nor the referee receives any automated notification or reward. The referral program is effectively a broken loop: people share, but nothing happens when their referral converts.

### Evidence

Looking at the referral flow:
- Referral share buttons exist on the booking status page (copy, email, WhatsApp)
- Share events are tracked with `code`, `channel` (MAI-1036)
- BUT: no trigger exists for "referral_converted" reward
- No automated email to the referrer when their friend books
- No "you've earned a discount" message to the referee
- No way to attribute a booking back to a referral code

The referral program needs a closed loop: **share → friend books → referrer gets reward**.

### User Story

> **As a** diner who referred a friend,
> **I want to** automatically receive a reward when my friend books,
> **so that** I'm motivated to keep sharing Maison des Chefs.

> **As a** platform,
> **I want to** track which referrals actually convert,
> **so that** I can measure true referral ROI and reward top referrers.

### Scope

**In:**
- Add `referredBy` field to bookings (stores referral code used)
- Add `referral_converted` analytics event on successful booking from referral
- Track referrer identity: link `referralCode` → `referrerUserId` → `referrerEmail`
- On booking confirmation from referral:
  - Send email to referrer: "Your friend just booked! Here's your reward: [X]% off your next booking"
  - Send email to referee: "Welcome! You were referred by [name]. Enjoy [X]% off as a thank you"
- Store `referralRewardClaimedAt` on referrer's account
- Dashboard: show referrer their referral stats (shares, conversions, rewards earned)

**Out:**
- Automatic discount code generation (reward is manual/voucher-based for MVP)
- Referral leaderboard
- Social media share tracking beyond UTM parameters

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | New booking with referral code populates `referredBy` on booking |
| AC2 | `referral_converted` event tracked when referral books |
| AC3 | Referrer receives email notification within 1h of referral booking |
| AC4 | Referee receives welcome email acknowledging referral source |
| AC5 | Chef dashboard shows referral source on affected bookings |

### Success Metrics

| Metric | Target |
|--------|--------|
| Referral conversion rate | Establish baseline (expect 5-15%) |
| Referrals per active diner | >0.5 per quarter |
| Revenue from referred bookings | Track GMV from `referredBy` bookings |
| Referral → repeat booking rate | Compare to non-referred |

### Effort

~3h (analytics event + referral attribution + email triggers)

### Dependencies

- Referral share system live (MAI-719)
- Share channel tracking live (MAI-1036)
- Email system (blocked by RESEND_API_KEY — Fred-owned)

### Open Questions

| # | Question | Priority |
|---|----------|---------|
| 1 | What is the reward? (e.g., $25 credit, 10% off next booking) | Must decide before build |
| 2 | Should reward be claimable or auto-applied? | Auto-applied simpler for MVP |
| 3 | Is there a minimum booking value to qualify for reward? | Prevents abuse |

---

## 2. Opportunity: Service Discovery Gap — Occasion Search (P2)

### Priority: P2 — Acquisition Funnel

### Problem Statement

The homepage hero search (MAI-894) filters by cuisine type. However, **diners don't search by cuisine — they search by occasion**: "birthday dinner for 12", "anniversary surprise", "corporate event for 30". A diner searching "birthday" or "party" gets zero results even though many services could accommodate their event.

This is a massive discovery gap: **most bookings are for occasions**, not just cuisine preferences.

### Evidence

Looking at the booking flow:
- Homepage search: cuisine filter only (line 131: `cuisine_type` search)
- Service schema has `occasionTypes` field (birthday, anniversary, corporate, etc.)
- `occasionTypes` is stored on services but not searchable or filterable on homepage
- No occasion-based browsing or filtering exists anywhere on the platform

### User Story

> **As a** diner planning a birthday dinner,
> **I want to** search for "birthday" and see chefs who specialize in celebrations,
> **so that** I can find the right chef for my specific event type.

### Scope

**In:**
- Add occasion type filter to homepage hero search alongside cuisine
- Display occasion type badges on service cards (e.g., 🎂 Birthday, 🎉 Corporate)
- Filter services by occasion on browse page
- Add occasion tags to service detail page metadata
- Track `occasion_search` analytics event when occasion filter is used

**Out:**
- AI-powered occasion menu recommendations
- Occasion-specific chef rankings
- Automated occasion reminders (e.g., "book again for next year")

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Homepage search includes occasion filter dropdown |
| AC2 | Service cards display relevant occasion badges |
| AC3 | Filtering by occasion shows only compatible services |
| AC4 | `occasion_search` event tracked when occasion filter used |
| AC5 | Mobile-friendly filter UI |

### Success Metrics

| Metric | Target |
|--------|--------|
| Search refinement rate | +15% using occasion filter |
| Service detail CTR from occasion search | +10% |
| Support tickets about "can't find what I need" | -20% |

### Effort

~2h (homepage filter + service card badges + browse filter + analytics)

### Dependencies

- `services.occasionTypes` field already in schema
- MAI-894 cuisine filter already implemented (reuse pattern)

---

## 3. Opportunity: Booking Submission Confirmation Page (P2)

### Priority: P2 — Trust & Clarity

### Problem Statement

When a diner submits a booking request, they receive only a basic status page or a simple confirmation message. The current booking status page shows the visual timeline (MAI-1014 ✅) but the **submission moment itself** lacks warmth, context, and next-step guidance.

Diners who've just committed to a $400+ booking deserve:
- Warm confirmation that their request was received
- Clear timeline: "Chef typically responds within X hours"
- What happens next (chef reviews → receives quote → you confirm)
- Emotional reinforcement: this is a special experience, not just a transaction
- Easy share option to announce the upcoming event

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
> **so that** I'm not anxious about whether the chef will respond and I know what to expect.

### Scope

**In:**
- Enhance booking submission confirmation with warm, informative messaging
- Show "Estimated response time" (based on chef's `avgResponseMinutes`)
- Add "What happens next" section: 3-step visual (Request sent → Chef reviews → You receive quote)
- Add "Share your upcoming event" option (pre-filled text for social/WhatsApp)
- Show service summary (chef name, date, guests, price)
- For multi-chef inquiries: show which other chefs were contacted
- Confirmation email to diner (currently missing — blocked by RESEND_API_KEY)

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
| Post-submission anxiety (support tickets) | -30% |
| Share/announce rate | >10% of submissions |
| Booking form completion rate | +5% (reduced abandonment from uncertainty) |

### Effort

~1.5h (frontend enhancement + analytics event for share clicks)

### Dependencies

- Booking status page already exists (MAI-1014)
- `avgResponseMinutes` on chef API (MAI-994)
- Email confirmation (blocked by RESEND_API_KEY — Fred-owned)

---

## Open Questions

| # | Question | Priority | Owner | Status |
|---|----------|----------|-------|--------|
| 1 | ETA for Stripe live keys + Vercel OIDC refresh? | 🔴 Critical | Fred | 20+ days pending |
| 2 | What referral reward structure? (% off, $ credit, free dish?) | 🔴 P1 Blocker | CEO | Pending |
| 3 | RESEND_API_KEY ETA? | 🔴 Critical | Fred | 20+ days pending |
| 4 | Corporate inquiry threshold — 30 or 50 guests? | 🟡 Medium | CEO | Pending from MAI-1011 |
| 5 | MAI-1015 Corporate Inquiry Flow — who picks it up? | 🟡 Medium | BE | Ready to build |

---

## Recommended Tasks

| Priority | Task | Owner | Effort | Dependencies |
|----------|------|-------|--------|--------------|
| P1 | Revenue Feature Implementation (MAI-993) | BE+FE | ~12h | Stripe keys (Fred) |
| P1 | Referral Reward Automation | BE+FE | ~3h | Analytics, email (blocked on keys) |
| P2 | Service Discovery — Occasion Search | FE | ~2h | MAI-894 pattern |
| P2 | Corporate Inquiry Flow (MAI-1015) | BE+FE | ~1h | Ready to build |
| P2 | Booking Submission Confirmation Page | FE | ~1.5h | MAI-1014, MAI-994 |
| P2 | Multi-Chef Funnel Attribution | BE | ~1h | Analytics infrastructure |
| P3 | Chef Quote Reminder Manual Trigger | BE+FE | ~1h | Quote reminder exists |
| P3 | Lightbox Photo Navigation | FE | ~30min | Lightbox HTML exists |

---

## Prior POD Reference

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-1033 (May 3 16:00) | Multi-chef attribution, quote reminder trigger, lead engagement unification | ✅ Superseded |
| MAI-1029 (May 3 12:00) | Booking timeline (✅), reviews (✅), dietary badges, lightbox | ✅ Superseded |
| MAI-1011 (May 3 04:00) | Corporate inquiry flow, booking timeline, multi-chef tracking | ⚠️ Partially done — timeline ✅, reviews ✅, corporate pending |

---

## Definition of Done

- [x] Platform state analyzed (recently completed, blockers, in-flight work)
- [x] Revenue feature gap highlighted as top business priority
- [x] 3 new opportunities identified with user stories, scope, and acceptance criteria
- [x] Priority recommendation provided
- [x] Dependencies and effort estimated
- [x] Open questions documented

---

_Generated by Product Manager Agent (Max) on 2026-05-04 08:00 UTC as part of MAI-1054 Product Opportunity Discovery_