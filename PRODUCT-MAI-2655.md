# Product Opportunity Discovery — MAI-2655

**Autopilot Run:** 2026-06-07 04:00 UTC
**Analyst:** Product Manager

---

## Executive Summary

This run verified the status of MAI-2650's opportunities and found **all3 remain unbuilt**. One new gap was identified: the public inquiry tracking page (`/inquiry/[id]`) does not display booking information after an inquiry is accepted, leaving diners without visibility into their confirmed booking. The critical blockers (RESEND_API_KEY, STRIPE_SECRET_KEY) remain Fred's action.

---

## MAI-2650 Opportunity Status

| Opportunity | Priority | Status | Notes |
|-------------|----------|--------|-------|
| Diners can't see confirmed bookings in dashboard | P2 | ❌ **Unbuilt** | Bookings page still queries only `diner_id`, guest bookings invisible |
| In-Platform Messaging | P2 | ❌ **Unbuilt** | No messages table or API |
| Quote Expiration Notifications | P2 | ❌ **Unbuilt** | Blocked by RESEND_API_KEY |

**All 3 opportunities from MAI-2650 remain unimplemented.** No new code commits since ce20369 (MAI-2644b).

---

## New Opportunity #1: Inquiry Tracking Page Goes Dark After Acceptance (P2)

### Problem Statement

When a chef accepts an inquiry, a booking is created in the database, but the diner visiting `/inquiry/[id]` sees no change in their status. The page only shows inquiry fields — it has no awareness of the resulting booking. The diner:
- Sees "Pending" status indefinitely (page never updates to reflect acceptance)
- Has no link to their booking or quote
- Cannot see quote amount, message, or valid-until date
- Must wait for an email to know what happened (which requires RESEND_API_KEY)

**Root cause:** The inquiry detail page (`/inquiry/[id]/page.tsx`) fetches only from the `inquiries` table. It has no logic to check for an associated booking or to display booking/quote data.

### User Story

**As a** diner who submitted an inquiry
**I want** to see my booking status and quote details on the inquiry tracking page
**So that** I know when the chef has responded and what the quote is

