# Product Opportunity Discovery — MAI-2568

**Autopilot Run:** 2026-06-05 08:00 America/New_York
**Analyst:** Product Manager

---

## Executive Summary

Identified **2 opportunities** — one P0 (time-overlap double-booking risk in inquiry system) and one P1 (inquiry pre-fill fix from prior run not yet tasked). Both are clear, bounded, and MVP-scope.

---

## Product Health Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Inquiry submission | ✅ Working | Creates booking on chef accept |
| Availability management | ✅ Working | Chef dashboard slot CRUD |
| Booking management (chef) | ✅ Working | Accept/reject/quote inquiries |
| Quote system | ✅ Working | Quote modal + email wired via Resend stub |
| Chef application workflow | ✅ Working | Admin approve/reject UI |
| Review system | ✅ Working | POST /api/reviews works |
| Booking price calculation | ✅ Working | price_per_person × guest_count |
| Diner dashboard (MAI-2562) | 🔄 In Progress | Frontend Engineer |
| Chef profile edit (MAI-2553) | 🔄 In Progress | Frontend Engineer |
| Email notifications | ⚠️ Blocked | Resend key still placeholder |
| Inquiry time overlap | ❌ Gap Found | P0 — double-booking risk |

---

## Opportunity #1: Inquiry Time Overlap — Double-Booking Risk (P0)

### Problem Statement

The inquiry conflict detection in `/api/inquiry` performs three checks:

1. **Slot exists** — `availability` table has a row for `chef_id` + `date` with `is_booked = false`
2. **Date not blocked** — `chef_blocked_dates` has no row for this date
3. **No existing booking** — `bookings` table has no non-cancelled booking for this `date`

However, **check #3 only compares dates — it does NOT compare times**. Two diners can inquire for the same chef on the same day at overlapping times (e.g., 6pm and 8pm), and both checks will pass. The first booking gets the slot; the second is accepted but creates a conflict the chef has to resolve manually.

### User Story

**As a** diner
**I want** my booking time to be protected from double-booking
**So that** I can trust the chef will actually be available at my confirmed time

**Currently:** Chef A has a confirmed booking for March 15, 6-8pm. A second diner submits an inquiry for March 15, 7-9pm — the same day, overlapping time. The conflict check passes because it only looks at `booking_date`, not `start_time`/`end_time`. The chef receives two conflicting bookings.

### Scope

**In:**
- In `/api/inquiry`, enhance the booking conflict check (section c) to also compare time ranges
- Time overlap detection: `(inquiry_time < existing_end_time) AND (inquiry_time_end > existing_start_time)`
- Use `inquiry_time_end` derived from `inquiry_time + 2h` if not explicitly provided
- Return 409 with `conflictType: 'TIME_OVERLAP'` when overlap detected
- Error message includes the conflicting time range for clarity

**Out:**
- Changes to accept-quote / decline-quote endpoints (already correct)
- Changes to slot-level booking (availability is date-only, not time-slotted)
- Changes to blocked dates logic

### Acceptance Criteria

- [ ] Inquiry for March 15, 18:00-20:00 on chef with existing 18:00-20:00 booking → 409 `TIME_OVERLAP`
- [ ] Inquiry for March 15, 20:00-22:00 on chef with existing 18:00-20:00 booking → 409 `TIME_OVERLAP` (20:00 < 20:00 AND 22:00 > 18:00 = true)
- [ ] Inquiry for March 15, 21:00-23:00 on chef with existing 18:00-20:00 booking → 409 `TIME_OVERLAP`
- [ ] Inquiry for March 16 (different date) → no conflict regardless of time
- [ ] Error response includes `conflictType: 'TIME_OVERLAP'` and helpful message

### Implementation Note

