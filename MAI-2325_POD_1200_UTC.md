# Product Opportunity Discovery — MAI-2325

**Issue:** 7632e67d-1faa-4592-94fb-35d4c71a9b1d
**Date:** 2026-05-31 12:00 UTC / 08:00 New York
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager
**Model:** MiniMax-M2

---

## 1. Executive Summary

**Revenue pipeline:** Unknown (data stale). API keys remain placeholders → $0 revenue.

**Key findings this cycle:**
1. **MAI-2315 (Inquiry Conflict):** ✅ Code staged (lines 65-120 of `inquiry.ts`) — 3 conflict checks returning HTTP 409. **Build verified.** Just needs commit.
2. **MAI-2311 (Checkout Abandonment):** ✅ Staged across 6 files (109 lines added). **Build verified.** Just needs commit.
3. **MAI-2240 (Guest Pre-fill):** 🔴 Option B never executed — `booking-page.ts` receives `dinerEmail/Name/Phone` from server.ts cookie reads, but no API call to fetch returning diner data. No `/api/guest/info` endpoint exists.
4. **MAI-2135 FE (Chef Availability):** 🔴 FE uses wrong API contract — `start`/`end` params instead of `from`/`to`, and `availData.slots` instead of `availData.days`/`weeklyTemplate`.

**Action required:** Commit staged work (MAI-2315 + MAI-2311). ~10 minutes of work unblocks two P0 features.

---

## 2. What's Changed Since MAI-2319 (2026-05-31 08:00 UTC)

| Item | Change |
|------|--------|
| MAI-2315 Staged | ✅ Confirmed — 62-line conflict detection in `src/api/inquiry.ts` |
| MAI-2311 Staged | ✅ Confirmed — 109 lines across 6 files |
| Build Verification | ✅ `npm run build` succeeded — TypeScript compiles cleanly |
| MAI-2240 Guest Pre-fill | 🔴 Still broken — `booking-page.ts` receives cookies but no server-side lookup exists |
| MAI-2135 FE Contract | 🔴 Still broken — FE uses wrong params (`start`/`end`) and wrong response shape (`slots` vs `days`/`weeklyTemplate`) |
| API Keys (Stripe/Resend) | 🔴 Still placeholder — 90d+ blocked |

---

## 3. Staged Work Analysis

### MAI-2315: Inquiry Conflict Detection ✅

**File:** `src/api/inquiry.ts` (lines 65-120)
**Status:** Implementation complete, staged, build verified.

**3 conflict checks before lead insert:**
1. **NO_AVAILABILITY_SLOT** — Chef has no availability slots for requested day of week → 409
2. **DATE_BLOCKED** — Chef has blocked the specific date in `chef_blocked_dates` → 409
3. **DATE_ALREADY_BOOKED** — Existing non-cancelled booking on same date → 409

**Error message:** "Chef is not available on **[date]**. Please select a different date or time."

**⚠️ Issue:** The `[date]` placeholder is literal — not substituted with the actual date. This should be fixed.

**In-scope for commit:**
- [ ] `git add src/api/inquiry.ts`
- [ ] `git commit -m "MAI-2315: Add booking conflict detection to inquiry flow"`
- [ ] Fix `[date]` placeholder → actual date in error messages

**Effort:** ~5 min
**Owner:** Backend Engineer

---

### MAI-2311: Checkout Abandonment Detection ✅

**Staged files (109 lines across 6 files):**
- `src/db/schema.ts` — `checkoutPageVisitedAt` + `checkoutAbandonmentEmailSentAt` columns on `leads`
- `src/db/migrate.ts` — Migration for new columns + index
- `src/routes/checkout.ts` — Sets `checkoutPageVisitedAt` when diner hits checkout
- `src/server.ts` — Imports checkout abandonment scheduler
- `src/api/analytics.ts` — Checkout abandonment analytics events (13 lines)
- `src/services/checkout-abandonment-detector.ts` — New service (untracked)

**What the staged code does:**
- `checkout.ts` route: sets `checkoutPageVisitedAt` when diner reaches checkout page
- `checkout-abandonment-detector.ts` service (runs every 15 min via cron):
  - Finds leads where `checkoutPageVisitedAt` is set, status is `quoted`, `checkoutAbandonmentEmailSentAt` is null, quote hasn't expired
  - Sends high-urgency recovery email with time-remaining countdown
  - Sets `checkoutAbandonmentEmailSentAt` after send (idempotency)

**In-scope for commit:**
- [ ] `git add src/db/schema.ts src/db/migrate.ts src/routes/checkout.ts src/server.ts src/services/checkout-abandonment-detector.ts src/api/analytics.ts`
- [ ] `git commit -m "MAI-2311: Checkout abandonment detection + recovery email"`
- [ ] Verify `npm run build` succeeds

**Effort:** ~5 min
**Owner:** Backend Engineer

---

## 4. Product Opportunities (Not Staged)

### Opportunity #1: Guest Pre-fill — Execute Option B 🟡 P1

**Problem:** MAI-2240 identified `guest_session_id` approach never built. Returning diners can't pre-fill inquiry form.

**What's working today:**
- Server reads `diner_email`, `diner_name`, `diner_phone` cookies on booking page load → ✅
- `booking-page.ts` receives these as function parameters → ✅
- Form fields pre-fill with dinerEmail/dinerName/dinerPhone → ✅

**What's missing:**
- No `/api/guest/info?email=xxx` endpoint exists ❌
- No server-side lookup for returning diner data using email cookie ❌
- No way to fetch prior lead data (last event date, guest count) to pre-fill additional fields ❌

