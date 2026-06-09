# Product Opportunity Discovery — MAI-2800

**Autopilot Run:** 2026-06-09 12:00 America/New_York
**Analyst:** Product Manager

---

## Executive Summary

**Since MAI-2791 (08:00 run), no new features have been completed** — the build pipeline is quiet. Growth Marketer continues active work on MAI-2784 (Acquisition) and MAI-2787 (A/B Test).

**Platform is MVP-complete.** All core features are built and functional (pending API keys). Remaining opportunities are either Fred's action items or new product gaps.

**Critical blockers unchanged for 85+ days:**
- RESEND_API_KEY = placeholder → all transactional email dead
- STRIPE_SECRET_KEY = placeholder → zero revenue
- Production never deployed → platform not accessible to public

---

## What's Built (MVP Complete)

| Flow | Status |
|------|--------|
| Landing page + chef browsing | ✅ |
| Chef profiles + reviews display | ✅ |
| Waitlist signup | ✅ |
| Guest booking inquiry (no auth required) | ✅ |
| Guest booking tracking (`/guest/[token]`) | ✅ |
| Chef application form + status tracker | ✅ |
| Admin dashboard + analytics | ✅ |
| Chef dashboard (availability, bookings, quotes) | ✅ |
| Diner dashboard with booking tracking | ✅ |
| Quote flow (chef sends, diner accepts/declines) | ✅ |
| Booking reminders + cancellation | ✅ |
| Review submission | ✅ |
| Email unsubscribe + contact form | ✅ |
| Analytics tracking + compare page | ✅ |
| Messaging (in-platform) | ✅ |
| Dietary preference capture | ✅ |
| Stripe Payment Integration | ❌ Not started (MAI-2793 in todo) |

---

## Opportunity #1: Chef Application Admin Approval Queue (P1)

### Problem Statement

The `/admin/chef-applications/page.tsx` exists and shows a list of applicants, but **there is no UI for an admin to approve or reject a chef application**. The admin can see applicants but cannot act on them. This means the chef onboarding pipeline is broken — applications pile up with no resolution path.

### User Story

**As an** admin
**I want to** review and approve/reject chef applications from a dashboard
**So that** I can onboard new chefs and notify them of their status

**Currently:** A chef submits an application via `/chef/apply`. The application is stored in `chef_applications` table. The admin sees a list at `/admin/chef-applications`. But there is no "Approve" or "Reject" action — no button, no modal, no API endpoint to update application status.

### Scope

**In:**
- Admin application list page (`/admin/chef-applications`) gets action buttons
- "Approve" button: updates `chef_applications.status` → `approved`, triggers welcome email to chef
- "Reject" button: updates status → `rejected`, triggers rejection email
- Confirmation modal before action (prevent accidents)
- Success/error toast notifications
- Admin can add a rejection reason (stored in `chef_applications.rejection_reason`)

**Out:**
- Bulk approval/rejection (future)
- Application re-review flow (future)
- Automated profile creation on approval (future — chef creates profile manually)

### Acceptance Criteria

- [ ] Admin can view list of pending chef applications
- [ ] Admin can click "Approve" on a pending application
- [ ] Admin can click "Reject" on a pending application with optional reason
- [ ] Approval/rejection updates `chef_applications.status` in database
- [ ] Confirmation modal appears before status change
- [ ] Chef receives email notification on approval/rejection
- [ ] Approved chefs can log in and access chef dashboard

### Metrics
- **Primary:** % of pending applications resolved within 48h (target: >90%)
- **Secondary:** Time from application to approval/rejection
- **Guardrail:** Approval rate should be monitored (too high = not enough vetting, too low = bottleneck)

### Open Questions
- Should approval automatically create a chef auth account, or does the chef still need to sign up separately?
- Do we need a "Request More Info" intermediate status?
- Should rejection include a template message or be free-form?

---

## Opportunity #2: Acquisition Channel Tracking (P1)

### Problem Statement

The platform has no visibility into **how diners discover the site**. Analytics track events (page views, booking steps) but not UTM parameters, referrer sources, or channel attribution. Without this data, the Growth Marketer cannot optimize acquisition spend or understand which channels drive bookings.

