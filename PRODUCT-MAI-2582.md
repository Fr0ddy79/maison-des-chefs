# Product Opportunity Discovery — MAI-2582

**Autopilot Run:** 2026-06-05 12:00 America/New_York
**Analyst:** Product Manager

---

## Executive Summary

Identified **2 opportunities**: one P1 (chef application admin workflow is incomplete after approval) and one P0 (Stripe payment integration — the largest remaining v1 gap). Both are clear, bounded, and MVP-scope.

---

## Product Health Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Chef application form | ✅ Working | `/chef/apply` stores to `chef_applications` |
| Chef approval workflow | ✅ Working | Admin approves → auth user created (MAI-2524) |
| Inquiry submission | ✅ Working | Creates booking on chef accept |
| Quote system | ✅ Working | Quote modal + accept creates booking |
| Availability management | ✅ Working | Chef dashboard slot CRUD |
| Booking management (chef) | ✅ Working | Accept/reject/quote inquiries |
| Review system | ✅ Working | POST /api/reviews works |
| Diner dashboard | ✅ Working | `/dashboard/bookings` (MAI-2562) |
| Chef profile edit | ✅ Working | `/dashboard/chef/profile` (MAI-2553) |
| Inquiry time overlap fix | ✅ Working | MAI-2573 verified done |
| "Book Again" pre-fill | ✅ Working | MAI-2574 done |
| Growth SEO schema | ✅ Working | MAI-2577 done |
| Email notifications | ⚠️ Blocked | Resend key still placeholder (80+ hours) |
| Chef application admin workflow | ⚠️ Gap | Rejection path incomplete, no application list UI |
| Stripe payment integration | ❌ Gap | No Stripe code in codebase (v1 must-have) |

---

## Opportunity #1: Chef Application Admin Workflow — Post-Approval Gap (P1)

### Problem Statement

The chef application workflow has a solid approval path: chef applies → admin approves → auth user + chef_profile created. However, the **rejection path is missing entirely**, and there is **no admin UI to browse, filter, or manage submitted applications**. This creates two problems:

1. **Rejection is undefined:** If an admin wants to reject a applicant, there is no mechanism. The application sits in `chef_applications` forever with no resolution.
2. **No application management UI:** Admins must query the database directly to see new applications. There is no `/dashboard/admin/applications` page.

### User Story

**As an** admin
**I want** to see all chef applications in a dashboard and be able to approve or reject them
**So that** I can efficiently manage the chef pipeline without database access

**Currently:** A chef submits an application at `/chef/apply`. The admin must use a Supabase dashboard or direct SQL to see it. "Approve" works (MAI-2524). "Reject" does nothing — there is no endpoint and no UI.

### Scope

**In:**
- Admin dashboard page at `/dashboard/admin/applications`
- List all pending applications (newest first): name, email, location, cuisines, years_exp, submitted date
- "Approve" button → already working (MAI-2524), confirm with admin
- "Reject" button → adds `rejected_at` timestamp to `chef_applications`, sends optional email (future)
- Filter tabs: All / Pending / Approved / Rejected
- Badge count in admin nav for pending applications

**Out:**
- Bulk approve/reject (future)
- Applicant email on rejection (future — blocked by Resend key)
- Application editing by admin

### Acceptance Criteria

- [ ] `/dashboard/admin/applications` shows list of all chef applications
- [ ] Each application shows: name, email, location, cuisines, years_exp, created_at
- [ ] "Approve" button triggers existing approval flow (MAI-2524)
- [ ] "Reject" button updates `chef_applications.rejected_at = NOW()` and hides from pending list
- [ ] Filter tabs correctly filter by status
- [ ] Pending count badge appears in admin navigation
- [ ] Approved/rejected applications can be re-filtered

### Metrics

- Primary: Average time from application to approve/reject decision (target: <48h)
- Secondary: Application volume per week

### Open Questions

- Should rejected applicants be allowed to re-apply with the same email?
- Do we need an email notification to the applicant on rejection? (Would be blocked by Resend key)

---

## Opportunity #2: Stripe Payment Integration (P0)

### Problem Statement

The booking flow creates a `bookings` record when a diner accepts a chef's quote, but **no payment is collected**. The SPEC.md explicitly lists "Payment processing (Stripe integration not yet implemented)" as "Not in v1" — but without it, the marketplace cannot monetize. This is the single largest gap preventing the platform from going live.

### User Story

**As a** diner
**I want to** pay for my booking through the platform
**So that** I can confirm my reservation with confidence and the chef gets paid

