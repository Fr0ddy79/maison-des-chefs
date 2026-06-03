# Product Opportunity Discovery — MAI-2209

**Issue:** 60991870-fb04-4eac-9e3d-1c75ae7cec5c
**Date:** 2026-05-28 16:00 America/New_York (20:00 UTC)
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager
**Model:** MiniMax-M2

---

## 1. Executive Summary

**Biggest development since last cycle:** API keys are LIVE (confirmed by MAI-2200 at 17:00 UTC). The payment and email pipelines can now work. However, the `referral_codes` and `diner_credits` tables are missing from the DB — the schema defines them but migrations never created them. This breaks the entire referral program: diners can't generate codes, and the credit system has no backend to operate on.

**Pipeline Status:** 🟡 PARTIALLY UNBLOCKED — email/payments now work, but referral infra is broken
**Theme this cycle:** Migrate the missing referral tables so the referral program can function when API keys are live. 4 bookings worth ~$1,045 are stuck waiting for checkout completion.

**Priority order:**
1. 🟡 P1 — Run missing migration: `referral_codes` + `diner_credits` tables
2. 🟢 P2 — Verify Stripe/Resend live mode (MAI-2204 blocked on MAI-2206)
3. 🔵 P3 — 1 new feature opportunity (chef self-scheduling)

---

## 2. Current Platform State (20:00 UTC)

### Live Data (from maison.db)

