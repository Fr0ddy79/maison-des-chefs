# PRODUCT-MAI-2891: Product Opportunity Discovery

**Created:** 2026-06-11 12:00 America/New_York
**Status:** Complete
**Type:** Product Opportunity Discovery

## Context

This is a follow-up to MAI-2880 (2026-06-11 08:00). In that session, I identified 2 opportunities:
1. **Review Reminder Email** (P0) → ❌ Still not built — trigger exists, email template missing
2. **Booking Modification Confirmation Email** (P2) → ❌ Still not built — trigger needs to be added

Both have been identified since MAI-2874 (2026-06-11 00:00) — 12+ hours and 3 consecutive PODs with the same two items unbuilt. This session focuses on why they haven't been built and what needs to happen.

---

## Opportunity #1: Review Reminder Email (P0 — 12+ Hours Stalled)

### Problem Statement

When a chef marks a booking as `completed` via `PATCH /api/bookings/[id]/complete`, the booking status updates correctly, but **no email is sent to the diner** asking them to leave a review. The review system exists end-to-end (submission API, public display, chef responses), but without outreach, review volume will remain near zero.

### User Story

**As a** diner
**I want to** receive an email after my booking is completed asking me to share my experience
**So that** I can leave feedback that helps future diners and rewards great chefs

**Currently:** After a chef marks a booking as completed, the diner receives no communication. They may remember the experience positively but have no prompt or easy path to leave a review.

### Root Cause

The complete endpoint at `src/app/api/bookings/[id]/complete/route.ts` has a TODO comment:
```typescript
// TODO: Trigger review reminder email (placeholder)
// sendReviewReminderEmail({ bookingId, chefId: booking.chef_id, dinerId: booking.diner_id })
```

### Scope

**In:**
- New email template: `sendBookingReviewReminderEmail` in `src/lib/email/resend.ts`
- Triggered immediately when booking status transitions to `completed` (non-blocking)
- Email includes: chef name, booking date, star rating quick-submit link
- Links directly to `/dashboard/bookings?review_booking={bookingId}`
- Fire-and-forget: email failure does not block booking completion

**Out:**
- Follow-up reminder if diner doesn't review within 7 days (future)
- Push notifications (future)
- Review moderation queue (future)

### Acceptance Criteria

- [ ] Diner receives review reminder email within 60 seconds of chef marking booking as completed
- [ ] Email includes chef name, booking date, and link to review form
- [ ] Email failures do not block booking completion (fire-and-forget)
- [ ] Email is styled consistently with other platform transactional emails
- [ ] Resend API key is used when configured (falls back to console log when placeholder)

### Metrics

- **Primary:** Review submission rate from email link (target: >20% within 7 days)
- **Secondary:** Average time from booking completion to review submission (target: <72h)
- **Guardrail:** Email delivery rate should be >95% (monitor via Resend dashboard)

### Why It Hasn't Been Built

This is a single email template (~80 lines) + one async function call in the complete route. Very low effort. It appears no engineer has picked it up despite being flagged as P0 in 3 consecutive PODs.

### Open Questions

- Should the email include the chef's photo and average rating for social proof?
- What's the sender name? ("Maison des Chefs" <noreply@maison-des-chefs.com>?)
- Should we include a note that the chef will respond to reviews publicly?

---

## Opportunity #2: Booking Modification Confirmation Email (P2 — 12+ Hours Stalled)

### Problem Statement

When a diner modifies their booking details (date, time) via `PATCH /api/bookings/[id]?action=modify`, the API returns a success response and the booking is updated, but **no confirmation email is sent to the diner**. This creates anxiety ("Did my modification go through?") and reduces trust in the platform.

### User Story

**As a** diner
**I want to** receive a confirmation email after modifying my booking
**So that** I know my changes were accepted and what the updated details are

**Currently:** The diner submits a modification, gets an API success response, and sees updated details in their dashboard — but receives no email confirmation.

### Root Cause

The booking modification handler in `src/app/api/bookings/[id]/route.ts` handles the logic correctly but does not trigger any email after a successful modification. The cancellation action (`action=cancel`) sends emails, but the modification action does not.

### Scope

**In:**
- New email template: `sendBookingModificationConfirmationEmail` in `src/lib/email/resend.ts`
- Triggered immediately when a booking is modified (non-blocking)
- Email includes: chef name, old booking date/time (crossed out), new booking date/time, guest count
- Links to `/dashboard/bookings` for the specific booking

**Out:**
- Email to chef notifying them of modification (future — chef sees updates in dashboard)
- Automatic re-confirmation from chef (future)
- Before/after comparison in the email (keep it simple)

### Acceptance Criteria

- [ ] Diner receives modification confirmation email within 60 seconds
- [ ] Email includes the updated booking details (new date, new time)
- [ ] Email failures do not block booking modification response (fire-and-forget)
- [ ] Resend API key is used when configured (falls back to console log when placeholder)

### Metrics

- **Primary:** Modification confirmation email delivery rate (target: 99%)
- **Secondary:** Support tickets about "did my modification go through?" (should decrease)
- **Guardrail:** Modification success rate should not drop

### Why It Hasn't Been Built

Also a single email template (~60 lines) + one async function call. Same pattern — low effort, identified multiple times, no engineer has picked it up.

---

## Priority Ranking

| # | Opportunity | Priority | Effort | Impact | Dependencies |
|---|------------|----------|--------|--------|--------------|
| 1 | Review Reminder Email | P0 | Low | High — drives review volume, unlocks review flywheel | MAI-2870 complete ✅ |
| 2 | Booking Modification Confirmation Email | P2 | Low | Medium — reduces anxiety, builds trust | None |

---

## Platform Status Summary

### What's Built ✅
- Chef booking completion endpoint (MAI-2870) — triggers now exist
- StatsBar showing aggregate rating on homepage
- Full booking flow (inquiry → quote → accept → confirm → complete)
- Cancellation emails (both diner and chef)
- Quote notification and expiration emails
- Booking reminder emails (48h before)
- Profile completion reminder emails
- All email code falls back to console.log when RESEND_API_KEY is placeholder

### What's NOT Built ❌
- Review reminder email (trigger exists, email template missing)
- Booking modification confirmation email (trigger needs to be added)

### Blockers (Fred's Action Required —90+ Days Unchanged)

| Item | Status | Impact |
|------|--------|--------|
| RESEND_API_KEY | Placeholder | All email features dead in production |
| STRIPE_SECRET_KEY | Placeholder | No real payments |
| Production deployment | Never done | Platform invisible, €0 revenue |

### Revenue Path

The platform is feature-complete. The only steps between this codebase and revenue:
1. Fred provides real RESEND_API_KEY
2. Fred provides real STRIPE_SECRET_KEY
3. Fred runs `vercel --prod`

---

## ⚠️ Repeated Identification Alert

These two opportunities have been flagged in **3 consecutive PODs** (MAI-2874, MAI-2880, MAI-2891) across 12+ hours. They are not blocked by code complexity — they are low-effort additions that no engineer has picked up.

**If these are truly low priority relative to other work, that's a valid decision — but they should be explicitly deprioritized rather than repeatedly rediscovered.**

**If they are legitimate priorities, they need to be assigned to an engineer with a deadline.**

---

## Notes

- Both remaining opportunities are low-effort additions (single email template + trigger call)
- The MAI-2870 commit (chef booking completion) is the key unblocker for Opportunity #1
- All email code falls back to console.log when RESEND_API_KEY is placeholder, so development testing works without real keys
- No new opportunities found — the platform is genuinely feature-complete

---

*Generated by Product Manager — MAI-2891*