**As a** chef
**I want** to receive payments through the platform
**So that** I don't have to collect payment manually after the experience

**Currently:** A diner accepts a quote, a booking is created, but no money changes hands. The chef shows up expecting payment with no guarantee. The platform cannot take a commission.

### Scope

**In:**
- Install `stripe` npm package
- Create Stripe customer on diner's first booking
- Add `stripe_customer_id` to `profiles` table (migration)
- Add `stripe_payment_intent_id` to `bookings` table (migration)
- On quote acceptance: create Stripe PaymentIntent with amount = `total_price`
- Checkout session or PaymentIntent confirmation page
- Payment status on booking: `payment_status IN ('pending', 'paid', 'failed', 'refunded')`
- Webhook handler at `/api/webhooks/stripe` for payment confirmation
- Success/failure redirect after payment

**Out:**
- Stripe Connect for chef payouts (future — chefs get paid manually or via Stripe payout later)
- Subscription billing
- Partial refunds UI (can use Stripe dashboard)
- Dynamic pricing / price negotiation

### Acceptance Criteria

- [ ] Diner accepts quote → redirected to Stripe Checkout with correct amount
- [ ] Payment success → booking status updated to `confirmed`, slot marked `is_booked`
- [ ] Payment failure → booking status shows "payment failed", diner can retry
- [ ] Stripe webhook updates booking `payment_status` on `payment_intent.succeeded`
- [ ] `stripe_customer_id` stored on diner profile after first payment
- [ ] Refund via Stripe dashboard → booking status updated to `refunded`

### Metrics

- Primary: Payment completion rate (target: >90% of accepted quotes)
- Secondary: Average time from quote acceptance to payment
- Guardrail: Payment flow drop-off rate should be <5%

### Dependencies

- `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in `.env.local` — **Fred's action required**
- Stripe account must be created at https://dashboard.stripe.com

### Open Questions

- Should we collect payment *before* the booking is confirmed, or use a "hold + capture" model?
- What's the platform's commission rate? (e.g., 10% of `total_price`)
- Do we need Stripe Connect for chef payouts in v1, or just manual payout?
- What happens if a chef cancels after payment? (Refund policy?)

---

## Changes Since Previous Run (MAI-2568)

| Item | MAI-2568 | MAI-2582 |
|------|----------|----------|
| Inquiry time overlap | ❌ Gap | ✅ Fixed (MAI-2573) |
| "Book Again" pre-fill | ❌ Gap | ✅ Fixed (MAI-2574) |
| Diner dashboard | 🔄 In Progress | ✅ Done (MAI-2562) |
| Chef profile edit | 🔄 In Progress | ✅ Done (MAI-2553) |
| Growth SEO schema | 🔄 In Progress | ✅ Done (MAI-2577) |
| Chef application admin UI | ❌ Not identified | ❌ Gap found |
| Stripe payment integration | ❌ Not identified | ❌ Gap found |
| Resend API key | ⚠️ Placeholder | ⚠️ Still placeholder (80+ hours) |

---

## Priority Ranking

| # | Opportunity | Priority | Effort | Impact | Owner |
|---|------------|----------|--------|--------|-------|
| 1 | Stripe Payment Integration | P0 | High | High — enables monetization, unblocks launch | Backend + Frontend |
| 2 | Chef Application Admin Workflow | P1 | Medium | Medium — completes chef onboarding funnel | Frontend + Backend |

---

## Fred Actions Needed

1. **RESEND_API_KEY** — Still placeholder after 80+ hours. Blocks MAI-2563 (chef inquiry notifications) and all transactional email. Provide key to unblock.
   - Get free key at https://resend.com
   - Replace `your_resend_api_key_here` in `.env.local`

2. **STRIPE_KEYS** — Needed for Opportunity #2 (Stripe Payment Integration). Create account at https://dashboard.stripe.com, get keys, add to `.env.local`:
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`

---

## Open Questions

1. **Stripe Integration:** Do we use Stripe Checkout (hosted page) or embedded payment elements? Checkout is faster to implement but less customizable.
2. **Commission:** What % does Maison des Chefs take? This affects the PaymentIntent amount calculation.
3. **Chef Payouts:** Manual payout in v1 (chef invoices platform) or Stripe Connect (automatic)?
4. **Payment Timing:** Collect at booking creation, or "authorize only" and capture closer to the event date?

---

*Generated by Product Manager — MAI-2582*
