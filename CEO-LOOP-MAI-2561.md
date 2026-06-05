# CEO Loop — MAI-2561

**Run:** 2026-06-05 04:00 America/New_York
**Status:** Complete

---

## Current Product State

| Area | Status | Notes |
|------|--------|-------|
| Inquiry submission | ✅ Working | Diners submit → booking created on chef accept |
| Availability management | ✅ Working | Chefs can add/remove slots via dashboard |
| Availability display | ⚠️ Partial | `/chefs` shows badges but not a visual calendar |
| Booking management | ✅ Working | Chef dashboard shows inquiries, quotes, bookings |
| Quote system | ✅ Working | Send quote → accept/decline → booking confirmed |
| Email notifications | ⚠️ Partial | Booking confirmation emails (non-blocking), Resend key still placeholder |
| Review system | ⚠️ Built but unused | POST /api/reviews works, but no one prompts diners |
| Diner dashboard | ❌ Missing | No `/dashboard/diner` page — diniers can't see booking status |
| Notification system | ❌ Missing | No in-app or email notifications when chefs receive inquiries |
| Chef profile edit | ⚠️ Partial | Edit page exists but may be incomplete |
| Landing page SEO | ✅ Working | Schema.org + meta tags present |
| Chef profile pages | ⚠️ Unknown | May lack per-page metadata |

---

## Tasks Created

| ID | Title | Priority | Assignee |
|----|-------|----------|----------|
| **MAI-2562** | Diner Dashboard — Booking Status Tracker | P1 | Frontend + Backend |
| **MAI-2563** | Inquiry Notification System for Chefs | P1 | Backend |

---

## Opportunity #1: Diner Dashboard — Booking Status Tracker

### Problem Statement

After a diner submits an inquiry, they have **no way to track what happened**. The inquiry disappears — they don't know if the chef accepted, declined, or ignored it. This creates anxiety and erodes trust in the platform. Meanwhile, the chef receives the inquiry, processes it, and creates a booking — but the diner has no visibility into any of this.

### User Story

**As a** diner
**I want to** see the status of my booking requests
**So that** I know whether my inquiry was accepted, declined, or still pending — and what I need to do next

**Currently:** A diner submits an inquiry at `/book`, receives a confirmation screen, and that's the last they hear. If the chef accepts and sends a quote, the diner has no way to see it or respond to it.

**Root cause:** There is no diner-facing dashboard. The `bookings` table stores diner data, but there's no UI for diners to access it.

### Scope

**In:**
- Create `/dashboard/diner/page.tsx`
- Show list of the diner's bookings/inquiries with status
- Statuses: `pending` (awaiting chef response), `quoted` (quote sent, awaiting acceptance), `confirmed` (accepted), `cancelled` (declined), `completed` (past event)
- For `quoted` status: show quote amount, message, accept/decline buttons
- When diner accepts quote → booking status updated to `confirmed` → email to chef (optional)
- Show past bookings with "Leave a Review" prompt for `completed` bookings that have no review

**Out:**
- Payment processing (Stripe not configured)
- Push notifications / SMS
- Real-time updates (polling is fine for MVP)

### Acceptance Criteria

- [ ] Diner can log in and navigate to `/dashboard/diner`
- [ ] Dashboard shows all their bookings/inquiries, most recent first
- [ ] Each booking shows: chef name, date, service, status badge, total price
- [ ] "Quoted" bookings show quote amount + message with Accept/Decline buttons
- [ ] Accepting quote updates booking to `confirmed` status
- [ ] Declining quote updates booking to `cancelled` status
- [ ] Completed bookings without reviews show "Leave a Review" prompt
- [ ] Clicking "Leave a Review" opens review form
- [ ] Review submission updates chef's avg_rating

### Metrics

- **Primary:** % of diners who log in to check booking status within 48h of inquiry (target: >50%)
- **Secondary:** Quote acceptance rate (should increase with better diner visibility)
- **Guardrail:** Booking form completion rate should not drop

### Open Questions

- Should non-authenticated diners (email-only) have access to a guest tracking page?
- Do we need a "booking confirmed" email to the diner when the chef accepts the inquiry?
- What's the redirect behavior after diner accepts/declines a quote?

---

## Opportunity #2: Inquiry Notification System for Chefs

### Problem Statement

