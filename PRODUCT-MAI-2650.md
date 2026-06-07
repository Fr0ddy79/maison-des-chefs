# Product Opportunity Discovery — MAI-2650

**Autopilot Run:** 2026-06-07 00:00 UTC
**Analyst:** Product Manager

---

## Executive Summary

This run analyzed the current product state following MAI-2644 and identified **2 new opportunities** while verifying that all previously identified P2 features have been implemented. The platform's core booking flow is now functional end-to-end (inquiry → acceptance → quote → confirmation). Two UX gaps remain for authenticated diners and one new revenue protection opportunity was identified.

---

## Implementation Status (vs MAI-2644)

| Feature | MAI-2644 Status | MAI-2650 Status | Notes |
|---------|-----------------|-----------------|-------|
| Guest Booking Status Page (`/inquiry/[id]`) | Identified | ✅ **Implemented** | Public page for unauthenticated tracking |
| Inquiry Modal Guest Info | Identified | ✅ **Implemented** | `guest_count` and `inquiry_time` visible in modal |
| Quote Expiration Notifications | Identified | ⚠️ **Blocked** | Requires RESEND_API_KEY |
| Confirmation email to diner | Implemented | ✅ **Working** | `sendInquiryConfirmationEmail` called |
| Booking acceptance email | Implemented | ✅ **Working** | `sendBookingConfirmedEmail` fires on acceptance |
| Dietary preference capture | Implemented | ✅ **Working** | Checkboxes + stored in inquiry |
| Quote notification email | Working | ✅ **Working** | `sendQuoteNotificationEmail` fires |

---

## Opportunity #1: Diners Cannot See Their Own Confirmed Bookings in Dashboard (P2)

### Problem Statement

Authenticated diners (those who sign up after submitting an inquiry) **cannot see their confirmed bookings** in `/dashboard/bookings`. The bookings page queries by `diner_id`:

```typescript
// /dashboard/bookings/page.tsx
const { data: bookingsData } = await supabase
  .from('bookings')
  .select(...)
  .eq('diner_id', authUser.id)  // ← Requires diner_id to be set
```

However, when a booking is created from an accepted inquiry, `diner_id` is null because the original inquiry was submitted by a guest (unauthenticated). The booking stores `inquiry.diner_id` which is null for guest submissions.

**Result:** A diner who submits an inquiry as a guest, then later creates an account, will have their confirmed booking (created from the accepted inquiry) invisible in their own dashboard. They can only track it via the public `/inquiry/[id]` link in their email.

### User Story

**As a** diner who created an account
**I want** to see all my bookings in `/dashboard/bookings`
**So that** I can track confirmed bookings, accept/decline quotes, and leave reviews in one place

**Currently:** Bookings created from guest inquiries show `diner_id: null`, making them invisible to authenticated diners.

### Root Cause

1. Guest submits inquiry via `/book` without authentication
2. Inquiry is created with `diner_id: null` (no auth user)
3. Chef accepts inquiry → creates booking with `diner_id: null`
4. Diner creates account (same email) → gets `auth_user.id`
5. Diner visits `/dashboard/bookings` → queries by their `auth_user.id` → finds nothing

### Scope

**In:**
- After a booking is created from an accepted inquiry, if `booking.diner_id` is null AND `booking.email` matches an authenticated user's email, update `booking.diner_id` to link the booking
- Alternatively: add a "Link this booking to my account" button on the `/inquiry/[id]` page that appears when the diner is logged in but the booking has no `diner_id`
- Best approach: In the PATCH `/api/inquiries` handler where the booking is created, add a post-creation step that looks up the user by email and updates `diner_id` if found

**Out:**
- Full guest-to-authenticated account migration system
- Automatic email matching without user action
- Changes to inquiry submission flow

### Acceptance Criteria

- [ ] Authenticated diner can see bookings created from their guest inquiries in `/dashboard/bookings`
- [ ] Bookings with `diner_id: null` get linked when the diner's email matches `booking.email`
- [ ] "Book Again" works for linked bookings
- [ ] Review submission works for linked bookings
- [ ] Build passes

### Dependencies
None — the `email` field already exists on bookings (passed from inquiry)

### Owner
Backend (PATCH `/api/inquiries` handler) + Frontend (dashboard/bookings verification)

---

## Opportunity #2: No In-Platform Messaging Between Chef and Diner (P2)

### Problem Statement

After a booking is confirmed, chef and diner communicate entirely via email. This creates several issues:
1. Email threads become disconnected from the booking record
2. Important details (dietary restrictions, setup notes, timing) get lost in email
3. No in-platform history for dispute resolution
4. Platform can't notify users of messages (unless email is configured)

