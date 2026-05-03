# Product Opportunity Discovery

**Issue:** MAI-977
**Date:** 2026-05-02 12:00 UTC
**Status:** ✅ Complete
**Analyst:** Product Manager Agent (Max)
**Model:** MiniMax-M2.7

---

## Executive Summary

At 12:00 UTC on 2026-05-02, 1111 lines of uncommitted work persist across 14 files (MAI-933 Response Time, MAI-921 Chef Photo Upload). Critical blocker (MAI-618: keys) remains Fred's responsibility with no change. Recent PODs covered Best Value Sort, Category Landing Pages, Empty State UX, Multi-Chef Validation, Diner Preferences, and Chef Portfolio. Three **new** opportunities identified: **Booking Follow-up Reminder (P2)**, **Chef Decline Reason Capture (P3)**, and **Repeat Booking Analytics Dashboard (P3)**. Focus remains on closing uncommitted work before pursuing new opportunities.

---

## Current Platform State

### Uncommitted Work 🔴 (1111 Lines, 14 Files)

| Module | Files | Priority | Status |
|--------|-------|----------|--------|
| Chef Response Time Display | `src/api/chefs.ts`, `src/api/services.ts` | P1 | BE+FE done, needs commit |
| Chef Photo Upload | `src/api/chef-photo.ts` | P1 | BE+FE done, needs commit |
| Reviews System | Schema done, impl pending | P1 | MAI-962 breakdown done |

### Critical Blockers 🔴 (Fred Must Resolve — No Change)

| Blocker | Impact | Days Pending |
|---------|--------|---------------|
| `RESEND_API_KEY = re_placeholder` | All transactional emails blocked | 20+ days |
| `STRIPE_SECRET_KEY = empty` | Payment processing blocked | 20+ days |
| Vercel OIDC token expired | Cannot deploy | 19+ days |

**No agent can unblock these. Fred is the only owner.**

---

## New Opportunities Identified

### Opportunity 1: Booking Follow-up Reminder System (P2)

**Priority: P2 — Conversion Improvement**

### Problem Statement

When a diner submits a booking request, if the chef doesn't respond within 24-48 hours, the diner is left in limbo. They don't know if the chef saw the request, is busy, or declined silently. This uncertainty causes diners to either abandon the platform or double-book with other chefs, leading to wasted capacity when a chef finally responds.

### User Story

> **As a** diner who submitted a booking request and hasn't heard back,
> **I want to** receive a follow-up reminder after 48 hours,
> **so that** I can either re-engage the chef or pivot to alternatives without feeling abandoned.

### Current State

