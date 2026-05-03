# Task: Fee Calculation on Booking Confirmation (MAI-1002)

**Owner:** Backend Engineer  
**Parent:** MAI-993 Revenue Feature Spec
**Priority:** P1  
**Status:** Ready  
**Depends on:** MAI-1000 (DB migration)
**Created:** 2026-05-02

---

## Objective

Calculate and store platform fee (10%) and chef earnings when a booking is confirmed.

## Problem Statement

When a booking is confirmed, the system should calculate:
- `totalAmount` = chefPrice × 1.10
- `platformFee` = chefPrice × 0.10
- `chefEarnings` = chefPrice (what chef receives net)

## Implementation

In the booking confirmation endpoint (`src/api/bookings.ts` or wherever booking confirmation lives):

```typescript
const chefPrice = booking.chefPrice || booking.servicePrice;
const platformFee = Math.round(chefPrice * 0.10 * 100) / 100;
const totalAmount = Math.round(chefPrice * 1.10 * 100) / 100;
const chefEarnings = chefPrice;

// Store in booking record
await db.update(bookingsTable)
  .set({ totalAmount, platformFee, chefEarnings })
  .where(eq(bookingsTable.id, bookingId));
```

## API Response Change

The booking confirmation API response should include:

```json
{
  "booking": {
    "id": 123,
    "chefPrice": 400,
    "totalAmount": 440,
    "platformFee": 40,
    "chefEarnings": 400,
    "isPaid": false
  }
}
```

## Acceptance Criteria

- [ ] Booking confirmation calculates correct fee values
- [ ] Values stored in database
- [ ] API response includes all 4 new fields
- [ ] Existing bookings not affected (null/0 values)

## Testing

1. Confirm a test booking
2. Query booking record for totalAmount, platformFee, chefEarnings
3. Verify values are correct (400 → 40 fee, 440 total, 400 earnings)

## Estimated Time

1 hour

## Definition of Done

Backend Engineer marks complete when:
- Fee calculation correct in code
- Database updated with values
- API returns new fields
- No regression in booking flow
