# MAI-788: BE: Fix Chef Lead Flow Frontend/Backend API Mismatches + Commit Growth Changes

**Issue:** 71e0b127-38d8-407b-b16f-6cb4d9e882dc
**Created:** 2026-04-28
**Status:** ✅ Done
**Priority:** HIGH
**Commit:** 11ccda5

---

## Summary

Fixed critical API mismatches in the chef lead flow that prevented quote and status features from working.

## Changes Made

### Bug 1: Frontend/backend parameter name mismatch (MAI-766)
- **File:** `src/api/chef-leads.ts`
- Renamed `quoteAmount` → `amount` and `quoteMessage` → `message` in `respondToLeadSchema`
- Updated the update call and email service to use the new field names
- Frontend (`chef-leads-page.ts`) already sends `amount` and `message` — now fully aligned

### Bug 2: HTTP method mismatch for status update (MAI-766)
- **File:** `src/api/chef-leads.ts`
- Changed `server.post("/:leadId/status", ...)` → `server.patch("/:leadId/status", ...)`
- Frontend (`chef-leads-page.ts`) already sends `PATCH` — now fully aligned

### Growth Changes Committed (MAI-768, MAI-774, MAI-784)
- **File:** `src/routes/pages.ts`
- Urgency line: "Typically books out 2–3 weeks in advance" (or availability message based on lead count)
- Demand badge: "X diners are interested/inquired about this service"
- Dynamic CTA text variants (testA: "Request Your Date", testB: "Request Booking", testC: "Check Availability")
- Also compiled JS outputs for: pages.js, schema.js, index.js, config/index.js

## Verification

- [x] `POST /api/chef/leads/:leadId/respond` accepts `amount` (not `quoteAmount`)
- [x] `PATCH /api/chef/leads/:leadId/status` works (PATCH method, not POST)
- [x] Urgency/social proof changes in pages.ts committed
- [x] All uncommitted changes resolved

## Notes

Pre-existing TypeScript errors in unrelated files (auth.ts, bookings.ts, chefs.ts, etc.) are schema/TypeScript strictness issues unrelated to this fix — they existed before these changes.
