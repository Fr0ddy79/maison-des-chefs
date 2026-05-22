# Task: Chef Browse Filters API Extension

## Owner
Backend Engineer

## Issue Reference
Parent: MAI-1915 (CEO Loop)

## Objective
Extend the Chef Browse API to support filtering by date, party size, occasion, and price range so the frontend filter UI (MAI-1890) works properly.

## Problem
Frontend (MAI-1890) is building a filter UI with:
- Date picker
- Party size selector
- Occasion selector (romantic, business, birthday, etc.)
- Price range slider

But the `GET /api/chefs` endpoint currently ignores all these params and just returns all chefs.

## Scope
**In:**
- Extend `GET /api/chefs` to accept and process these query params:
  - `date` (ISO date string) — filter to chefs available on this date
  - `partySize` (integer) — filter to chefs who can accommodate this party size
  - `occasion` (string) — filter to chefs with this occasion tag/matching
  - `minPrice` (number) — minimum price per person
  - `maxPrice` (number) — maximum price per person
- Return filtered results in same format as existing endpoint
- Handle invalid params gracefully (ignore bad values, don't crash)

**Out:**
- No changes to the chef schema or database
- No changes to the frontend (FE is working on MAI-1890 separately)

## Acceptance Criteria
- `GET /api/chefs?date=2026-06-01&partySize=4` returns only available chefs
- `GET /api/chefs?minPrice=50&maxPrice=150` filters by price correctly
- Invalid params are ignored (no 500 errors)
- Existing `/api/chefs` behavior unchanged when no filters passed

## Effort
~1.5 hours

## Priority
Medium