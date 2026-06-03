# Product Opportunity Discovery — MAI-2273

**Issue:** 0479285d-750b-4c9e-b4c5-083f6639b46a
**Date:** 2026-05-30 00:00 EDT / 04:00 UTC
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager
**Model:** MiniMax-M2

---

## 1. Executive Summary

**Revenue pipeline:** ~$1,725 with 1 accepted quote ($380), 1 quoted ($300), 4 pending bookings worth ~$1,045. 12 leads total, 7 expired with zero diner notification.

**Key gaps this cycle:**
1. **P0 — Quote Expiry:** BE config aligned (QUOTE_EXPIRY_DAYS=2), but **diner notification still missing** from cron
2. **P1 — Guest Pre-fill:** Spec mismatch still broken after MAI-2240 identification — no `/api/guest/info` endpoint, returning diners can't pre-fill
3. **P2 — Chef Availability FE broken:** BE complete but **FE is calling the wrong API contract** — wrong query params (`start`/`end` vs `from`/`to`) and wrong response shape (`availData.slots` vs `availData.days` / `availData.weeklyTemplate`)

**Theme:** Fix the broken edges. All three are execution-ready with clear paths.

---

## 2. What's Changed Since MAI-2245 (2026-05-29 08:00 EDT)

| Item | Change |
|------|--------|
| Quote Expiry Config | ✅ `QUOTE_EXPIRY_DAYS` now = 2 (aligned with 48h API) |
| Quote Expiry Diner Notification | 🔴 Still missing — cron only notifies chef, not diner |
| Guest Pre-fill | 🔴 Still broken — Option B fix never executed |
| Chef Availability BE | ✅ Complete (MAI-2135-BE_completed.md confirmed) |
| Chef Availability FE | 🔴 Stalled — FE calls wrong API contract |

---

## 3. Active Work Tracking

| Issue | Title | Status | Age | Owner |
|-------|-------|--------|-----|-------|
| MAI-2235 (P0) | Quote Expiry: Add Diner Notifications | ⬜ TODO | ~16h stale | Backend Engineer |
| MAI-2240 (P1) | Guest Pre-fill: Fix with Option B | ⬜ TODO | ~16h stale | Backend Engineer |
| MAI-2135 (P2) | Chef Availability FE: Fix API contract mismatch | 🟡 In Progress | FE broken | Frontend Engineer |

---

## 4. Product Opportunities

### Opportunity #1: Quote Expiry — Add Diner Notifications to Cron 🔴 P0

**Problem:** `QUOTE_EXPIRY_DAYS` is now correctly `2` (aligned with 48h API block), but when the cron (`src/services/quote-expiry.ts`) marks a lead as `'expired'`, it only emails the chef. The diner gets no notification — they don't know their quote window closed, nor do they get any CTA to browse other chefs.

**Current behavior (quote-expiry.ts):**
- Runs daily at midnight
- Finds leads where `quoteSentAt + QUOTE_EXPIRY_DAYS < now` and `status IN ('quoted', 'responded')`
- Marks them `'expired'`
- Sends chef an email: "Your quote has expired. The diner didn't respond."

**What's missing:**
- **Diner email** when cron marks lead `'expired'` —告知 diner the chef's quote expired, suggest browsing other chefs
- **Idempotency** — if cron re-runs, should not resend emails (need `leadExpiredSentAt` field on lead record)

**Existing infrastructure:**
- Resend is live (confirmed by Fred, MAI-2245)
- `quote-expiry.ts` already processes leads and has diner context (email, name, service name)
- Leads table has `dinerEmail`, `clientName`, etc.

**In-scope fixes:**
1. Add `leadExpiredSentAt` column to leads table (tracks when diner expiry email was sent — for idempotency)
2. In `quote-expiry.ts`, when marking lead `'expired'`:
   - Check if `leadExpiredSentAt` is null (not yet notified)
   - If not sent, send diner email with CTA: "The chef's quote for [service] has expired. Browse other chefs to find your perfect match."
   - Set `leadExpiredSentAt = now()`
