# Product Opportunity Discovery — MAI-2589

**Autopilot Run:** 2026-06-05 16:00 UTC (America/New_York)
**Analyst:** Product Manager

---

## Executive Summary

The platform has made significant progress since MAI-2582. However, **SPEC.md is now materially stale** — it still says "Not in v1" for features that are already built (booking acceptance/decline, email notifications, chef dashboard). More critically, **Stripe payment integration remains the #1 v1 gap** and has been unaddressed for multiple cycles. Two other gaps stand out: a broken support link in the chef dashboard and an underspecified booking flow that bypasses the services layer entirely.

---

## Product Health Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Landing page | ✅ Working | Hero, chef preview, how it works |
| Chef listing & profiles | ✅ Working | Filters, ratings, bio, cuisines |
| Booking flow | ✅ Working | Multi-step, A/B variant testing |
| Inquiry conflict detection | ✅ Working | Availability, blocked dates, time overlap |
| Quote system | ✅ Working | Chef sends quote, diner accepts/declines |
| Booking management (chef) | ✅ Working | Inquiries, upcoming bookings, quote modal |
| Diner dashboard | ✅ Working | Quote accept/decline, reviews, book again |
| Chef profile editing | ✅ Working | Photo, bio, services, availability |
| Chef application admin UI | ✅ Working | Full list/detail/approve/reject (discovered: MAI-2582 overcounted this gap) |
| Review system | ✅ Working | POST /api/reviews, inline quick review |
| Email code (Resend) | ✅ Implemented | All email functions written, just needs key |
| Stripe payment integration | ❌ Not built | **#1 v1 gap — no Stripe code exists** |
| Resend API key | ⚠️ Placeholder | 80+ hours, all transactional email dead |
| Support/contact page | ❌ Missing | "Need Help?" → href="#", no /contact page |
| SPEC.md accuracy | ⚠️ Stale | Lists many implemented features as "Not in v1" |

---

## Changes Since Previous Run (MAI-2582)

| Item | MAI-2582 | MAI-2589 |
|------|----------|----------|
| Chef application admin UI | ❌ Gap flagged | ✅ Already built (overcounted) |
| Stripe payment integration | ❌ Gap | ❌ Still not built |
| Resend API key | ⚠️ Placeholder | ⚠️ Still placeholder (80+ hours) |
| SPEC.md accuracy | Not flagged | ⚠️ Stale — needs update |

---

## Opportunity #1: Stripe Payment Integration (P0 — Repeatedly Deferred)

### Problem Statement

The booking flow creates a `bookings` record when a chef accepts an inquiry, and a quote system lets chefs propose prices that diners accept or decline. However, **no money ever changes hands**. The platform cannot monetize. This has been the #1 gap for multiple product cycles and is the single largest blocker for launch.

### User Story

**As a** diner
**I want to** pay through the platform when I accept a quote
**So that** my booking is confirmed and I have payment protection

**As a** platform owner
**I want to** collect payment on bookings
**So that** I can take a commission and the business is viable

**Currently:** A diner accepts a quote → booking is marked "confirmed" → chef shows up expecting payment with no guarantee. No Stripe code exists in the codebase. SPEC.md explicitly says "Payment processing (Stripe integration not yet implemented)" is "Not in v1" — but without it, the platform cannot launch.

### Scope

**In:**
- Install `stripe` npm package
- Add `stripe_customer_id` column to `profiles` table
- Add `stripe_payment_intent_id` and `payment_status` columns to `bookings` table
- On quote acceptance: create Stripe PaymentIntent with amount = `quote_amount`
- Redirect diner to Stripe Checkout session
- Stripe webhook at `/api/webhooks/stripe` for `payment_intent.succeeded`
- Payment status tracking: `pending → paid / failed`
- Retry flow for failed payments

**Out:**
- Stripe Connect for chef payouts (future)
- Partial refunds UI (use Stripe dashboard)
- Dynamic pricing / negotiation

### Acceptance Criteria

- [ ] Diner clicks "Accept Quote" → redirected to Stripe Checkout with correct amount
- [ ] Payment success → booking `status` updated to `confirmed`, slot marked `is_booked`
- [ ] Payment failure → booking shows "payment failed", diner can retry
- [ ] Stripe webhook updates `payment_status` on `payment_intent.succeeded`
- [ ] `stripe_customer_id` stored on profile after first payment
- [ ] Refund via Stripe dashboard → booking `payment_status` updated to `refunded`

### Metrics

- Primary: Payment completion rate (target: >90% of accepted quotes)
- Secondary: Average time from quote acceptance to payment
- Guardrail: Payment drop-off rate should be <5%

### Dependencies

