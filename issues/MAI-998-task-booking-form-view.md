# Task: Add Booking Form View Event Tracking (MAI-998)

**Owner:** Frontend Engineer  
**Parent:** MAI-999 CEO Loop
**Priority:** P2  
**Status:** Ready  
**Created:** 2026-05-02

---

## Objective

Add `booking_form_view` event tracking to the booking page so we can measure CTA click → booking form reach rate.

## Problem Statement

The booking page (`/book/:serviceId`) never fires a `booking_form_view` event. We can only track CTA clicks and booking submissions, but not how many users actually reach the form after clicking a CTA. This prevents measuring true funnel conversion.

## Implementation

In `src/routes/booking-page.ts`, on page initialization, add:

```typescript
// Fire on page load to track booking form reach
// (trackAnalytics is already available in the codebase)
```

The `trackAnalytics` function already exists and sends events to `POST /api/analytics/event`.

## Event Schema

```json
{
  "event": "booking_form_view",
  "service_id": number,
  "is_returning_diner": boolean,
  "timestamp": "ISO string"
}
```

## Acceptance Criteria

- [ ] `booking_form_view` event fires on booking page load
- [ ] Event includes `service_id` and `is_returning_diner`
- [ ] Event is sent to `POST /api/analytics/event`
- [ ] Works for both new and returning diners

## Testing

1. Ensure MAI-997 (analytics persistence) is complete first
2. Start dev server: `npm run dev`
3. Navigate to `/book/1`
4. Check `data/analytics_events.jsonl` for `booking_form_view` entry

## Estimated Time

10 minutes

## Definition of Done

Frontend Engineer marks complete when:
- Code change committed
- `booking_form_view` event verified in `analytics_events.jsonl`
