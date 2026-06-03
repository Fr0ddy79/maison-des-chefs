# Product Opportunity Discovery — MAI-2356

**Issue:** e743f54f-da93-47aa-8342-17261a5cabf8
**Date:** 2026-06-01 00:00 EDT / 04:00 UTC
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager
**Model:** MiniMax-M2

---

## 1. Executive Summary

**Commit status:** `fc11a80 feat: UTM capture, booking conflict detection, A/B form tracking, checkout abandonment, inquiry referral` — committed 2026-05-31 19:03 EDT (23:03 UTC). All BE work staged in prior cycles is now shipped.

**Remaining gap from MAI-2347:** `src/services/checkout-abandonment-detector.ts` (271 lines) is **untracked** — imported in `src/server.ts` but never `git add`ed. This is the checkout abandonment cron service for recovery emails.

**API keys:** `.env` shows `STRIPE_SECRET_KEY=sk_live_...` and `RESEND_API_KEY=re_...` — these are **masked placeholder patterns**, not real keys. Last confirmed as placeholders in MAI-2319 (~32h ago). **Fred must verify/provide real keys before revenue can flow.**

**New opportunities update:**
- MAI-2315 Inquiry Conflict Detection → ✅ Committed in fc11a80
- MAI-2253 POD (leads page improvements) — confirmed committed
- MAI-2240 Guest Pre-fill → Still broken, Option B never executed
- MAI-2135 FE → Still broken, wrong API contract

---

## 2. What's Changed Since MAI-2347 (2026-05-31 20:00 UTC / 16:00 EDT)

| Item | Change |
|------|--------|
| fc11a80 Committed | ✅ All staged BE features shipped (UTM, conflict detection, A/B, abandonment, inquiry referral) |
| MAI-2315 Inquiry Conflict | ✅ Committed — now live |
| checkout-abandonment-detector.ts | 🔴 **Still untracked** — imported but never git add'd |
| MAI-2240 Guest Pre-fill | 🔴 Still broken — Option B not executed |
| MAI-2135 FE Contract | 🔴 Still broken — FE uses wrong params/shape |
| API Keys (Stripe/Resend) | 🔴 Still masked placeholders (90d+ blocked) |

---

## 3. Active Work Tracking

| Issue | Title | Status | Age | Owner |
|-------|-------|--------|-----|-------|
| MAI-2356 (follow-up) | Commit checkout-abandonment-detector.ts | 🔴 Untracked | new | Backend Engineer |
| MAI-2240 | Guest Pre-fill: Fix with Option B | ⬜ TODO | ~100h | Backend Engineer |
| MAI-2135 FE | Chef Availability FE: Fix API contract mismatch | ⬜ TODO | 124h+ | Frontend Engineer |
)| MAI-2219 | Fred: Verify Real API Keys | 🔴 BLOCKED | 90d+ | Fred |

---

## 4. Product Opportunities

### Opportunity #1: Commit Checkout Abandonment Detector 🔴 P0 — Quick Commit

**Status:** `src/services/checkout-abandonment-detector.ts` (271 lines) is imported in `src/server.ts:18` via `import { startCheckoutAbandonmentScheduler } from './services/checkout-abandonment-detector.js';` but was never added to git.

**What it does:**
- Cron job every 15 minutes via `startCheckoutAbandonmentScheduler`
- Scans for leads with `checkoutPageVisitedAt` set, no `checkoutAbandonmentEmailSentAt`, status = `quoted`, quote not expired
- Sends recovery email via Resend to abandoned checkouts
- Logs "Would send recovery email..." if Resend key is placeholder
- Sets `checkoutAbandonmentEmailSentAt` after send (idempotency)

The migration to add `checkoutPageVisitedAt` and `checkoutAbandonmentEmailSentAt` columns to the `leads` table is already done (confirmed in schema.ts lines 217-218). The scheduler import is in server.ts. The service file itself was just never tracked.

**In-scope for commit:**
- [ ] `git add src/services/checkout-abandonment-detector.ts`
- [ ] `git commit -m "MAI-2356: Add checkout abandonment detection service with recovery email cron"`
- [ ] Verify `npm run build` passes
- [ ] Verify server starts without import errors

**Effort:** ~2 min
**Owner:** Backend Engineer

---

### Opportunity #2: Guest Pre-fill — Execute Option B 🟡 P1

**Problem:** MAI-2240 identified the fix. Option B was recommended. `/api/guest/info` endpoint was never built. Returning diners see empty form.

**What works today:**
- `diner_email`, `diner_name`, `diner_phone` cookies set on inquiry submit (30-day rolling) — ✅
- Cookie-based diner recognition on booking page load — ✅

**What's broken:**
- `booking-page.ts` calls `/api/guest/prefill?session=xxx` → **no such endpoint exists** ❌
- No `guest_session_id` column on leads table ❌
- Form fields NOT pre-filled for returning diners ❌

**Option B fix (MVP):**

1. Create `GET /api/guest/info?email=xxx` → returns most recent lead's `{ email, name, phone, lastEventDate, lastGuestCount }` or 404
2. `booking-page.ts`: on load, read `diner_email` cookie → call `/api/guest/info` → pre-fill email/name/phone fields if data exists
3. Deprecate `guest_session_id` approach (never fully worked)

**User Value:** Returning diners don't re-type contact info. Faster inquiry → higher conversion.

