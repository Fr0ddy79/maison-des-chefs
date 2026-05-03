# Product Opportunity Discovery — MAI-1029

**Issue:** 01bd0f53-f97b-4f59-9ee1-1c8fbd6ee82f
**Date:** 2026-05-03 16:00 UTC
**Status:** ✅ Complete
**Analyst:** Product Manager Agent (Max)
**Model:** MiniMax-M2.7

---

## Executive Summary

MAI-1014 (Booking Status Visual Timeline) committed. MAI-1013 (Reviews on Chef Profile) committed. Analytics event persistence is live (MAI-1008). Three new opportunities identified: **Chef Quote Reminder Control (P2)**, **Lead Engagement Unification (P2)**, and **Service Page Dietary Awareness (P3)**. MAI-618 (Stripe/Resend keys) remains Fred's sole critical blocker at 17+ days.

---

## Current Platform State

### Recently Completed ✅ (Last 48h)

| Module | Status | Issue |
|--------|--------|-------|
| Booking Status Visual Timeline | ✅ Committed (43602a3) | MAI-1014 |
| Reviews on Chef Profile | ✅ Committed (9b59950) | MAI-1013 |
| Analytics Event Persistence | ✅ Live (f0e1f73) | MAI-1008 |
| CTA Click Tracking for A/B Test | ✅ Live (a201e23) | MAI-995 |
| Multi-Chef Inquiry System | ✅ Live (fe7514e) | MAI-990 |
| Chef Response Time Tiers | ✅ Live (06986c5) | MAI-933 |

### Email Automations (Active)

| Automation | Schedule | Issue |
|------------|----------|-------|
| Quote Reminder (48h follow-up) | Cron: every 6h | MAI-795 |
| Stale Lead Re-engagement | On-demand via booking status page | MAI-845/MAI-1014 |
| Diner Confirmation Email | On lead creation | MAI-751 |

### Critical Blockers 🔴

| Blocker | Impact | Days Pending |
|---------|--------|---------------|
| `RESEND_API_KEY = re_placeholder` | All transactional emails blocked | 17+ days |
| `STRIPE_SECRET_KEY = empty` | Payment processing + revenue blocked | 17+ days |
| Vercel OIDC token expired | Cannot deploy | Unknown |

**No agent can unblock these. Fred is the only owner.**

---

## 1. Opportunity: Chef Quote Reminder Control (P2)

### Priority: P2 — Chef Empowerment

### Problem Statement

The quote reminder system (MAI-795) runs automatically every 6 hours via cron job. However, chefs have **no on-demand control** to manually trigger a "resend quote reminder" email to a diner who hasn't responded. A chef may want to nudge a diner immediately after realizing they haven't heard back, rather than waiting for the next cron cycle. This creates a gap where engaged chefs can't actively manage their pipeline.

### Evidence

