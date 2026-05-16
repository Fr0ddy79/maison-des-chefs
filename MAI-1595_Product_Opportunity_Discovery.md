# Product Opportunity Discovery — MAI-1595

**Issue:** 8b8b9a67-6b15-4ea4-be0c-fefb67567063
**Date:** 2026-05-15 12:00 UTC
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager

---

## 1. Executive Summary

**Platform state:** 4 pending bookings (42-57 days old), 0 confirmed, 0 completed, 0 reviews. MAI-1499 (Chef Inquiry Accept/Decline) is DONE. MAI-1586 (Quick-Reply Templates) FE in progress. MAI-1585 QA in progress. RESEND_API_KEY still in stub mode (55+ days overdue).

**This cycle's finding:** The stagnation alert cron fires after only 6 hours — too aggressive for a fine dining booking context where 24-48h chef response time is normal. This creates noise: diners get "chef hasn't responded" emails while chefs are still considering. The fix is a one-line change to the staleness threshold. Additionally, the "Chase the Chef" manual trigger (MAI-1535) and the auto-cron (MAI-1548) remain uncoordinated — the integration fix identified in MAI-1588 is still not implemented.

**New opportunity:** A diner-facing booking context card ("Your booking is with Chef X — they're preparing a response") reduces anxiety for pending bookings under 24h old and sets expectations. This is low-effort, high-empathy UX that reduces support inquiries without requiring code changes to the backend or notification system.

---

## 2. Platform State (12:00 UTC May 15)

| Metric | Value | Change Since MAI-1588 (08:00 UTC) |
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
- MAI-1570 (FE: Photo Gallery) — TODO, unblocked

**Still pending from prior cycles:**
- Stagnation Alert Integration Fix (MAI-1535 + MAI-1548) — identified in MAI-1588, not implemented
- Stagnation cron staleness threshold (6h → 24h minimum) — identified this cycle
- Abandoned Booking Check-in — spec'd in MAI-1588, not built

---

## 3. Integration Fix Status: MAI-1535 + MAI-1548

The fix identified in MAI-1588 is verified and still pending implementation. The change is in `src/api/booking-status.ts` (~line 175):

**Current code (line ~175):**
```typescript
await db
  .update(leads)
  .set({ staleLeadReengagementSentAt: new Date() })
  .where(eq(leads.id, lead.id));

return { success: true, message: 'Re-engagement email sent' };
```

**Fix (add after setting staleLeadReengagementSentAt):**
```typescript
// Prevent auto-cron from sending duplicate diner email (MAI-1571)
if (lead.bookingId) {
  await markStagnationAlertSent(lead.bookingId);
}
```

**Impact:** When diner clicks "Chase the Chef", the auto-cron 6h later will skip that booking. Without this fix, the auto-cron fires and sends a duplicate "chef hasn't responded" email to the diner.

**This fix still needs a BE ticket. Flag for CEO to create task.**

---

## 4. New Opportunity: Pending Booking Context Card

### Problem Statement

Diners with pending bookings (status: "pending") see no updates for days. They submitted an inquiry, got a generic "we've received your request" message, and then nothing. They don't know if:
- The chef received it
- The chef is considering it
- Their booking is lost in a system
- They should follow up

This anxiety drives:
- Duplicate inquiry submissions
- "Is this still available?" emails to support
- Early abandonment (diner assumes silence = rejected and moves on)

### User Story

**As a** diner with a pending booking  
**I want** to see context about my booking status on the booking status page  
**So that** I know the chef has received my request and is considering it, rather than assuming it's fallen silent

### Root Cause

The booking status page for pending bookings shows the inquiry details but no reassurance message. The MAI-1491 inquiry stepper was meant to address this, but it's not implemented yet. The immediate fix is simpler: add a context card to the pending booking state.

### Scope

**In:**
- Add a context banner/card to the booking status page when `lead.status === 'pending'` and `lead.createdAt < 24h ago`
- Card text: "Chef [Name] has received your booking request and is reviewing it. They'll respond within 24-48 hours."
- Card is informational only — no CTA, no action required
- Card does NOT show for bookings already confirmed/declined/cancelled

