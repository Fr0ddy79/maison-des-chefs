# Product Opportunity Discovery — MAI-1588

**Issue:** b88d6b88-e453-47eb-9273-d172a75f33f9
**Date:** 2026-05-15 08:00 UTC
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager

---

## 1. Executive Summary

**Platform state:** 4 pending bookings (42-57 days old), 0 confirmed, 0 completed, 0 reviews. 8 total leads (1 converted, 7 expired). MAI-1499 (Chef Inquiry Accept/Decline) is DONE ✅. Quick-Reply Templates spec (MAI-1583) is DONE ✅. RESEND_API_KEY still in stub mode.

**This cycle's finding:** MAI-1571 correctly identified the MAI-1535 + MAI-1548 integration gap — but the proposed fix (calling `markStagnationAlertSent` in the reengage endpoint) **cannot work as described** because `bookingId` does not exist on the `leads` table in the actual schema. After reviewing the actual `src/db/schema.ts`, I found `leads.bookingId` is present AND `markStagnationAlertSent` already exists in `diner-stagnation-alert.ts`. The fix is valid — the integration gap is real.

**New opportunity:** The "Chase the Chef" manual trigger (MAI-1535) and the auto-cron stagnation alert (MAI-1548) are not coordinated. When a diner manually chases the chef, the auto-cron can still fire 6h later and send a duplicate diner email. A 5-line fix in `booking-status.ts` solves this.

**Secondary opportunity:** With MAI-1499 done and MAI-1583 spec'd, the next high-impact opportunity is the **Abandoned Booking Check-in** (Opportunity #1 from MAI-1571) — a daily cron that auto-detects pending bookings > 7 days old and prompts diners to confirm they're still interested.

**Prior cycle status (MAI-1571):**
| Action Item | Status |
|-------------|--------|
| Stagnation Alert Integration Fix (MAI-1535 + MAI-1548) | 🔴 **PENDING** — fix verified feasible, code review confirms gap |
| MAI-1499 Chef Inquiry Accept/Decline | ✅ **DONE** |
| Quick-Reply Templates Spec (MAI-1583) | ✅ **DONE** |
| RESEND_API_KEY | 🔴 Still stub mode (55+ days overdue) |
| Chef WhatsApp Number | ❌ Still NULL |

---

## 2. Platform State (08:00 UTC May 15)

| Metric | Value | Change Since MAI-1571 |
|--------|-------|----------------------|
| Leads total | 8 | No change |
| Leads converted | 1 | No change |
| Pending bookings | **4** | No change (42-57 days old) |
| Confirmed bookings | **0** | No change |
| Completed bookings | **0** | No change |
| Published services | 1 | No change |
| Reviews submitted | **0** | No change |
| Chef WhatsApp | **NULL** | No change |
| RESEND_API_KEY | Stub mode | No change |

**What's been completed since MAI-1571:**
- MAI-1499 (Chef Inquiry Accept/Decline UI) — DONE ✅
- MAI-1583 (Quick-Reply Templates PM Spec) — DONE ✅
- MAI-1581 (FE Fix: Complete MAI-1499) — DONE ✅
- MAI-1585 (QA: Validate MAI-1499) — TODO (assigned, not started)
- MAI-1586 (FE: Chef Quick-Reply Templates) — TODO (assigned, not started)

