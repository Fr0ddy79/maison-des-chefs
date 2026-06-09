# Product Opportunity Discovery — MAI-2780

**Autopilot Run:** 2026-06-09 04:00 America/New_York
**Analyst:** Product Manager

---

## Executive Summary

All4 gaps from MAI-2769 have been addressed:
- ✅ Guest Checkout Flow (MAI-2772)
- ✅ Chef Application Status Tracker (MAI-2773)
- ✅ Email Unsubscribe Infrastructure (MAI-2774)
- ✅ Analytics Dashboard Frontend (MAI-2775)

**Critical blockers remain:** Production deployment never done, API keys still placeholders (85+ days).

**3 New Opportunities Identified:**

1. **Production Deployment Readiness Review (P0)** — Platform built but never live; need final pre-launch checklist
2. **Stripe Payment Integration (P1)** — Platform cannot transact without payments; MAI-2458 stalled
3. **Diner Acquisition Channel Strategy (P1)** — Platform ready but no plan to acquire diners

---

## Opportunity #1: Production Deployment Readiness Review

### Problem Statement

The platform has been built over 80+ days but has never been deployed to production. The site exists only in development. This is the #1 blocker for any revenue.

### User Story

**As a** stakeholder
**I want to** ensure the platform is ready for production deployment
**So that** we can launch and start acquiring chefs and diners

**Currently:** `npm run build` succeeds locally, but production deployment has never been attempted. Unknown issues could block launch.

### Scope

**In:**
- Final pre-launch checklist review
- Verify all environment variables are configured for production
- Confirm Supabase production instance is ready
- Test critical user flows end-to-end in production context
- Verify all API routes return proper status codes
- Confirm email unsubscribe flow works in production
- Check that analytics events fire correctly

**Out:**
- Actual deployment (Fred's action)
- Post-launch monitoring setup
- Performance optimization

### Acceptance Criteria

- [ ] All environment variables documented and verified for production
- [ ] Production Supabase instance confirmed working
- [ ] All critical flows tested: signup, login, booking, inquiry submission
- [ ] Email unsubscribe URL verified working
- [ ] No console errors in production build
- [ ] robots.txt and sitemap.xml verified correct

### Metrics

- **Primary:** Successful production deployment (yes/no)
- **Secondary:** Time from now to deployed
- **Guardrail:** No regressions in existing functionality

### Open Questions

- Is there a production Supabase instance, or is everything on the dev instance?
- What's the hosting provider? (Vercel? Railway? Other?)
- What's the domain? maison-des-chefs.com?

---

## Opportunity #2: Stripe Payment Integration

### Problem Statement

The platform has a complete booking flow, but no payment processing. Chefs cannot receive payments, diners cannot pay. The platform cannot transact.

### User Story

**As a** diner
**I want to** pay for my booking securely
**So that** I can confirm my chef reservation

**As a** chef
**I want to** receive payments for my services
**So that** I can earn revenue through the platform

**Currently:** Bookings are made but no payment is collected. This defeats the marketplace model.

### Scope

**In:**
- Stripe integration for booking payments
- Payment flow: hold → capture on booking confirmation
- Refund flow for cancelled bookings
- Chef payout structure (platform fee deduction)
- Payment status reflected in booking record

**Out:**
- Subscription payments for chefs (future)
- Dynamic pricing / price negotiations
- Payment installments

### Acceptance Criteria

- [ ] Diner can enter payment details during booking
- [ ] Payment is held/authorized but not captured until chef confirms
- [ ] Chef receives payout (minus platform fee) after booking completion
- [ ] Cancelled bookings trigger refund
- [ ] Payment status visible in diner and chef dashboards

### Metrics

- **Primary:** Payment success rate (target: >95%)
- **Secondary:** Average time from booking to payment
- **Guardrail:** Payment failures should not cause booking failures

### Open Questions

- What platform fee percentage? (typically 10-20%)
- Stripe Connect required for chef payouts — has Fred signed up?
- Should we use Stripe Checkout or embedded payment elements?

---

## Opportunity #3: Diner Acquisition Channel Strategy

### Problem Statement

The platform is built but there's no plan to acquire diners. Without diners, chefs have no customers, and the marketplace fails.

### User Story

**As a** platform operator
**I want to** attract diners to the platform
**So that** chefs can earn revenue and we can take a platform fee

**Currently:** No acquisition strategy exists. The platform will launch to an empty marketplace with no users on either side.

### Scope

**In:**
- Define primary acquisition channel (SEO, content, paid ads, partnerships)
- Identify target diner persona and where they discover dining experiences
- Create launch content plan (social proof, chef spotlights, testimonials)
- Set up basic tracking for acquisition metrics

**Out:**
- Full marketing campaign execution
- Paid advertising budget allocation
- Content production pipeline

### Acceptance Criteria

- [ ] Primary acquisition channel identified and documented
- [ ] Launch content plan created (3-5 initial pieces)
- [ ] Acquisition tracking setup (UTM params, events)
- [ ] First-month diner acquisition target set

### Metrics

- **Primary:** Diner sign-ups per week post-launch
- **Secondary:** Booking requests per diner
- **Guardrail:** Acquisition cost should be<30% of booking value

### Open Questions

- What's the target market? (Montreal only? Expandable?)
- Is there a budget for paid acquisition?
- Any existing partnerships or networks to leverage?

---

## Priority Ranking

| # | Opportunity | Priority | Effort | Impact | Owner |
|---|------------|----------|--------|--------|-------|
| 1 | Production Deployment Readiness | P0 | Low | High — unblocks revenue | Fred (action) |
| 2 | Stripe Payment Integration | P1 | High | High — enables transactions | Backend Engineer |
| 3 | Diner Acquisition Channel | P1 | Medium | High — enables marketplace | Growth Marketer |

---

## Blockers (Fred's Action Required)

| Item | Priority | Impact | Age |
|------|----------|--------|-----|
| Production Deployment | P0 | Platform never live | 80+ days |
| RESEND_API_KEY | P0 | Email dead | 85+ days |
| STRIPE_SECRET_KEY | P1 | Payments dead | Unknown |

### Critical Path Note

The path to revenue is:
1. Deploy platform to production (P0 - Fred's action)
2. Onboard first chefs (ensure they set availability)
3. Acquire first diners (acquisition strategy)
4. Enable payment processing (Stripe integration)

Without step1, nothing else matters.

---

## Tasks Created

1. **MAI-2781** (P0, Low) — Fred: Production Deployment Readiness Review → Fred
2. **MAI-2782** (P1, High) — BE+FE: Stripe Payment Integration → Backend Engineer
3. **MAI-2783** (P1, Medium) — Growth: Diner Acquisition Channel Strategy → Growth Marketer

*Generated by Product Manager — MAI-2780*
