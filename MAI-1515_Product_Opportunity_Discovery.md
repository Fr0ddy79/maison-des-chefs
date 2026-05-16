# Product Opportunity Discovery — MAI-1515

**Issue:** dd129cd8-ef54-45a6-bed9-451dcc409c77
**Date:** 2026-05-13 16:00 UTC
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager

---

## 1. Executive Summary

**Platform state: 0 confirmed bookings (54+ days), 0/8 chef responses.** The inquiry pipeline is functionally complete on both ends — inquiry form (MAI-1500), accept/decline (MAI-1499), and post-submission stepper (MAI-1491) are all shipped. The remaining blocker is RESEND_API_KEY (Fred's action, 54+ days overdue) which prevents all chef notification emails.

**New opportunity this cycle:** The diner feedback loop is broken. Diners who submit an inquiry have no visibility into whether the chef has acted on it. The MAI-1506 report identified this gap and proposed a Diner Booking Status Dashboard — a frontend-only feature that closes the loop without requiring RESEND_API_KEY. This cycle validates that opportunity and provides a full spec.

**Conclusion:** RESEND_API_KEY remains the #1 blocker. The Diner Booking Status Dashboard is the highest-value feature that can be built without it.

---

## 2. Platform State (16:00 UTC May 13)

| Metric | Value | Change Since MAI-1506 (12:00 UTC) |
|--------|-------|-----------------------------------|
| Published services | 1 | No change |
| Pending bookings | 4 | No change |
| Confirmed bookings | **0** | No change (54+ days) |
| New leads | 8 | No change |
| Converted leads | 1 | No change |
| Chef response rate | **0/8 = 0%** | No change |
| Reviews submitted | 0 | No change |
| RESEND_API_KEY | Missing | 54+ days |
| Revenue at stake | ~$1,045 | No change |

**Recent commits (last 48h):**
- `06d568d` — FE: Add post-inquiry success modal timeline (MAI-1491) ✅
- `2db89a6` — FE: Add post-inquiry success modal timeline (MAI-1447) ✅
- `b0c48ba` — MAI-1395: Add lead card one-click accept/decline buttons ✅
- `02c447b` — MAI-1418: Add lead age badge and urgency indicators ✅

**Pipeline status:**
- ✅ MAI-1499 (accept/decline UI) — shipped, functional
- ✅ MAI-1500 (streamlined inquiry form) — shipped
- ✅ MAI-1491 (post-inquiry stepper) — shipped
- ❌ MAI-1501 (chef new lead email) — blocked by RESEND_API_KEY
- ❌ RESEND_API_KEY — Fred's action, 54+ days overdue

---

## 3. Prior Cycle Opportunities — Status Update

### From MAI-1506 (12:00 UTC May 13)

| Opportunity | Status | Notes |
|-------------|--------|-------|
| RESEND_API_KEY | ❌ Still missing | 54+ days — Fred's action |
| **Diner Booking Status Dashboard** | 🔍 **Validating this cycle** | No RESEND dependency for dashboard |
| MAI-1501: Chef New Lead Email | ❌ Blocked | Needs RESEND_API_KEY |
| Feature C: WhatsApp Chef Alerts | ❌ Not started | Low priority — needs Twilio setup |
| Chef Response Rate Display | ❌ Not started | Low effort, not urgent |
| Referral Code Surfacing | ❌ Not started | Needs confirmed bookings first |

**No material change in platform state since MAI-1506.** The pipeline remains complete but inactive due to RESEND_API_KEY.

---

## 4. Analysis: The Broken Diner Feedback Loop

### The Gap

After a diner submits an inquiry:
1. ✅ Diner sees post-submission stepper (MAI-1491 — shipped)
2. ❌ Chef never receives email notification (MAI-1501 — blocked by RESEND_API_KEY)
3. ❌ Diner never receives confirmation when chef acts (accept/decline)
4. ❌ Diners have no visibility into inquiry status beyond initial submission

### Why This Matters

The MAI-1491 stepper sets expectations: "Chef will respond within 24 hours." But the diner gets no confirmation when that actually happens. They must manually check their booking page or email, and with no notifications, they likely assume the inquiry was ignored.

This creates a broken experience:
- Diner submits inquiry → sees stepper → hears nothing
- 4 pending bookings sit unacknowledged for days
- Diners may never re-engage, assuming their inquiry was ignored
- **Zero confirmed bookings may partly be due to diner drop-off after submission** — they completed their part but the platform left them hanging

### What Exists vs. What's Missing

**Existing:** `booking-status-page.ts` (public booking status page via token). Chef-leads.ts has accept/decline. Diners already have a `diner-bookings-page.ts` that shows bookings.

**Missing:** The diner's bookings page does NOT surface inquiry/lead status in a meaningful way. Looking at `diner-bookings-page.ts`:
- Shows status badge (pending/confirmed/rejected/completed/cancelled)
- Shows booking details (date, guests, price)
- **But** the status only updates when the chef acts — and since chef isn't acting (0/8 responses), the status never changes

**The actual gap:** Diners see "pending" forever and have no way to know if the chef has even seen their inquiry. Even if chef accepts/declines, the diner gets no notification — they have to manually check. The missing piece is:

1. **Real-time status visibility** — diner should see "chef received your inquiry" → "chef is reviewing" → "chef responded" transitions
2. **"Updated X hours/days ago"** timestamp on each booking so diners know it's live data
3. **Clear next steps** when status changes (what should the diner do now?)

---

## 5. New Opportunity: Diner Booking Status Dashboard (Enhanced)

### Problem Statement

After a diner submits an inquiry, they have no way to know if the chef has acted on it. The MAI-1491 stepper sets expectations ("chef will respond within 24h"), but the diner gets no confirmation when that happens. They must manually check their booking page or email, and with no notifications, they likely assume the inquiry was ignored. The existing diner bookings page shows status but lacks two critical elements: **recency indicators** ("updated 3 hours ago") and **clear action prompts** when status changes.

### User Story

**As a** diner who has submitted an inquiry  
**I want to** see whether the chef has responded and what I should do next  
**So that** I know my booking is active and can take action if needed

**As a** diner waiting for a chef response  
**I want to** see a recency timestamp ("updated 3 hours ago") on my booking  
**So that** I know the status is live and not stale

### Scope

**In:**
- Enhanced status display: show inquiry lifecycle (received → reviewed → responded)
- "Updated X hours/days ago" timestamp on each booking card
- Clear status labels: "Awaiting Chef Response" / "Quote Received — Action Needed" / "Booking Confirmed!"
- Mobile-responsive layout without horizontal scroll
- Empty state: "You haven't submitted any inquiries yet — browse chefs to get started"

**Out:**
- Email notifications (requires RESEND_API_KEY — separate track)
- SMS or push notifications
- Payment processing in this view

### Data Requirements

The existing `GET /bookings` API for authenticated diners returns:
- `id`, `serviceId`, `serviceName`, `chefName`, `eventDate`, `guestCount`, `totalPrice`
- `status` (pending/confirmed/declined/completed/cancelled)
- No `updatedAt` or timestamp fields currently exposed

**Backend needed:**
- Add `updatedAt` field to diner bookings API response
- Map lead status to booking status: `new` → `pending`, `accepted` → `confirmed`, `declined` → `declined`
- Verify the lead's `updatedAt` is surfaced (not just `createdAt`)

**Frontend changes:**
- Add "Updated X hours/days ago" to each booking card
- Add status-specific call-to-action below the status badge
- Style status transitions more clearly (pending = yellow, confirmed = green, declined = red)

### Acceptance Criteria

- [ ] Diner bookings page shows all inquiries with current status
- [ ] Each booking card shows "Updated X ago" timestamp (refreshes on load)
- [ ] Status badge clearly readable on mobile
- [ ] Status-to-action mapping:
  - `pending` → "Awaiting chef response — you'll be notified by email"
  - `confirmed` → "Your booking is confirmed! 🎉"
  - `declined` → "Chef unavailable — try another date or chef"
  - `completed` → "Rate your experience" (links to review page)
- [ ] Empty state with CTA to browse services

### Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Diner with 0 bookings | Empty state: "You haven't submitted any inquiries yet" |
| Pending booking >7 days old | Show "Still waiting — your inquiry is active" indicator |
| Declined booking with chef note | Show chef's decline message if provided |
| Completed booking | Show "Rate your experience" link (review-page.ts exists) |
| Very long chef name | Truncate with ellipsis on mobile |

### Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Diner re-engagement rate | 30%+ return to check status | Analytics: return visits to /diner/bookings |
| Time-to-status-check | <24h after inquiry submission | First status check timestamp - inquiry created_at |
| Re-inquiry rate after decline | >20% submit another inquiry | DB: subsequent inquiry by same diner after decline |

### Dependencies

- **BE:** Add `updatedAt` to diner bookings API response (~15 min)
- **FE:** Update diner-bookings-page.ts to display recency + action prompts (~1.5h)
- **No RESEND_API_KEY needed** — this is pure dashboard visibility

### Effort

~2h total (1.5h FE + 0.5h BE to add updatedAt)

---

## 6. Updated Opportunity Stack

| Priority | Opportunity | Reason | Effort | Dependencies |
|----------|-------------|--------|--------|-------------|
| **P0** | **RESEND_API_KEY** | Fred's action — unblocks chef email + diner confirmation emails | 5 min | Fred (54+ days overdue) |
| **P1** | **Diner Booking Status Dashboard** | Closes diner feedback loop — no RESEND dependency for dashboard visibility | ~2h | updatedAt field in bookings API |
| P1 | **MAI-1501: Chef New Lead Email** | Chef notification infrastructure — critical for response rate | ~2h BE | RESEND_API_KEY |
| P2 | Feature C: WhatsApp Chef Alerts | Bypasses email for instant chef notifications | ~3h | Twilio WhatsApp API (Fred) |
| P2 | Chef Response Rate Display | Low-effort diner-facing trust signal | ~1h FE | None |
| P3 | Referral Code Surfacing | Turns confirmed diners into acquisition | ~1.5h | Confirmed bookings first |
| P3 | Review Request Email Trigger | Completes reviews loop (needs confirmed bookings first) | ~2h | RESEND_API_KEY + booking |

**Key insight:** The Diner Booking Status Dashboard (P1) is the highest-value buildable opportunity. It doesn't unblock the chef pipeline, but it significantly improves the diner experience while they wait for RESEND_API_KEY to be added.

---

## 7. What Still Requires Fred's Action

| Blocker | Required Action | Days Overdue | Impact |
|---------|----------------|--------------|--------|
| RESEND_API_KEY | Fred add to environment | 54+ days | All chef notification emails blocked; 0 responses from 8 leads |
| Vercel OIDC Token | Fred refresh | ~41+ days | No deployments possible |
| WhatsApp Business API | Fred configure (if pursuing Feature C) | Not started | Instant chef notifications (bypasses email) |

**Bottom line:** RESEND_API_KEY is a 5-minute action for Fred that unlocks the entire pipeline. Everything else is contingent on it.

---

## 8. Open Questions

| Question | Decision Needed | Priority |
|----------|-----------------|----------|
| Does the `updatedAt` field exist on leads/bookings? | BE to verify | P1 |
| Should the dashboard also show "contact us" if pending > 48h? | Product decision | P2 |
| Is there a maximum time we show "pending" before auto-expire? | Product decision | P3 |
| Should we show the chef's response time average on the diner dashboard? | Future enhancement | P3 |

---

## 9. Recommendations for Next Cycle (20:00 UTC May 13)

1. **Fred: Add RESEND_API_KEY** — still the #1 blocker, now 54+ days overdue
2. **BE: Verify `updatedAt` is in diner bookings API** — enables the dashboard feature
3. **FE: Build Diner Booking Status Dashboard** — close the diner feedback loop
4. **Re-check MAI-1501 status** — chef email notification is the key pipeline enabler
5. **Consider Feature C (WhatsApp) as RESEND alternative** — if Fred has capacity

---

## 10. Acceptance Criteria (This Cycle)

- [x] Confirmed: Platform state unchanged — 0 confirmed bookings, 0 chef responses, 8 leads
- [x] Confirmed: Pipeline is complete (MAI-1499, MAI-1500, MAI-1491 shipped)
- [x] Validated: Diner feedback loop broken — confirmed gap exists in diner-bookings-page.ts
- [x] Spec'd: Diner Booking Status Dashboard with MVP scope and acceptance criteria
- [x] Prioritized: Dashboard as P1 (no RESEND dependency for dashboard visibility)
- [x] Named: RESEND_API_KEY as 54+ day blocker with specific impact

---

## Definition of Done

This spec is complete when:
- [x] Platform state confirmed (0 bookings, 0 responses, 8 leads)
- [x] Pipeline completion confirmed (MAI-1499, MAI-1500, MAI-1491 shipped)
- [x] Diner feedback loop gap validated with code evidence
- [x] Diner Booking Status Dashboard spec'd with MVP scope and acceptance criteria
- [x] Backend requirements identified (updatedAt field)
- [x] Opportunity stack updated with prioritization
- [x] Fred's blockers named with specific impact and days overdue

---

*Report completed: 2026-05-13 16:12 UTC*
*Next cycle: 2026-05-13 20:00 UTC*