# PRODUCT-MAI-2867: Product Opportunity Discovery

**Created:** 2026-06-11 00:00 America/New_York
**Status:** Complete
**Type:** Product Opportunity Discovery

## Context

Platform is feature-complete (per MAI-2861). All revenue-blocking items are infrastructure (API keys + deployment) requiring Fred's action. This session focused on identifying product gaps that don't require Fred's infrastructure involvement.

## What Was Analyzed

- Review system (API + UI + public display)
- Booking lifecycle (pending → confirmed → completed)
- Email system (reminder emails, application emails, no review email)
- Chef dashboard (availability, inquiries, bookings, analytics)
- Public chef profile (reviews displayed with chef responses)

## Finding: Booking Completion Gap

**The critical gap is booking completion.** Here's the current state:

| Booking Status | Who Can Set | How |
|----------------|-------------|-----|
| `pending` | Chef dashboard | Accept inquiry → creates booking |
| `confirmed` | Chef dashboard | Accept quote from diner |
| `completed` | **Admin only** | Via `/api/admin/bookings/[id]/status` |
| `cancelled` | Diners + Admin | Via `/api/bookings/[id]` (cancel action) |

**Problem:** After a chef performs the service, they have **no UI or API** to mark the booking as `completed`. Only an admin can do it via the admin panel. This breaks the review flow:

1. Chef finishes service → booking stays `confirmed` forever
2. No trigger exists to send review reminder email
3. Diners don't know their experience is "done" and should be reviewed
4. Reviews accumulate only from the rare case an admin updates status manually

---

## Opportunity #1: Chef-Side Booking Completion (P0)

### Problem Statement

Chefs have no way to mark a booking as completed after delivering the service. The booking stays `confirmed` indefinitely, breaking any downstream automation (review emails, analytics accuracy, chef performance metrics).

### User Story

**As a** chef
**I want to** mark a booking as completed after I've delivered the service
**So that** diners receive a review reminder and my performance record stays accurate

**Currently:** After a confirmed booking happens, the chef has no UI to close it out. The booking status remains `confirmed` forever unless an admin intervenes.

### Scope

**In:**
- Add "Mark as Completed" button in chef dashboard for `confirmed` bookings
- PATCH endpoint at `/api/bookings/[id]/complete` (chef-only, not admin-only)
- When booking is marked `completed`, trigger review reminder email to diner
- Optimistic UI update in chef dashboard

**Out:**
- Admin-only status endpoint remains admin-only (not expanded)
- Automatic completion based on booking date (future — cron job)
- Partial refunds or status-based payment release (future — Stripe)

### Acceptance Criteria

- [ ] Chef dashboard shows "Mark as Completed" button on confirmed bookings
- [ ] Clicking it updates booking status to `completed` (no admin required)
- [ ] Review reminder email is sent to diner within 60 seconds of completion
- [ ] Booking no longer appears in chef's "upcoming" list after completion
- [ ] Chef cannot mark a `pending` or `cancelled` booking as completed
- [ ] Only the chef assigned to the booking can mark it complete

### Metrics

- **Primary:** % of confirmed bookings marked completed within 7 days (target: >60%)
- **Secondary:** Review submission rate after booking completion (target: >20%)
- **Guardrail:** Completion rate should not drop (chefs not overwhelmed with actions)

### Open Questions

- Should the "Mark as Completed" button also trigger a confirmation prompt ("Confirm service was delivered?")?
- Do we need a way for chefs to add a private note when completing ("Client was late, special requests not fulfilled")?
- Should the email to the diner be a1-click review or link to the full review form?

---

## Opportunity #2: Review Reminder Email (P1)

### Problem Statement

After a booking is completed, no automated email asks the diner to leave a review. The review system exists fully (submission API, public display, chef responses), but without outreach, review volume will be near zero.

### User Story

**As a** diner
**I want to** receive an email after my booking is completed asking me to share my experience
**So that** I can leave feedback that helps future diners and rewards great chefs