- `diner-confirmation-email.ts` exists (+169 lines) but sends a confirmation on booking REQUEST, not follow-up
- No reminder for stale booking requests (chef hasn't responded)
- No escalation path for diners when chefs go silent

### Scope

**In:**
- Trigger: 48 hours after booking request submitted, chef hasn't responded (no status change from `requested`)
- Action: Send a "Checking in" email to diner with options:
  1. "Yes, still interested" → re-sends notification to chef
  2. "No, find another chef" → show alternative chefs matching criteria
  3. "Just waiting" → snooze reminder for 24h
- Diner can only receive this reminder once per booking request
- Log reminder sent in `booking_events` or new `reminder_log` table

**Out:**
- Automated chef chase emails (chef needs to opt-in to "responsive" badge)
- Payment-related reminders
- Multi-follow-up sequences

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Reminder triggers 48h after booking request if chef hasn't responded |
| AC2 | Diner receives email with 3 clear actions: re-engage / find alternatives / snooze |
| AC3 | "Find alternatives" shows chefs matching original criteria |
| AC4 | Reminder only sent once per booking request |
| AC5 | If chef responds before reminder fires, no reminder sent |

### Success Metrics

| Metric | Target |
|--------|--------|
| Reminder → diner re-engagement rate | >25% |
| Reminder → alternative booking rate | >10% |
| Diner satisfaction with "stuck" bookings | Improve from baseline (TBD) |

### Effort

~1.5h (database column + cron job + email template + diner redirect page)

### Dependencies

- Requires `RESEND_API_KEY` to be functional (MAI-618)
- Can build in isolation, deploy when Resend is live

---

### Opportunity 2: Chef Decline Reason Capture (P3)

**Priority: P3 — Platform Learning**

### Problem Statement

When a chef declines a booking request, the platform doesn't capture WHY. Is it price? Date unavailability? Guest count? This data would help the platform:
1. Train better matching algorithms
2. Surface actionable insights to chefs ("Your price is 20% above median for Italian cuisine")
3. Identify systemic issues (e.g., all chefs declining events over 20 guests)

### User Story

> **As a** chef declining a booking request,
> **I want to** optionally specify a reason (or select "no reason"),
> **so that** the platform can learn and help me get better-fit inquiries.

### Current State

- Booking status can be `declined` but no reason field
- Chef declines via dashboard with no capture mechanism
- No feedback loop to inform chef discovery ranking

### Scope

**In:**
- Add `decline_reason` field to `bookings` table: enum (`price_too_high`, `date_unavailable`, `guest_count_too_large`, `location_out_of_range`, `other`, `no_reason`)
- On decline flow, show modal: "Why are you declining? (optional)" with selectable reasons + free-text "other" field
- Save decline reason with booking
- Aggregate decline reasons into chef insights panel:
  - "40% of your declines are due to guest count — consider adjusting your max capacity"
- Platform-level aggregate: "Italian chefs decline 30% of events over 15 guests"

**Out:**
- Chef coaching automations (future)
- Auto-adjustment of chef search results based on decline patterns
- Public decline reasons visible to diners

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Decline modal shows reason options when chef rejects a booking |
| AC2 | Reason selection is optional (chef can skip) |
| AC3 | "Other" reason allows free-text input |
| AC4 | Decline reasons aggregated in chef insights panel |
| AC5 | Platform-level decline reason analytics accessible to admin |

### Success Metrics

| Metric | Target |
|--------|--------|
| Chef decline reason completion rate | >60% (optional field) |
| Insights generated per chef | >1 insight after 50 declined bookings |

### Effort

~1h (schema change + UI modal + aggregation query + insights display)

### Dependencies

- None (fully independent)

---

### Opportunity 3: Repeat Booking Analytics Dashboard (P3)

**Priority: P3 — Retention Insight**

### Problem Statement

The MVP spec targets "Repeat booking rate >20% at 6 months" but there's no dashboard to track this metric. Without visibility into repeat booking behavior, the team can't identify which chefs drive repeat diners, which booking cohorts convert to repeat, or which events (birthdays vs corporate) generate loyalty.

### User Story

> **As a** platform operator,
> **I want to** see repeat booking rates segmented by chef, diner cohort, and event type,
> **so that** I can identify what's working and double down on successful patterns.

### Current State

- `SPEC.md` defines repeat booking rate as a success metric
- `MAI-881 Book Again Shortcut` is committed but not yet verified
- No analytics dashboard exists
- Booking data exists but no segmentation

### Scope

**In:**
- New `/admin/analytics` route (or simple admin page)
- Metrics displayed:
  - **Repeat booking rate** — % of diners who booked a 2nd time (overall)
  - **By chef** — which chefs have highest repeat rate
  - **By event type** — birthday, anniversary, corporate, other
  - **By cuisine** — which cuisines generate loyalty
  - **Time to repeat** — median days between first and second booking
- Simple table + bar chart (CSS-only, no chart library needed)

**Out:**
- Cohort analysis with complex funnel visualization
- Predictive churn modeling
- Automated reports emailed to Fred

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Dashboard shows overall repeat booking rate |
| AC2 | Table breaks down repeat rate by chef |
| AC3 | Table breaks down repeat rate by event type |
| AC4 | Time-to-repeat metric is displayed |
| AC5 | Dashboard accessible at `/admin/analytics` with admin auth |

### Success Metrics

| Metric | Target |
|--------|--------|
| Dashboard access rate | Baseline once built |
| Actionable insight generated | >1 per week from viewing data |

### Effort

~1.5h (admin route + SQL aggregation queries + simple table display)

### Dependencies

- None (fully read-only, admin-only)

---

## Priority Matrix

| Priority | Feature | Effort | Impact | Dependencies |
|----------|---------|--------|--------|--------------|
| **P2** | Booking Follow-up Reminder | ~1.5h | HIGH | Needs Resend (MAI-618) to deploy |
| **P3** | Chef Decline Reason Capture | ~1h | MEDIUM | None |
| **P3** | Repeat Booking Analytics | ~1.5h | MEDIUM | None |

---

## Recommended Immediate Actions

| Action | Owner | Priority | Effort | Notes |
|--------|-------|----------|--------|-------|
| Commit MAI-933/921 uncommitted code | BE | P1 | ~15min | 1111 lines waiting |
| Break down MAI-940 Reviews into tasks | PM | P1 | ~30min | MAI-962 done, create issues |
| Implement Booking Follow-up Reminder | BE+FE | P2 | ~1.5h | Build in isolation |
| Implement Decline Reason Capture | BE+FE | P3 | ~1h | None |
| Build Repeat Booking Analytics Dashboard | BE+FE | P3 | ~1.5h | None |

---

## Open Questions

| # | Question | Priority | Owner | Status |
|---|----------|----------|-------|--------|
| 1 | ETA for Stripe live keys + Resend API key? | 🔴 Critical | Fred | 20+ days pending |
| 2 | Platform deployment status after Vercel unblock? | 🔴 Critical | Fred | Unknown |
| 3 | MAI-881 (Book Again) — has it been verified in production? | 🟡 Medium | FE | Unverified |
| 4 | What is baseline repeat booking rate? | 🟡 Medium | Data | Need to establish |
| 5 | MAI-948 (Multi-Chef Validation) — status? | 🟡 Medium | BE+FE | Task exists, validation code in multi-inquiry.ts |

---

## Prior PODs (Recent)

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-957 (04:00 UTC) | Best Value Sort, Category Landing Pages, Empty State UX | ✅ Identified |
| MAI-952 (00:00 UTC) | Best Value Sort, Category Landing Pages, Empty State UX | ✅ Identified |
| MAI-946 (20:00 UTC) | Multi-Chef Validation, Diner Preferences, Chef Portfolio | ✅ Identified |
| MAI-938 (16:00 UTC) | Quote View Analytics, Stale Lead Escalation, Diner Timeline | ✅ Completed |
| MAI-930 (12:00 UTC) | Chef Response Time Display, Availability Calendar, Saved Search Alerts | ✅ Completed |
| MAI-922 (08:00 UTC) | Service Photo Gallery, Search Enhancement, Corporate Inquiry | ✅ Completed |

---

## Notes

1. **MAI-618 still critical after 20 days.** Fred is the only owner. No agent can unblock Stripe/Resend. This remains the highest-ROI action for Fred.

2. **Uncommitted work is a growing risk.** 1111 lines across 14 files is medium-risk. Conflicts become more likely as other work continues. BE should commit MAI-933/921 before end of day.

3. **Booking Follow-up Reminder (Opportunity 1)** is the highest-impact new opportunity identified this cycle. It directly addresses the "stuck booking" pain point and could improve conversion without requiring new chef acquisition.

4. **Decline Reason Capture (Opportunity 2)** is low-effort and generates data that compounds over time. Early capture now means actionable insights sooner.

5. **Repeat Booking Analytics (Opportunity 3)** closes the gap between "we track repeat rate as a metric" and "we can see repeat rate." Without this, the team is flying blind on retention.

---

_Generated by Product Manager Agent (Max) on 2026-05-02 12:00 UTC as part of MAI-977 Product Opportunity Discovery_