Looking at `src/services/quote-reminder.ts`:
- `processQuoteReminders()` runs on a cron schedule (every 6 hours)
- It's entirely cron-driven — no manual trigger exists
- Chefs can only wait for the automated 48h reminder
- The booking-status-page has a "Send Reminder" button for *stale leads* (no quote yet) but not for *quoted leads* (diners who haven't accepted)

The lead schema has both `quoteReminderSentAt` and `staleLeadReengagementSentAt` — two separate re-engagement paths that aren't unified.

### User Story

> **As a** chef who sent a quote,
> **I want to** manually resend a reminder to the diner with a single click,
> **so that** I can actively manage my pipeline without waiting for automated cron jobs.

### Scope

**In:**
- Add `POST /api/chef/leads/:id/resend-quote-reminder` endpoint
- Idempotent: updates `quoteReminderSentAt` only when actually sent (not on every click)
- Sends the same quote reminder email as the cron job (MAI-795 template)
- Accessible from chef leads dashboard (button next to "Send Quote" for `responded` status leads)
- Shows "Reminder sent ✓" feedback state with timestamp of last sent

**Out:**
- Email open/click tracking
- Multiple reminder types (single vs. gentle nudge vs. urgent)
- Scheduled reminder customization per lead

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Chef can trigger quote reminder on-demand from lead detail modal |
| AC2 | Email uses same template as automated 6h cron job |
| AC3 | Idempotent: clicking again shows "Already sent" with timestamp |
| AC4 | Rate limited to prevent spam (max 1 manual reminder per 24h per lead) |
| AC5 | Button disabled if email was sent within last 24h |

### Success Metrics

| Metric | Target |
|--------|--------|
| Manual reminder trigger rate | Track usage to establish baseline |
| Quote acceptance rate uplift from manual vs. automatic | +10% (hypothesis) |
| Chef satisfaction with pipeline control | Qualitative feedback |

### Effort

~1h (single API endpoint + frontend button update)

### Dependencies

- `src/services/quote-reminder.ts` — email template already exists
- Lead `quoteReminderSentAt` field already in schema

---

## 2. Opportunity: Lead Engagement Unification (P2)

### Priority: P2 — Data Clarity

### Problem Statement

The lead schema has two separate re-engagement timestamps:
- `staleLeadReengagementSentAt` — for leads in `new`/`pending` status with no quote yet
- `quoteReminderSentAt` — for leads in `responded` status (quote sent, diner hasn't converted)

This dual-track system is confusing to reason about. When investigating "has this diner been re-engaged?", you need to check two fields and understand which applies based on status. There's no single "lastReengagementAt" or "engagementCount" to simplify querying.

### Evidence

In `src/db/schema.ts`:
```typescript
staleLeadReengagementSentAt: integer('stale_lead_reengagement_sent_at', { mode: 'timestamp' }),
quoteReminderSentAt: integer('quote_reminder_sent_at', { mode: 'timestamp' }),
```

In `src/routes/booking-status-page.ts`:
- Stale lead re-engagement uses `staleLeadReengagementSentAt` (after 12h with no response)
- Quote reminder uses `quoteReminderSentAt` (after 48h, for quoted leads)

These should probably be unified into a single field that's status-agnostic.

### User Story

> **As a** platform operator,
> **I want** to have a single engagement tracking field per lead,
> **so that** I can easily query re-engagement history and avoid confusing two-track logic.

### Scope

**In:**
- Add `lastEngagementSentAt` timestamp to leads (nullable, replaces need for both `staleLeadReengagementSentAt` and `quoteReminderSentAt`)
- Update booking-status re-engagement logic to use new field
- Update chef dashboard quote reminder logic to use new field
- Update lead detail view to show "Last Re-engagement" timestamp
- Backwards compatible: old fields remain but are deprecated (no migration needed)

**Out:**
- Deleting old fields (risk of breaking existing references)
- Notification system for when engagement emails bounce
- Engagement count tracking (multiple sends)

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | `lastEngagementSentAt` field added to leads schema |
| AC2 | Booking-status page uses `lastEngagementSentAt` for stale lead re-engagement |
| AC3 | Chef leads dashboard "Send Quote Reminder" updates `lastEngagementSentAt` |
| AC4 | Old `staleLeadReengagementSentAt` and `quoteReminderSentAt` still readable (deprecated) |
| AC5 | Lead detail modal shows "Last Re-engagement" timestamp when available |

### Success Metrics

| Metric | Target |
|--------|--------|
| Query simplicity | Single field vs. dual field for engagement checks |
| Time to build new re-engagement automations | -20% (fewer conditions to check) |

### Effort

~1.5h (schema field + 3 code updates + deprecation comments)

### Dependencies

- None — can be built independently

### Open Questions

| # | Question | Priority | Owner |
|---|----------|----------|-------|
| 1 | Should we also add `engagementCount` to track multiple re-engagements? | 🟡 Medium | Product |
| 2 | Do we need to notify chefs when a re-engagement email bounces? | 🟡 Low | Future |

---

## 3. Opportunity: Service Page Dietary Awareness (P3)

### Priority: P3 — Discovery Enhancement

### Problem Statement

The dietary filter system (MAI-722) is live and working. Chefs can tag their services with dietary accommodations (vegetarian, vegan, gluten-free, halal, kosher, dairy-free, nut-free). However, the **service detail page** doesn't prominently display these dietary tags. Diners who filter by dietary preference may discover a service but then not realize the chef offers their required accommodation until deeper in the booking flow.

### Evidence

Looking at `src/routes/pages.ts` (service detail page):
- Service detail page shows: name, description, chef info, price, photos
- No visible dietary tags on the main service card or service detail view
- `services.dietaryTags` is stored as JSON array but never rendered

The chef profile page does show cuisine types, but dietary tags are only accessible via the booking form (filtered out if incompatible).

### User Story

> **As a** diner with dietary restrictions,
> **I want to** instantly see which dietary accommodations a service offers on the service detail page,
> **so that** I can quickly identify compatible services without reading full descriptions.

### Scope

**In:**
- Add dietary tags display to service detail page below description
- Visual badges (not just text): icon + label for each tag
- Tags displayed: vegetarian 🥬, vegan 🌱, gluten_free 🌾, halal ☪️, kosher ✡️, dairy_free 🥛, nut_free 🥜
- Order by importance (vegetarian/vegan first, then others alphabetically)
- Compact badge layout (max 5 visible, "+N more" for overflow)

**Out:**
- Filtering by dietary tags on service discovery page (already exists via MAI-722)
- "Dietary compatibility score" or recommendation engine
- Chef profile page dietary section (separate concern)

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Service detail page displays dietary tags with visual badges |
| AC2 | Tags use consistent iconography across platform |
| AC3 | Services with no dietary tags show nothing (no empty state needed) |
| AC4 | Mobile-friendly badge layout (scrollable if >5 tags) |

### Success Metrics

| Metric | Target |
|--------|--------|
| Service detail page → booking form conversion | +3% (hypothesis) |
| Support tickets about dietary compatibility | -20% |

### Effort

~45min (frontend display component using existing dietary tags data)

### Dependencies

- MAI-722 dietary filter system (already live)
- `services.dietaryTags` field already populated

### Notes

- This is a pure frontend display task — no API changes needed
- The badges should match the style of the dietary filter UI from MAI-722 for consistency
- Consider using the same SVG icon set already in use on the platform

---

## Open Questions

| # | Question | Priority | Owner | Status |
|---|----------|----------|-------|--------|
| 1 | ETA for Resend API key (re_placeholder)? | 🔴 Critical | Fred | 17+ days pending |
| 2 | Should we add `engagementCount` to lead schema? | 🟡 Medium | Product | Future decision |
| 3 | Corporate inquiry threshold — 30 or 50 guests? | 🟡 Medium | CEO | Pending decision (from MAI-1011) |
| 4 | Vercel OIDC token — does Fred need help? | 🔴 Critical | Fred | Unknown |

---

## Recommended Tasks

| Priority | Task | Owner | Effort | Dependencies |
|----------|------|-------|--------|--------------|
| P2 | Chef Quote Reminder Control | BE + FE | ~1h | Quote reminder email exists |
| P2 | Lead Engagement Unification | BE | ~1.5h | None |
| P3 | Service Page Dietary Badges | Frontend | ~45min | MAI-722 already live |

---

## Prior POD Reference

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-1011 (May 3 04:00) | Booking timeline, reviews on profile, corporate inquiry | ✅ Superseded |
| MAI-998 (May 2 20:00) | Analytics gap, booking timeline, multi-chef attribution | ✅ Superseded |
| MAI-993 (May 2 13:00) | Revenue Feature Spec (booking fee) | ✅ Specced |
| MAI-977 (May 2 08:00) | Growth: multi-chef funnels, pricing display | ✅ Superseded |

---

## Definition of Done

- [x] Platform state analyzed (recently completed, blockers, in-flight work)
- [x] Prior POD opportunities reviewed (MAI-1014/MAI-1013 both committed — gap discovery needed)
- [x] 3 opportunities identified with user stories, scope, and acceptance criteria
- [x] Priority recommendation provided
- [x] Dependencies and effort estimated
- [x] Open questions documented

---

_Generated by Product Manager Agent (Max) on 2026-05-03 16:00 UTC as part of MAI-1029 Product Opportunity Discovery_