**Currently:** After a booking is completed, the diner receives no communication. They may remember the experience positively but have no prompt or easy path to leave a review.

### Scope

**In:**
- New email template: `sendBookingReviewReminder` in `src/lib/email/resend.ts`
- Sent immediately when booking status transitions to `completed`
- Email includes: chef name, booking date, star rating quick-submit link
- Links directly to `/dashboard/bookings` with the specific booking pre-selected
- Non-blocking: if email fails, booking completion still succeeds

**Out:**
- Follow-up reminder if diner doesn't review within 7 days (future)
- Push notifications (future)
- Review moderation queue (future — already have chef responses)

### Acceptance Criteria

- [ ] Diner receives review reminder email within 60 seconds of booking completion
- [ ] Email includes chef name, booking date, and link to review form
- [ ] Email failures do not block booking completion (fire-and-forget)
- [ ] Email is styled consistently with other platform transactional emails
- [ ] Resend API key is used (not placeholder — requires Fred's action)

### Metrics

- **Primary:** Review submission rate from email link (target: >20% within 7 days)
- **Secondary:** Average time from booking completion to review submission (target: <72h)
- **Guardrail:** Email delivery rate should be >95% (monitor via Resend dashboard)

### Open Questions

- Should the email include the chef's photo and average rating for context?
- What's the sender name? ("Maison des Chefs" <noreply@...>?)
- Should we include a template for the chef's public response so diners know their feedback matters?

---

## Opportunity #3: Homepage Star Rating Display (P2)

### Problem Statement

The homepage has no social proof for the platform's overall quality. New visitors have no signal that this is a trusted marketplace with real reviews from real diners.

### User Story

**As a** first-time visitor
**I want to** see aggregate review ratings on the homepage
**So that** I trust the platform and feel confident submitting my first inquiry

**Currently:** Homepage has hero CTA, social proof toast, and chef cards, but no platform-wide aggregate rating.

### Scope

**In:**
- Fetch aggregate platform stats: average rating across all chefs, total review count
- Display as a single line: "★4.8 · 200+ reviews" in the hero section or below the main CTA
- Data source: `SELECT AVG(avg_rating), SUM(review_count) FROM chef_profiles WHERE avg_rating IS NOT NULL`
- Graceful fallback: if no reviews yet, show nothing (don't show "0.0")

**Out:**
- Full review section on homepage (future)
- Testimonials or case studies (future)
- Review carousel or individual review display (future)

### Acceptance Criteria

- [ ] Homepage displays aggregate rating when `SUM(review_count) > 0`
- [ ] Rating updates in real-time as new reviews are submitted
- [ ] Fallback: nothing shown when platform has 0 reviews
- [ ] Build passes with no errors

### Metrics

- **Primary:** Homepage bounce rate (guardrail — should not increase)
- **Secondary:** Hero CTA click-through rate (should not decrease)
- **Guardrail:** Platform trust signals should not feel spammy or pressured

### Open Questions

- Where exactly should the rating appear? (Below hero CTA? In footer? Next to logo?)
- Should we show the number of chefs or just reviews?
- Is200+ reviews enough to show this, or wait for more?

---

## Priority Ranking

| # | Opportunity | Priority | Effort | Impact | Dependencies |
|---|------------|----------|--------|--------|--------------|
| 1 | Chef-Side Booking Completion | P0 | Low | High — unblocks review email trigger | None |
| 2 | Review Reminder Email | P1 | Low | High — drives review volume | Opportunity #1 |
| 3 | Homepage Star Rating Display | P2 | Low | Medium — trust signal for new visitors | None |

---

## Notes

- **MAI-2828 (Post-Launch Readiness)** is already in_progress — this work complements that by identifying what's missing from the current build
- The platform's review system is technically complete (API, UI, public display, chef responses) but has no automation feeding it
- The booking completion gap is the root cause — fixing it enables the entire review flywheel
- All three opportunities are low-effort additions that don't require Fred's infrastructure involvement

---

*Generated by Product Manager — MAI-2867*
