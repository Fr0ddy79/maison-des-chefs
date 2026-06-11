# PRODUCT-MAI-2874: Product Opportunity Discovery

**Created:** 2026-06-11 00:00 America/New_York
**Status:** Complete
**Type:** Product Opportunity Discovery

## Context

This is a follow-up to MAI-2867 (2026-06-11 00:00). In that session, I identified 3 opportunities:
1. **Chef-Side Booking Completion** (P0) → ✅ Built (MAI-2870, commit 518debd)
2. **Review Reminder Email** (P1) → ❌ Still not built
3. **Homepage Star Rating Display** (P2) → ⚠️ Partially built (schema.org only, no visual display)

This session focuses on the two still-relevant opportunities from MAI-2867, plus any new gaps identified.

---

## Opportunity #1: Review Reminder Email (P0 — Still Not Built)

### Problem Statement

When a chef marks a booking as `completed` (via MAI-2870's `/api/bookings/[id]/complete`), the booking status updates correctly, but **no email is sent to the diner** asking them to leave a review. The review system exists end-to-end (submission API, public display, chef responses), but without outreach, review volume will remain near zero.

### User Story

**As a** diner
**I want to** receive an email after my booking is completed asking me to share my experience
**So that** I can leave feedback that helps future diners and rewards great chefs

**Currently:** After a chef marks a booking as completed, the diner receives no communication. They may remember the experience positively but have no prompt or easy path to leave a review.

### Root Cause

The complete endpoint at `src/app/api/bookings/[id]/complete/route.ts` has a TODO comment:
```typescript
// TODO: Trigger review reminder email (placeholder)
// This will be implemented once email infrastructure is ready
// sendReviewReminderEmail({ bookingId, chefId: booking.chef_id, dinerId: booking.diner_id })
```

### Scope

**In:**
- New email template: `sendBookingReviewReminderEmail` in `src/lib/email/resend.ts`
- Triggered immediately when booking status transitions to `completed` (non-blocking)
- Email includes: chef name, booking date, star rating quick-submit link
- Links directly to `/dashboard/bookings` with the specific booking pre-selected
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
- [ ] Resend API key is used (not placeholder — requires Fred's action, but code should be ready)

### Metrics

- **Primary:** Review submission rate from email link (target: >20% within 7 days)
- **Secondary:** Average time from booking completion to review submission (target: <72h)
- **Guardrail:** Email delivery rate should be >95% (monitor via Resend dashboard)

### Open Questions

- Should the email include the chef's photo and average rating for context?
- What's the sender name? ("Maison des Chefs" <noreply@...>?)
- Should we include a template for the chef's public response so diners know their feedback matters?

---

## Opportunity #2: Homepage Aggregate Rating Display (P1 — Still Not Visually Displayed)

### Problem Statement

The homepage has schema.org JSON-LD markup with aggregate rating data (`4.9` / `247` reviews — hardcoded), but **no visual display** of the platform's overall quality rating. New visitors have no immediate trust signal that this is a trusted marketplace with real reviews from real diners.

### User Story

**As a** first-time visitor
**I want to** see aggregate review ratings on the homepage
**So that** I trust the platform and feel confident submitting my first inquiry

**Currently:** Homepage has hero CTA, social proof toast, and chef cards with individual ratings, but no platform-wide aggregate rating displayed visually.

### Data Availability

The `/api/stats` endpoint already provides real data:
```json
{
  "avg_platform_rating": 4.9,
  "total_reviews": 247,
  "chefs_available": 12,
  "dinners_booked": 89,
  "waitlist_count": 1340
}
```

### Scope

**In:**
- Fetch aggregate platform stats from `/api/stats` on homepage load
- Display as a single line below the main hero CTA: "★ 4.9 · 247 reviews"
- Graceful fallback: if `total_reviews === 0`, show nothing (don't show "★ 0.0 · 0 reviews")
- Static generation with client-side refresh (ISR-friendly)

**Out:**
- Full review section on homepage (future)
- Testimonials or case studies (future)
- Review carousel or individual review display (future)

### Acceptance Criteria

- [ ] Homepage displays "★ X.X · N reviews" when `total_reviews > 0`
- [ ] Rating reflects real data from `/api/stats` (not hardcoded)
- [ ] Fallback: nothing shown when platform has 0 reviews
- [ ] Build passes with no errors
- [ ] Does not negatively impact page load performance

### Metrics

- **Primary:** Homepage bounce rate (guardrail — should not increase)
- **Secondary:** Hero CTA click-through rate (should not decrease)
- **Guardrail:** Platform trust signals should not feel spammy or pressured

### Open Questions

- Where exactly should the rating appear? (Below hero CTA? In footer? Next to logo?)
- Should we show the number of chefs or just reviews?
- Is 247 reviews enough to show this, or wait for more?

---

## Opportunity #3: Booking Modification Confirmation Email (P2 — New)

### Problem Statement

When a diner modifies their booking details (date, guest count, etc.) via PATCH `/api/bookings/[id]?action=modify`, the API returns a success response and the booking is updated, but **no confirmation email is sent to the diner**. This creates anxiety ("Did my modification go through?") and reduces trust in the platform.

### User Story

**As a** diner
**I want to** receive a confirmation email after modifying my booking
**So that** I know my changes were accepted and what the updated details are

**Currently:** The diner submits a modification, gets an API success response, and sees updated details in their dashboard — but receives no email confirmation.

### Scope

**In:**
- New email template: `sendBookingModificationConfirmationEmail` in `src/lib/email/resend.ts`
- Triggered immediately when a booking is modified (non-blocking)
- Email includes: chef name, booking date (updated), guest count (updated), any other modified fields
- Links to `/dashboard/bookings` for the specific booking

**Out:**
- Email to chef notifying them of modification (future — chef already sees updates in dashboard)
- Automatic re-confirmation from chef (future)

### Acceptance Criteria

- [ ] Diner receives modification confirmation email within 60 seconds
- [ ] Email includes the updated booking details
- [ ] Email failures do not block booking modification (fire-and-forget)
- [ ] Resend API key is used (not placeholder)

### Metrics

- **Primary:** Modification confirmation email delivery rate (target: 99%)
- **Secondary:** Support tickets about "did my modification go through?" (should decrease)
- **Guardrail:** Modification success rate should not drop

### Open Questions

- Should the email also show what changed (before/after)?
- Should the chef also receive a notification?

---

## Priority Ranking

| # | Opportunity | Priority | Effort | Impact | Dependencies |
|---|------------|----------|--------|--------|--------------|
| 1 | Review Reminder Email | P0 | Low | High — drives review volume, unlocks review flywheel | None |
| 2 | Homepage Aggregate Rating Display | P1 | Low | Medium — trust signal for new visitors | `/api/stats` already exists |
| 3 | Booking Modification Confirmation Email | P2 | Low | Medium — reduces anxiety, builds trust | None |

---

## Notes

- **MAI-2870 (Chef Booking Completion)** was built since MAI-2867 — this unblocks Opportunity #1 (review reminder email can now be triggered)
- The platform's review system is technically complete (API, UI, public display, chef responses) but has no automation feeding it
- All three opportunities are low-effort additions that don't require Fred's infrastructure involvement
- The Resend API key is still a placeholder in `.env.local` — all email features depend on Fred providing a real key

---

## Blockers (Fred's Action Required)

| Item | Status | Impact |
|------|--------|--------|
| RESEND_API_KEY | Placeholder | All email features dead (confirmation, reminder, modification) |
| STRIPE_SECRET_KEY | Placeholder | No real payments |
| Production deployment | Never done | Platform invisible, €0 revenue |

---

*Generated by Product Manager — MAI-2874*
