# Task: Database Migration for Revenue Fields (MAI-1000)

**Owner:** Backend Engineer  
**Parent:** MAI-993 Revenue Feature Spec
**Priority:** P1  
**Status:** Ready  
**Created:** 2026-05-02

---

## Objective

Add revenue-related fields to the BookingRequest table to support 10% platform take rate.

## Problem Statement

The BookingRequest table has no fields to track payment amount, platform fee, chef earnings, or payment status. These are required for the revenue feature.

## Changes Required

### 1. Database Migration

Create migration to add to `bookings` table (or `bookingRequests` if separate):

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `totalAmount` | decimal(10,2) | null | Total charged to diner |
| `platformFee` | decimal(10,2) | null | 10% of chefPrice |
| `chefEarnings` | decimal(10,2) | null | totalAmount - platformFee |
| `isPaid` | boolean | false | Payment status |
| `stripePaymentIntentId` | varchar(255) | null | Stripe payment reference |

### 2. Update Schema

File: `src/db/schema.ts` — add these fields to the booking/bookingRequest model.

### 3. TypeScript Types

Ensure new fields are reflected in TypeScript interfaces used by API and pages.

## Acceptance Criteria

- [ ] Migration adds 5 new fields to database
- [ ] Schema updated with new fields
- [ ] TypeScript types reflect new fields
- [ ] Existing bookings have null/0 values for new fields

## Testing

```bash
# Check migration applied
sqlite3 data/maison.db ".schema bookings"
```

## Estimated Time

2 hours

## Definition of Done

Backend Engineer marks complete when:
- Migration created and applied
- Schema updated
- TypeScript compiles without errors
- Existing data not affected