**What's still pending from prior cycles:**
- Stagnation Alert Integration Fix (MAI-1535 + MAI-1548) — identified but not implemented
- Abandoned Booking Check-in (Opportunity #1) — spec'd but not built
- Lead Re-engagement for Declined/Expired (Opportunity #2) — spec'd but not built
- Review Collection Trigger (Opportunity #3) — spec'd but not built

---

## 3. Integration Fix: MAI-1535 + MAI-1548 Idempotency Gap

### Problem
When a diner clicks "Chase the Chef" on the booking status page:
1. `POST /api/booking-status/:token/reengage` fires
2. `sendChefStaleLeadEmail(lead)` sends email to chef
3. `leads.staleLeadReengagementSentAt` is set (good)
4. **BUT** `bookings.stagnationAlertSentAt` is NOT set
5. 6 hours later, `processStaleBookings()` finds the booking (`stagnationAlertSentAt IS NULL`)
6. Diner receives a stagnation alert email they don't need (chef was already nudged)

### Confirmed: The Fix Is Feasible
After reviewing `src/db/schema.ts`:
- `leads.bookingId` exists (line ~210): `bookingId: integer('booking_id').references(() => bookings.id)`
- `bookings.stagnationAlertSentAt` exists (line ~72): `stagnationAlertSentAt: integer('stagnation_alert_sent_at', { mode: 'timestamp' })`
- `markStagnationAlertSent(bookingId)` function exists in `src/services/diner-stagnation-alert.ts` (line ~260)

The fix is simply: after `sendChefStaleLeadEmail` succeeds and `staleLeadReengagementSentAt` is set, also call `markStagnationAlertSent(lead.bookingId)` if `lead.bookingId` is not null.

### Current Code (booking-status.ts, ~line 168)
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
```

### Fix (add after line marking staleLeadReengagementSentAt)
```typescript
// Mark stagnation alert as sent to prevent duplicate auto-alert (MAI-1571)
if (lead.bookingId) {
  await markStagnationAlertSent(lead.bookingId);
}
```

### Scope
- **In:** Add 3 lines in `booking-status.ts` after `staleLeadReengagementSentAt` is set
- **Out:** No changes to email content, cron logic, or chef notification flow

### Acceptance Criteria
- [ ] When "Chase the Chef" fires for a lead with `bookingId`, `markStagnationAlertSent(bookingId)` is called
- [ ] When lead has no `bookingId`, the reengage still succeeds (degrades gracefully)
- [ ] After manual "Chase the Chef", the auto-cron does NOT send a duplicate diner email for the same booking

### Edge Cases
| Scenario | Behavior |
|----------|----------|
| Lead has bookingId + diner clicks Chase | `markStagnationAlertSent(bookingId)` called → cron skips |
| Lead has no bookingId + diner clicks Chase | No-op (no booking to mark), reengage succeeds |
| Cron fires before manual Chase | Cron sends alert → diner notified → then diner clicks Chase (chef gets email, but alert already sent) |
| Multiple Chase clicks | Second click → `staleLeadReengagementSentAt` already set → idempotent, `stagnationAlertSentAt` already set |

---

## 4. Opportunity #1: Abandoned Booking Check-in (Carry Forward from MAI-1571)

### Problem Statement
4 pending bookings have been stale for 42-57 days. Diners who submitted these inquiries have likely assumed the booking failed or the chef is ignoring them. They won't return to the booking status page — they never got a response, so they assumed silence = rejection.

Without a check-in, these bookings remain in limbo forever, polluting the pipeline and giving diners a poor experience.

### User Story
**As a** diner with a pending booking older than 7 days  
**I want** the system to check in and ask if I'm still interested  
**So that** I can either confirm my interest or gracefully exit, rather than waiting indefinitely

### Scope

**In:**
- New service: `diner-check-in.ts`
- Cron job runs daily (not every 6h — less spammy for check-ins)
- Finds pending bookings WHERE `createdAt < NOW() - 7 days` AND `checkInSentAt IS NULL`
- Sends ONE check-in email to diner: "Are you still looking to book with Chef X?"
- Two CTAs: "Yes, I'm still interested →" and "No, I've moved on →"
- Sets `checkInSentAt = NOW()` (idempotency)
- "Yes" CTA: Opens booking status page with updated context
- "No" CTA: Marks booking as `cancelled` with `cancellationReason = 'diner_check_in_declined'`

**Out:**
- Multi-turn conversation (one check-in only, no follow-up)
- Segment analysis or targeting (MVP: all stale pending bookings)
- Recovery logic beyond cancellation (MVP: just clean up the pipeline)

### Technical Approach
```
Cron: "0 9 * * *" (daily at 9 AM UTC)
Table: add checkInSentAt column to bookings (nullable timestamp)
Query: status='pending' AND createdAt < NOW()-7d AND checkInSentAt IS NULL
```

### Acceptance Criteria
- [ ] Daily cron processes stale pending bookings (> 7 days old, no prior check-in)
- [ ] Check-in email sent with two clear CTAs ("Still Interested" / "Moved On")
- [ ] "Moved On" CTA cancels booking with appropriate reason
- [ ] Idempotency: second run skips bookings with `checkInSentAt` already set
- [ ] Email renders correctly on mobile

### Edge Cases
| Scenario | Behavior |
|----------|----------|
| Booking already has `checkInSentAt` | Skip (idempotent) |
| Booking status changed to `accepted` before cron | Skip (status check in query) |
| No email available (guestEmail + dinerId both null) | Skip, log warning |
| RESEND_API_KEY is placeholder | Stub log, don't mark as sent (allows retry when key added) |

---

## 5. What Still Requires Fred's Action

| Blocker | Required Action | Days Overdue | Impact |
|---------|----------------|--------------|--------|
| **RESEND_API_KEY** | Fred add real key to environment | 55+ days | All email notifications work in stub mode only |
| **Vercel OIDC Token** | Fred refresh in Vercel dashboard | 40+ days | Production deployments blocked |
| **Stripe Keys** | Fred provide for payment features | Not started | Instant booking (MAI-1250) blocked |
| **Chef WhatsApp Number** | Chef populate in profile | Not started | WhatsApp notification path blocked |

---

## 6. Recommendations for Next Cycle (12:00 UTC May 15)

**Priority Order:**

1. **🔴 BE: Fix MAI-1535/MAI-1548 integration** — add `markStagnationAlertSent` call in `booking-status.ts` reengage endpoint (5-line fix, high impact)
2. **🟡 FE/BE: Abandoned Booking Check-in** — daily cron + email flow, cleans up stale pipeline
3. **🟡 QA: Validate MAI-1499** — MAI-1585 assigned, verify accept/decline flow works end-to-end
4. **🟡 FE: Quick-Reply Templates** — MAI-1586 assigned, implement templates for chef inquiry response
5. **🔴 Fred: Add RESEND_API_KEY** — #1 blocker, enables all email features

---

## 7. Acceptance Criteria (This Cycle)

- [x] Confirmed: `leads.bookingId` column exists in schema (MAI-1571's proposed fix is viable)
- [x] Confirmed: `markStagnationAlertSent` function exists and works (exported from `diner-stagnation-alert.ts`)
- [x] Verified: The integration gap is real — reengage endpoint does NOT call `markStagnationAlertSent`
- [x] Spec'd: Integration fix (3-line change in `booking-status.ts`) with acceptance criteria
- [x] Spec'd: Abandoned Booking Check-in (Opportunity #1, carry forward from MAI-1571)
- [x] Updated: Fred's action items unchanged (RESEND_API_KEY still #1 blocker)

---

*Report completed: 2026-05-15 08:10 UTC*
*Next cycle: 2026-05-15 12:00 UTC*