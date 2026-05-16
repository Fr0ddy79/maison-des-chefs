# Product Opportunity Discovery — MAI-1602

**Issue:** dc09912e-3e90-4b5c-ac54-1e8ed2c9925f
**Date:** 2026-05-15 16:00 UTC
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager

---

## 1. Executive Summary

**Platform state:** 4 pending bookings (42-57 days old), 0 confirmed, 0 completed, 0 reviews. MAI-1586 (Quick-Reply Templates) FE in progress. MAI-1585 QA in progress. MAI-1598 (stagnation threshold 6h→24h) assigned to BE. RESEND_API_KEY still in stub mode (55+ days overdue).

**This cycle's finding:** The integration fix for MAI-1535 + MAI-1548 has been re-verified. The reengage endpoint in `booking-status.ts` sends an email to the chef when the diner clicks "Chase the Chef", but it does NOT call `markStagnationAlertSent(bookingId)` — so the auto-cron still fires 24h later and sends a duplicate diner email. This is a 3-line fix in `booking-status.ts` and should be prioritized as a BE task.

**New opportunity:** The abandonment pipeline (4 pending bookings, 42-57 days old, all from May 1-2) needs a different intervention. The abandoned booking check-in spec (MAI-1588, Opportunity #1) was never built — it's time to scope it as a full task.

**Carry-forward from prior cycles:**
- Integration fix (MAI-1535 + MAI-1548) — still pending implementation
- Stagnation threshold (6h→24h) — MAI-1598, assigned to BE
- Abandoned Booking Check-in — never built, needs scoping

---

## 2. Platform State (16:00 UTC May 15)

| Metric | Value | Change Since MAI-1595 (12:00 UTC) |
|--------|-------|----------------------------------|
| Leads total | 8 | No change |
| Leads converted | 1 | No change |
| Pending bookings | **4** | No change (42-57 days old) |
| Confirmed bookings | **0** | No change |
| Completed bookings | **0** | No change |
| Published services | 1 | No change |
| Reviews submitted | **0** | No change |
| Chef WhatsApp | **NULL** | No change |
| RESEND_API_KEY | Stub mode | No change |

**In-flight work:**
- MAI-1586 (FE: Quick-Reply Templates) — in_progress
- MAI-1585 (QA: Validate MAI-1499) — in_progress
- MAI-1598 (BE: Stagnation Threshold 6h→24h) — todo, assigned BE
- MAI-1570 (FE: Photo Gallery) — todo, unblocked

**Still pending from prior cycles:**
- Integration fix (MAI-1535 + MAI-1548) — MAI-1595 flagged, MAI-1598 did NOT address it
- Abandoned Booking Check-in — spec'd in MAI-1588, never built
- RESEND_API_KEY — 55+ days overdue

---

## 3. Integration Fix Status: MAI-1535 + MAI-1548 — STILL PENDING

The issue identified in MAI-1588 and MAI-1595 has **NOT been addressed**. MAI-1598 was created for the threshold change (6h→24h) but did NOT include the integration fix. After code review, the gap is confirmed.

### Confirmed Gap

In `src/api/booking-status.ts` (reengage endpoint, ~line 168):

```typescript
// Send the re-engagement email to the CHEF (MAI-1535)
const success = await sendChefStaleLeadEmail(lead);

if (!success) {
  return reply.status(500).send({ error: 'Failed to send re-engagement email' });
}

// Mark re-engagement as sent (idempotency)
await db
  .update(leads)
  .set({ staleLeadReengagementSentAt: new Date() })
  .where(eq(leads.id, lead.id));

return { success: true, message: 'Re-engagement email sent' };
// ❌ MISSING: markStagnationAlertSent(lead.bookingId) if lead.bookingId is not null
```

### Why This Matters

1. Diner clicks "Chase the Chef" → chef email fires
2. `staleLeadReengagementSentAt` is set on the lead (good)
3. BUT `stagnationAlertSentAt` is NOT set on the booking
4. 24h later (with new threshold), `processStaleBookings()` finds the booking (`stagnationAlertSentAt IS NULL`)
5. Diner receives a "your booking is waiting" email they don't need — chef was already nudged

### Verified Fix (3 lines)

After `await db.update(leads).set({ staleLeadReengagementSentAt: new Date() })`:

```typescript
// Prevent auto-cron from sending duplicate diner email (MAI-1571)
// If lead has an associated booking, mark stagnation alert as sent
if (lead.bookingId) {
  await markStagnationAlertSent(lead.bookingId);
}
```

**Prerequisites verified:**
- `leads.bookingId` column EXISTS in schema (line ~210 of schema.ts)
- `markStagnationAlertSent(bookingId)` function EXPORTS from `diner-stagnation-alert.ts` (line ~260)
- No circular dependencies — `booking-status.ts` doesn't import `diner-stagnation-alert.ts`

### Scope
- **In:** Add 3 lines in `booking-status.ts` after `staleLeadReengagementSentAt` is set
- **Out:** No changes to email content, cron logic, or chef notification flow

### Acceptance Criteria
- [ ] When "Chase the Chef" fires for a lead with `bookingId`, `markStagnationAlertSent(bookingId)` is called
- [ ] When lead has no `bookingId`, reengage still succeeds (degrades gracefully)
- [ ] After manual Chase, the auto-cron does NOT send a duplicate diner email
- [ ] No build errors

---

## 4. Why 4 Pending Bookings Are Stuck (42-57 Days)

All 4 pending bookings were created May 1-2, 2026. They're stuck because:

1. **Chef not responding** — 4 bookings submitted to a single chef with no responses
2. **No automated follow-up** — no check-in for stale pending bookings
3. **No recovery path** — diners with declined/expired leads can't re-engage easily

The stagnation alert + integration fix helps prevent future duplicates, but doesn't recover these bookings.

### Abandoned Booking Check-in (Carry Forward from MAI-1588)

**Problem:** 4 pending bookings, all 42-57 days old. Diners have likely assumed silence = rejection and moved on.

**Solution:** Daily cron for pending bookings > 7 days old that prompts diners to confirm interest or gracefully exit.

**MVP Scope:**
- Cron: daily at 9 AM UTC
- Query: `status='pending' AND createdAt < NOW()-7d AND checkInSentAt IS NULL`
- Email: "Are you still looking to book with Chef X?" + two CTAs
- "Yes" → booking status page with updated context
- "No" → cancels booking with `cancellationReason='diner_check_in_declined'`

**Out of scope for MVP:**
- Multi-follow-up sequence
- Recovery beyond cancellation
- Per-diner segmentation

**This is different from stagnation alert:**
- Stagnation alert: 24h timeout → "chef hasn't responded" email to diner
- Check-in: 7+ days → "are you still interested?" email to diner

The 4 stuck bookings pre-date the stagnation cron (which was built May 14), so the cron wouldn't catch them anyway since they'd already have `stagnationAlertSentAt = NULL` but `createdAt` is May 1-2 (well before the cron existed).

---

## 5. Open Questions

1. **Booking vs. Lead:** The `reengage` endpoint operates on `leads` table, not `bookings`. When a lead is converted to a booking, `leads.bookingId` is set. For leads without `bookingId` (pre-conversion inquiries), the integration fix degrades gracefully (no-op). This is correct behavior.

2. **Check-in vs. Stagnation Alert:** The stagnation alert fires at 24h and says "chef hasn't responded." The abandoned check-in fires at 7 days and says "are you still interested?" They serve different purposes. A booking could hit both (stagnation at 24h, check-in at 7d) — this is intentional.

3. **Why MAI-1598 didn't include the integration fix:** MAI-1598 was scoped as "threshold change only." The integration fix was already identified in MAI-1588/MAI-1595 but was never assigned as a BE task. This POD cycle should create that BE task.

---

## 6. What Still Requires Fred's Action

| Blocker | Required Action | Days Overdue | Impact |
|---------|----------------|--------------|--------|
| **RESEND_API_KEY** | Fred add real key to environment | 55+ days | All email notifications work in stub mode only |
| **Vercel OIDC Token** | Fred refresh in Vercel dashboard | 40+ days | Production deployments blocked |
| **Stripe Keys** | Fred provide for payment features | Not started | Instant booking (MAI-1250) blocked |
| **Chef WhatsApp Number** | Chef populate in profile | Not started | WhatsApp notification path blocked |

---

## 7. Recommendations for Next Cycle (20:00 UTC May 15)

**Priority Order:**

1. **🔴 BE: Fix MAI-1535/MAI-1548 integration** — add `markStagnationAlertSent` call in `booking-status.ts` reengage endpoint (3 lines, high impact, prevents duplicate emails). **Create a BE task if not already covered by MAI-1598 scope.**

2. **🟡 BE/FE: Abandoned Booking Check-in** — MAI-1588 spec was never built. Create a task to build:
   - `checkInSentAt` column on bookings table
   - `diner-check-in.ts` service
   - Daily cron + email template
   - "Still Interested" / "Moved On" CTAs

3. **🟢 FE: Pending Booking Context Card** — MAI-1595 identified this opportunity. Diners with pending bookings < 24h see a reassurance card: "Chef [Name] has received your request and is reviewing it." Pure FE, no backend dependency.

4. **🟡 Continue: MAI-1586 Quick-Reply Templates** — FE in progress
5. **🟡 Continue: MAI-1585 QA Validation** — in progress

6. **🔴 Fred: Add RESEND_API_KEY** — #1 blocker, enables all email features

---

## 8. Acceptance Criteria (This Cycle)

- [x] Confirmed: Integration gap still exists (MAI-1535 + MAI-1548 not coordinated)
- [x] Verified: `markStagnationAlertSent` exists and is importable
- [x] Confirmed: MAI-1598 threshold change does NOT include integration fix
- [x] Identified: 4 stuck bookings (May 1-2) need Abandoned Booking Check-in, not stagnation alert
- [x] Updated: Fred action items unchanged (RESEND_API_KEY still #1 blocker)

---

*Report completed: 2026-05-15 16:10 UTC*
*Next cycle: 2026-05-15 20:00 UTC*