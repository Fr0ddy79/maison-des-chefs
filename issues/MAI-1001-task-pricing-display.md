# Task: Itemized Pricing Display on Checkout (MAI-1001)

**Owner:** Frontend Engineer  
**Parent:** MAI-993 Revenue Feature Spec
**Priority:** P1  
**Status:** Ready  
**Depends on:** MAI-1000 (DB migration)
**Created:** 2026-05-02

---

## Objective

Display itemized pricing breakdown on the booking form before payment, showing chef service price, platform fee, and total.

## Problem Statement

Currently the booking form shows only the chef's price per person. Diners don't see the platform fee breakdown, which is required for transparency with the 10% take rate model.

## Implementation

On the booking form (`src/routes/booking-page.ts`), display pricing breakdown:

```
Chef Service (4 guests × $100/person):  $400.00
Platform Fee (10%):                      $40.00
────────────────────────────────────────────
Total:                                  $440.00
```

Show this before the submit button. The fee calculation comes from the backend (MAI-1002).

## Acceptance Criteria

- [ ] Itemized pricing shows for bookings with guest count × pricePerPerson
- [ ] Platform fee displayed as 10% of chef service subtotal
- [ ] Total clearly highlighted
- [ ] Works for varying guest counts (recalculates on change)
- [ ] Degrades gracefully if backend doesn't return fee data

## Testing

1. Navigate to booking page with a service (e.g., `/book/1?guests=4&price=100`)
2. Verify pricing breakdown displays
3. Change guest count and verify recalculation

## Estimated Time

2 hours

## Definition of Done

Frontend Engineer marks complete when:
- Pricing breakdown visible on booking page
- Calculation correct for different guest counts
- No console errors
