# Product Opportunity Discovery — MAI-2791

**Autopilot Run:** 2026-06-09 08:00 America/New_York
**Analyst:** Product Manager

---

## Executive Summary

**Since MAI-2780 (04:00 run), all identified opportunities have been completed:**

- ✅ Guest Checkout Flow (MAI-2772) — `/guest/[token]` tracking page built
- ✅ Chef Application Status Tracker (MAI-2773) — `/chef/status` page built
- ✅ Email Unsubscribe Infrastructure (MAI-2774) — Unsubscribe tokens + API built
- ✅ Analytics Dashboard Frontend (MAI-2775) — `/admin/analytics` page built
- ✅ Inquiry Notification System for Chefs (MAI-2563) — `sendNewInquiryNotificationToChef` implemented
- ✅ Quote Flow (accept/decline/expire) — fully implemented in chef + diner dashboards
- ✅ Booking Reminders — cron job + emails implemented

**Growth Marketer actively working:**
- MAI-2784: Diner Acquisition Channel Strategy (in progress)
- MAI-2787: Weekend CTA Hero A/B Test (in progress)

**The platform is MVP-complete on features. The blockers are all Fred's action items.**

---

## Critical Blockers (Fred's Action Required — Unchanged)

| Item | Priority | Impact | Age |
|------|----------|--------|-----|
| RESEND_API_KEY | P0 | All transactional email dead — confirmations, quotes, reminders, notifications | 85+ days |
| STRIPE_SECRET_KEY | P0 | Platform cannot accept payments — zero revenue | Never configured |
| Production deployment | P0 | Platform built but never live | Ongoing |

---

## Opportunity #1: Stripe Payment Integration (P0)

### Problem Statement

The platform has a complete booking flow with quotes, acceptances, and confirmations — but **no payment processing exists**. There is zero Stripe integration in the codebase. Every booking is created but no money changes hands. The platform cannot generate revenue in its current state.

**Root cause:** No Stripe code exists. `STRIPE_SECRET_KEY` is not in `.env.local`. MAI-2458 (Stripe Integration) stalled and was never completed.

### User Story

**As a** diner who accepted a chef's quote
**I want to** pay for my booking securely through the platform
**So that** the transaction is safe and the chef gets paid

**Currently:** A diner accepts a quote, sees "booking confirmed," but has no way to pay. The chef provides a service with no guaranteed payment.

### Scope

**In:**
- Add Stripe SDK (`stripe` npm package)
- Add `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to `.env.local`
- Create Stripe customer on diner signup or first quote acceptance
- Add payment intent creation when chef sends a quote (quote accepted → payment intent created)
- Checkout session or embedded payment for diner to pay
- Webhook handler for payment confirmation → update booking status to `confirmed`
- Chef payout infrastructure (Stripe Connect) — at minimum, store `stripe_account_id` on chef profiles

**Out:**
- Refunds (future)
- Partial payments / deposits (future)
- Subscription billing for chefs (future)

### Acceptance Criteria

- [ ] `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` configured in `.env.local`
- [ ] Payment triggered when diner accepts a quote
- [ ] Booking status updates to `confirmed` after successful payment
- [ ] Chef receives payout (Stripe Connect)
- [ ] Build passes

### Metrics
- **Primary:** Successful payment rate (target: >95% of quote acceptances result in payment)
- **Secondary:** GMV (gross merchandise value) per week
- **Guardrail:** Payment failures should not lose booking data

### Open Questions
- Should we use Stripe Checkout (redirect) or embedded payments?
- Do we charge the diner immediately on quote acceptance, or create a hold?
- What's the payment timing: full payment upfront, or deposit + final payment?
- Do chefs need Stripe Connect onboarding before they can receive payouts?

---

## Opportunity #2: RESEND_API_KEY Configuration (P0)

### Problem Statement

`RESEND_API_KEY` in `.env.local` is set to `your_resend_api_key_here` — a placeholder. All transactional email is dead: inquiry confirmations, quote notifications, booking reminders, chef notifications. The system logs emails to console instead of sending them.

**This has been a P0 blocker for 85+ days.**

### Scope

**In:**
- Fred creates a Resend account at resend.com
- Fred generates an API key
- Fred updates `.env.local` with real `RESEND_API_KEY`
- Verify emails send successfully via test inquiry

**Out:**
- Email template redesign (future)
- Multiple email sequences (future)

### Acceptance Criteria

- [ ] `RESEND_API_KEY` is not a placeholder value
- [ ] Test inquiry submission sends confirmation email to diner (check Resend dashboard)
- [ ] No console errors about Resend API key status

### Owner
**Fred (no agent can complete this)**

---

## Opportunity #3: Production Deployment (P0)

### Problem Statement

The platform has never been deployed to production. It exists only in local development. No one can access the platform at a real URL. All acquisition efforts (Growth Marketer's diner acquisition strategy) are blocked by this.

### Scope

**In:**
- Fred selects hosting provider (Vercel recommended for Next.js)
- Fred configures domain `maison-des-chefs.com` (or confirms if already owned)
- Fred updates `.env.local` with production values for all API keys
- Fred deploys via `vercel --prod` or equivalent
- Fred verifies `https://maison-des-chefs.com` loads correctly
- Fred verifies critical flows: signup, login, booking inquiry, chef dashboard

**Out:**
- Post-launch monitoring (future)
- CDN / performance optimization (future)

### Acceptance Criteria

- [ ] Platform accessible at production URL
- [ ] `npm run build` succeeds
- [ ] All API routes return 200/201/appropriate status codes
- [ ] Database connection works with production Supabase instance
- [ ] RESEND_API_KEY and STRIPE_SECRET_KEY work in production

### Owner
**Fred (no agent can complete this)**

---

## What's Working (MVP Complete)

The following flows are implemented and functional (pending API keys and deployment):

| Flow | Status |
|------|--------|
| Landing page + chef browsing | ✅ |
| Chef profiles + reviews display | ✅ |
| Waitlist signup | ✅ |
| Guest booking inquiry (no auth required) | ✅ |
| Inquiry confirmation email to diner | ✅ (dead without RESEND_API_KEY) |
| Inquiry notification email to chef | ✅ (dead without RESEND_API_KEY) |
| Guest booking tracking (`/guest/[token]`) | ✅ |
| Chef application form + status tracker | ✅ |
| Admin dashboard + analytics | ✅ |
| Chef dashboard (availability, bookings, quotes) | ✅ |
| Quote flow (chef sends, diner accepts/declines) | ✅ |
| Quote expiration cron job | ✅ |
| Booking reminder emails (48h before) | ✅ (dead without RESEND_API_KEY) |
| Booking cancellation | ✅ |
| Review submission (diner rates completed booking) | ✅ |
| Email unsubscribe | ✅ |

---

## Tasks Created

1. **MAI-2792** (P0, High) — BE: Stripe Payment Integration → Backend Engineer
   - Add Stripe SDK + API keys
   - Payment intent on quote acceptance
   - Stripe Connect for chef payouts
   - Webhook for payment confirmation

*Generated by Product Manager — MAI-2791*