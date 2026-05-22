# Product Opportunity Discovery — MAI-1709

**Issue:** 2fb58309-1a59-4fbf-858e-46338a3a5cc7
**Date:** 2026-05-17 20:00 UTC
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager

---

## 1. Executive Summary

**Platform state:** 8 leads (7 expired, 1 converted), 4 pending bookings, 0 confirmed, $0 revenue. RESEND_API_KEY still missing (60+ days). MAI-1681 (Outreach Sequence Tracker) is shipped. This cycle surfaces **3 new opportunities** including a critical notification gap and a data integrity issue.

| # | Opportunity | Effort | Impact | Status |
|---|-------------|--------|--------|--------|
| 1 | Chef Real-Time Lead Notification (in-app) | ~1h | High | **New Discovery** |
| 2 | Fix Lead Guest Count / Event Date Data Gaps | ~30 min | Medium | **New Discovery** |
| 3 | RESEND_API_KEY + Stripe | Manual | Critical | **60+ days overdue** |

---

## 2. Platform State (20:00 UTC May 17)

| Metric | Value | Change Since MAI-1692 (May 17 12:00 UTC) |
|--------|-------|----------------------------------------|
| Leads total | 8 | No change |
| Leads converted | 1 | No change |
| Leads expired | 7 | No change |
| Pending bookings | 4 | No change |
| Confirmed bookings | 0 | No change |
| Completed bookings | 0 | No change |
| Published services | 1 | No change (onboarding service, 0 photos) |
| Chef response rate | 0/8 = 0% | Unchanged — **zero chef responses** |
| Notifications | 0 | No chef-facing notifications exist |
| RESEND_API_KEY | Missing | 🔴 Blocked (60+ days) |
| STRIPE_SECRET_KEY | Missing | 🔴 Blocked |

**In-flight work:**
- MAI-1691: Photo gallery for service detail pages — DONE
- MAI-1645: Stale lead cron — in progress (scheduled every 6h, but email blocked)
- MAI-1501: Chef new lead email notification — blocked on RESEND_API_KEY

---

## 3. Critical Finding: Zero Chef Responses — Root Cause

**Problem:** Of 8 leads created, 0 received a response from the chef. The chef has never responded to any lead.

**Root Cause Chain:**
1. ✅ Lead creation works (8 leads created)
2. ⚠️ Chef receives **no real-time notification** when a new lead arrives
3. ⚠️ MAI-1501 (chef new lead email notification) is blocked by missing RESEND_API_KEY
4. ✅ Stale lead cron runs every 6 hours (chef-stale-lead-email.ts) — but email is dead
5. ✅ Outreach tracking (MAI-1681) is live but has no leads to track responses for

**Impact:** The chef doesn't know when diners inquire. The only current alert mechanism is the 6-hour stale lead cron, which is dead without RESEND.

---

## 4. Discovery: Opportunity #1 — Chef Real-Time Lead Notification (In-App) 🔴 HIGH IMPACT

### Problem
When a diner submits an inquiry, the chef has **no immediate notification**. They must manually check the leads dashboard or wait for a 6-hour cron email (which is blocked). This creates a poor chef experience and delays response times.

MAI-1501 attempted to address this via email, but it's blocked on RESEND_API_KEY. An in-app notification system would work immediately without any external dependencies.

### Confirmed Gap
- No real-time notification when a lead arrives
- No in-app notification created when a lead is created
- `notifications` table exists (MAI-1212) but is only used for booking status updates for diners
- No `new_lead` notification type exists in the system
- Chef leads page (chef-leads-page.ts) has bell icon + dropdown that polls `/api/chef/notifications` — but **no notifications are ever created for leads**

### Existing Infrastructure (Ready to Use)
- `notifications` table already exists with `userId`, `type`, `title`, `body`, `read`, `metadata`, `createdAt`
- `POST /api/chef/notifications` endpoints exist and work
- Bell icon + dropdown UI already rendered in chef-leads-page.ts
- Polling interval already active (30 seconds)
- Unread count badge already implemented

### Root Cause
The `notifications` table is only written when a **booking status changes** (booking_confirmed, booking_declined, etc.). The lead creation flow (`POST /api/inquiry`) never creates a notification for the chef.

### Scope (MVP)

**In:**
- `POST /api/inquiry` (lead creation) — add a `createChefNotification()` call that inserts a `new_lead` notification for `chefId`
- Notification type: `new_lead`
- Notification content: diner email, service name, guest count, event date, lead ID
- Chef notification endpoints already exist at `/api/chef/notifications` (GET, PATCH read, POST mark-all-read)
- Metadata includes `leadId` so clicking the notification can deep-link to the lead

