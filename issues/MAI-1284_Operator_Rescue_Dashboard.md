# MAI-1284: Operator Rescue Dashboard

**Issue:** (to be assigned by Multica)
**Created:** 2026-05-08 18:00 UTC
**Status:** Todo
**Owner:** Frontend Engineer + Backend Engineer

---

## 1. Problem Statement

**Fred (operator) has no visibility into which bookings are dying and no direct line to the chef.** The $1,045 revenue is completely stuck. Manual WhatsApp outreach is the only path, but there's no system to track/rescue. Fred can't see pending bookings across all chefs or easily reach the chef via WhatsApp.

**Revenue Impact:** Manual intervention can rescue $1,045 immediately via WhatsApp.

---

## 2. User Story

> **As an** operator (Fred),
> **I want to** see all pending bookings with diner info and a direct WhatsApp link to the chef,
> **So that** I can personally rescue bookings before diners give up.

---

## 3. Scope

### IN

1. **Operator View: All Pending Bookings**
   - Page accessible at `/admin/rescue` (or `/operator/rescue`)
   - Show all pending bookings across ALL chefs
   - Columns: Booking ID, Chef Name, Diner Name, Diner Email, Event Date, Total Price, Days Pending
   - Sort by days pending (oldest first)
   - Filter by status (pending/accepted/declined/all)

2. **WhatsApp Rescue Action**
   - "Rescue via WhatsApp" button per booking
   - Generates pre-filled message:
     ```
     Hi [Chef Name]! You have a new booking request:
     - Diner: [Diner Name]
     - Date: [Event Date]
     - Guests: [Guest Count]
     - Total: $[Price]
     Please confirm or decline: [booking link]
     ```
   - Click opens `https://wa.me/?text=<encoded_message>` in new tab

3. **Rescue Tracking**
   - "Rescue Sent" checkbox/button on booking
   - Timestamp of last rescue attempt (manual entry)
   - Simple flag, no complex workflow

### OUT

- Automated WhatsApp sending
- Email notification fixes
- Payment integration

---

## 4. Acceptance Criteria

- [ ] `/admin/rescue` shows all pending bookings sorted by age
- [ ] Booking shows: Chef Name, Diner Name, Diner Email, Event Date, Price, Days Pending
- [ ] "Rescue via WhatsApp" button generates correct pre-filled message
- [ ] WhatsApp opens in new tab with correct message
- [ ] "Rescue Sent" status can be toggled on booking
- [ ] Build succeeds (TypeScript compiles without errors)

---

## 5. Technical Approach

### Backend
- `GET /admin/bookings?status=pending` — admin-only endpoint, returns all pending bookings with chef + diner info
- `PATCH /bookings/:id` — update rescue status (add `rescueSentAt` timestamp)

### Frontend
- New page: `/admin/rescue`
- Table layout with all pending bookings
- WhatsApp button with `window.open()` for pre-filled message
- Simple toggle for rescue status

### Auth
- Admin-only route (check user role)
- Or simple auth check for now

---

## 6. Effort Estimate

~1-2 hours total (BE: 30min, FE: 1h)

---

## 7. Dependencies

- None — WhatsApp requires no API keys, just external link

---

## 8. Priority

**P2** — Enables Fred to manually rescue $1,045 in revenue

---

## 9. Definition of Done

- [ ] All acceptance criteria met
- [ ] TypeScript builds without errors
- [ ] Tested manually: WhatsApp link works, table shows all pending

---

*Operator Rescue Dashboard — MAI-1284 — CEO — 2026-05-08 18:00 UTC*
