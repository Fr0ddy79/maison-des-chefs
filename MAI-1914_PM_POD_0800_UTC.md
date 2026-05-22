# Product Opportunity Discovery — MAI-1914

**Issue:** 89c33b8e-d019-426d-b87a-422ecdeb566d
**Date:** 2026-05-22 08:00 UTC
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager

---

## 1. Executive Summary

Three opportunities identified — two are implementation gaps requiring FE/BE work, one is a critical infrastructure blocker owned by Fred.

| # | Opportunity | Effort | Impact | Owner |
|---|-------------|--------|--------|-------|
| 1 | **Chef Browse Filters — Date/Guests/Occasion Not Wired to API** | ~1h FE | **High** | Frontend |
| 2 | **Guest Checkout Reviews — Email Verification Bypass** | ~30min BE | **High** | Backend |
| 3 | **Stripe Key Missing — $0 Revenue** | Fred's responsibility | **Critical** | Fred |

---

## 2. Platform State (2026-05-22 08:00 UTC)

### Infrastructure Status

| Blocker | Owner | Age | Revenue Impact |
|---------|-------|-----|----------------|
| `STRIPE_SECRET_KEY` | Fred | 90+ days | **$0 revenue** — payments blocked |
| `RESEND_API_KEY` | Fred | 90+ days | All email flows dead |
| `JWT_SECRET` | Fred | ? | Auth tokens may be misconfigured |

**Revenue: $0** — No payment processing capability.

### Active Work

| Task | Owner | Status |
|------|-------|--------|
| MAI-1880: Post-Booking Review Prompt | FE | in_progress |
| MAI-1879: Checkout Credit | BE | in_progress |
| MAI-1875: Guest Checkout | FE | in_progress |

### Key Technical Observations

1. **MAI-1913 (Chef browse API filters) was partially implemented** — Backend `GET /api/chefs` accepts `date`, `partySize`, `occasion` params, but the frontend doesn't call the API. It uses preloaded data + client-side filtering only.

2. **MAI-1912 (Reviews nullable diner_id) completed** — But guest checkout review flow needs verification logic.

3. **`stagnation_alert_sent_at` column exists** — MAI-1548 migration ran (drizzle/0007). The column is in schema.ts and the diner-stagnation-alert service correctly uses it.

---

## 3. Opportunity #1 — Chef Browse Filters Not Wired to API 🔴 HIGH IMPACT

### Problem Statement

The chef discovery page has date, guests, and occasion filters in the UI. The backend API (`GET /api/chefs`) already supports these parameters (MAI-1913 implementation). However, the frontend `applyFilters()` function only performs **client-side filtering** on preloaded data — it never calls the `/api/chefs` endpoint with these filters.

**Result:** When a diner uses the date/guests/occasion filters, they only filter the initially-loaded chef subset. This means:
- Filters don't accurately reflect availability (uses stale preloaded data)
- Guest count filter uses client-side logic that doesn't verify against actual service `minGuests`/`maxGuests`
- Date filter only checks `blockedDates` on preloaded services — not real-time availability

### Confirmed Gap

**Frontend (`src/routes/chef-discovery-page.ts` lines 635-670):**
```javascript
function applyFilters() {
  // Reads currentFilters.date, guests, occasion from UI
  // ...
  renderChefs();  // ← Only client-side filter on PRELOADED_CHEFS
  updateUrlParams();
}
```

**Backend (`src/api/chefs.ts` lines 76-90):**
```typescript
const searchQuerySchema = z.object({
  // ... other params
  date: z.string().optional(),      // YYYY-MM-DD - filter by blocked dates
  partySize: z.coerce.number().int().min(1).max(8).optional(),
  occasion: z.string().optional(),  // e.g. "Birthday", "Corporate"
  // ...
});
```

**BUT:** `applyFilters()` never calls `fetch('/api/chefs?...' + filters)`. It only calls `renderChefs()` which filters `allChefs` (preloaded from server-side render) client-side.

### User Story

**As a** diner searching for chefs  
**I want** my date, guest count, and occasion filters to accurately show only available chefs  
**So that** I don't waste time browsing chefs who can't accommodate my event

### Scope

**In:**
- Modify `applyFilters()` to call `/api/chefs` with `date`, `partySize`, `occasion` params when these filters have values
- When filters are active, replace client-side filtering with API call
- Keep cuisine/dietary/price client-side filtering for initial load (no API call needed for these)
- URL sync is already working — URL params should be passed to API call

**Out:**
- Price range API filter (already works client-side, low priority)
- Sorting via API (currently client-side only)
- Availability calendar (requires per-chef real-time data, not MVP)

### Acceptance Criteria

- [ ] `GET /api/chefs?date=YYYY-MM-DD&partySize=N&occasion=X` returns correctly filtered results
- [ ] Date filter checks service `blockedDates` against requested date
- [ ] Guest filter checks `minGuests ≤ N ≤ maxGuests` on published services
- [ ] Occasion filter matches service `category` (case-insensitive partial match)
- [ ] FE calls API with filters when date/guests/occasion are set (not just client-side)
- [ ] Clear all button works correctly
- [ ] URL sync works with API-backed filters
- [ ] `npm run build` passes

