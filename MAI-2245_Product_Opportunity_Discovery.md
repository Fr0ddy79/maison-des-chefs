# Product Opportunity Discovery — MAI-2245

**Issue:** ce70da57-fea2-4b29-bcb2-820035234c19
**Date:** 2026-05-29 08:00 EDT / 12:00 UTC
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager
**Model:** MiniMax-M2

---

## 1. Executive Summary

**Revenue pipeline:** ~$1,725 with 1 accepted quote ($380), 1 quoted ($300), 4 pending bookings worth ~$1,045. 12 leads total, 7 expired with zero diner notification.

**Key gaps this cycle:**
1. **Quote expiry broken** — API enforces 48h but cron uses 7 days; diners never get notified at any point
2. **Guest pre-fill broken** — spec claims `/api/guest/prefill` exists but it doesn't; returning diners can't pre-fill the form
3. **Chef Availability MVP stalled** — 45h+ without progress; blocks availability management for chefs

**Theme:** Fix the broken edges. Both #1 and #2 are execution-ready with clear paths. #3 needs re-energizing.

---

## 2. What's Changed Since Prior POD (MAI-2235 — 08:00 UTC 2026-05-29)

| Item | Change |
|------|--------|
| MAI-2235 (Quote Expiry POD) | 🟡 Carried forward — still P0, not executed |
| MAI-2240 (Guest Checkout Verification) | ✅ Complete — spec mismatch identified with Option B fix |
| MAI-2204 (Stripe + Resend Live Verification) | 🟡 Unknown status — was blocked, may be unblocked now |
| MAI-2135 (Chef Availability MVP) | 🔴 Stalled — 45h+, needs re-evaluation |

---

## 3. Active Work Tracking

| Issue | Title | Status | Age | Owner |
|-------|-------|--------|-----|-------|
| MAI-2235 (P0) | Quote Expiry: Unify API/Cron + Diner Notifications | ⬜ TODO | 8h stale | Backend Engineer |
| MAI-2240 | Guest Checkout: Fix Pre-fill (Option B) | ⬜ TODO | New | Backend Engineer |
| MAI-2135 | FE+BE: Chef Availability MVP | 🟡 Stalled | 45h+ | BE+FE |
| MAI-2204 | BE: Verify Stripe + Resend Live Mode | 🟡 Unknown | — | Backend Engineer |

---

## 4. Product Opportunities

### Opportunity #1: Quote Expiry — Unify API/Cron Windows + Activate Diner Notifications 🔴 P0

**Problem:** Two independent quote expiry mechanisms with mismatched behavior. Diners hit a dead end silently at 48h with zero notification. The cron that finally marks quotes expired only notifies the chef, not the diner.

**Mechanism A — API (`quotes.ts`, `QUOTE_EXPIRY_HOURS = 48`):**
- Hard 48h block on `POST /api/quotes/:leadId/accept`
- `GET /api/quotes/:leadId` returns `is_expired: true` after 48h
- **No email sent** — silent wall for diners

**Mechanism B — Cron (`quote-expiry.ts`, `QUOTE_EXPIRY_DAYS = 7`):**
- Runs daily at midnight
- Marks `status IN ('quoted', 'responded')` as `'expired'` after 7 days
- Notifies chef only — **diner gets nothing**

**The conflict:** API blocks at 48h but cron doesn't expire the DB record for 7 days. Diners get no notification at 24h (pre-expiry), at 48h (blocked), or when the quote finally expires.

**Existing infrastructure:**
- `quote-reminder.ts` — sends 48h reminder for `responded` leads (works, but only for `responded`, not `quoted`; no 24h pre-warning)
- `quote-expiry.ts` — notifies chef on expiry (works, but only notifies chef)
- Resend is live (confirmed by Fred)

**In-scope fixes:**
1. Change `QUOTE_EXPIRY_DAYS` from `7` to `2` (aligns with API 48h intent)
2. Add 24h pre-warning in `quote-reminder.ts` — send "your quote expires tomorrow" email to diners with unaccepted quotes
3. Add diner expiry email to `quote-expiry.ts` — when cron marks lead `'expired'`, email diner with CTA to browse/request new chefs
4. Ensure idempotency on all email sends (use `quoteReminderSentAt` / new `leadExpiredSentAt` fields)

**Out of scope:**
- Auto-extend or re-quote workflow
- Multiple reminder nudges beyond 24h pre-warning + expiry notification

**User Value:** Diners don't hit a silent dead end. They get a heads-up at 24h and a clear CTA at expiry. More quotes get accepted before expiring. Revenue captured instead of lost.