The only current communication is the chef sending a quote message (stored in `bookings.quote_message`), but there's no reply mechanism.

### User Story

**As a** diner with a confirmed booking
**I want** to send a message to my chef through the platform
**So that** I can coordinate menu preferences, timing, or special requests without leaving the platform

**As a** chef
**I want** to receive and reply to diner messages in the platform
**So that** all communication is stored with the booking record

### Scope

**In:**
- Add a `messages` table (id, booking_id, sender_id, content, created_at)
- Add messaging UI to `/dashboard/bookings` detail view (expandable section per booking)
- Add `GET /api/bookings/[id]/messages` and `POST /api/bookings/[id]/messages`
- Show message thread on both chef and diner dashboards
- Simple text-based messaging (no attachments, no rich media for MVP)

**Out:**
- Push notifications
- Real-time chat (WebSocket)
- Read receipts
- File attachments
- Message deletion/editing

### Acceptance Criteria

- [ ] Both chef and diner can send/receive messages on a confirmed booking
- [ ] Messages persist and are visible on subsequent visits
- [ ] No authentication required to view (sender_id links to profiles)
- [ ] Build passes

### Dependencies
None (new table + new API routes)

### Owner
Backend (new table + API) + Frontend (messaging UI in booking detail)

---

## Opportunity #3: Quote Expiration Revenue Leak (P3 → P2 upgrade)

### Problem Statement

Re-stated from MAI-2644 (Opportunity #3) — still not implemented. When a quote expires without response:
- Chef doesn't know their slot is released
- Diner doesn't know their booking request failed
- Both may be waiting for the other to act
- Availability slot remains "reserved" in chef's mental model

This is a **revenue leak** — confirmed bookings that could happen are lost to silent expiration.

### User Story

**As a** chef
**I want** to be notified when a quote I sent has expired
**So that** I can follow up or free up my mental availability

**As a** diner
**I want** to be notified before my quote expires
**So that** I don't lose my slot accidentally

### Scope

**In:**
- "Quote Expiring Soon" email 24h before expiration (to diner)
- "Quote Expired" email to both diner and chef
- Availability slot freed on expiration (currently only on explicit decline)
- Chef dashboard shows expired quotes with "Resend Quote" option

**Out:**
- Automated follow-up sequences
- SMS notifications
- Re-sending of quotes (manual only)

### Acceptance Criteria

- [ ] Diner receives reminder email 24h before quote expires
- [ ] Chef receives email when their quote expires
- [ ] Availability slot is freed when quote expires
- [ ] Email failures are non-blocking
- [ ] Build passes

### Dependencies
RESEND_API_KEY (Fred's action)

### Owner
Backend (email functions + slot cleanup logic)

---

## Priority Ranking

| # | Opportunity | Priority | Effort | Impact | Owner | Blocked By |
|---|------------|----------|--------|--------|-------|------------|
| 1 | Diners can't see their own confirmed bookings | **P2** | Low | High — broken UX for guest-to-auth transitions | Backend + Frontend | None |
| 2 | In-Platform Messaging | **P2** | Medium | Medium — better coordination, stickiness | Backend + Frontend | None |
| 3 | Quote Expiration Notifications | **P2** | Medium | Medium — recovers potentially lost bookings | Backend | RESEND_API_KEY |

---

## Fred Actions Still Needed

| Item | Priority | Impact | Age |
|------|----------|--------|-----|
| RESEND_API_KEY | P0 | All transactional email dead in production | 170+ hours |
| STRIPE_SECRET_KEY | P0 | No payment processing — cannot launch | Unknown |

---

## Backlog (Unstarted Tasks)

| ID | Task | Priority | Owner | Notes |
|----|------|----------|-------|-------|
| MAI-2650a | Link guest bookings to authenticated diners | P2 | Backend | New opportunity |
| MAI-2650b | In-platform messaging for confirmed bookings | P2 | Backend + Frontend | New opportunity |
| MAI-2650c | Quote expiration notifications | P2 | Backend | Blocked by RESEND_API_KEY |
| MAI-2593 | Chef Recruitment CTA | Medium | Frontend | Nav + footer links, unstarted |

---

## Notes

- All MAI-2644 P2 opportunities have been implemented (Guest Booking Status Page + Inquiry Modal Guest Info)
- The platform is functionally complete for the MVP — the booking flow works end-to-end
- The remaining gaps are UX improvements and revenue protection features
- RESEND_API_KEY remains the critical blocker for all email-dependent features

---

*Generated by Product Manager — MAI-2650*