- `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — **Fred's action required**
- Stripe account at https://dashboard.stripe.com

### Open Questions

1. What commission rate does Maison des Chefs take? (Affects PaymentIntent amount: `quote_amount * (1 - commission)`)
2. Pre-authorize only and capture closer to event date, or charge immediately?
3. Do chef payouts happen manually (invoicing) or via Stripe Connect in v1?

---

## Opportunity #2: Functional Support / Contact Page (P2)

### Problem Statement

The chef dashboard has a "Need Help?" section with a dead link (`href="#"`). There is no `/contact` page anywhere on the site. Diners have no way to reach support. This erodes trust — a premium platform must have a clear support path.

### User Story

**As a** diner or chef
**I want to** contact support if I have an issue
**So that** I can resolve problems without feeling abandoned

**Currently:** Every "Need Help?" link points to `href="#"` — a no-op. No contact form, no email address, no support page.

### Scope

**In:**
- `/contact` page with contact form (name, email, subject, message)
- Submissions stored in a `support_inquiries` table (id, name, email, subject, message, created_at)
- Admin can view submissions at `/admin/support`
- "Need Help?" in chef dashboard links to `/contact`
- Footer link to `/contact`

**Out:**
- Live chat integration
- Automated responses
- Support ticket status tracking

### Acceptance Criteria

- [ ] `/contact` page renders with contact form
- [ ] Form submission stores to `support_inquiries` table
- [ ] Admin can view submissions at `/admin/support`
- [ ] All "Need Help?" / "Contact Support" links point to `/contact`
- [ ] Form validation: required fields, valid email format

### Metrics
- Primary: Support inquiry volume (tracks how many people need help)
- Secondary: Support resolution time

---

## Opportunity #3: Booking Flow — Services Not Wired (P2)

### Problem Statement

The `services` table exists in the database with columns for title, description, cuisine_type, duration_hours, price_per_person, max_guests. However, the booking flow at `/book` and `/book/BookPageContent.tsx` **never reads from or writes to the services table**. The `service_id` field is passed in the inquiry payload but is never used to look up service details. Diners select a chef, date, time, and guests — but never select which *service* (prix fixe, cocktail party, cooking class, etc.) they want.

### User Story

**As a** diner
**I want to** select a specific service experience when booking
**So that** I know exactly what I'm getting and the chef can prepare accordingly

**As a** chef
**I want to** offer distinct service types at different price points
**So that** I can cater to different party sizes and occasions

**Currently:** A diner picks a chef and a date/time. The chef's `services` in the database are never shown or selectable. This means chefs can't offer differentiated experiences (e.g., "Dinner Party for 2-8 guests at $120/person" vs "Cocktail Party for 10-20 guests at $80/person").

### Scope

**In:**
- Booking page fetches and displays chef's active services
- Diner selects a service before picking date/time
- Service selection pre-fills guest count limits (max_guests)
- Service title/description shown in confirmation step
- `service_id` is used to look up service details (not just stored blindly)

**Out:**
- Service creation/editing UI in chef dashboard (already exists at `/dashboard/chef/services`)
- Pricing calculation based on service (future — currently quote-based)

### Acceptance Criteria

- [ ] Chef selection step shows chef's active services
- [ ] Selecting a service pre-fills guest count (respects max_guests from service)
- [ ] Service name appears on confirmation step
- [ ] Booking inquiry includes correct service_id

### Open Questions

- Should chefs be required to have at least one service before they can receive bookings?
- Should the booking flow require service selection, or keep it optional (current behavior)?

---

## Priority Ranking

| # | Opportunity | Priority | Effort | Impact | Owner |
|---|------------|----------|--------|--------|-------|
| 1 | Stripe Payment Integration | **P0** | High | High — enables monetization, unblocks launch | Backend + Frontend |
| 2 | Resend API Key | **P0** | Low | Medium — unblocks all transactional email | Fred (1-step config) |
| 3 | Support / Contact Page | P2 | Low | Medium — trust signal for premium platform | Frontend |
| 4 | Booking Flow → Services Wiring | P2 | Medium | Medium — completes service offering UX | Frontend + Backend |
| 5 | SPEC.md Update | P2 | Low | Low — keeps docs accurate | Product |

---

## Fred Actions Still Needed

| Item | Priority | Impact | Age |
|------|----------|--------|-----|
| RESEND_API_KEY | P0 | All transactional email dead | 80+ hours |
| STRIPE_SECRET_KEY + NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | P0 | No payment processing, cannot launch | Unknown |

**RESEND:** Get free key at https://resend.com, replace `your_resend_api_key_here` in `.env.local`.
**STRIPE:** Create account at https://dashboard.stripe.com, add keys to `.env.local`.

---

## Open Questions

1. **Commission rate:** What % does Maison des Chefs take on bookings? Needed for PaymentIntent calculation.
2. **Payment model:** Charge immediately on quote acceptance, or authorize and capture closer to the event?
3. **Chef payouts:** Manual invoicing in v1, or implement Stripe Connect?
4. **Service requirement:** Should chefs be required to have at least one active service to appear in search?

---

*Generated by Product Manager — MAI-2589*