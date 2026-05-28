# Product Opportunity Discovery — MAI-2163

**Issue:** 2aacdeae-b643-4bd4-917d-73a881210864
**Date:** 2026-05-27 20:00 UTC
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager
**Model:** MiniMax-M2

---

## 1. Executive Summary

**Platform is at $0 revenue with ~$1,725 at stake.** Both STRIPE_SECRET_KEY and RESEND_API_KEY remain as placeholders — the same state reported since MAI-2117 (16:00 UTC), now 16+ hours unchanged. The product infrastructure is built and functional. The gap is purely Fred's external actions (API keys, Marcel WhatsApp). While waiting, engineering has a ready-built opportunity: the referral codes table is missing, breaking the partial referral program already implemented in the booking status page UI.

**Pipeline Status:** 🔴 STALLED — payment blocked by placeholder Stripe key
**Theme this cycle:** Fix the broken referral program infra (referral_codes table missing). Continue pushing Fred on API keys. No new features needed — existing implementation gaps are the priority.

---

## 2. Current Platform State (20:00 UTC)

### Live Data (from maison.db)

| Metric | Value | Notes |
|--------|-------|-------|
| Total leads | 10 | |
| Accepted quotes | 1 (Lead #551498) | $380 — payment blocked |
| Quoted leads | 1 (Lead #9) | $300 — email undelivered (Resend key fake) |
| Confirmed (converted) | 1 (Lead #1) | Booking #1 — no payment captured |
| Expired leads | 7 | |
| Published services | 1 | "Dinner for 2" @ $95/person |
| Diners | 4 | |
| Pending bookings | 4 | ~$1,045 total — all stale |
| Revenue realized | **$0** | |
| Revenue at stake | **~$1,725** | |
| STRIPE_SECRET_KEY | Placeholder (`sk_live_...`) | 🔴 BLOCKED |
| RESEND_API_KEY | Placeholder (`re_...`) | 🔴 BLOCKED |

### Pending Bookings (all stale)

| ID | Total | Event Date | Guests | Status |
|----|-------|------------|--------|--------|
| 1 | $190 | 2026-05-15 | 2 | pending |
| 2 | $190 | 2026-06-15 | 2 | pending |
| 3 | $285 | 2026-06-20 | 3 | pending |
| 4 | $380 | 2026-07-01 | 4 | pending |

**Note:** None of these bookings have reached the payment step. Booking dates are all in the past or imminent — all are effectively stuck. Booking #1 (May 15) is 12+ days overdue with no payment.

### What Already Exists (Referral Program)

The booking status page (`booking-status-page.ts`) already has a referral CTA with this structure:
- **Incentive:** "Give your friends €25 off → get a FREE DESSERT when they confirm"
- **UI:** Referral code box + Copy/Email/WhatsApp share buttons
- **Analytics:** `referral_share` event tracked (`analytics.ts`)
- **Lead attribution:** `leads.referral_code` and `leads.referral_source` columns exist
- **Analytics logging:** `/referral/track?code=X&source=Y` route exists

**What's broken:** No `referral_codes` table persists generated codes. The booking status page generates codes client-side and displays them, but there's no server-side table to validateredeem them or track which diners have generated codes.

---

## 3. Active Work Tracking

| Issue | Title | Status |
|-------|-------|--------|
| MAI-2151 | FE+BE: Growth Funnel Fixes | in_progress |
| MAI-2150 | FE: Chef Availability MVP | todo |
| MAI-2160 | BE: Stale Booking Timeout Flow | todo |
| — | Stripe Payments Integration | 🔴 BLOCKED — Fred's key |
| — | Referral Codes Table | 🔴 BROKEN — missing table |
| — | RESEND_API_KEY | 🔴 BLOCKED — Fred's key |

---

## 4. Product Opportunities

### Opportunity #1: Referral Codes Table (MVP) — P1 🔴 BROKEN INFRA

**Problem:** The booking status page shows a referral CTA with generated codes, but there's no `referral_codes` backend table. Codes are generated client-side with no persistence, validation, or redemption tracking. The referral program UI exists but has no backend.

**What exists vs. what's missing:**

| Component | Status |
|-----------|--------|
| `leads.referral_code` column | ✅ Exists |
| `leads.referral_source` column | ✅ Exists |
| Referral CTA on booking status page | ✅ Exists |
| Analytics `referral_share` tracking | ✅ Exists |
| `referral_codes` table | ❌ Missing |
| Referral code generation (server-side) | ❌ Missing |
| Referral code validation/redeeming | ❌ Missing |

**User Story:**
> As a diner who just had a great experience, I want my referral code to actually work when my friend uses it, so I can earn my free dessert reward.

**Scope (MVP):**

**In:**
- Create `referral_codes` table: `(id, code, diner_id, created_at, used_at, used_by_lead_id)`
- Server-side code generation on first confirmed booking (instead of client-side random)
- Store generated code per diner (one code per diner, reusable)
- When a lead is created with `?ref=CODE`, validate against `referral_codes` table
- Track which leads were referred by which diner
- Display diner's existing referral code on booking status page (if already generated)

**Out:**
- No tiered rewards
- No expiry on referral codes
- No automated reward fulfillment emails (manual reward delivery for MVP)

**Acceptance Criteria:**
- [ ] `referral_codes` table created
- [ ] Confirmed booking triggers server-side referral code generation (if diner doesn't have one)
- [ ] `?ref=CODE` validates against referral_codes table
- [ ] Referred leads are attributed to the correct referrer (diner)
- [ ] Referral code shown on booking status page if diner already has a code
- [ ] Analytics `referral_share` continues to fire correctly

**Effort:** ~2-3 hours (backend table + code gen + validation + frontend integration)
**Dependencies:** None — can build now
**Owner:** Backend + Frontend

---

### Opportunity #2: Booking Timeout Flow — P1 🟡 IMPROVES CLARITY

**Problem:** 4 bookings are stuck in `pending` status with past or imminent event dates. There's no automated timeout flow — no reminders to complete payment, no stale booking cancellation, no lead re-engagement. The booking flow has no defined SLA or escalation steps.

**What exists:**
- Booking status page shows "Accept & Pay →" CTA
- `bookings.status = 'pending'` 
- No cron/scheduler for booking reminders
- No stale booking cancellation

**User Story:**
> As a diner with a pending booking, I want a gentle reminder to complete payment before my event date, so I don't lose my spot. As the platform, I want stale bookings to either convert or expire so pipeline metrics stay accurate.

**Scope (MVP):**

**In:**
- 24h before event date: payment reminder email (if booking still pending)
- 48h after event date with no payment: mark booking as `expired`
- Re-engagement email for stale pending bookings (7+ days old): offer to reschedule
- Analytics event for booking_expiry

**Out:**
- Automatic cancellation (manual review for MVP)
- Refund logic
- Payment retry logic

**Acceptance Criteria:**
- [ ] Pending booking approaching event date triggers reminder
- [ ] Stale pending booking (48h+ past event) is marked expired
- [ ] Stale re-engagement email fires for 7+ day old pending bookings
- [ ] Analytics events logged for timeout flow

**Effort:** ~3-4 hours backend (scheduler + emails)
**Dependencies:** RESEND_API_KEY must be real (currently placeholder)
**Owner:** Backend

---

### Opportunity #3: Checkout Page Auth Gate Fix — P1 🔴 ALREADY TRACKED

**Problem:** MAI-2151 (in_progress) addresses auth gate on checkout page + booking flow fixes. This is already being worked. Not a new opportunity.

---

## 5. Recommendations

**Priority order:**

| Priority | Action | Owner | Impact |
|----------|--------|-------|--------|
| 🔴 P0 | Replace STRIPE_SECRET_KEY | Fred | $380+ collected |
| 🔴 P0 | Replace RESEND_API_KEY | Fred | $300+ email delivery |
| 🟡 P1 | Build `referral_codes` table + backend code gen | Engineering | Fix broken referral program |
| 🟡 P1 | Booking timeout flow (MAI-2160) | Backend | Pipeline clarity |
| 🟡 P1 | Chef outreach to recruit 1 new chef | Fred | GMV ceiling |

**Theme:** Fred's API keys remain the #1 bottleneck. Engineering should fix the referral_codes table (broken infra that was never fully built) and MAI-2151 (checkout auth gate) while waiting for keys. The referral program UI is live but backend is incomplete.

---

## 6. Open Questions

| Question | Owner | Priority |
|----------|-------|----------|
| What is Fred's timeline for API keys? | Fred | P0 |
| Is Lead #9 reachable via phone as backup? | Growth | P2 |
| What happens to the $380 accepted lead (Lead #551498) if Stripe key provided? | Backend | P1 |

---

## 7. Summary

| Opportunity | Effort | Impact | Owner | Priority |
|-------------|--------|--------|-------|----------|
| Replace STRIPE_SECRET_KEY | 5 min | $380+ collected | Fred | 🔴 P0 |
| Replace RESEND_API_KEY | 5 min | $300+ email delivery | Fred | 🔴 P0 |
| Referral codes table | 2-3h | Fix broken referral infra | Engineering | 🟡 P1 |
| Booking timeout flow (MAI-2160) | 3-4h | Pipeline clarity | Backend | 🟡 P1 |
| Chef outreach | 2-4h | GMV ceiling | Fred | 🟡 P1 |

**The structural insight:** 16+ hours have passed with API keys as placeholders. The product infrastructure (booking, checkout, email triggered, referral CTA) is technically built — the gap is Fred providing real API credentials. While waiting, engineering should complete the referral_codes table (the most tangible broken piece) and clear MAI-2151.

---

*End of report — MAI-2163*