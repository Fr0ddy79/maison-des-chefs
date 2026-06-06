# Product Opportunity Discovery — MAI-2643

**Autopilot Run:** 2026-06-06 16:00 UTC (America/New_York)
**Analyst:** Product Manager

---

## Executive Summary

Building on MAI-2628's findings, this run identified **4 additional gaps** across three themes: (1) confirmation email gap in the inquiry submission flow, (2) data integrity and UI display issues in the chef dashboard, (3) guest-facing tracking blind spot. The P1 structural dietary preference capture from MAI-2620 remains the highest-priority unbuilt opportunity.

---

## Product Health Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Landing page | ✅ Working | Hero A/B test, trust section, SEO schema |
| Chef listing + compare | ✅ Working | Compare bar, service badges, filters |
| Chef profile page | ✅ Working | Services, reviews, sidebar booking |
| Booking flow (A/B) | ✅ Working | Multi-step, simplified variant, services wired |
| Inquiry submission | ✅ Working | Creates inquiry, sends chef notification email |
| **Inquiry confirmation email to diner** | ❌ Missing | Function exists (`sendInquiryConfirmationEmail`) but not called in POST handler |
| Quote system | ✅ Working | Chef sends quote, diner accepts/declines via dashboard |
| Chef dashboard | ⚠️ Partial | Inquiry modal missing guest info; availability management working |
| Diner dashboard | ✅ Working | Booking tracking, quote accept/decline, review prompts |
| Admin dashboard | ✅ Working | Stats, chef applications, recent bookings |
| Contact page | ✅ Working | Form → support_inquiries table |
| Chef application emails | ✅ Working | Confirmation + admin notification (when key configured) |
| **Structured dietary capture** | ❌ Missing | Free-text only — P1 since MAI-2620 |
| **Guest booking tracking page** | ❌ Missing | No `/inquiry/[id]` page for guest diners |
| **Inquiry modal — guest info** | ❌ Missing | Schema has columns; not fetched/displayed |
| STRIPE payment integration | ❌ Not built | Blocked by STRIPE_SECRET_KEY (Fred's action) |
| RESEND_API_KEY | ⚠️ Placeholder | 130+ hours — FROM_EMAIL domain unverified |

---

## Changes Since Previous Run (MAI-2628)

| Item | MAI-2628 | MAI-2643 |
|------|----------|----------|
| Inquiry confirmation email | ❌ Not called | ❌ Still not called — function exists but orphaned |
| FROM_EMAIL domain | `maison-des-chefs.com` unverified | ⚠️ Likely unverified — emails will land in spam |
| Structured dietary capture | ⚠️ Identified as P1 | ❌ Still not built |
| Inquiry modal guest info | ⚠️ Identified as P2 | ❌ Still not built |
| Guest tracking page | ⚠️ Identified as P2 | ❌ Still not built |
| RESEND_API_KEY | ⚠️ Placeholder | ⚠️ Still placeholder (130+ hours) |
| Stripe payment | ❌ Not built | ❌ Still not built (blocked) |

---

## Opportunity #1: Inquiry Confirmation Email (P1)

### Problem Statement

The `sendInquiryConfirmationEmail()` function exists in `src/lib/email/resend.ts` and is fully implemented — but **it is never called in the inquiry submission flow**. When a diner submits a booking inquiry via `POST /api/inquiry`, they receive only a JSON success response. No email is sent to confirm receipt.

This creates:
1. **Anxiety** ("Did my request go through?")
2. **Spam folder risk** — The FROM_EMAIL domain `maison-des-chefs.com` is likely unverified in Resend, meaning even when emails *do* send, they may land in spam
3. **Reduced trust** — Competitors send immediate confirmations; we don't

### User Story

**As a** guest diner
**I want** to receive an email immediately after submitting my booking inquiry
**So that** I know it was received and what to expect next

**Currently:** POST `/api/inquiry` → 201 JSON response → no email. Diner stares at the screen wondering if it worked.

### Root Cause

The inquiry POST handler in `src/app/api/inquiry/route.ts` calls `sendNewInquiryNotificationToChef()` but does **not** call `sendInquiryConfirmationEmail()` for the diner. The function exists but is orphaned.

### Scope

**In:**
- Call `sendInquiryConfirmationEmail()` in the inquiry POST handler after successful inquiry creation
- Verify FROM_EMAIL domain in Resend (Fred action — see below)
- Email failure is non-blocking (inquiry still succeeds if email fails)

**Out:**
- Email template redesign (existing template is functional)
- SMS notifications (future)
- Branding overhaul

### Acceptance Criteria

- [ ] Diner receives confirmation email within 60 seconds of inquiry submission
- [ ] Email includes: chef name, requested date, diner email, reference ID, "chef will respond within 24-48h"
- [ ] Email failures do not cause inquiry submission to fail (non-blocking try/catch)
- [ ] RESEND_API_KEY is configured with a verified domain (Fred's action)

### Metrics

- **Primary:** Confirmation email delivery rate (target: 99%)
- **Secondary:** Support tickets about "did my inquiry go through?" (should decrease)
- **Guardrail:** Inquiry submission rate should not drop

### Owner
Backend (1-line addition to existing POST handler)

### ⚠️ Fred Action Required — FROM_EMAIL Domain

The `FROM_EMAIL` constant in `src/lib/email/resend.ts` is:
```typescript
const FROM_EMAIL = 'Maison des Chefs <noreply@maison-des-chefs.com>'
```

This domain **must be verified in Resend** before emails deliver reliably. Steps:
1. Add DNS records (MX, TXT, DKIM) for `maison-des-chefs.com` in Resend
2. Or use a verified domain like `onboarding@resend.dev` for testing
3. Or use Fred's own domain if he has one configured in Resend

This affects **all transactional emails** (inquiry confirmations, booking confirmed, quote notifications, chef application emails).

---

## Opportunity #2: Inquiry Modal Guest Info — Data Fetch Gap (P2)

### Problem Statement

Confirmed during code inspection. MAI-2628 identified this gap but it was not actioned. The `fetchInquiries()` query in the chef dashboard explicitly **excludes** `guest_count` and `inquiry_time`:

```typescript
// src/app/dashboard/chef/page.tsx — fetchInquiries()
const { data } = await supabase
  .from('inquiries')
  .select(`id, email, message, inquiry_date, status, created_at, service_id, services:service_id (title)`)
  // guest_count and inquiry_time are NOT selected
```

And the inquiry detail modal has no fields for these values either.

### User Story

**As a** chef
**I want** to see guest count and requested time in the inquiry modal
**So that** I can quickly assess fit before accepting

**Currently:** Must cross-reference or ask the diner. Creates friction in the accept/decline decision.

### Scope

**In:**
- Add `guest_count` and `inquiry_time` to the `fetchInquiries()` Supabase select query
- Display both fields in the inquiry detail modal (within the existing modal structure)
- Inquiry list card can optionally show guest count as a secondary detail

**Out:**
- Changes to the booking flow or other dashboard sections
- Any backend schema changes (columns already exist via migration 013)

### Acceptance Criteria

- [ ] Inquiry detail modal shows "X guests" and "Requested time: HH:MM"
- [ ] Data comes from `inquiries` table columns (not calculated)
- [ ] Build passes

### Owner
Frontend (chef dashboard page.tsx)

---

## Opportunity #3: Guest Booking Status Tracking Page (P2)

### Problem Statement

Re-stated from MAI-2628 — still not built. Guest diners (unauthenticated) submit inquiries via `/book` and have **no way to check their booking status on the platform**. They must rely entirely on email, which:
1. Requires RESEND_API_KEY to be configured (currently a placeholder)
2. Land in spam if FROM_EMAIL domain is unverified
3. Doesn't allow diners to check status on demand

### User Story

**As a** guest diner
**I want** to visit `/inquiry/[id]` to see my booking status
**So that** I know if the chef has confirmed without hunting through email

**Currently:** No such page exists. Guest submits → waits passively.

### Scope

**In:**
- `/inquiry/[id]` page — publicly accessible (no auth), fetch inquiry by ID
- Shows: chef name, requested date/time, status badge (pending/confirmed/rejected), guest count
- Status badge updates when chef accepts/rejects (polling on page load)
- "Contact Chef" mailto link
- Clean, minimal UI

**Out:**
- Full guest account system
- In-platform messaging
- Password reset flows

### Acceptance Criteria

- [ ] `/inquiry/[id]` accessible without login
- [ ] Shows inquiry status, chef name, date, guest count
- [ ] Status updates reflect chef's accept/reject action
- [ ] 404 state for invalid IDs
- [ ] Build passes

### Dependencies
- None (reads from existing `inquiries` table)

### Owner
Frontend + lightweight Backend (new public API route to fetch inquiry by ID)

---

## Opportunity #4: Booking Acceptance → Quote Flow UX Gap (P2)

### Problem Statement

When a chef accepts an inquiry, a booking is created with `status: 'pending'` and `quote_status: null`. The chef dashboard correctly shows this booking in the "Awaiting Your Quote" section. However:

1. **No email is sent to the diner** notifying them that their booking was accepted and a quote is coming
2. The diner has no way to know on-platform that their inquiry was accepted
3. If the chef never sends a quote (intends to confirm directly), the diner is left in the dark

This is a **silent failure mode** — the system looks like it's working from the chef side, but the diner gets no feedback.

### User Story

**As a** diner
**I want** to be notified when my booking inquiry is accepted
**So that** I know the chef is working on a quote and what to expect next

**Currently:** Chef accepts inquiry → booking created → diner receives nothing until quote email arrives (if Resend key is configured).

### Scope

**In:**
- When chef accepts an inquiry (PATCH `/api/inquiries`), send a "Booking Accepted — Quote Coming" email to the diner
- This is distinct from the `sendBookingConfirmedEmail` (which fires when booking is fully confirmed with payment)
- Non-blocking — email failure does not roll back the booking creation

**Out:**
- Full booking confirmation email (future, after payment integration)
- SMS notifications

### Acceptance Criteria

- [ ] Diner receives email when chef accepts their inquiry
- [ ] Email explains: booking was accepted, chef will send a quote within X days
- [ ] Email failures do not cause booking creation to fail
- [ ] Build passes

### Owner
Backend (add email call in PATCH `/api/inquiries` acceptance branch)

---

## Priority Ranking

| # | Opportunity | Priority | Effort | Impact | Owner | Blocked By |
|---|------------|----------|--------|--------|-------|------------|
| 1 | Structured Dietary Preferences | **P1** | Medium | High — better UX for chefs and diners | Frontend + Backend | None |
| 2 | Inquiry Confirmation Email | **P1** | Low | High — trust and completion rate | Backend | RESEND_API_KEY + domain verification |
| 3 | Inquiry Modal Guest Info | P2 | Low | Medium — faster chef decisions | Frontend | None |
| 4 | Guest Booking Tracking Page | P2 | Low | Medium — reduces support burden | Frontend + Backend | None |
| 5 | Booking Acceptance Email | P2 | Low | Medium — closes silent failure mode | Backend | RESEND_API_KEY |

---

## Fred Actions Still Needed

| Item | Priority | Impact | Age |
|------|----------|--------|-----|
| RESEND_API_KEY | P0 | All transactional email dead in production | 130+ hours |
| Verify FROM_EMAIL domain | P0 | Emails land in spam even when key is configured | — |
| STRIPE_SECRET_KEY | P0 | No payment processing — cannot launch | Unknown |

**RESEND:** Get free key at https://resend.com, add DNS records for `maison-des-chefs.com` to verify domain, or use Resend's default `onboarding@resend.dev` domain for testing.

---

## Backlog (Unstarted Tasks)

| ID | Task | Priority | Owner | Notes |
|----|------|----------|-------|-------|
| MAI-2620 | Structured Dietary Preference Capture | P1 | Frontend + Backend |5 opportunities identified |
| MAI-2593 | Chef Recruitment CTA | Medium | Frontend | Nav + footer links, unstarted |
| MAI-2464 | Growth Optimization | Medium | Growth Marketer | Ongoing |
| MAI-2447 | Booking Form Micro-Interactions | Medium | Growth Marketer | Days |
| MAI-2410 | Availability Status Badges | Medium | Frontend | Done in frontend |

---

## Notes

- The `sendInquiryConfirmationEmail` function is a **low-hanging fruit** — it exists, is complete, and just needs a1-line call added to the POST handler
- The booking acceptance email (Opportunity #4) is a separate email from the booking confirmed email — the former notifies of acceptance and upcoming quote; the latter fires after payment confirmation
- MAI-2628's Opportunity #4 (Chef Revenue Dashboard) was not re-examined — it remains P3 and valid

---

*Generated by Product Manager — MAI-2643*