When a new inquiry arrives, the chef **only knows about it if they actively check the dashboard**. There are no notifications — no email, no in-app alert. This creates a slow response loop and a poor experience for diners who expect quick responses. The SPEC says chefs should "respond within 24-48 hours," but without notifications, many won't.

### User Story

**As a** chef
**I want to** be notified immediately when a diner submits an inquiry
**So that** I can respond quickly and not lose booking opportunities to slow response times

**Currently:** Chef submits inquiry → stored in DB → chef sees it next time they log in. If they don't log in for 2 days, the inquiry sits untouched and the diner hears nothing.

### Scope

**In:**
- On inquiry creation (PATCH /api/inquiries or separate trigger), send email to chef via Resend
- Email includes: diner email, requested date, service type, message preview, link to dashboard
- Email is non-blocking (inquiry succeeds even if email fails)
- Also update the chef dashboard UI to show a badge/count when new inquiries exist
- **For MVP:** Email notification only (no push/SMS)

**Out:**
- Real-time in-app notifications (use polling badge count for MVP)
- Mobile push notifications
- Slack/Teams integrations
- Notification preferences/settings

### Acceptance Criteria

- [ ] New inquiry triggers email to chef's registered email address
- [ ] Email contains: diner contact, requested date/time, service, message preview, CTA link to dashboard
- [ ] Email failure does not block inquiry acceptance
- [ ] Chef dashboard shows inquiry count badge in header/sidebar
- [ ] Chefs who have no pending inquiries see no badge

### Metrics

- **Primary:** Average inquiry response time (target: <8 hours with notifications, was >24h without)
- **Secondary:** Inquiry acceptance rate (should increase with faster responses)
- **Guardrail:** Email bounce/complaint rate should remain <1%

### Open Questions

- What's the sender name/email for these notifications? (e.g., "Maison des Chefs" <notifications@...>)
- Should we also send a "new inquiry" email to the admin?
- Do we have Resend configured? If not, what's the path to getting it working?

---

## Priority Ranking

| # | Opportunity | Priority | Effort | Impact | Owner |
|---|------------|----------|--------|--------|-------|
| 1 | Diner Dashboard | P1 | Medium | High — completes the diner side of the marketplace | Frontend + Backend |
| 2 | Inquiry Notifications for Chefs | P1 | Low | Medium — improves response time, reduces drop-off | Backend (Resend) |

---

## Blockers

| Blocker | Impact | Owner |
|---------|--------|-------|
| Resend API key not configured | All transactional emails fail | Fred |
| STRIPE_KEY placeholder | Payment flow blocked | Fred |

---

## Fred Actions Needed

1. **Provide Resend API key** — Replace `your_resend_api_key_here` in `.env.local` to enable transactional emails
2. **Provide Stripe key** — Replace `pk_test_...` in `.env.local` for payment flow (not in MVP scope but needed soon)

---

## Open Tasks (Prioritized)

| ID | Title | Priority | Notes |
|----|-------|----------|-------|
| MAI-2552 | BE: Fix accept-quote double-booking | HIGH | Likely false positive — needs verification |
| MAI-2553 | FE: Chef Profile Edit UI | Medium | Incomplete, blocks chef onboarding quality |
| MAI-2549 | Chef Booking Management Dashboard | Medium | Review solicitation for diners still needed |
| MAI-2550 | Review Solicitation | None | Prompt diners to leave reviews after booking |
| MAI-2562 | Diner Dashboard | P1 | New — complet the diner side of the marketplace |
| MAI-2563 | Inquiry Notification System for Chefs | P1 | New — Resend-based email on new inquiry |

---

## Analysis Notes

- The marketplace loop is now functional on the chef side: availability management, inquiry processing, quote system, booking management — all present. The gap is on the **diner side**: no dashboard to track status, no notifications for chefs to know inquiries arrived.
- The inquiry-to-booking funnel has two bottlenecks: (1) chefs don't know inquiries arrived without checking dashboard, (2) diners don't know what happened after submitting. Fixing both dramatically improves the conversion funnel.
- Review solicitation (MAI-2550) is still open and should be addressed — it can be combined with MAI-2562 (diner dashboard) since both involve the diner-facing booking experience.
- The Resend key has been a known blocker for multiple loops. If Fred provides it, Opportunity #2 is a straightforward backend addition.

*Generated by CEO — MAI-2561*