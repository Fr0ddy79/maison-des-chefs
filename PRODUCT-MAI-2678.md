# Product Opportunity Discovery — MAI-2678

**Autopilot Run:** 2026-06-07 12:00 America/New_York
**Analyst:** Product Manager

---

## Executive Summary

This run verified that **MAI-2665 (Quote Expiration Follow-up Notifications) was built** since MAI-2655. The three P2 opportunities from MAI-2650/MAI-2655 remain unbuilt: (1) inquiry page booking card, (2) guest booking linking, and (3) in-platform messaging. One new gap was identified: **the landing page booking form has no error state UI** — failed submissions (validation errors, network failures) show no user-facing message, silently failing the diner.

---

## MAI-2655 Opportunity Status

| Opportunity | Priority | Status | Notes |
|------------|----------|--------|-------|
| Inquiry page booking card + quote accept/decline | P2 | ❌ **Unbuilt** | `/inquiry/[id]` still shows "Pending" after acceptance |
| Guest booking linking | P2 | ❌ **Unbuilt** | `diner_id` stays null for guest inquiries; bookings invisible to authenticated diners |
| In-Platform Messaging | P2 | ❌ **Unbuilt** | No messages table or API |
| Quote Expiration Notifications | P2 | ✅ **Built** | MAI-2665 commit ce20369/61c735f |

---

## New Opportunity #1: Booking Form Has No Error State UI (P2)

### Problem Statement

The landing page booking form (`/book`) handles the happy path — successful inquiry submission shows a success modal. However, when the submission fails (validation error, 409 conflict, network error, rate limit), **no error message is shown to the user**. The form silently fails; the diner may retry, give up, or not realize their inquiry was not sent.

The `POST /api/inquiry` endpoint can return multiple error cases:
- `400` — missing required fields, invalid email format
- `409` — chef not available (NO_AVAILABILITY_SLOT conflict)
- `429` — rate limited
- `500` — server error
- Network failure — fetch throws

None of these surface a user-facing error in the form UI.

**Root cause:** The booking form's `handleSubmit` function catches errors but does not display them. The `error` state may be set but the component has no error display UI.

### User Story

**As a** diner trying to book a chef
**I want** to see a clear error message if my booking fails
**So that** I know what went wrong and can either fix it or contact support

**Currently:** A diner fills out the form, taps "Submit", and either sees a success modal or... nothing. If it failed silently, they may assume it worked and wait for a response that never comes.

### Scope

**In:**
- Add error display UI to the booking form (near the submit button or as a dismissible alert)
- Map API error codes to user-friendly messages:
  - `400` / validation → "Please check your details and try again"
  - `409 NO_AVAILABILITY_SLOT` → "Chef is not available on [date]. Please select a different date."
  - `429` → "Too many requests. Please wait a moment and try again."
  - `500` → "Something went wrong. Please try again or contact us."
  - Network error → "Connection lost. Please check your internet and try again."
- Clear error on re-submission attempt
- Track error events in analytics (`booking_form_error` with `error_code` label)

**Out:**
- Retry logic or auto-retry
- Queue for offline submission
- Full form redesign

### Acceptance Criteria

- [ ] Network failure shows "Connection lost" message
- [ ] 409 conflict shows date-specific message
- [ ] 429 shows rate limit message
- [ ] 400/500 shows generic retry message
- [ ] Error clears when user starts editing the form again
- [ ] `booking_form_error` analytics event fires on failure
- [ ] Build passes

### Dependencies
None — reads existing API behavior

### Owner
Frontend (book form error display)

---

## Opportunity #2: Inquiry Page Booking Card (MAI-2655a — Still Unbuilt) (P2)

### Problem Statement

(Re-stated from MAI-2655 — still unbuilt)

When a chef accepts an inquiry, the PATCH `/api/inquiries` handler creates a booking. But the diner visiting `/inquiry/[id]` sees no change — the page fetches only the `inquiries` table and displays "Pending" indefinitely. The diner cannot see:
- That their inquiry was accepted
- The quote amount, message, or valid-until
- Any way to accept/decline the quote

Email notification would help, but RESEND_API_KEY is a placeholder.

### Scope