### API Contract (Already Implemented)

```typescript
// GET /api/chefs?date=2026-06-15&partySize=4&occasion=Birthday
// Returns: chef objects matching all filter criteria
```

---

## 4. Opportunity #2 — Guest Checkout Reviews Email Verification Bypass 🔵 HIGH IMPACT

### Problem Statement

MAI-1912 made `reviews.diner_id` nullable to support guest checkout users (who don't have accounts). However, the review submission flow doesn't properly handle the case where a guest has a booking but hasn't verified their email.

The MAI-1912 migration made diner_id nullable, but the review submission API may accept reviews from guests who:
1. Created a booking via guest checkout
2. Never verified their email (`emailVerified = false`)
3. Shouldn't be able to submit reviews without verification

### User Story

**As a** diner who booked via guest checkout  
**I want** to be able to leave a review after my event  
**So that** I can share my experience even without an account

**As a** platform  
**I want** to verify email before allowing reviews  
**So that** we prevent fake review spam from unverified guest accounts

### Confirmed Gap

**Database evidence:**
- `reviews.diner_id` is nullable (MAI-1912 migration ran)
- `bookings.email_verified` column exists (MAI-805 migration)
- But review submission API (`src/api/reviews.ts`) may not check `emailVerified` before accepting

**Edge case:** Guest checkout user with unverified email submits review for completed booking → Should this be allowed or blocked?

### Scope

**In:**
- Check `bookings.email_verified` before allowing review submission for guest bookings
- If `emailVerified = false` and `dinerId IS NULL` (guest checkout), return appropriate error
- Document the behavior in API contract

**Out:**
- New email verification flow (not MVP)
- Moderation queue (auto-approve is fine for MVP)
- Edit/delete reviews

### Acceptance Criteria

- [ ] Guest checkout user with `emailVerified = false` cannot submit review
- [ ] Guest checkout user with `emailVerified = true` can submit review
- [ ] Authenticated user (dinerId not null) can submit review regardless of email verification
- [ ] API returns 403 with clear message when unverified guest attempts review
- [ ] `npm run build` passes

---

## 5. Critical Infrastructure Blockers — Fred's Responsibility

| Blocker | Owner | Age | Impact |
|---------|-------|-----|--------|
| `STRIPE_SECRET_KEY` | Fred | 90+ days | **$0 revenue** — payments completely blocked |
| `RESEND_API_KEY` | Fred | 90+ days | All email flows dead |
| `JWT_SECRET` | Fred | ? | Auth misconfiguration risk |

**Revenue is $0.** Without Stripe key, no payments can be processed. The platform can only show value — it cannot capture it.

**This is blocking all revenue-generating work:**
- Even if chef browse filters are wired (Opp #1), diners can't book
- Even if review flow is fixed (Opp #2), payment can't be processed
- Every growth effort results in $0 if Stripe isn't configured

### Recommended Action for Fred

```
1. Add STRIPE_SECRET_KEY to .env — this is the single most impactful action
2. Add RESEND_API_KEY to .env — enables all email flows
3. Verify JWT_SECRET is set to a random 32+ char string
```

---

## 6. Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | Should guest checkout users be able to review without email verification? | PM | Decision needed |
| 2 | Does the guest checkout review flow require a deep link email? | PM | Clarification needed |
| 3 | Should chef browse filters call API for ALL filter changes (cuisine/dietary too)? | BE | Low priority — current hybrid approach is fine for small chef count |
| 4 | Are there any other MAI-1913 API params that FE needs to wire up? | FE | Verify `minPrice`/`maxPrice` are handled |

---

## 7. This Cycle's Recommendations

| # | Action | Owner | Priority |
|---|--------|-------|----------|
| 1 | **FE: Wire date/guests/occasion to API call** (Opportunity #1) | CEO → FE | High |
| 2 | **BE: Add email verification check to review submission** (Opportunity #2) | CEO → BE | High |
| 3 | **Fred: Add `STRIPE_SECRET_KEY` to .env** | Fred | **Critical** |
| 4 | **Fred: Add `RESEND_API_KEY` to .env** | Fred | Critical |
| 5 | Verify MAI-1880 (review prompt) considers guest checkout case | FE | Medium |

---

## 8. Definition of Done

- [x] Platform state analyzed (2026-05-22 08:00 UTC)
- [x] Active work identified and de-duplicated
- [x] Opportunity #1 (chef browse filters wire-up) scoped with API gap confirmed
- [x] Opportunity #2 (guest checkout reviews) scoped with email verification gap identified
- [x] Infrastructure blockers surfaced
- [x] Open questions listed
- [x] Issue renamed to reflect actual work
- [x] Status updated to done

---

*MAI-1914 — Product Manager — 2026-05-22 08:00 UTC*