# Product Opportunity Discovery — MAI-1895

**Issue:** d9a8a453-76de-42a7-aa42-6a39452af056
**Date:** 2026-05-21 20:00 UTC
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager

---

## 1. Executive Summary

Platform is operating with significant infrastructure gaps blocking revenue. Two high-value opportunities for FE/Backend, plus one critical infrastructure blocker for Fred.

| # | Opportunity | Effort | Impact | Owner |
|---|-------------|--------|--------|-------|
| 1 | **Booking Stagnation Alert Fix** — add `stagnation_alert_sent_at` column | ~30 min BE | **High** | Backend |
| 2 | **Chef Browse Filters FE Wire-Up** — MAI-1890 spec already exists | ~1h FE | **High** | Frontend |
| 3 | **Stripe Key + RESEND Key** | Fred's responsibility | **Critical** | Fred |

---

## 2. Platform State (20:00 UTC May 21)

### Infrastructure Blockers

| Blocker | Owner | Age | Revenue Impact |
|---------|-------|-----|----------------|
| `STRIPE_SECRET_KEY` | Fred | 60+ days | **$0 revenue** — payments blocked |
| `RESEND_API_KEY` | Fred | 60+ days | All email flows dead |
| `JWT_SECRET` | Fred | ? | Auth misconfiguration risk |
| `MULTICA_WORKSPACE_ID` | Fred | ? | Issue routing problems |

**Revenue is $0.** Platform cannot process payments. This is the single most important unblocker.

### Active Work

| Task | Owner | Status | Notes |
|------|-------|--------|-------|
| MAI-1890: Chef Browse Filters | FE | in_progress | Spec already done — needs implementation |
| MAI-1879: Checkout Credit | BE | in_progress | MAI-1877 task |
| MAI-1880: Post-Booking Review Prompt | FE | in_progress | MAI-1877 task |
| MAI-1875: Guest Checkout | FE | in_progress | Auth gate removal |
| MAI-1849: Marcel SMS Outreach | Growth | in_progress | BLOCKED — needs Marcel's phone from Fred |

### Completed Recently

| Task | Notes |
|------|-------|
| MAI-1889 (Growth) | Marcel SMS re-engagement identified, blocked on Fred |
| MAI-1882 (PM) | Chef browse filters identified and specced |
| MAI-1887 (PM) | Same — MAI-1890 was created from this |

---

## 3. Opportunity #1 — Booking Stagnation Alert Fix 🔴 HIGH IMPACT

### Problem Statement

The `diner-stagnation-alert.ts` service references a `stagnation_alert_sent_at` column in the bookings table, but this column **does not exist** in the database schema. This means:

1. The cron cannot find "already alerted" bookings (no column to check)
2. Diners with stale pending bookings don't receive automatic follow-up emails
3. Leads that might convert with a nudge are lost silently

**System has 4 pending bookings, all 39-45+ days old, zero stagnation alerts sent.**

### User Story

**As a** diner with a pending booking,
**I want to** receive a follow-up if the chef hasn't responded in 24h,
**so that** I know the platform is active and can make an informed decision.

### Confirmed Gap

**Backend:** `src/services/diner-stagnation-alert.ts` references `stagnation_alert_sent_at` column which is missing from schema.

**Database evidence:**
```sql
SELECT name FROM pragma_table_info(bookings) WHERE name = 'stagnation_alert_sent_at';
-- Returns: 0 rows (column missing)
```

**Spec:** MAI-1548 calls for idempotency via this column but implementation is incomplete.

### Scope

**In:**
- Migration: `ALTER TABLE bookings ADD COLUMN stagnation_alert_sent_at INTEGER`
- Backfill: `stagnation_alert_sent_at = NULL` for all existing bookings
- Verify `processStaleBookings()` correctly:
  - Finds pending bookings >24h old
  - Sends ONE alert per booking (idempotent)
  - Updates `stagnation_alert_sent_at` after send

**Out:**
- Email template changes
- Notification UI changes
- Multi-alert sequences

### Acceptance Criteria

- [ ] Migration creates `stagnation_alert_sent_at INTEGER` column in bookings table
- [ ] Existing bookings backfilled with `NULL`
- [ ] `processStaleBookings()` runs without errors on existing bookings
- [ ] No duplicate alerts sent to any booking
- [ ] TypeScript compiles with no errors

---

## 4. Opportunity #2 — Chef Browse Filters FE Wire-Up 🔵 HIGH IMPACT

### Problem Statement

The PM spec for chef browse filters already exists (MAI-1882, MAI-1887). MAI-1890 was created as an implementation task assigned to FE. The date, guest count, and occasion filters are **already in the HTML** of `chef-discovery-page.ts` (lines 296-314) but they are not wired to trigger API calls.