**Out:**
- No email changes
- No backend changes
- No notification triggers
- No stepper or multi-step flow (MAI-1491 handles that separately)

### Acceptance Criteria
- [ ] Pending bookings < 24h old show context card with reassurance message
- [ ] Pending bookings > 48h old show different message: "Chef is taking longer than expected — you can chase them below"
- [ ] Confirmed/declined/cancelled bookings do not show the card
- [ ] Card is visible on mobile

### Edge Cases
| Scenario | Behavior |
|----------|----------|
| No chef name available | Show generic "The chef has received your request" |
| Booking status changes to confirmed while card is showing | Card disappears, confirmed state shown |
| RESEND_API_KEY is stub | Card still shows (no email dependency) |

---

## 5. Stagnation Cron Threshold: 6h → 24h

### Problem

The auto-stagnation alert fires 6 hours after a lead is created if the chef hasn't responded. For fine dining bookings, 6 hours is extremely aggressive — chefs may be menu planning, working events, or simply not checking the platform constantly. The 6h threshold creates false positives: diners receive "chef hasn't responded" emails for bookings that are actively being considered.

### Current Behavior
- `processStaleBookings()` runs on cron (every 6h)
- Finds bookings: `status = 'pending' AND stagnationAlertSentAt IS NULL AND createdAt < NOW() - 6 hours`
- Sends stagnation alert to diner

### Proposed Fix (1 line in service config)
Change the staleness threshold from 6 hours to 24 hours in `src/services/diner-stagnation-alert.ts`.

### Acceptance Criteria
- [ ] Stagnation alerts fire for pending bookings > 24h old, not 6h
- [ ] Existing "Chase the Chef" flow still works (it's separate from the cron)
- [ ] The integration fix (section 3) is also implemented so manual Chase doesn't conflict with auto-cron

---

## 6. What Still Requires Fred's Action

| Blocker | Required Action | Days Overdue | Impact |
|---------|----------------|--------------|--------|
| **RESEND_API_KEY** | Fred add real key to environment | 55+ days | All email notifications work in stub mode only |
| **Vercel OIDC Token** | Fred refresh in Vercel dashboard | 40+ days | Production deployments blocked |
| **Stripe Keys** | Fred provide for payment features | Not started | Instant booking (MAI-1250) blocked |
| **Chef WhatsApp Number** | Chef populate in profile | Not started | WhatsApp notification path blocked |

---

## 7. Recommendations for Next Cycle (16:00 UTC May 15)

**Priority Order:**

1. **🟡 BE: Fix MAI-1535/MAI-1548 integration** — add `markStagnationAlertSent` call in `booking-status.ts` reengage endpoint (~3 lines, high impact, prevents duplicate emails)
2. **🟡 BE: Adjust stagnation cron threshold** — change 6h → 24h in `diner-stagnation-alert.ts` (1 line, reduces noise)
3. **🟢 FE: Pending Booking Context Card** — adds reassurance UX to booking status page for pending bookings
4. **🟡 FE: Quick-Reply Templates** — MAI-1586, continue implementation
5. **🟡 QA: Complete MAI-1585** — validate MAI-1499 accept/decline flow
6. **🔴 Fred: Add RESEND_API_KEY** — #1 blocker, enables all email features

---

## 8. Acceptance Criteria (This Cycle)

- [x] Confirmed: MAI-1588 integration fix still pending (not implemented)
- [x] Identified: Stagnation cron 6h threshold is too aggressive for fine dining context
- [x] Spec'd: Pending Booking Context Card (FE, 1 component, no backend changes)
- [x] Spec'd: Stagnation cron threshold adjustment (1 line change, BE)
- [x] Updated: Fred's action items unchanged (RESEND_API_KEY still #1 blocker)

---

*Report completed: 2026-05-15 12:10 UTC*
*Next cycle: 2026-05-15 16:00 UTC*