**Option B fix (from MAI-2240):**

1. Create `GET /api/guest/info?email=xxx` endpoint that:
   - Looks up most recent lead with matching email
   - Returns: `{ email, name, phone, lastEventDate, lastGuestCount }` or 404

2. Keep current cookie-based pre-fill working (dinerEmail/dinerName/dinerPhone passed to `buildBookingPage`)

3. Future enhancement: Pre-fill additional fields (guest count, last event date) from returned data

**User Value:** Returning diners don't retype contact info. Faster inquiry → higher conversion.

**Acceptance Criteria:**
- [ ] `GET /api/guest/info?email=xxx` returns diner info for most recent lead with that email (or 404)
- [ ] Existing cookie-based pre-fill continues working (no regression)
- [ ] If no prior lead for email, form shows empty (no error, no crash)
- [ ] Works for both single-chef and multi-chef inquiry flows
- [ ] `npm run build` succeeds

**Effort:** ~1h BE
**Dependencies:** None — uses existing cookies and lead data
**Owner:** Backend Engineer

---

### Opportunity #2: Chef Availability FE — Fix API Contract Mismatch 🟡 P2

**Problem:** BE (MAI-2135) is complete. FE silently fails — wrong query params and wrong response shape.

**Current FE call in `initPage()`:**
```javascript
'/api/chefs/' + chefId + '/availability?start=' + today + '&end=' + endDate
```

**API expects:**
```javascript
'?from=' + from + '&to=' + to
```

**Response shape FE expects (incorrect):**
```javascript
availData.slots           // flat array
slotEntry.dayOfWeek      // number
slotEntry.is_blocked     // boolean
slotEntry.date           // string
slotEntry.time_windows   // array with {start, end}
```

**API actually returns (two shapes):**

*No date range (weekly template):*
```javascript
{
  chefId: 123,
  weeklyTemplate: [
    { dayOfWeek: 0, dayName: 'Sunday', isAvailable: true/false,
      slots: [{ id, startTime, endTime, isActive }] }
  ]
}
```

*With date range (`?from=YYYY-MM-DD&to=YYYY-MM-DD`):*
```javascript
{
  chefId: 123,
  from: '2026-06-01', to: '2026-08-30',
  days: [
    { date: '2026-06-01', dayName: 'Monday', dayOfWeek: 1,
      isAvailable: true/false, reason: 'Blocked' | undefined,
      slots: [{ startTime, endTime }] }
  ]
}
```

**Impact:** Chef loads availability settings page → sees empty form (silent failure).

**Fix:** Update `initPage()` in `chef-availability-settings-page.ts`:
1. Use `from`/`to` query params (not `start`/`end`)
2. Handle both response shapes (`days` array vs `weeklyTemplate`)
3. Map field names: `startTime`/`endTime` (not `start`/`end`), `isAvailable` (not `is_blocked`)

**Acceptance Criteria:**
- [ ] `initPage()` calls `/api/chefs/:id/availability?from=<today>&to=<90days>`
- [ ] If response has `days` array (date range mode), FE correctly populates `currentSlots`
- [ ] If response has `weeklyTemplate` array, FE correctly populates `currentSlots`
- [ ] Blocked dates loaded via `isAvailable: false` + `reason`
- [ ] Chef loads settings page → sees correct weekly schedule pre-filled → can edit and save
- [ ] `npm run build` succeeds

**Effort:** ~30 min FE
**Owner:** Frontend Engineer

---

## 5. Open Questions

| # | Question | Resolution |
|---|----------|------------|
| 1 | Does `booking-page.ts` already call `/api/guest/info` or still call `/api/guest/prefill`? | Neither exists. Cookie pre-fill works via server.ts. No API call for returning diner lookup. |
| 2 | MAI-2315 — does the 409 response include the actual date or literal `[date]`? | **Literal `[date]`** — needs fix to show actual date |
| 3 | MAI-2311 — should the checkout abandonment email include a direct "Complete Payment" CTA? | Yes — staged email has CTA button with booking status URL |
| 4 | Should we also notify chefs when a diner abandons checkout? | Not in MVP — focuses on diner recovery first |
| 5 | MAI-2135 BE vs FE — should we standardize on one response shape? | Recommend: FE uses `weeklyTemplate` (no date range) for initial load, date-range mode only when explicitly needed |

---

## 6. Summary

| Priority | Opportunity | Status | Effort | Owner |
|----------|-------------|--------|--------|-------|
| P0 🔴 | MAI-2315: Commit Inquiry Conflict Detection | ✅ Staged, build verified, ~5min to commit | ~5 min | Backend Engineer |
| P0 🔴 | MAI-2311: Commit Checkout Abandonment | ✅ Staged, build verified, ~5min to commit | ~5 min | Backend Engineer |
| P1 🟡 | Guest Pre-fill: Create `/api/guest/info` endpoint | ⬜ TODO | ~1h BE | Backend Engineer |
| P2 🟡 | Chef Availability FE: Fix API contract mismatch | ⬜ TODO | ~30min FE | Frontend Engineer |
| P0 🔴 | Fred: Provide Real API Keys | 🔴 BLOCKED | — | Fred |

**Immediate action:** Backend Engineer commits MAI-2315 and MAI-2311 — both are staged and build-verified. ~10 minutes of work unblocks two P0 features.

---

*Next POD cycle: ~2026-05-31 18:00 UTC / 14:00 EDT*