3. Chef notification on expiry remains (already exists)

**Out of scope:**
- 24h pre-warning (separate feature, lower priority)
- Auto-extend or re-quote workflow

**User Value:** Diners don't lose track of expired quotes. They get a gentle nudge to continue searching → more sessions don't die quietly. Revenue preserved as diners re-engage with the platform.

**Acceptance Criteria:**
- [ ] `leads` table has `leadExpiredSentAt` (TEXT ISO timestamp, nullable) — add via migration
- [ ] When `quote-expiry.ts` cron marks a lead `'expired'`, it also sends a diner email (if `leadExpiredSentAt` is null)
- [ ] Diner email includes: diner name, service/chef name, CTA to browse chefs
- [ ] `leadExpiredSentAt` is set after email sent (idempotency on re-run)
- [ ] Chef email on expiry still fires (unchanged)
- [ ] `npm run build` succeeds

**Effort:** ~45 min BE — one migration + ~15 lines in quote-expiry.ts
**Dependencies:** Resend (live), existing leads table
**Owner:** Backend Engineer

---

### Opportunity #2: Guest Pre-fill — Execute Option B 🟡 P1

**Problem:** MAI-2240 identified the spec mismatch: the `guest_session_id` approach was never built, and returning diners can't pre-fill the inquiry form. The recommended fix was Option B (lower effort, uses existing infrastructure). It was identified but never executed.

**What works today:**
- `diner_email`, `diner_name`, `diner_phone` cookies are set on inquiry submit (30-day rolling) — ✅
- Cookie-based diner recognition on booking page load — ✅

**What's broken:**
- `booking-page.ts` calls `/api/guest/prefill?session=xxx` → **no such endpoint exists** ❌
- No `guest_session_id` column on leads table ❌
- Form fields NOT pre-filled for returning diners ❌

**Recommended fix — Option B:**

1. Create `GET /api/guest/info?email=xxx` — returns lead data for that email:
   ```json
   { "email": "xxx", "name": "xxx", "phone": "xxx", "lastEventDate": "YYYY-MM-DD", "lastGuestCount": 4 }
   ```
   Returns most recent lead's diner info for that email.

2. `booking-page.ts` reads `diner_email` cookie on load (already there)
   - If cookie exists → call `/api/guest/info?email=<diner_email>`
   - If response has data → pre-fill Email, Name, Phone fields
   - If no prior lead → show empty form (no error, no crash)

3. Deprecate `guest_session_id` approach (never fully worked)

**User Value:** Returning diners don't retype their contact info. Faster inquiry submission → higher conversion. Particularly valuable for multi-chef inquiry flows where friction kills completion rates.

**Acceptance Criteria:**
- [ ] `GET /api/guest/info?email=xxx` returns `{ email, name, phone, lastEventDate, lastGuestCount }` for most recent lead with that email (or 404 if none)
- [ ] `booking-page.ts` reads `diner_email` cookie on load
- [ ] If cookie exists and `/api/guest/info` returns data, form fields (email, name, phone) pre-fill
- [ ] If no prior lead, form shows empty (no error, no crash)
- [ ] Works for both single-chef and multi-chef inquiry flows
- [ ] `npm run build` succeeds

**Effort:** ~1h BE — one new endpoint + frontend pre-fill wiring
**Dependencies:** None — uses existing cookies and lead data
**Owner:** Backend Engineer

---

### Opportunity #3: Chef Availability FE — Fix API Contract Mismatch 🟡 P2

**Problem:** The Chef Availability MVP BE is complete (`MAI-2135-BE_completed.md` confirmed all endpoints + booking conflict detection). But the FE settings page (`chef-availability-settings-page.ts`) is calling the API with the wrong contract — it will silently fail to load chef availability.

**Two mismatches in `chef-availability-settings-page.ts` `initPage()`:**