```ts
// Current (date-only):
const { data: conflictingBooking } = await supabase
  .from('bookings')
  .select('id, booking_date, start_time, end_time, status')
  .eq('chef_id', chef_id)
  .eq('booking_date', inquiry_date)
  .neq('status', 'cancelled')
  .single()

// Fixed (date + time overlap):
const inquiryTimeEnd = inquiry_time_end || add2Hours(inquiry_time)

const { data: existingBookings } = await supabase
  .from('bookings')
  .select('id, start_time, end_time')
  .eq('chef_id', chef_id)
  .eq('booking_date', inquiry_date)
  .neq('status', 'cancelled')

const hasOverlap = existingBookings?.some(b =>
  inquiry_time < (b.end_time || '23:59') &&
  inquiryTimeEnd > b.start_time
)

if (hasOverlap) {
  return NextResponse.json({
    error: `Chef is already booked during this time on ${inquiry_date}. Please select a different time.`,
    conflictType: 'TIME_OVERLAP',
  }, { status: 409 })
}
```

---

## Opportunity #2: "Book Again" Pre-Fill Bug (P1)

### Problem Statement

The "Book Again" button in the diner dashboard (`/dashboard/bookings`) generates a URL with `chef_id`, `date`, `time`, and `guests`:
```
/book?chef_id=...&date=2024-03-15&time=18:00&guests=4
```

However, `/book/page.tsx` only reads `chef_id`, `date`, `guests` from the URL params — **it ignores `time`**. The time field remains blank even though `booking.start_time` is passed in the URL.

**Root cause:** Line 135 in `BookPageContent.tsx` reads `urlServiceId`, `urlDate`, `urlGuests` but not `urlTime`.

### User Story

**As a** diner
**I want** clicking "Book Again" to pre-fill the form including the time
**So that** I can quickly re-book without manually re-entering everything

**Currently:** "Book Again" navigates to `/book?chef_id=...&date=...&time=...&guests=...` but the time field is empty.

### Scope

**In:**
- Read `time` URL param in `BookPageContent.tsx` useEffect
- Pre-fill `formData.time` when `time` param is present
- Keep existing behavior for missing `time` param (blank field)

**Out:**
- Changes to booking flow, validation, or step logic
- Pre-filling menu preferences

### Acceptance Criteria

- [ ] Navigate to `/book?chef_id=...&date=2024-03-15&time=18:00&guests=4` → form pre-fills date, time (18:00), guest count
- [ ] Existing query params (`chef_id`, `service_id`) still work as before
- [ ] No `time` param → time field starts blank (existing behavior preserved)

---

## Changes Since Previous Run (MAI-2554)

| Item | MAI-2554 | MAI-2568 |
|------|----------|----------|
| Inquiry time overlap check | ❌ Gap found | ❌ Still unfixed |
| Book Again pre-fill (date/guests) | ❌ Gap found | ❌ Still unfixed |
| Book Again pre-fill (time) | ❌ Not identified | ❌ Gap found |
| MAI-2562 Diner Dashboard | Not started | 🔄 In Progress |
| MAI-2563 Chef Notifications | Not started | 🔄 In Progress |
| Resend API key | ⚠️ Placeholder | ⚠️ Still placeholder |

---

## Priority Ranking

| # | Opportunity | Priority | Effort | Impact | Owner |
|---|------------|----------|--------|--------|-------|
| 1 | Inquiry Time Overlap Fix | P0 | Low | High — prevents double-booking | Backend Engineer |
| 2 | "Book Again" Time Pre-Fill | P1 | Low | Medium — reduces re-book friction | Frontend Engineer |

---

## Fred Actions Needed

1. **RESEND_API_KEY** — Still placeholder after 60+ days. All email features are built but silently fail. Provide key to unblock MAI-2563 and enable transactional emails.
   - Get free key at https://resend.com
   - Replace `your_resend_api_key_here` in `.env.local`

---

## Open Questions

1. **Opportunity #1 (Time Overlap):** Should the slot's `start_time`/`end_time` bounds be checked against the inquiry time range? Currently the slot only confirms the date is available — inquiry time must fall within the slot's time window. Is this already enforced elsewhere?

---

*Generated by Product Manager — MAI-2568*