**Acceptance Criteria:**
- [ ] `quote-expiry.ts` uses `QUOTE_EXPIRY_DAYS = 2` (aligned with API 48h window)
- [ ] 24h pre-warning email fires at `quoteSentAt + 24h` for unaccepted quotes (extend `quote-reminder.ts`)
- [ ] Diner receives expiry email when cron marks lead `'expired'` (extend `quote-expiry.ts`)
- [ ] Chef notification on expiry remains (already exists)
- [ ] All email sends are idempotent (cron re-runs don't resend)
- [ ] `npm run build` succeeds

**Effort:** ~1-2h BE — config change + add diner email paths in existing crons
**Dependencies:** Resend (confirmed live), existing cron infrastructure
**Owner:** Backend Engineer

---

### Opportunity #2: Guest Pre-fill — Fix Broken `guest_session_id` System with Option B 🟡 P1

**Problem:** The spec (MAI-2240) describes a `guest_session_id` UUID cookie + `/api/guest/prefill` endpoint for returning guest pre-fill. This infrastructure was never built. Returning diners cannot pre-fill the inquiry form.

**What the spec says should happen:**
1. Guest submits inquiry → `guest_session_id` UUID cookie generated
2. Lead record gets `guest_session_id` stored
3. Returning guest visits booking page → JS reads cookie → calls `/api/guest/prefill?session=xxx`
4. Form fields pre-filled from prior lead data

**What actually happens:**
1. `booking-page.ts` sets `guest_session_id` cookie on page load ✅
2. `booking-page.ts` calls `/api/guest/prefill?session=xxx` ✅ called
3. **No `/api/guest/prefill` route exists** ❌
4. **No `guest_session_id` column on leads table** ❌
5. **Form fields NOT pre-filled** ❌

**Existing infrastructure that works:**
- `diner_email`, `diner_name`, `diner_phone` cookies set on inquiry submit (30-day rolling)
- Anonymous diner account created on inquiry submit (email-based)
- Cookie-based diner recognition already works

**Recommended fix — Option B (lower effort, uses existing infrastructure):**
1. `booking-page.ts` reads `diner_email` cookie on load (already there)
2. Create `GET /api/guest/info?email=xxx` — returns lead data (most recent lead) for that email
3. When returning diner loads booking page with `diner_email` cookie → call `/api/guest/info` → pre-fill Email, Name, Phone fields
4. Pre-fill gracefully handles no-prior-lead case (show empty form)
5. Remove or deprecate the `guest_session_id` approach (partially built, never worked)

**User Value:** Returning diners don't retype their contact info. Faster inquiry submission → higher conversion. Particularly valuable for multi-chef inquiries where friction is higher.

**Acceptance Criteria:**
- [ ] `GET /api/guest/info?email=xxx` returns `{ email, name, phone, lastEventDate, lastGuestCount }` for most recent lead with that email
- [ ] `booking-page.ts` reads `diner_email` cookie on load
- [ ] If `diner_email` cookie exists and `/api/guest/info` returns data, form fields (email, name, phone) are pre-filled
- [ ] If no prior lead found, form shows empty (no error, no crash)
- [ ] Works for both single-chef and multi-chef inquiry flows
- [ ] `npm run build` succeeds

**Effort:** ~1h BE — one new lightweight endpoint + frontend pre-fill wiring
**Dependencies:** None — uses existing cookies and lead data
**Owner:** Backend Engineer

---

### Opportunity #3: Chef Availability MVP — Re-energize Stalled Work 🟡 P2

**Problem:** MAI-2135 (Chef Availability MVP) has been stalled 45h+. This feature is critical for chefs to manage their availability windows, which directly impacts lead response times and booking conversion. Without it, chefs must manually track availability or risk double-booking.

**Context:** Previous POD cycles have flagged this as blocked. The work was started but stalled. No clear blocker reported in recent cycles — may need re-evaluation of scope or approach.

**What's needed:**
1. Review MAI-2135 current status and blocker
2. Assess if scope needs trimming (is the MVP too large?)
3. Re-assign or re-prioritize
4. Define clear next step to unblock

**User Value:** Chefs can set and update availability without manual intervention. Reduces double-booking risk. Enables availability-based search/filter in future. Improves chef response rate (faster leads → higher conversion).

**Acceptance Criteria (MVP scope):**
- [ ] Chef can set available dates/times via settings page
- [ ] Availability blocks new booking requests on those dates
- [ ] Chef can update availability (add/remove windows)
- [ ] `npm run build` succeeds

**Effort:** Unknown — needs status review first
**Dependencies:** Likely needs BE schema work + FE settings page
**Owner:** BE+FE (needs re-assignment)

---

## 5. Open Questions

| # | Question | Resolution |
|---|----------|------------|
| 1 | MAI-2204 (Stripe + Resend live verification) — what's the current status? | Need Fred or BE to confirm if payments/emails are actually working end-to-end |
| 2 | Should `quote-reminder.ts` also handle `status = 'quoted'` leads, or is `quoted` transient? | `quoted` → `responded` transition likely happens when chef responds. Check if reminder needs to cover `quoted` too. |
| 3 | Should `QUOTE_EXPIRY_DAYS` be derived from `QUOTE_EXPIRY_HOURS`? | Hardcode `2` for quick fix, or derive: `Math.ceil(QUOTE_EXPIRY_HOURS / 24)` |
| 4 | Is `guest_session_id` ever needed beyond Option B? | Future consideration — Option B covers MVP need |

---

## 6. Summary

| Priority | Opportunity | Effort | Owner |
|----------|-------------|--------|-------|
| P0 🔴 | Quote Expiry — Unify API/Cron + Diner Notifications | ~1-2h BE | Backend Engineer |
| P1 🟡 | Guest Pre-fill — Fix with Option B | ~1h BE | Backend Engineer |
| P2 🟡 | Chef Availability MVP — Re-energize stalled work | Unknown | BE+FE (needs re-assignment) |

**Immediate action:** Execute Opportunity #1 (P0). Low effort, high impact. Resend is live. Infrastructure exists. Just needs config change + diner email paths added.

---

*Next POD cycle: ~16:00 UTC / 12:00 EDT*