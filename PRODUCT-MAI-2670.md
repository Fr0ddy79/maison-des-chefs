# Product Opportunity Discovery — MAI-2670

**Autopilot Run:** 2026-06-07 08:00 America/New_York
**Analyst:** Product Manager

---

## Executive Summary

This run examined the current product state following MAI-2655 (04:00 UTC) and verified that the **guest booking linking is already implemented** in the PATCH `/api/inquiries` handler. The remaining highest-impact unbuilt opportunity is the **inquiry tracking page going dark after chef acceptance** — diners see no update after their inquiry becomes a booking with a quote.

---

## Verification: What's Already Built

| Feature | Status | Evidence |
|---------|--------|----------|
| Guest booking linking | ✅ **Implemented** | PATCH `/api/inquiries` lines 167-180 — matches `booking.email` to `profiles.email` and updates `diner_id` |
| Quote Expiration Follow-up | ✅ **Task Created** | MAI-2665 — blocked by RESEND_API_KEY |
| Inquiry confirmation email | ✅ **Implemented** | `sendInquiryConfirmationEmail` in inquiry route |
| Booking acceptance email | ✅ **Implemented** | `sendBookingConfirmedEmail` on PATCH `/api/inquiries` acceptance |
| Dietary restriction capture | ✅ **Implemented** | Checkboxes stored in `inquiries.dietary_restrictions` |
| Guest booking status page | ✅ **Implemented** | `/inquiry/[id]` — public page for tracking |
| Inquiry modal guest info | ✅ **Implemented** | `guest_count` + `inquiry_time` visible in modal |

---

## Opportunity #1: Inquiry Page Goes Dark After Booking Creation (P2)

### Problem Statement

When a chef accepts an inquiry, the PATCH `/api/inquiries` handler creates a booking and sends a confirmation email. However, the diner visiting `/inquiry/[id]` sees **no change** — the page fetches only the `inquiries` table and displays the same pending status card indefinitely. The diner has no way to know:

- Whether the chef accepted or declined
- What quote was sent (amount, message, valid-until)
- That a booking record exists

The only notification path is email, which requires RESEND_API_KEY (currently a placeholder).

**Root cause:** The inquiry detail page (`/inquiry/[id]/page.tsx`) has no logic to:
1. Check if a booking was created from this inquiry
2. Display quote data (amount, message, valid-until)
3. Allow the diner to accept/decline the quote from the public page

### User Story

**As a** diner who submitted an inquiry
**I want** to see my booking and quote status on `/inquiry/[id]`
**So that** I know whether the chef accepted and what the quote is — without needing email

**Currently:** The inquiry page shows only inquiry fields. After acceptance, it still says "Pending" with no booking or quote data.

### Scope

**In:**
- On `/inquiry/[id]` load, after fetching inquiry data, also fetch the associated booking by matching `booking_date = inquiry_date`, `chef_id`, and `email` (or `diner_id` if set)
- If a booking exists, display a **Booking Card** below the inquiry details:
  - Booking status (pending/confirmed/active)
  - Quote amount (if `quote_amount` is set)
  - Quote message (if set)
  - Quote valid-until (if set)
  - Accept/Decline buttons (if `quote_status === 'pending'`)
- Accept/Decline quote buttons call `/api/bookings/[id]/accept-quote` and `/api/bookings/[id]/decline-quote` respectively
- After accepting/declining, refresh the page state to reflect the new status

**Out:**
- Authentication requirement (page stays public/unauthenticated)
- Full booking management UI (send to `/dashboard/bookings` for authenticated users)
- Changes to booking creation logic
- Email notifications (already handled)

### Acceptance Criteria

- [ ] `/inquiry/[id]` shows booking card with status after chef accepts inquiry
- [ ] Quote amount, message, and valid-until display when chef has quoted
- [ ] Diner can accept or decline quote directly from the public inquiry page
- [ ] Page correctly shows "Confirmed" or "Declined" status after action
- [ ] No regression for pending inquiries (status badge still shows correctly)
- [ ] No regression for rejected inquiries
- [ ] Build passes (`npm run build`)

### Dependencies
None — reads existing booking data via Supabase

### Owner
Frontend (inquiry/[id] page enhancement)

### Technical Approach

The inquiry page already has `chef_id`, `inquiry_date`, and `email` from the inquiry fetch. To find the associated booking:

```typescript
// After fetching inquiry, look up the booking:
const { data: booking } = await supabase
  .from('bookings')
  .select('*')
  .eq('chef_id', inquiry.chef_id)
  .eq('booking_date', inquiry.inquiry_date)
  .or(`email.ilike.${inquiry.email},diner_id.eq.${inquiry.diner_id || 'null'}`)
  .single()
```

Or use `inquiry.inquiry_time` for additional precision matching.

---

## Opportunity #2: In-Platform Messaging (P2) — Still Unbuilt

**Re-stated from MAI-2650** — no code changes since MAI-2655.

### Problem Statement
Chef and diner communicate via email after booking confirmation. No in-platform history, no reply mechanism, all communication siloed outside the platform.

### Scope

**In:**
- `messages` table: id, booking_id, sender_id, content, created_at
- `GET /api/bookings/[id]/messages` and `POST /api/bookings/[id]/messages`
- Messaging UI in booking detail view on both chef and diner dashboards
- Simple text-based messaging (no attachments for MVP)

**Out:**
- Push notifications, WebSocket real-time, read receipts, file attachments

### Dependencies
None

### Owner
Backend + Frontend

---

## Critical Blocker (Fred's Action Required — 200+ Hours)

| Item | Priority | Impact | Age |
|------|----------|--------|-----|
| RESEND_API_KEY | P0 | All transactional email dead in production | 200+ hours |
| STRIPE_SECRET_KEY | P0 | No payment processing — cannot launch | Unknown |

---

## Backlog

| ID | Task | Priority | Owner | Status |
|----|------|----------|-------|--------|
| MAI-2670a | Inquiry page booking card + quote accept/decline | P2 | Frontend | Unbuilt |
| MAI-2650b | In-platform messaging | P2 | Backend + Frontend | Unbuilt |
| MAI-2665 | Quote expiration notifications | P2 | Backend | Blocked by RESEND_API_KEY |
| MAI-2593 | Chef Recruitment CTA | Medium | Frontend | Unstarted |

---

## Notes

- Guest booking linking (MAI-2650 Opportunity #1) is **already implemented** in PATCH `/api/inquiries` — no new task needed
- The inquiry page gap is the most immediately impactful unbuilt feature — it directly controls the post-acceptance diner experience
- All email-dependent features remain blocked on RESEND_API_KEY from Fred

---

*Generated by Product Manager — MAI-2670*