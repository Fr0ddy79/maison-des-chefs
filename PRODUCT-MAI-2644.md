# Product Opportunity Discovery — MAI-2644

**Autopilot Run:** 2026-06-06 20:00 UTC (America/New_York)
**Analyst:** Product Manager

---

## Executive Summary

Building on MAI-2643's findings, this run verified implementation progress and identified **2 remaining gaps** plus **1 new opportunity**. The inquiry confirmation email (Opportunity #1 from MAI-2643) is now implemented. The booking acceptance email (Opportunity #4) was already implemented. Two P2 opportunities from MAI-2643 remain unaddressed, and a new quote expiration gap was identified.

---

## Implementation Status

| Feature | MAI-2643 Status | MAI-2644 Status | Notes |
|---------|-----------------|----------------|-------|
| Inquiry confirmation email to diner | ❌ Not called | ✅ **Implemented** | `sendInquiryConfirmationEmail` now called in POST handler |
| Booking acceptance email | ⚠️ Identified | ✅ **Implemented** | `sendBookingConfirmedEmail` fires when chef accepts inquiry |
| Inquiry modal guest info (guest_count, inquiry_time) | ⚠️ Identified | ❌ **Still missing** | `fetchInquiries()` doesn't select these fields; modal doesn't display |
| Guest booking tracking page (`/inquiry/[id]`) | ⚠️ Identified | ❌ **Still missing** | Route doesn't exist |
| Structured dietary preference capture | ❌ Missing | ✅ **Implemented** | Checkboxes in booking form, stored in inquiry, displayed in chef modal |
| Quote notification email | ✅ Working | ✅ **Working** | `sendQuoteNotificationEmail` fires when chef sends quote |

---

## Opportunity #1: Guest Booking Status Tracking Without Account (P2)

### Problem Statement