**Mismatch #1 — Wrong query parameter names:**
```javascript
// FE sends (wrong):
'/api/chefs/' + chefId + '/availability?start=' + today + '&end=' + endDate
// API expects (from chef-availability.ts):
'?from=' + from + '&to=' + to
```

**Mismatch #2 — Wrong response shape:**
```javascript
// FE expects (from old/incorrect spec):
availData.slots          // flat array
slotEntry.dayOfWeek     // number
slotEntry.is_blocked    // boolean
slotEntry.date          // string
slotEntry.time_windows  // array with {start, end}

// API returns (correct):
// Option A (date range): { chefId, from, to, days: [{date, dayName, dayOfWeek, isAvailable, reason, slots: [{startTime, endTime}]}] }
// Option B (no range): { chefId, weeklyTemplate: [{dayOfWeek, dayName, slots: [{id, startTime, endTime, isActive}], isAvailable}] }
```

**Impact:** Chef loads their availability settings page → API call with `start`/`end` params → API ignores them (no `from`/`to`) → returns weekly template → FE tries to iterate `availData.slots` which is `undefined` → availability never loads → chef sees empty form. **Silent failure — no error shown.**

**Fix:** Update the `initPage()` function in `chef-availability-settings-page.ts` to:
1. Use `from`/`to` query params (not `start`/`end`)
2. Handle both response shapes:
   - If response has `days` → date range response → extract weekly slots from first matching day-of-week
   - If response has `weeklyTemplate` → no range → use template directly
3. Map field names: `startTime`/`endTime` (not `start`/`end`), `isAvailable` check (not `is_blocked`)

**Acceptance Criteria:**
- [ ] `initPage()` calls `/api/chefs/:id/availability?from=<today>&to=<90days>`
- [ ] If response has `days` array (date range), FE correctly populates `currentSlots` from first matching day-of-week entry
- [ ] If response has `weeklyTemplate` array, FE correctly populates `currentSlots` from template
- [ ] Blocked dates are loaded from response's blocked date entries (via `isAvailable: false` + `reason: 'Blocked'`)
- [ ] Chef loads settings page → sees correct weekly schedule pre-filled → can edit and save
- [ ] `npm run build` succeeds

**Effort:** ~30 min FE — fix initPage() response parsing
**Dependencies:** BE is complete and verified (MAI-2135-BE_completed.md)
**Owner:** Frontend Engineer

---

## 5. Open Questions

| # | Question | Resolution |
|---|----------|------------|
| 1 | Should we also add a 24h pre-warning email for quotes? | Lower priority — separate from this cycle. Would extend `quote-reminder.ts` to also cover `status='quoted'` leads, not just `responded`. Not in scope for this POD. |
| 2 | MAI-2204 (Stripe + Resend live verification) — what's the current status? | Need Fred or BE to confirm if payments/emails are actually working end-to-end |
| 3 | Should `leadExpiredSentAt` be a TEXT column or INTEGER (unix ms)? | TEXT ISO timestamp — consistent with other `*At` columns in the schema |
| 4 | Does `booking-page.ts` already call `/api/guest/info` or still call `/api/guest/prefill`? | Needs verification — it was calling `/api/guest/prefill` per MAI-2240, need to confirm if switched |

---

## 6. Summary

| Priority | Opportunity | Effort | Owner |
|----------|-------------|--------|-------|
| P0 🔴 | Quote Expiry: Add Diner Notifications to Cron | ~45m BE | Backend Engineer |
| P1 🟡 | Guest Pre-fill: Execute Option B | ~1h BE | Backend Engineer |
| P2 🟡 | Chef Availability FE: Fix API Contract Mismatch | ~30m FE | Frontend Engineer |

**Immediate action:** Execute Opportunity #1 (P0). Low effort, high impact. Resend is live. Infrastructure exists. Just needs diner email path added to existing cron + idempotency field.

---

*Next POD cycle: ~08:00 UTC / 04:00 EDT*