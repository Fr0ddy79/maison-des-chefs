# Product Opportunity Discovery — MAI-2809

**Autopilot Run:** 2026-06-09 16:00 America/New_York
**Analyst:** Product Manager

---

## Executive Summary

**Since MAI-2800 (12:00 run), significant progress:**

- ✅ **MAI-2803 (Chef Application Admin Approval Queue)** — Done (committed in `6351659`). Admin approve/reject UI at `/admin/chef-applications/[id]`, confirmation modal, rejection reason, email notifications.
- ✅ **MAI-2804 (Acquisition Channel Tracking)** — Done (committed in `6351659`). UTM capture on all lead flows, `lead_sources` table, top channels in admin analytics.
- ✅ **MAI-2797 (Stripe Webhook + Checkout Flow)** — Done (committed in `6351659`). Stripe SDK integrated, webhook handler at `/api/webhooks/stripe`, checkout session at `/api/bookings/[id]/checkout`.

**Working tree is clean. Build passes.**

**Growth Marketer actively testing:** MAI-2787 (A/B Test) and MAI-2784 (Acquisition Strategy) in progress.

**Critical blockers unchanged (Fred's action required):**
- `RESEND_API_KEY` = `your_resend_api_key_here` → all transactional email dead (85+ days)
- `STRIPE_SECRET_KEY` = `your_stripe_secret_key_here` → no real payments (never configured)
- Production never deployed → platform not accessible to public

---

## 🚨 Critical Revenue Gap: Accept Quote → Payment Flow Disconnected

### Problem Statement

When a diner accepts a chef's quote, the booking is immediately marked as `status: 'confirmed'` — **but no Stripe checkout session is created and no payment is collected**. The diner sees "Your booking is confirmed!" without ever being asked to pay.

The Stripe webhook handler and checkout session API exist (`/api/bookings/[id]/checkout`), but they are **not wired into the accept-quote flow**. This means:

1. Diner accepts quote → booking marked "confirmed" → **no payment requested**
2. Chef provides service → **no payment collected**
3. Platform takes **zero commission** on every booking

**This is the single biggest revenue leak in the platform.**

### User Story

**As a** diner who accepted a chef's quote
**I want to** be redirected to secure payment after accepting
**So that** I can complete my booking transaction

**Currently:** Diner accepts quote, sees "✓ Quote accepted. Your booking is confirmed!" — but is never asked to pay. Booking is marked confirmed without payment.

### Root Cause

`/api/bookings/[id]/accept-quote` updates `status → 'confirmed'` and `quote_status → 'accepted'` but does **not** create a Stripe checkout session. The checkout endpoint exists independently but is never called.

### Scope

**In:**
- Modify `POST /api/bookings/[id]/accept-quote` to create a Stripe checkout session after quote acceptance
- Redirect diner to Stripe Checkout URL after accepting quote (in diner dashboard)
- Update booking status to `'payment_pending'` (not `'confirmed'`) until Stripe webhook confirms payment
- Stripe webhook at `/api/webhooks/stripe` updates booking to `'confirmed'` on `checkout.session.completed`
- If payment fails or is cancelled, booking stays in `'payment_pending'` status
- Add "Pay Now" button on diner dashboard for bookings in `'payment_pending'` status (for returning after navigating away)
- Guest checkout: `/guest/[token]` page shows "Payment Required" state when booking is in `'payment_pending'` status

**Out:**
- Partial payments or deposits (future)
- Automatic retry on failed payment (future)
- Refunds (future)

### Acceptance Criteria

- [ ] Diner accepts quote → Stripe Checkout session created → diner redirected to Stripe
- [ ] Booking status is `'payment_pending'` (not `'confirmed'`) until payment confirmed
- [ ] Stripe webhook updates booking to `'confirmed'` on successful payment
- [ ] "Pay Now" button appears on diner dashboard for `'payment_pending'` bookings
- [ ] Guest tracking page shows "Payment Required" for unpaid accepted quotes
- [ ] Build passes

### Metrics

- **Primary:** Payment completion rate (target: >90% of quote acceptances result in payment)
- **Secondary:** GMV (gross merchandise value) per week
- **Guardrail:** Quote acceptance rate should not drop when payment is introduced

### Open Questions

- Should we use Stripe Checkout (redirect) or embedded payment form?
- What happens if payment fails? Does the booking stay in `'payment_pending'` indefinitely?
- Do we need a payment timeout (e.g., 48h to pay or booking is cancelled)?
- Should the checkout session be created server-side (in accept-quote API) or client-side (after response)?

### Owner
Frontend Engineer + Backend Engineer (depends on `STRIPE_SECRET_KEY` from Fred)

---

## Opportunity #2: Chef Profile Completion Enforcement (P1)

### Problem Statement

When an admin approves a chef application, the chef receives an invite email and can log in. However, **there is no enforcement or follow-up to ensure the chef completes their profile** (photo, bio, services, availability). Many approved chefs end up with empty profiles — invisible to diners and useless for the platform.

The chef dashboard already shows a "profile completeness" score (0–100%), but there's no:
- Admin visibility into which approved chefs have incomplete profiles
- Automated follow-up to chefs with incomplete profiles
- Consequence for remaining incomplete (e.g., hidden from search)

### User Story

**As an** admin
**I want to** see which approved chefs have incomplete profiles
**So that** I can follow up and ensure the platform has quality, bookable chefs

**As a** chef
**I want to** be prompted to complete my profile after logging in for the first time
**So that** I can start receiving booking inquiries

### Scope

**In:**
- Admin analytics or chef applications page shows "profile completion %" for each approved chef
- Chef dashboard shows persistent banner until profile is >80% complete
- Chef cannot receive booking inquiries (inquiries rejected with "chef profile incomplete") until minimum completion threshold is met
- Email reminder to chef if profile is <50% complete after 7 days since first login

**Out:**
- Auto-hiding incomplete chefs from search (future)
- Admin-only profile editing (future)
- Automatic profile completion suggestions (future)

### Acceptance Criteria

- [ ] Admin can see profile completion % for each approved chef
- [ ] Chef dashboard shows completion banner until profile is >80% complete
- [ ] Chef with<50% completion after 7 days receives reminder email
- [ ] Build passes

### Metrics

- **Primary:** % of approved chefs with >80% profile completion within 14 days (target: >75%)
- **Secondary:** Booking inquiries per approved chef (should increase with complete profiles)

### Open Questions

- What is the minimum viable completion threshold? (e.g., photo + bio + 1 service +1 availability slot)
- Should incomplete chefs be hidden from `/chefs` search?
- Do we need a "Submit for review" step for chef profiles?

### Owner
Frontend Engineer + Backend Engineer

---

## Opportunity #3: Admin Application Notification (P2)

### Problem Statement

When a prospective chef submits an application at `/chef/apply`, **no one is notified**. The admin must manually check `/admin/chef-applications` to see if new applications arrived. This creates a discovery lag — a chef applies, waits, and may abandon the process because they don't hear back quickly.

### User Story

**As an** admin
**I want to** be notified immediately when a new chef application is submitted
**So that** I can review and respond quickly, keeping applicants engaged

**Currently:** Chef submits application → stored in database → admin discovers it next time they check the dashboard (which may be days later).

### Scope

**In:**
- On new `chef_applications` INSERT, trigger admin notification email
- Include: applicant name, email, location, cuisines, submission time
- Email goes to admin email address (from profile or env var)
- Non-blocking (application still saves even if email fails)

**Out:**
- Slack/Discord notification (future)
- SMS to admin (future)
- Daily digest emails (future)

### Acceptance Criteria

- [ ] New chef application submission triggers admin notification email
- [ ] Email includes applicant key details (name, email, location)
- [ ] Email failure does not block application submission
- [ ] Build passes

### Metrics

- **Primary:** Admin notification delivery rate (target: 100%)
- **Secondary:** Time from application submission to first admin review (target: <24h)

### Owner
Backend Engineer (depends on `RESEND_API_KEY` from Fred)

---

## Blockers (Fred's Action Required — Unchanged)

| Item | Priority | Impact | Age |
|------|----------|--------|-----|
| RESEND_API_KEY | P0 | All transactional email dead |85+ days |
| STRIPE_SECRET_KEY | P0 | Platform cannot accept payments | Never configured |
| Production deployment | P0 | Platform never live | Never |

---

## Tasks Created

1. **MAI-2811** (P0, High) — **BE+FE: Wire Accept-Quote to Stripe Checkout**
   - Create Stripe checkout session on quote acceptance
   - Redirect diner to Stripe Checkout after accepting
   - Update booking to `'payment_pending'` (not `'confirmed'`) until payment
   - Stripe webhook confirms payment → updates to `'confirmed'`
   - "Pay Now" button on diner dashboard + guest tracking page
   - Owner: Backend Engineer + Frontend Engineer

2. **MAI-2812** (P1, Medium) — **BE+FE: Chef Profile Completion Enforcement**
   - Admin view of chef profile completion %
   - Chef dashboard completion banner
   - Minimum threshold before receiving inquiries
   - Owner: Frontend Engineer + Backend Engineer

3. **MAI-2813** (P2, Low) — **BE: Admin Application Notification**
   - Email admin on new chef application submission
   - Non-blocking, includes applicant details
   - Owner: Backend Engineer

---

*Generated by Product Manager — MAI-2809*