**Acceptance Criteria:**
- [ ] `GET /api/guest/info?email=xxx` returns `{ email, name, phone, lastEventDate, lastGuestCount }` for most recent lead with that email (or 404 if none)
- [ ] `booking-page.ts` reads `diner_email` cookie on load
- [ ] If cookie exists and `/api/guest/info` returns data → pre-fill email, name, phone
- [ ] If no prior lead → show empty form (no error, no crash)
- [ ] Works for both single-chef and multi-chef inquiry flows
- [ ] `npm run build` succeeds

**Effort:** ~1h BE
**Owner:** Backend Engineer

---

### Opportunity #3: Chef Availability FE — Fix API Contract 🟡 P2

**Problem:** MAI-2135 BE is complete. FE in `chef-availability-settings-page.ts` calls with wrong API contract → silently fails to load availability.

**Two mismatches in `initPage()`:**

**Mismatch #1 — Wrong query params:**
```javascript
// FE sends (wrong):
'/api/chefs/' + chefId + '/availability?start=' + today + '&end=' + endDate

// API expects (from chef-availability.ts):
'?from=' + from + '&to=' + to
```

**Mismatch #2 — Wrong response shape:**
```javascript
// FE expects (incorrect):
availData.slots           // flat array with slotEntry.dayOfWeek, slotEntry.is_blocked, slotEntry.date, slotEntry.time_windows
slotEntry.time_windows[0].start   // wrong field name
slotEntry.time_windows[0].end    // wrong field name

// API returns (correct):
// Option A (date range): { days: [{date, dayName, dayOfWeek, isAvailable, reason, slots: [{startTime, endTime}]}] }
// Option B (weekly template): { weeklyTemplate: [{dayOfWeek, dayName, slots: [{id, startTime, endTime, isActive}], isAvailable}] }
```

**Correct mapping:**
- `slotEntry.time_windows[0].start` → `slot.startTime`
- `slotEntry.time_windows[0].end` → `slot.endTime`
- `slotEntry.is_blocked` → no longer used (replaced by `isAvailable: false` with `reason`)
- `availData.slots` (flat array) → only exists in FE expectation, not in actual API

**Impact:** Chef loads availability settings page → sees empty form. No error shown (silent failure).

**Acceptance Criteria:**
- [ ] `initPage()` calls `/api/chefs/:id/availability?from=<today>&to=<90days>` (not `start`/`end`)
- [ ] If response has `days` array (date range), FE correctly maps `slots[].startTime`/`endTime`
- [ ] If response has `weeklyTemplate` array, FE correctly maps `slots[].startTime`/`endTime`
- [ ] Blocked dates loaded from `isAvailable: false` + `reason` (not `is_blocked` boolean)
- [ ] `currentSlots` populated from daySlotMap matching the actual API response shape
- [ ] Chef loads settings → sees correct weekly schedule pre-filled → can edit and save
- [ ] `npm run build` succeeds

**Effort:** ~30 min FE
**Owner:** Frontend Engineer

---

## 5. Open Questions

| # | Question | Status |
|---|----------|--------|
| 1 | Are API keys actually real now, or still `sk_live_...` / `re_...` placeholders? | Still masked — needs Fred verification |
| 2 | Does `analytics_events` table exist? | Need DB inspection — tracking inserts may be failing silently |
| 3 | MAI-2315 (Inquiry Conflict) — does the 409 error message return actual date or the literal `[date]` placeholder? | Should fix to show actual date (from MAI-2319 open question #4) |
| 4 | MAI-2240 — has anyone started building `/api/guest/info` or is it fully untouched? | Fully untouched — no such endpoint exists |

---

## 6. Metrics

| Metric | Current | Target | Notes |
|--------|---------|--------|-------|
| Inquiry conflict detection | ✅ Committed (fc11a80) | Enable 409 on conflict | MAI-2315 done |
| Checkout abandonment detection | ⚠️ Service exists, NOT committed | ✅ Commit + active | MAI-2311/MAI-2356 — untracked file |
| Guest Pre-fill | 🔴 Missing endpoint | ✅ Pre-fill works | MAI-2240 — 100h+ pending |
| Chef Availability FE | 🔴 Broken contract | ✅ Settings page works | MAI-2135 FE — 124h+ pending |
| API Keys (Stripe/Resend) | 🔴 Masked placeholders | ✅ Production keys | MAI-2219 — 90d+ blocked |

---

## 7. Summary

| Priority | Opportunity | Status | Effort | Owner |
|----------|-------------|--------|--------|-------|
| P0 🔴 | Commit checkout-abandonment-detector.ts | 🔴 Untracked | ~2 min | Backend Engineer |
| P1 🟡 | Guest Pre-fill: Execute Option B | ⬜ TODO | ~1h BE | Backend Engineer |
| P2 🟡 | Chef Availability FE: Fix API contract | ⬜ TODO | ~30min FE | Frontend Engineer |
| P0 🔴 | Fred: Provide Real Stripe/Resend API Keys | 🔴 BLOCKED | — | Fred |

**Immediate action (Backend Engineer):** `git add src/services/checkout-abandonment-detector.ts && git commit` — this is a 2-minute commit that was accidentally left out of fc11a80.

---

*Next POD cycle: ~2026-06-01 06:00 EDT / 10:00 UTC*
