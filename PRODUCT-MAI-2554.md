# Product Opportunity Discovery — MAI-2554

**Autopilot Run:** 2026-06-05 00:00 America/New_York
**Analyst:** Product Manager

---

## Executive Summary

Backlog is clean — all P0/P1 issues from prior runs are resolved. This run identified **2 concrete opportunities** worth pursuing: a diner-facing dashboard to manage bookings (more intuitive than the current `/dashboard/bookings` page) and a chef availability conflict detection edge case where the slot-level check bypasses the time-of-day check.

---

## Product Health Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Booking flow (inquiry → quote → accept/decline) | ✅ Working | Accept-quote marks slot as booked (MAI-2552) |
| Chef profile edit UI | ✅ Working | MAI-2553 done, sidebar link correct |
| Inquiry conflict detection (3-way) | ✅ Working | Slot + blocked date + booking |
| Chef dashboard (analytics, quotes, availability) | ✅ Working | All sections functional |
| Diner dashboard (booking management) | ✅ Working | Accept/decline quote, review solicitation |
| Review system | ✅ Working | MAI-2529 done, MAI-2550 done |
| Email infrastructure | ⚠️ Blocked | Resend key still placeholder |
| Per-page SEO metadata | ✅ Working | MAI-2535 done, MAI-2543 done |
| Chef application flow | ✅ Working | Confirmation emails stubbed |
| Admin dashboard | ✅ Working | Revenue, applications |

---

## Gap #1: Missing "Book Again" Date/Time Pre-Fill (P2)

### Problem Statement

The diner booking page (`/book`) accepts `chef_id`, `date`, `time`, and `guests` as URL query params. The "Book Again" button in the diner dashboard correctly passes `chef_id`, `date`, `time`, and `guests`. However, the booking form doesn't pre-fill from these query params — the date/time/guests fields remain empty. The user sees no pre-populated values and must re-enter everything manually.

### Root Cause

`/book/page.tsx` reads URL params but doesn't actually set the form state from them. The URL params are only used as initial state via `useSearchParams()`, but the form fields don't use these values as their initial values.

### User Story

**As a** diner
**I want** clicking "Book Again" to pre-fill the booking form with the previous date/time/guests
**So that** I can quickly re-book a similar experience without re-entering everything

**Currently:** "Book Again" navigates to `/book?chef_id=...&date=...&time=...&guests=...` but the form is blank.

### Scope

**In:**
- Parse `date`, `time`, `guests` from URL search params in `/book/page.tsx`
- Pre-fill the booking form fields with these values when present
- Date field shows the date, time field shows the time, guest count shows the count

**Out:**
- Changes to the booking flow or validation
- Pre-filling menu preferences (too complex for this fix)

### Acceptance Criteria

- [ ] Navigate to `/book?chef_id=...&date=2024-03-15&time=18:00&guests=4` — form pre-fills date, time, guest count
- [ ] Existing query params (`chef_id`) still work
- [ ] No query params → form starts empty (existing behavior)

---

## Gap #2: Inquiry Conflict Detection — Time-of-Day Not Checked (P2)

### Problem Statement

The inquiry conflict detection in `/api/inquiry` performs three checks:

1. **Slot exists** — `availability` table has row for `chef_id` + `date` with `is_booked = false`
2. **Date not blocked** — `chef_blocked_dates` has no row for this `date`
3. **No existing booking** — `bookings` table has no non-cancelled booking for this `date`

However, **check #3 only checks if there's a booking on the same date — it does NOT check the time**. If Chef A has a booking for March 15 from 6-8pm, a second diner can inquire for March 15 at 9pm (or 5pm, overlapping). The conflict check passes because it only checks `booking_date`, not `start_time` or `end_time`.

Similarly, **check #1 (slot exists)** only checks date-level existence — two diners can book the same slot if their times partially overlap within the same availability window.

### User Story

**As a** diner
**I want** my booking time to be genuinely available (not overlapping with another confirmed booking)
**So that** I can trust the system won't double-book my chef

**Currently:** Two non-overlapping time slots on the same day both pass conflict detection, but the first booking's chef availability ends before the second slot starts.

### Scope

**In:**
- In `/api/inquiry`, add time-overlap check to existing booking conflict check:
  - When checking for conflicting bookings, also compare `start_time` / `end_time`
  - Two bookings conflict if they share the same `chef_id` + `date` AND their time ranges overlap
  - Time overlap = `(new_start < existing_end) AND (new_end > existing_start)`
