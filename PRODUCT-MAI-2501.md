# Product Opportunity Discovery — MAI-2501

**Autopilot Run:** 2026-06-04 00:00 UTC
**Analyst:** Product Manager

---

## Executive Summary

Core booking flow is **functionally complete and working**. The platform supports end-to-end guest checkout (browse → inquiry → chef accept → quote → diner accept). However:

1. **MAI-2423 bug is confirmed FIXED** — `total_price` correctly calculates as `price_per_person × guest_count`
2. **Resend API key is still placeholder** — all transactional emails silently fail (blocker on Fred)
3. **Three opportunities remain** for improving conversion, trust, and operational visibility

---

## Opportunity #1: Email Delivery is Silently Failing (P0 — Blocked on Fred)

### Problem Statement

`RESEND_API_KEY` in `.env.local` remains `your_resend_api_key_here`. Every transactional email fails silently without crashing the user-facing flow.

### User Impact

| Email | Recipient | Current State |
|-------|-----------|---------------|
| Inquiry confirmation | Diner | ❌ Silently fails |
| New inquiry notification | Chef | ❌ Silently fails |
| Booking confirmed | Diner | ❌ Silently fails |
| Quote available | Diner | ❌ Silently fails |
| Application confirmation | Applicant | ❌ Silently fails |
| Application received | Admin | ❌ Silently fails |

### What Works When

Chefs receive inquiries via the dashboard UI (no email needed). Diners can see quote status in their booking dashboard (no email needed). **But trust signals are missing** — no confirmation email after submitting an inquiry.

### Action Required (Fred)