Re-stated from MAI-2643 (Opportunity #3) — still not built after 4 hours. Guest diners (unauthenticated) can submit booking inquiries via `/book`, but have **no way to track their booking status** without creating an account. They must rely entirely on email, which:
1. Requires RESEND_API_KEY to be configured (currently a placeholder)
2. Land in spam if FROM_EMAIL domain is unverified
3. Doesn't allow diners to check status on demand

This creates a broken user experience: "I submitted my inquiry — what happens next?"

### User Story

**As a** guest diner (no account)
**I want** to visit `/inquiry/[id]` to see my booking status
**So that** I know if the chef has confirmed without hunting through email

**Currently:** No such page exists. Guest submits → waits passively → may assume it failed.

### Root Cause

The inquiry submission returns the `inquiry_id` in the response, but there's no public page to view inquiry status. The diner dashboard (`/dashboard/bookings`) requires authentication.

### Scope

**In:**
- `/inquiry/[id]` page — publicly accessible (no auth required)
- Fetch inquiry by ID from `inquiries` table
- Display: chef name, requested date, status badge (pending/confirmed/rejected), guest count
- Status updates when chef accepts/rejects (polling on page load)
- "Contact Chef" mailto link
- Clean, minimal UI — mobile-friendly

**Out:**
- Full guest account system
- In-platform messaging
- Password reset flows

### Acceptance Criteria

- [ ] `/inquiry/[id]` accessible without login
- [ ] Shows inquiry status, chef name, date, guest count
- [ ] Status updates reflect chef's accept/reject action
- [ ] 404 state for invalid IDs with friendly message
- [ ] Build passes

### Dependencies
None (reads from existing `inquiries` table)

### Owner
Frontend (new page) + lightweight Backend (optional API route to fetch inquiry by ID for better error handling)

---

## Opportunity #2: Inquiry Modal Missing Guest Information (P2)

### Problem Statement

Re-stated from MAI-2643 (Opportunity #2) — still not implemented after 4 hours. The `fetchInquiries()` query in the chef dashboard explicitly **excludes** `guest_count` and `inquiry_time`:

```typescript
// src/app/dashboard/chef/page.tsx — fetchInquiries()
.select(`id, email, message, inquiry_date, status, created_at, service_id, services:service_id (title)`)
```

The inquiry detail modal doesn't display these fields either. Chefs must guess or ask diners for:
- How many guests are expected
- What time they want the service to start

This creates friction in the accept/decline decision and may lead to underbidding or overbidding on price.

### User Story

**As a** chef
**I want** to see guest count and requested time in the inquiry modal
**So that** I can quickly assess fit before accepting

**Currently:** Must cross-reference or ask the diner. Creates friction.

### Root Cause

The Supabase query doesn't select these columns, and the modal doesn't render them.

### Scope

**In:**
- Add `guest_count` and `inquiry_time` to the `fetchInquiries()` Supabase select query
- Display both fields in the inquiry detail modal (within the existing modal structure)
- Fields to add:
  - "Party Size: X guests" 
  - "Requested Time: HH:MM" (if inquiry_time is set)

**Out:**
- Changes to the booking flow or other dashboard sections
- Any backend schema changes (columns already exist via migration 013)

### Acceptance Criteria

- [ ] Inquiry detail modal shows "X guests" and "Requested time: HH:MM"
- [ ] Data comes from `inquiries` table columns (not calculated)
- [ ] Build passes

### Owner
Frontend (chef dashboard page.tsx) — ~5 line change to query + ~10 lines in modal

---

## Opportunity #3: Quote Expiration Silent Failure (P3)

### Problem Statement

Newly identified gap. When a chef sends a quote, the diner has a validity window (default 7 days). If the diner doesn't respond:
- The quote expires silently (`quote_status: 'expired'`)
- Neither party is notified
- The booking sits in limbo
- The chef may wait indefinitely, not knowing to follow up
- The availability slot remains booked unnecessarily

This is a **revenue leak** — bookings that could be recovered are lost to silent expiration.

### User Story

**As a** chef
**I want** to be notified when a quote I sent has expired without response
**So that** I can follow up with the diner or free up my availability

**As a** diner
**I want** to receive a reminder before my quote expires
**So that** I don't lose my booking slot accidentally

### Root Cause

No expiration notification emails exist. The system only sends emails on:
- Inquiry submission (confirmation to diner)
- Inquiry acceptance (confirmation to diner)
- Quote sent (to diner)
- Quote accepted/declined (to both)

Missing: quote expiration warning (24h before) and expiration notification (when it happens).

### Scope

**In:**
- When a quote is within 24h of expiration, send a "Quote Expiring Soon" email to the diner
- When a quote expires, send a "Quote Expired" email to both diner and chef
- Chef's availability slot is freed when quote expires (currently it IS freed on decline, but not on expiration)

**Out:**
- Automated follow-up sequences
- SMS notifications
- Re-sending of quotes

### Acceptance Criteria

- [ ] Diner receives reminder email 24h before quote expires
- [ ] Chef receives email when their quote expires
- [ ] Availability slot is freed when quote expires (currently only on explicit decline)
- [ ] Email failures are non-blocking

### Dependencies
RESEND_API_KEY (Fred's action)

### Owner
Backend (new email functions + cron job or on-demand check)

---

## Priority Ranking

| # | Opportunity | Priority | Effort | Impact | Owner | Blocked By |
|---|------------|----------|--------|--------|-------|------------|
| 1 | Guest Booking Status Page | **P2** | Low | Medium — reduces support burden, enables guest UX | Frontend + Backend | None |
| 2 | Inquiry Modal Guest Info | **P2** | Low | Medium — faster chef decisions, better UX | Frontend | None |
| 3 | Quote Expiration Notifications | **P3** | Medium | Medium — recovers potentially lost bookings | Backend | RESEND_API_KEY |

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
| MAI-2644 | Guest Booking Status Page | P2 | Frontend + Backend | New opportunity |
| MAI-2644b | Inquiry Modal Guest Info | P2 | Frontend | New opportunity |
| MAI-2644c | Quote Expiration Notifications | P3 | Backend | New opportunity |
| MAI-2593 | Chef Recruitment CTA | Medium | Frontend | Nav + footer links, unstarted |
| MAI-2464 | Growth Optimization | Medium | Growth Marketer | Ongoing |

---

## Notes

- The inquiry confirmation email was successfully implemented since MAI-2643 — the `sendInquiryConfirmationEmail` function is now being called in the POST handler
- Dietary preference capture (checkboxes in booking form) is now fully implemented and displayed in the chef dashboard inquiry modal
- The two P2 opportunities from MAI-2643 remain unaddressed after 4 hours — they are low-effort, high-impact improvements that should be prioritized
- Quote expiration handling is a new gap that wasn't identified in previous runs — it represents a potential revenue leak

---

*Generated by Product Manager — MAI-2644*