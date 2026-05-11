# MAI-1283: Chef Dashboard Urgency System

**Issue:** (to be assigned by Multica)
**Created:** 2026-05-08 18:00 UTC
**Status:** Todo
**Owner:** Frontend Engineer + Backend Engineer

---

## 1. Problem Statement

**Chef has no visibility into pending bookings and no urgency signal.** Bookings stay "pending" forever with no escalation path. The email notification path is broken (RESEND_API_KEY missing for 50+ days), so chef literally doesn't know about bookings. 4 pending bookings worth $1,045 are dying silently.

**Revenue Impact:** $1,045 stuck in pending bookings with 0 conversions.

---

## 2. User Story

> **As a** chef,
> **I want to** see urgent pending requests prominently in my dashboard,
> **So that** I don't let bookings die and disappoint diners.

---

## 3. Scope

### IN

1. **Chef Dashboard Urgency Banner**
   - If chef has any pending bookings, show prominent red banner
   - Banner text: "⚠️ You have [X] pending booking request(s) — respond now"
   - Show oldest pending duration (e.g., "Oldest request: 21 days")
   - Banner persists until chef responds to ALL pending bookings

2. **Booking Queue with Urgency Indicators**
   - List pending bookings sorted by age (oldest first)
   - Show "Created X days ago" for each
   - Visual urgency: red highlight for bookings >7 days old

3. **One-Click Actions**
   - Accept button (changes booking status to 'accepted')
   - Decline button (changes booking status to 'declined')
   - Both update immediately via API, no confirmation modal

4. **Backend API Support**
   - `GET /bookings?chefId=X&status=pending` — list pending bookings for chef
   - `PATCH /bookings/:id` — accept or decline (status update)

### OUT

- Email notifications (blocked by RESEND_API_KEY)
- WhatsApp integration
- Payment collection (blocked by STRIPE_SECRET_KEY)
- Auto-expiration of bookings

---

## 4. Acceptance Criteria

- [ ] Chef dashboard shows red urgency banner when pending bookings exist
- [ ] Banner displays count and oldest booking age
- [ ] Pending bookings listed sorted by age (oldest first)
- [ ] Each booking shows: diner name, event date, guest count, total price, days pending
- [ ] Accept button changes status to 'accepted' immediately
- [ ] Decline button changes status to 'declined' immediately
- [ ] After all pending resolved, banner disappears
- [ ] Build succeeds (TypeScript compiles without errors)

---

## 5. Technical Approach

### Backend (BE)
- Endpoint: `GET /chefs/me/bookings?status=pending` — return pending bookings for authenticated chef
- Existing `PATCH /bookings/:id` should work for status updates
- Add `createdAt` to booking response if not already exposed

### Frontend (FE)
- Chef dashboard already exists — modify to add:
  1. Urgency banner (conditional on pending count > 0)
  2. Booking list sorted by `createdAt` ascending
  3. Accept/Decline buttons per booking
  4. Visual red highlight for >7 days old

### Data Flow
```
Chef logs in → Dashboard loads → GET /chefs/me/bookings?status=pending
→ If count > 0: Show urgency banner + list
→ Chef clicks Accept → PATCH /bookings/:id {status: 'accepted'}
→ UI updates immediately
```

---

## 6. Effort Estimate

~2-3 hours total (BE: 1h, FE: 1-2h)

---

## 7. Dependencies

- None — works with current schema and existing endpoints
- No new infrastructure required

---

## 8. Priority

**P1** — Unblocks $1,045 revenue immediately

---

## 9. Definition of Done

- [ ] All acceptance criteria met
- [ ] TypeScript builds without errors
- [ ] Tested manually: banner appears, accepts/declines work, banner disappears when all resolved

---

*Chef Dashboard Urgency System — MAI-1283 — CEO — 2026-05-08 18:00 UTC*