Replace `RESEND_API_KEY=your_resend_api_key_here` in `.env.local` with a real Resend API key from [resend.com](https://resend.com).

### Scope

**In:**
- Valid Resend API key in `.env.local`
- Verify emails send correctly (check `/api/inquiry` logs for `[Email]` warnings)

**Out:**
- Email template redesign
- Email analytics/dashboard
- Multiple email providers

### Acceptance Criteria

- [ ] Submit inquiry → diner receives confirmation email within 60s
- [ ] Submit inquiry → chef receives notification email within 60s
- [ ] Chef accepts inquiry → diner receives booking confirmation email

### Metrics

- **Primary:** Email delivery rate (target: 99%)
- **Secondary:** "Did my request go through?" support questions

### Open Questions

- Should we log email failures to a database table for debugging?
- Do we need separate "from" email addresses for diner vs. chef notifications?

---

## Opportunity #2: Improve Diner Trust After Inquiry Submission (P1)

### Problem Statement

After a diner submits an inquiry via `/book`, they see a success screen with "What Happens Next" steps. However, **no email confirmation arrives** (see Opportunity #1). Diners may refresh the page, close the tab, or wonder if their request actually went through.

### User Story

**As a** diner
**I want to** receive an email confirmation after submitting my booking inquiry
**So that** I trust my request was received and know what to expect next

**Currently:** Diner sees success UI but receives no email. If email fails silently, diner has no proof of submission.

### Scope

**In:**
- Email confirmation with: chef name, requested date/time, diner email, "chef will respond within 24-48h"
- Non-blocking (inquiry succeeds even if email fails)

**Out:**
- Branded email templates (future)
- Email open/click tracking (future)

### Acceptance Criteria

- [ ] Diner receives confirmation email within 60 seconds of inquiry submission
- [ ] Email includes: chef name, requested date, guest count, diner email
- [ ] Email clearly explains the next steps (chef confirmation within 24-48h)
- [ ] Email failure does not cause inquiry submission to fail

### Metrics

- **Primary:** % of inquiries that trigger a delivered confirmation email
- **Secondary:** Diner re-submitting same inquiry (sign of no confirmation received)

### Open Questions

- What sender name should appear? ("Maison des Chefs" <noreply@...>?)
- Should the email include a direct link to the booking dashboard?

---

## Opportunity #3: Admin Dashboard — Revenue Calculation Accuracy (P2)

### Problem Statement

The admin dashboard (`/admin`) shows a "Total Revenue" KPI. The code fetches `SUM(total_price)` from the `bookings` table where `status = 'completed'`. However:

1. Bookings created from accepted inquiries have `status = 'pending'` or `'confirmed'`, not `'completed'`
2. The `total_price` field is correctly calculated (fixed in MAI-2423)
3. But revenue only counts `'completed'` bookings — this may severely undercount actual revenue

### User Story

**As an** admin
**I want** the revenue metric to reflect confirmed + completed bookings
**So that** I can accurately track platform business health

### Scope

**In:**
- Revenue = SUM of bookings where status IN ('confirmed', 'completed') and quote_status = 'accepted'
- Or: Revenue = SUM of bookings with accepted quotes and confirmed/pending status
- Clarify which bookings count as "revenue" (accepted quotes or completed events?)

**Out:**
- Full financial reporting dashboard (future)
- Payment processing integration (future)

### Acceptance Criteria

- [ ] Admin dashboard revenue reflects confirmed bookings (accepted quotes)
- [ ] Revenue calculation is documented in code comments
- [ ] Frontend displays "Confirmed Revenue" vs "Pending Revenue" separately

### Metrics

- **Primary:** Revenue accuracy vs. actual accepted quotes
- **Secondary:** Admin confidence in dashboard numbers

### Open Questions

- Should revenue only count `completed` events (actual dining happened)?
- Or should revenue count `confirmed` bookings (quotes accepted, event pending)?
- Do we need to track "potential revenue" vs "realized revenue"?

---

## What's Working (Confirmed)

| Feature | Status | Location |
|---------|--------|----------|
| Guest checkout flow | ✅ Working | `/book` multi-step form |
| Inquiry submission | ✅ Working | `/api/inquiry` POST |
| Chef inquiry dashboard | ✅ Working | Chef dashboard → "Booking Inquiries" |
| Accept/reject inquiry | ✅ Working | `/api/inquiries` PATCH |
| Booking creation on accept | ✅ Working | Uses `price_per_person × guest_count` |
| Quote modal in chef dashboard | ✅ Working | Send Quote button + modal |
| Quote acceptance by diner | ✅ Working | `/api/bookings/[id]/accept-quote` |
| Diner booking dashboard | ✅ Working | `/dashboard/bookings` |
| Quote accept/decline UI | ✅ Working | Accept Quote / Decline buttons |
| Analytics tracking | ✅ Working | `/api/analytics/booking-form/viewed` |
| Profile completeness prompt | ✅ Working | First-login chef setup prompt |
| Availability management | ✅ Working | Add/remove slots in chef dashboard |

---

## What's NOT Working (Known Issues)

| Item | Status | Fix Required |
|------|--------|-------------|
| Resend API key | ❌ Placeholder | Fred provides key |
| Email sending | ❌ Silent fail | Depends on Resend key |
| Admin revenue calculation | ⚠️ Under-reported | Clarify revenue definition |

---

## Priority Ranking

| # | Opportunity | Priority | Effort | Owner |
|---|------------|----------|--------|-------|
| 1 | Resend API key configuration | P0 | Low | Fred (needs key) |
| 2 | Diner trust email confirmation | P1 | Low | Backend (key enables it) |
| 3 | Admin revenue calculation accuracy | P2 | Low | Backend (clarify logic) |

---

## Technical Notes

**Email infrastructure is fully in place:**
- `src/lib/email/resend.ts` — Resend client setup
- `src/lib/email/sendInquiryConfirmationEmail.ts` — Confirmation email function
- `src/lib/email/sendNewInquiryNotificationToChef.ts` — Chef notification function
- `src/lib/email/sendBookingConfirmedEmail.ts` — Booking confirmation function
- All calls are non-blocking (`.catch()` wrapper) — failures don't affect user-facing success

**The only missing piece is the API key.**

---

## Changes Since MAI-2493

| Item | MAI-2493 | Current Reality |
|------|----------|-----------------|
| `total_price` calculation bug | Present | ✅ **FIXED** (confirmed in code) |
| Resend API key | Placeholder | ❌ Still placeholder |
| Email sending | Silent fail | ❌ Still failing (no key) |
| Quote workflow | Working | ✅ Confirmed working |
| Inquiry → booking flow | Working | ✅ Confirmed working |
| Admin revenue metric | "Revenue" shown | ⚠️ May undercount (only `completed` status) |

---

*Generated by Product Manager — MAI-2501*