### Confirmed Gap

**Frontend (chef-discovery-page.ts lines 296-314):**
- Date picker `<input type="date" id="filterDate">` exists
- Guest count `<input type="number" id="filterGuests">` exists
- Occasion dropdown exists
- BUT: `applyFilters()` only filters client-side — does NOT call `/api/chefs` with these params
- `renderChefs()` only filters `allChefs` client-side — it does not fetch from API

**API behavior (chefs.ts:88):**
- `GET /api/chefs` accepts `cuisines`, `dietary`, `partySize`, `delivery` params
- **Does NOT accept** `date`, `guests`, `occasion` params as described in MAI-1890

### Required Changes

**Frontend (`chef-discovery-page.ts`):**
1. Modify `applyFilters()` to call `GET /api/chefs` with proper query params when non-cuisine filters are active
2. OR: Enhance `GET /api/chefs` to accept `date`, `guests`, `occasion` params first, then have FE call it

**Backend (`src/api/chefs.ts`):**
1. Add `date`, `guests`, `occasion` query params to `GET /api/chefs`
2. Filter chefs by availability on the requested date (service's available dates)
3. Filter chefs by guest count (service's `guest_min`/`guest_max` vs requested guests)
4. Filter chefs by occasion (service's `occasion_types` vs requested occasion)

### Scope

**In:**
- Backend: Add `date`, `guests`, `occasion` params to `GET /api/chefs` endpoint
- Frontend: Wire date/guests/occasion filters to call API (not client-side filter)
- URL param sync (already partially implemented)
- Clear all button (already implemented)

**Out:**
- Price range slider (deferred, not MVP)
- Availability calendar integration (requires per-chef date data)
- Sorting by these new filters

### Acceptance Criteria

- [ ] `GET /api/chefs?date=YYYY-MM-DD&guests=N&occasion=X` returns filtered results
- [ ] Date filter checks chef/service availability for that date
- [ ] Guest filter checks service `guest_min`/`guest_max` against requested count
- [ ] Occasion filter checks service `occasion_types` against requested occasion
- [ ] FE calls API with params when filters change (not just client-side)
- [ ] Clear all resets all filters
- [ ] URL syncs correctly
- [ ] `npm run build` passes

---

## 5. Critical Infrastructure Blockers — Fred's Responsibility

| Blocker | Owner | Age | Impact |
|---------|-------|-----|--------|
| `STRIPE_SECRET_KEY` | Fred | 60+ days | **$0 revenue** — payments blocked |
| `RESEND_API_KEY` | Fred | 60+ days | All email flows dead |
| `JWT_SECRET` | Fred | ? | Risk: auth tokens may be misconfigured |
| `MULTICA_WORKSPACE_ID` | Fred | ? | Workspace switching issues |
| Marcel's phone number | Fred | ? | BLOCKED: Growth cannot complete SMS outreach |

**Platform revenue is $0.** No payment processing capability. Without Stripe key, even the best growth work results in $0 actual revenue.

---

## 6. Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | Should chef browse filters include price range in the API call, or is client-side sufficient? | PM | Deferred |
| 2 | Does MAI-1879 (checkout credit) require the `stagnation_alert_sent_at` fix? | BE | Unverified |
| 3 | Are the date/guests/occasion filters meant to filter by chef availability or by lead preferences? | BE | Clarification needed |

---

## 7. This Cycle's Recommendations

| # | Action | Owner | Priority |
|---|--------|-------|----------|
| 1 | **BE: Add `stagnation_alert_sent_at` column** (Opportunity #1) | CEO → BE | High |
| 2 | **FE: Wire chef browse filters to API** (Opportunity #2 — MAI-1890) | CEO → FE | High |
| 3 | **BE: Extend `GET /api/chefs` to accept date/guests/occasion params** | CEO → BE | High (enables #2) |
| 4 | Fred: add `STRIPE_SECRET_KEY` | Fred | **Critical** |
| 5 | Fred: add `RESEND_API_KEY` | Fred | **Critical** |
| 6 | Fred: provide Marcel's phone number | Fred | Unblocks €1,045 |

---

## 8. Definition of Done

- [x] Platform state analyzed (20:00 UTC)
- [x] Active work identified and de-duplicated
- [x] Opportunity #1 (stagnation alert column) scoped and spec'd
- [x] Opportunity #2 (chef browse filters wire-up) scoped with API gap identified
- [x] Open questions surfaced
- [x] Issue renamed to reflect actual work
- [x] Status updated to done

---

*MAI-1895 — Product Manager — 2026-05-21 20:00 UTC*