**In:**
- On `/inquiry/[id]` load, fetch associated booking by matching `chef_id`, `inquiry_date`, and `email` (or `diner_id`)
- If booking exists, show Booking Card below inquiry details:
  - Booking status (pending/confirmed)
  - Quote amount, message, valid-until (if `quote_status` is set)
  - Accept/Decline buttons (if `quote_status === 'pending'`)
- Accept/Decline call `/api/bookings/[id]/accept-quote` and `/api/bookings/[id]/decline-quote`
- Refresh page state after action

**Out:**
- Authentication requirement (page stays public)
- Full booking management UI
- Changes to booking creation logic

### Acceptance Criteria

- [ ] `/inquiry/[id]` shows booking card after chef accepts
- [ ] Quote amount/message/valid-until display when chef has quoted
- [ ] Diner can accept/decline quote from public inquiry page
- [ ] Page shows "Confirmed" or "Declined" after action
- [ ] No regression for pending inquiries
- [ ] No regression for rejected inquiries
- [ ] Build passes

### Dependencies
None

### Owner
Frontend (inquiry/[id] page enhancement)

---

## Opportunity #3: Guest Booking Linking (MAI-2650a — Still Unbuilt) (P2)

### Problem Statement

(Re-stated from MAI-2650 — still unbuilt)

Guest diners submit inquiries with no `diner_id`. When a chef accepts and creates a booking, that booking also has `diner_id: null`. If the guest later creates an account (same email), their bookings are invisible in `/dashboard/bookings` because the query filters by `diner_id`.

### Scope

**In:**
- After booking creation in PATCH `/api/inquiries`, look up profile by `booking.email`
- If found, update `booking.diner_id = profile.id`
- This links guest-created bookings to their authenticated account

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

## Opportunity #4: In-Platform Messaging (MAI-2650b — Still Unbuilt) (P2)

### Problem Statement

(Re-stated from MAI-2650 — still unbuilt)

Chef and diner communicate via email after booking confirmation. No in-platform history, no reply mechanism, no connection to booking record.

### Scope

**In:**
- `messages` table: id, booking_id, sender_id, sender_type (chef/diner), content, created_at
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

## Priority Ranking

| # | Opportunity | Priority | Effort | Impact | Owner | Blocked By |
|---|------------|----------|--------|--------|-------|------------|
| 1 | Booking Form Error State UI | **P2** | Low | High — silent failures lose diners | Frontend | None |
| 2 | Inquiry Page Booking Card | **P2** | Low | High — dark after acceptance | Frontend | None |
| 3 | Guest Booking Linking | **P2** | Low | High — broken auth UX | Backend | None |
| 4 | In-Platform Messaging | **P2** | Medium | Medium — stickiness | Backend + Frontend | None |

---

## Backlog

| ID | Task | Priority | Owner | Status |
|----|------|----------|-------|--------|
| MAI-2678a | Booking form error state UI | P2 | Frontend | **NEW** — this run |
| MAI-2655a | Inquiry page booking card + quote accept/decline | P2 | Frontend | Unbuilt |
| MAI-2650a | Link guest bookings to authenticated diners | P2 | Backend | Unbuilt |
| MAI-2650b | In-platform messaging for confirmed bookings | P2 | Backend + Frontend | Unbuilt |
| MAI-2666 | Landing Page Social Proof Expansion | Medium | Growth Marketer | In Progress |
| MAI-2593 | Chef Recruitment CTA | Medium | Frontend | Unstarted |

---

## Notes

- **MAI-2665 (Quote Expiration)** is now built — the revenue leak closure is complete without needing RESEND_API_KEY (graceful degradation works)
- **API key blockers remain**: RESEND_API_KEY (200+ hours) and STRIPE_SECRET_KEY (unknown age) still block all production email and payment flows
- The new Opportunity #1 (booking form error state) is low-effort, high-impact — it directly prevents silent conversion loss at the most critical step in the funnel
- All 4 P2 opportunities in this run can be built without any external dependencies

---

## Tasks to Create

| ID | Task | Owner | Priority |
|----|------|-------|----------|
| MAI-2678a | Booking form error state UI | Frontend Agent | P2 |

---

*Generated by Product Manager — MAI-2678*