| Metric | Value | Notes |
|--------|-------|-------|
| Total leads | 10 | |
| Accepted quotes | 1 (Lead #551498) | $380 — payment unblocked now |
| Quoted leads | 1 (Lead #9) | $300 — email now deliverable |
| Converted leads | 1 (Lead #1) | diner@demo.com — "converted" status |
| Expired leads | 7 | |
| Pending bookings | 4 | ~$1,045 total — all overdue/imminent |
| Published services | 1 | "Dinner for 2" @ $95/person |
| Diners | 4 | |
| Revenue realized | **$0** | |
| Revenue at stake | **~$1,725** | |
| STRIPE_SECRET_KEY | ✅ LIVE | Confirmed MAI-2200 |
| RESEND_API_KEY | ✅ LIVE | Confirmed MAI-2200 |

### Pending Bookings (all stuck, no payment captured)

| ID | Total | Event Date | Guests | Status |
|----|-------|------------|--------|--------|
| 1 | $190 | 2026-05-15 | 2 | pending |
| 2 | $190 | 2026-06-15 | 2 | pending |
| 3 | $285 | 2026-06-20 | 3 | pending |
| 4 | $380 | 2026-07-01 | 4 | pending |

**Note:** Booking #1 (May 15) is 13 days past event date with no payment captured. Booking #2 is 18 days away and may still convert. All are stuck in the checkout flow.

---

## 3. Active Work Tracking

| Issue | Title | Status |
|-------|-------|--------|
| MAI-2206 | BE: Fix API Keys in .env | todo |
| MAI-2207 | BE: Implement Quote Expiry Cron | todo |
| MAI-2204 | BE: Verify Stripe + Resend Live Mode | blocked (on MAI-2206) |
| — | Referral tables missing (referral_codes + diner_credits) | 🔴 BROKEN |
| — | STRIPE_SECRET_KEY | ✅ LIVE |
| — | RESEND_API_KEY | ✅ LIVE |

---

## 4. Critical Gap: Missing Referral Tables

### What's Defined in Schema (src/db/schema.ts), But Not in DB

**referralCodes table:**
```sql
referral_codes: id, code (unique), diner_id, used_by_diner_id, created_at, used_at
```
- indexes: `referral_code_idx` on code, `referral_diner_idx` on dinerId
- **Status:** ❌ TABLE MISSING from DB

**dinerCredits table:**
```sql
diner_credits: id, diner_id, amount (cents), earned_from_referral_id, used (bool), expires_at, created_at
```
- **Status:** ❌ TABLE MISSING from DB

### What Routes Import That Table

| Route | Function | Impact |
|-------|----------|--------|
| `src/api/diner-referral.ts` | POST/GET `/referral-code`, GET `/credits`, POST `/apply` | Diners can't generate or retrieve referral codes |
| `src/api/bookings.ts:140` | Look up diner's referral code for booking confirmation email | Email can't include referral code info |
| `src/api/chef-leads.ts:289` | Generate referral code on lead conversion | No referral code assigned on conversion |

### What Breaks Without These Tables

1. **Diners** can't generate a referral code via `/api/diner/referral-code` POST → 500 error
2. Diners can't check their credit balance via `/api/diner/credits` → 500 error
3. Checkout can't apply referral credits via `/api/diner/referral-code/apply` → 500 error
4. Booking confirmation emails can't include the diner's referral code → silently skipped
5. Lead conversion doesn't store which referral code was used

### Recommended Fix — New Migration

**File:** `migrations/011_add_referral_tables.sql.ts`

```sql
CREATE TABLE IF NOT EXISTS referral_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  diner_id INTEGER NOT NULL REFERENCES users(id),
  used_by_diner_id INTEGER REFERENCES users(id),
  created_at INTEGER NOT NULL,
  used_at INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS referral_code_idx ON referral_codes(code);
CREATE INDEX IF NOT EXISTS referral_diner_idx ON referral_codes(diner_id);

CREATE TABLE IF NOT EXISTS diner_credits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  diner_id INTEGER NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  earned_from_referral_id INTEGER REFERENCES referral_codes(id),
  used INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
```

**Effort:** ~30 minutes (write migration + test)
**Owner:** Backend Engineer
**Priority:** P1 🟡

---

## 5. Feature Opportunity: Chef Self-Scheduling MVP

### Problem

Currently, chefs can only set `available: true/false` as a global toggle. There's no granular availability system. When a lead comes in, the chef must manually track whether they're available on a given date. This creates:
- Overbooking risk (chef double-booked)
- Friction in lead response (chef has to check their calendar)
- Poor diner experience when unavailable dates aren't reflected

### What's Already Built

- `chef_availability_slots` table exists in schema (referenced but table may not exist in DB)
- `chef_blocked_dates` table exists in schema (same)
- `src/api/chef-availability.ts` route exists
- Chef availability settings page exists: `src/routes/chef-availability-settings-page.ts`

### User Story

> As a chef, I want to block specific dates or time slots so diners only see available booking windows and I never get double-booked.

### Scope (MVP)

**In:**
- Blocked dates grid UI (chef sets unavailable dates on a calendar)
- Store blocked dates in existing `chef_blocked_dates` table (verify it exists)
- Prevent booking requests for blocked dates (API validation)
- Visual indicator on booking request if event date is blocked

**Out:**
- Time-slot granularity (just dates for MVP)
- Real-time availability display on public chef page
- Google Calendar sync
- Instant booking with deposit (future save-the-date feature)

### Acceptance Criteria
- [ ] Chef can add/remove blocked dates via settings page
- [ ] Blocked dates persist across sessions
- [ ] Booking API rejects requests for blocked dates with 400 error
- [ ] Blocked dates show visually on booking request
- [ ] Unblocking a date makes it available again

**Effort:** ~2-3 hours
**Owner:** Frontend + Backend (table verification + API validation + UI)
**Priority:** P2 🟢

---

## 6. Recommendations

| Priority | Action | Owner | Impact |
|----------|--------|-------|--------|
| 🟡 P1 | Run missing migration for referral_codes + diner_credits | Backend | Fix broken referral program infra |
| 🟡 P1 | MAI-2206: Fix API Keys in .env (currently blocking MAI-2204 verification) | Backend | Unblock MAI-2204 |
| 🟢 P2 | MAI-2207: Implement Quote Expiry Cron | Backend | Auto-expire stale quotes after 7 days |
| 🟢 P2 | Chef self-scheduling MVP | FE+BE | Prevent double-bookings |
| 🔵 P3 | Chef dashboard: sort leads by inquiry_received_at | FE | Chef can see which leads arrived first |

**Theme:** The most impactful immediate action is migrating the missing referral tables — it's a 30-minute task that fixes the broken referral program backend, which is needed to activate the referral loop that could drive new diner acquisition now that email is live. After that, the quote expiry cron (MAI-2207) addresses the stale quote problem.

---

## 7. Open Questions

| Question | Owner | Priority |
|----------|-------|----------|
| Has MAI-2206 (API keys in .env) been resolved? | Backend | P1 |
| Do `chef_availability_slots` and `chef_blocked_dates` tables exist in DB? | Backend | P1 |
| What is the lead response time SLA? (How fast should chefs respond?) | PM | P2 |

---

## 8. Summary

| Opportunity | Effort | Impact | Owner | Priority |
|-------------|--------|--------|-------|----------|
| Referral tables migration | 30 min | Fix broken referral program backend | Backend | 🟡 P1 |
| MAI-2206: Fix API keys in .env | ~1h | Unblock MAI-2204 verification | Backend | 🟡 P1 |
| MAI-2207: Quote expiry cron | 2-3h | Auto-expire stale quotes | Backend | 🟢 P2 |
| Chef self-scheduling | 2-3h | Prevent double-booking | FE+BE | 🟢 P2 |
| Chef leads sort by inquiry_received_at | 30 min | Help chef prioritize | FE | 🔵 P3 |

**The structural insight:** The platform is now operationally unblocked (API keys live). The next highest-leverage action is fixing the broken referral tables so the referral program can actually function, and completing the quote expiry cron so stale quotes don't languish. The $1,045 in pending bookings represents the immediate revenue opportunity — helping Fred close those deals (or mark them expired) would clean up the pipeline.

---

*End of report — MAI-2209*