### User Story

**As a** Growth Marketer
**I want to** know which channels drive diner acquisition
**So that** I can focus spend on high-converting sources and abandon low-performing ones

**Currently:** A diner arrives from Instagram, Google, or word-of-mouth. The platform records a page view but has no idea where they came from. Booking source is untracked.

### Scope

**In:**
- Capture UTM parameters (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`) on first visit
- Store in a `analytics_sessions` or `lead_sources` table linked to `bookings` or `waitlist` entries
- Capture `referrer` header for non-UTM traffic
- Display source breakdown in admin analytics dashboard
- Track booking source on inquiry submission (associate lead source with booking)

**Out:**
- Paid ad integration (Google Ads, Facebook Pixel) — future
- Multi-touch attribution modeling — future
- Automated reporting — future

### Acceptance Criteria

- [ ] UTM parameters captured on waitlist signup and booking inquiry
- [ ] Source data stored in database linked to booking/waitlist record
- [ ] Admin analytics shows top acquisition channels
- [ ] First-touch attribution visible per booking

### Metrics
- **Primary:** % of bookings with a tracked source (target: >80%)
- **Secondary:** Top3 acquisition channels by booking volume
- **Guardrail:** This is an analytics feature — no impact on booking conversion rate expected

### Open Questions
- Should we use first-touch or last-touch attribution?
- Do we need a cookie/localStorage layer for UTM persistence across sessions?
- Is the Growth Marketer already implementing this as part of MAI-2784?

---

## Opportunity #3: Stripe Payment Integration — Spec Expansion (P0)

### Problem Statement

MAI-2793 exists as a task but has only a one-line description. Stripe integration is the single highest-impact revenue opportunity. A proper spec is needed before implementation can begin.

### Scope (Detailed)

**In:**
- Add `stripe` npm package
- Add `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to `.env.local`
- Create Stripe customer on diner's first quote acceptance
- Create Payment Intent when chef sends a quote (amount = quote price)
- Checkout session or embedded payment form for diner to pay after accepting quote
- Webhook handler at `/api/webhooks/stripe` for payment confirmation
- On payment success: update `bookings.status` → `paid`, notify chef
- Stripe Connect: chef onboarding flow to receive payouts (`stripe_account_id` on chef profile)
- Payment held in escrow until booking completion (configurable)

**Out:**
- Refunds (future)
- Partial deposits (future)
- Subscription billing for chefs (future)
- Automatic payout to chef bank account (future — manual transfer acceptable for MVP)

### Acceptance Criteria

- [ ] Diner can pay for a booking after accepting a quote
- [ ] Payment confirmed via Stripe webhook updates booking status
- [ ] Chef receives payout via Stripe Connect
- [ ] Build passes
- [ ] Test payment flow works in Stripe test mode

### Owner
**Backend Engineer** (requires STRIPE_SECRET_KEY from Fred)

---

## Blockers (Fred's Action Required — Unchanged Since MAI-2769)

| Item | Priority | Impact | Age |
|------|----------|--------|-----|
| RESEND_API_KEY | P0 | All transactional email dead |85+ days |
| STRIPE_SECRET_KEY | P0 | Platform cannot accept payments | Never configured |
| Production deployment | P0 | Platform never live | Never |

---

## Tasks Created

1. **MAI-2803** (P1, Medium) — BE+FE: Chef Application Admin Approval Queue → Frontend + Backend
   - Admin approval/rejection UI at `/admin/chef-applications`
   - API: PATCH `/api/chef-applications/[id]`
   - Email notification on status change

2. **MAI-2804** (P1, Medium) — BE+FE: Acquisition Channel Tracking → Backend + Frontend
   - UTM capture on waitlist/booking inquiry
   - Store in `lead_sources` table linked to booking
   - Display in admin analytics

3. **MAI-2805** (P0, High) — **Fred: Provide STRIPE_SECRET_KEY**
   - Required to start MAI-2793 (Stripe Payment Integration)
   - Platform cannot accept payments without this

---

*Generated by Product Manager — MAI-2800*