**Out:**
- No push notifications (email, SMS, push)
- No notification settings UI
- No notification dismissal tracking (beyond `read` boolean)

### Acceptance Criteria
- [ ] New lead triggers in-app notification for chef
- [ ] Notification includes: lead ID, diner email/name, service name, guest count, event date
- [ ] Chef leads page bell shows unread count badge
- [ ] Clicking notification navigates to lead detail
- [ ] No external dependencies (works without RESEND_API_KEY)
- [ ] TypeScript compiles with no errors

### User Value
- Chef knows immediately when a diner inquiries
- Reduces time-to-first-response (currently 0 chef responses in 60+ days)
- Works even when email is blocked

### Effort
~1h. Existing `notifications` table already supports this type.

---

## 5. Discovery: Opportunity #2 — Lead Data Quality: Guest Count / Event Date

### Problem
7 out of 8 leads have **zero message content**. The inquiry form allows diners to submit without a message, but the bigger issue is that many leads also lack proper guest count or event date — the core booking parameters.

Looking at lead data:
- Lead 1 (converted): Guests=2, EventDate=2026-05-15 ✅
- Lead 2–8 (expired): Some have guest_count=4, event_date set — but all are missing `message`

The problem isn't missing fields — it's that the inquiry form doesn't **validate or guide** the diner to provide meaningful booking context. A lead with 4 guests and a date but no message from a "test" email is not actionable.

### Confirmed Gap
- Inquiry form accepts `guestCount` and `eventDate` but they're optional (defaults: guestCount=1)
- No validation that guestCount matches service min/max range at inquiry time
- No validation that event date is in the future
- No validation that required fields are populated before submission

### Scope (MVP)

**In:**
- `POST /api/inquiry`: Add Zod validation that `eventDate` is required and in the future
- `POST /api/inquiry`: Validate `guestCount` is within service minGuests/maxGuests range
- Frontend inquiry form: Add visual validation before submit (inline error messages)
- Frontend inquiry form: Make event date and guest count visually prominent (not easy to skip)

**Out:**
- No change to the lead schema (fields are already present)
- No mandatory message field (allow minimal inquiries)

### Acceptance Criteria
- [ ] Inquiry rejected if event date is missing or in the past
- [ ] Inquiry rejected if guest count is below service min or above service max
- [ ] Frontend shows clear inline error when validation fails
- [ ] Valid inquiries create leads with complete booking parameters

### User Value
- Prevents low-quality leads that waste chef time
- Reduces lead expiration from bad data (leads can't convert without a valid date/guests)
- Improves chef experience by ensuring leads have actionable data

### Effort
~30 min. Mostly validation logic.

---

## 6. Discovery: Opportunity #3 — RESEND_API_KEY + Stripe Integration 🔴 BLOCKER

### is a recurring blocker that has been outstanding for 60+ days.

### Impact
All chef email notifications are dead:
- Chef new lead email (MAI-1501) — blocked
- Stale lead reminder email — blocked
- Diner confirmation email — blocked
- Quote sent email — blocked

### Required Action
Manual environment configuration — this is not a code issue. Someone with access to the Resend account and Stripe dashboard needs to set the keys.

This is noted but not actioned by Product Manager — marking as **waiting on external action**.

---

## 7. Opportunity Prioritization

| # | Opportunity | Effort | Impact | Priority |
|---|-------------|--------|--------|----------|
| 1 | Chef Real-Time Lead Notification | ~1h | High | **P0 — Ship now** |
| 2 | Lead Data Quality Validation | ~30 min | Medium | **P1 — Next sprint** |
| 3 | RESEND_API_KEY + Stripe | Manual | Critical | **P0 — Blocked on ops** |

---

## 8. Open Questions

1. **RESEND_API_KEY**: Who owns the Resend account? Is there a budget constraint preventing API key setup?
2. **Service photos**: The only published service (onboarding service) has 0 photos. Should photo gallery (MAI-1691) be a prerequisite for lead notification, so the chef sees a complete service profile?
3. **Notification preferences**: Should chefs be able to disable in-app notifications? (Not in MVP scope, but worth discussing.)

---

## Appendix: Key Files Reference

- Lead creation: `src/api/inquiry.ts` — `POST /api/inquiry`
- Chef leads API: `src/api/chef-leads.ts` — `GET /api/chef/leads`, notifications endpoints
- Chef leads page: `src/routes/chef-leads-page.ts` — bell icon + dropdown already implemented, polls every 30s
- Notifications schema: `src/db/schema.ts` — `notifications` table
- Notifications API (diner): `src/api/notifications.ts`
- Schema: `src/db/schema.ts` — `leads`, `notifications`, `services` tables