**Currently:** Accepted inquiries silently create bookings. The diner's only path to seeing the booking is either: (a) an email that requires RESEND_API_KEY, or (b) creating an account and checking `/dashboard/bookings` — but that won't work because `diner_id` is null for guest inquiries (see MAI-2650 Opportunity #1).

### Scope

**In:**
- Inquiry detail page fetches associated booking by matching `inquiry_date`, `chef_id`, and `email` (or `diner_id` if set)
- When a booking exists for the inquiry, show booking card with:
  - Booking status (pending/confirmed)
  - Quote amount (if `quote_status` is set)
  - Quote message (if set)
  - Quote valid-until (if set)
  - Accept/Decline quote buttons (if `quote_status === 'pending'`)
- Link to create an account if diner wants to track future bookings

**Out:**
- Authentication on the inquiry page (remains unauthenticated/public)
- Full booking management on the inquiry page (send to `/dashboard/bookings` for that)
- Changes to booking creation logic

### Acceptance Criteria

- [ ] After inquiry is accepted, `/inquiry/[id]` shows booking card with status
- [ ] Quote amount, message, and valid-until are visible when chef sends a quote
- [ ] Diner can accept/decline quote directly from inquiry page without logging in
- [ ] Page remains functional for pending inquiries (no regression)
- [ ] Build passes

### Dependencies
None — reads existing booking data

### Owner
Frontend (inquiry/[id] page enhancement)

---

## Opportunity #2: Guest Booking Linking (MAI-2650 #1 — Still Unbuilt) (P2)

### Problem Statement

(Re-stated from MAI-2650 — still unbuilt)

When a guest submits an inquiry, `diner_id` is null. When the chef accepts it and creates a booking, that booking also has `diner_id: null`. If the guest later creates an account (same email), their bookings are invisible in `/dashboard/bookings` because the query filters by `diner_id`.

### Scope

**In:**
- After booking creation in PATCH `/api/inquiries`, add a post-creation step:
  - Look up profile by `booking.email`
  - If found, update `booking.diner_id = profile.id`
- Alternative: Add a "Link to my account" button on `/inquiry/[id]` for logged-in users whose email matches the booking

**Out:**
- Full guest-to-auth migration system
- Changes to inquiry submission flow

### Acceptance Criteria

- [ ] Authenticated diner sees bookings created from their guest inquiries
- [ ] "Book Again" works for linked bookings
- [ ] Build passes

### Dependencies
None

### Owner
Backend (PATCH `/api/inquiries` handler)

---

## Opportunity #3: In-Platform Messaging (MAI-2650 #2 — Still Unbuilt) (P2)

### Problem Statement

(Re-stated from MAI-2650 — still unbuilt)

Chef and diner communicate via email after booking confirmation. No in-platform history, no reply mechanism, no connection to booking record.

### Scope

**In:**
- `messages` table: id, booking_id, sender_id, content, created_at
- `GET /api/bookings/[id]/messages` and `POST /api/bookings/[id]/messages`
- Messaging UI in booking detail view on both chef and diner dashboards
- Simple text-based messaging (no attachments for MVP)

**Out:**
- Push notifications, WebSocket real-time, read receipts, file attachments

### Acceptance Criteria

- [ ] Both chef and diner can send/receive messages on confirmed bookings
- [ ] Messages persist on re-visits
- [ ] Build passes

### Dependencies
None

### Owner
Backend (table + API) + Frontend (messaging UI)

---

## Opportunity #4: Quote Expiration Notifications (MAI-2650 #3 — Still Unbuilt) (P2)

### Problem Statement

(Re-stated from MAI-2650 — still unbuilt)

Silent revenue leak: quotes expire without notification, slots remain "reserved" in chef's mental model, diners lose their booking without knowing.

### Scope

**In:**
- "Quote Expiring Soon" email 24h before expiration (to diner)
- "Quote Expired" email to both diner and chef
- Availability slot freed on expiration
- Chef dashboard shows expired quotes with "Resend Quote" option

**Out:**
- Automated follow-up sequences, SMS, auto re-send

### Dependencies
RESEND_API_KEY (Fred's action)

### Owner
Backend

---

## Priority Ranking

| # | Opportunity | Priority | Effort | Impact | Owner | Blocked By |
|---|------------|----------|--------|--------|-------|------------|
| 1 | Inquiry Tracking Page → Booking Visibility | **P2** | Low | High — goes dark after acceptance | Frontend | None |
| 2 | Guest Booking Linking | **P2** | Low | High — broken auth UX | Backend | None |
| 3 | In-Platform Messaging | **P2** | Medium | Medium — stickiness | Backend + Frontend | None |
| 4 | Quote Expiration Notifications | **P2** | Medium | Medium — revenue recovery | Backend | RESEND_API_KEY |

---

## Critical Blocker (Fred's Action Required — 190+ Hours)

| Item | Priority | Impact | Age |
|------|----------|--------|-----|
| RESEND_API_KEY | P0 | All transactional email dead in production | 190+ hours |
| STRIPE_SECRET_KEY | P0 | No payment processing — cannot launch | Unknown |

---

## Backlog

| ID | Task | Priority | Owner | Notes |
|----|------|----------|-------|-------|
| MAI-2655a | Inquiry page booking card + quote accept/decline | P2 | Frontend | **NEW** — this run |
| MAI-2650a | Link guest bookings to authenticated diners | P2 | Backend | MAI-2650 #1, still unbuilt |
| MAI-2650b | In-platform messaging for confirmed bookings | P2 | Backend + Frontend | MAI-2650 #2, still unbuilt |
| MAI-2650c | Quote expiration notifications | P2 | Backend | MAI-2650 #3, blocked by RESEND_API_KEY |
| MAI-2593 | Chef Recruitment CTA | Medium | Frontend | Nav + footer links, unstarted |

---

## Notes

- The platform's core booking flow is functional, but three critical UX gaps remain from MAI-2650
- The new Opportunity #1 (inquiry page booking visibility) is the most immediately impactful — it directly affects the diner experience after a chef accepts their inquiry
- RESEND_API_KEY remains the hard blocker for all email-dependent features

---

*Generated by Product Manager — MAI-2655*