- Update the 409 error message to include time information when a time conflict is detected

**Out:**
- Changes to accept-quote / decline-quote endpoints
- Changes to slot blocking logic
- Changes to inquiry conflict on the chef side (inquiries are a pre-quote request)

### Acceptance Criteria

- [ ] Inquiry for March 15, 6-9pm → no conflict (slot exists, no booking overlap)
- [ ] Then inquiry for March 15, 8-10pm on same chef → 409 `TIME_OVERLAP_CONFLICT` error
- [ ] Then inquiry for March 15, 5-7pm on same chef → 409 `TIME_OVERLAP_CONFLICT` error
- [ ] Inquiry for March 15, 9-11pm on different chef → no conflict (different chef)
- [ ] Error message includes actual conflicting time range

### Implementation Note

In `/api/inquiry/route.ts`, the conflicting booking check (section c) should be enhanced:

```ts
// c) Check for conflicting bookings on the same date AND time range
const { data: conflictingBooking } = await supabase
  .from('bookings')
  .select('id, booking_date, start_time, end_time, status')
  .eq('chef_id', chef_id)
  .eq('booking_date', inquiry_date)
  .neq('status', 'cancelled')
  // Time overlap: new time overlaps if:
  //   new start < existing end AND new end > existing start
  // This is the standard interval overlap check
  .or(`and(start_time.lt.${inquiry_time_end ? inquiry_time_end : '23:59'}),start_time.gt.${inquiry_time})`)
  .single()
```

Wait — Supabase doesn't support complex OR within `.or()` the same way. A simpler approach: query all bookings on that date and filter in JS, since at most there are a handful per chef per date. Or use a raw SQL check.

Actually, the simplest fix: fetch all active bookings for this chef on this date (no time filter), then in JS check if `inquiry_time < existing_end AND inquiry_time_end > existing_start`.

**Fallback approach:**
```ts
// Get inquiry_time_end — if not provided, assume 2h after inquiry_time
const inquiryTimeEnd = inquiry_time_end || (() => {
  const [h, m] = (inquiry_time || '19:00').split(':').map(Number)
  const endH = (h + 2) % 24
  return `${String(endH).padStart(2,'0')}:${String(m).padStart(2,'0')}`
})()

const { data: existingBookings } = await supabase
  .from('bookings')
  .select('id, start_time, end_time')
  .eq('chef_id', chef_id)
  .eq('booking_date', inquiry_date)
  .neq('status', 'cancelled')

// Check time overlap
const hasConflict = existingBookings?.some(b => {
  return inquiry_time < (b.end_time || '23:59') && inquiryTimeEnd > b.start_time
})

if (hasConflict) {
  return NextResponse.json({ error: 'Chef is already booked during this time on the selected date.', conflictType: 'TIME_OVERLAP' }, { status: 409 })
}
```

---

## Changes Since Previous Run (MAI-2544)

| Item | MAI-2544 | MAI-2554 |
|------|----------|----------|
| Accept-quote slot booking | ✅ Fixed (MAI-2552) | ✅ Working |
| Chef profile edit UI | ✅ Fixed (MAI-2553) | ✅ Working |
| Per-page SEO metadata | ✅ Fixed (MAI-2535+2543) | ✅ Working |
| Inquiry time overlap check | ❌ Not checked | ❌ Gap found |
| Book Again pre-fill | ❌ Not checked | ❌ Gap found |
| Diner dashboard | ✅ Working | ✅ Working |
| Resend API key | ⚠️ Placeholder | ⚠️ Still placeholder |

---

## No New Tasks Created

Both gaps identified in this run are P2-level and have clear, low-effort fixes. The existing backlog has no P0/P1 items. Since these are minor improvements that don't affect core marketplace flow, **no new tasks were created**. The gaps are documented here for the next iteration.

---

## Fred Actions Needed

1. **Provide Resend API key** — Replace `your_resend_api_key_here` in `.env.local`. All email templates are built and waiting; the key is the only missing piece.

---

## Open Questions

1. **MAI-2554 Gap #1 (Book Again pre-fill):** The inquiry flow stores `inquiry_time` but the booking creation in `/api/bookings` gets `start_time` from... what? If it's derived from `inquiry_time`, then pre-filling `inquiry_time` would be correct. Need to verify the booking creation API maps `inquiry_time` → `start_time`.

---

*Generated by Product Manager — MAI-2554*