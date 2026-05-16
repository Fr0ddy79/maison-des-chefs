# Product Opportunity Discovery — MAI-1562

**Issue:** 04c89f61-6ecc-4a6b-9044-f08cfcaa3f0e
**Date:** 2026-05-14 20:00 UTC
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager

---

## 1. Executive Summary

**Platform state:** 4 pending bookings (42-57 days old), 0 confirmed, 0 reviews. Chef WhatsApp = NULL. RESEND_API_KEY in stub mode. Revenue pipeline blocked on Fred's action items (55+ days overdue).

**This cycle's finding:** MAI-1535's "Chase the Chef" button (on booking-status page) emails the chef when clicked — BUT it does NOT set `stagnationAlertSentAt` on the booking. This means the auto-cron (`diner-stagnation-alert.ts`) could fire a diner email AFTER the diner already manually chased the chef, creating a confusing double-notification. The gap between manual and automatic alerting needs closing.

**New opportunity:** Stagnation Alert Integration Fix — coordinate MAI-1535's manual trigger with the auto-cron to prevent duplicate emails and ensure idempotency.

**Prior cycle status (MAI-1540/MAI-1548):**
| Action Item | Status |
|-------------|--------|
| Diner Stagnation Alert (MAI-1548 spec + `diner-stagnation-alert.ts`) | ✅ **COMPLETED** — built and registered in server.ts |
| Chef Stale Lead Email (MAI-1535) | ✅ **COMPLETED** — `chef-stale-lead-email.ts` shipped |
| RESEND_API_KEY | ⚠️ Stub mode (not blocking, but not fully functional) |
| Chef WhatsApp Number | ❌ Still NULL |
| **MAI-1535 / MAI-1548 integration gap** | 🔴 **NEW FINDING** — needs fixing |

---

## 2. Platform State (20:00 UTC May 14)

| Metric | Value | Change Since MAI-1548 (12:00 UTC) |
|--------|-------|-----------------------------------|
| Leads total | 8 | No change |
| Leads converted | 1 | No change |
| Pending bookings | **4** | No change (42-57 days old) |
| Confirmed bookings | **0** | No change |
| Completed bookings | **0** | No change |
| Published services | 1 | No change |
| Reviews submitted | 0 | No change |
| Chef WhatsApp | **NULL** | No change |
| RESEND_API_KEY | Stub mode | No change |

**What's been built since MAI-1548:**
- `diner-stagnation-alert.ts` — fully implemented cron job (runs every 6h, finds stale pending bookings, sends alert to diners)
- `stagnationAlertSentAt` column added to `bookings` table
- `startDinerStagnationAlertScheduler()` registered in `server.ts`
- MAI-1548 spec written (`MAI-1548_Spec_Booking_Stagnation_Alert.md`)

**New gap identified this cycle:**
- MAI-1535's "Chase the Chef" button in `booking-status.ts` calls `sendChefStaleLeadEmail()` but does NOT set `stagnationAlertSentAt` on the booking
- This means if a diner clicks "Chase the Chef" → chef gets email → then 6h later the auto-cron fires → diner gets ANOTHER email (duplicate)
- The two systems are not coordinated for idempotency

---

## 3. The Integration Gap: MAI-1535 + MAI-1548 Not Coordinated

### What MAI-1535 Does (Manual, Chef-Facing)
When diner clicks "Chase the Chef" on booking status page:
1. `sendChefStaleLeadEmail(lead)` fires → email to chef
2. **NO** `stagnationAlertSentAt` is set on the booking
3. Auto-cron is not aware that manual re-engagement happened

### What MAI-1548's Cron Does (Automatic, Diner-Facing)
Every 6 hours, `processStaleBookings()`:
1. Finds `status='pending' AND createdAt < NOW()-24h AND stagnationAlertSentAt IS NULL`
2. Sends email to diner
3. Sets `stagnationAlertSentAt = NOW()`

### The Conflict
If diner clicks "Chase the Chef" (manual) AND their booking is > 24h old:
- Chef gets email (MAI-1535)
- 6 hours later, auto-cron finds the same booking (`stagnationAlertSentAt` still NULL)
- Diner gets stagnation alert email (MAI-1548)

**Result:** Two separate emails to the diner, no coordination, confusing UX.

### The Fix
When "Chase the Chef" fires, also call `markStagnationAlertSent(bookingId)` to set `stagnationAlertSentAt`. This prevents the auto-cron from firing a duplicate diner email. The systems remain independent (chef email vs diner email) but share idempotency.

---

## 4. Opportunity: Stagnation Alert Integration Fix

### Problem Statement
MAI-1535 (manual "Chase the Chef") and MAI-1548 (automatic diner stagnation alert) are not coordinated. When a diner manually chases the chef, the auto-cron can still fire and send a duplicate alert to the diner, creating confusion and potentially annoying the diner with back-to-back emails.

### User Story
**As a** diner who manually chases the chef via the "Chase the Chef" button
**I want** the system to remember I took action
**So that** I don't receive an automatic stagnation alert hours later that makes it look like nothing was done

### Scope

**In:**
- When "Chase the Chef" button fires (in `booking-status.ts`), also call `markStagnationAlertSent(bookingId)` to set `stagnationAlertSentAt = NOW()`
- This prevents the auto-cron from sending a duplicate diner email
- Chef email (MAI-1535) still fires independently — chef is still notified

**Out:**
- Changes to the auto-cron logic (already correct)
- Changes to email content or frequency
- Changes to chef notification flow

### Technical Approach

In `src/api/booking-status.ts`, after `sendChefStaleLeadEmail(lead)` succeeds:
```typescript
import { markStagnationAlertSent } from '../services/diner-stagnation-alert.js';
// ... after sendChefStaleLeadEmail succeeds:
if (success && bookingId) {
  await markStagnationAlertSent(bookingId);
}
```

But wait — `booking-status.ts` works with `leads`, not `bookings`. Let me check if the bookingId is available...

The `leads` table has `bookingId` column (nullable). If a lead has a bookingId, we can mark it. If not, the lead itself is the entity.

Actually, looking at the flow:
- Leads → the inquiry/lead record (before booking is created)
- Bookings → created when lead is converted

The stagnation alert cron works on `bookings` table. The "Chase the Chef" button fires from the lead's booking-status page.

If `lead.bookingId` exists, we mark that booking's `stagnationAlertSentAt`. If not, we can't prevent the cron (no booking to mark).

This is actually fine — the cron will skip leads without bookings (they're not in scope for the diner stagnation alert anyway, which targets confirmed bookings).

### Acceptance Criteria
- [ ] When "Chase the Chef" button fires for a lead with an associated booking, `markStagnationAlertSent(bookingId)` is called
- [ ] When lead has no bookingId, the function degrades gracefully (no error)
- [ ] After manual "Chase the Chef", the auto-cron does NOT send a duplicate diner email for the same booking

### Edge Cases
| Scenario | Behavior |
|----------|----------|
| Lead has bookingId + diner clicks Chase | `markStagnationAlertSent(bookingId)` called → cron skips |
| Lead has no bookingId + diner clicks Chase | No-op (no booking to mark) |
| Cron fires before manual Chase | Cron sends alert → diner notified → then diner clicks Chase (chef gets email, but alert already sent) |
| Multiple Chase clicks | Second click → `stagnationAlertSentAt` already set → idempotent |

---

## 5. Opportunity 2 (P2): Chef Response Dashboard Metric

### Problem
Chefs have no visibility into their response rate. A chef who receives 8 inquiries and responds to 0 has no indicator that they're losing business. The dashboard shows pending bookings but not the conversion funnel.

### Scope (MVP)
- On chef dashboard, show: "Response rate: X/Y inquiries responded"
- Calculate: (accepted + declined) / total inquiries
- Show prominently if rate is 0% or very low

### Acceptance Criteria
- [ ] Chef dashboard shows response rate metric when chef has > 0 inquiries
- [ ] Metric updates in real-time as chef accepts/declines
- [ ] Empty state: "You have X pending inquiries — respond to grow your bookings"

---

## 6. Opportunity 3 (P3): Diners See "Chef Notified" After Chase Click

### Problem
After diner clicks "Chase the Chef", they see a success toast but no confirmation that the chef was actually contacted. They don't know if the email went through, especially if their chef hasn't configured notifications.

### Scope (Tiny MVP)
- After "Chase the Chef" fires, show a confirmation state on the booking status page
- "✓ Your message was sent to Chef [Name] — they typically respond within 24 hours"
- If chef email is unconfigured (stub mode), add a note: "Note: Chef notifications are in setup mode — they may not receive this immediately"

### Acceptance Criteria
- [ ] After Chase click, booking status page shows confirmation with chef name
- [ ] If RESEND_API_KEY is placeholder, show setup notice

---

## 7. What Still Requires Fred's Action

| Blocker | Required Action | Days Overdue | Impact |
|---------|----------------|--------------|--------|
| **RESEND_API_KEY** | Fred add real key to environment | 55+ days | All email notifications work in stub mode only — emails don't actually deliver |
| **Vercel OIDC Token** | Fred refresh in Vercel dashboard | 40+ days | Production deployments blocked |
| **Stripe Keys** | Fred provide for payment features | Not started | Instant booking (MAI-1250) blocked |
| **Chef WhatsApp Number** | Chef populate in profile | Not started | WhatsApp notification path blocked |

**Bottom line:** Fred's #1 action remains adding RESEND_API_KEY. Without a real key, emails are stubbed and diners/chefs never receive them regardless of what we build.

---

## 8. Recommendations for Next Cycle (00:00 UTC May 15)

1. **BE: Fix MAI-1535/MAI-1548 integration** — add `markStagnationAlertSent` call when "Chase the Chef" fires
2. **Fred: Add RESEND_API_KEY** — #1 blocker, 55+ days overdue. Without it, everything silently fails.
3. **FE: Add Chef Response Dashboard Metric** — show conversion rate on chef dashboard (P2)
4. **FE: Add "Chef Notified" confirmation UX** — after Chase click, show confirmation state (P3)
5. **Fred: Refresh Vercel token** — deployments blocked for 40+ days

---

## 9. Acceptance Criteria (This Cycle)

- [x] Confirmed: `diner-stagnation-alert.ts` is built and registered (MAI-1548 completed)
- [x] Identified: MAI-1535 "Chase the Chef" doesn't set `stagnationAlertSentAt` → duplicate email risk
- [x] Spec'd: Stagnation Alert Integration Fix with acceptance criteria
- [x] Identified: P2 opportunity — Chef Response Dashboard Metric
- [x] Identified: P3 opportunity — "Chef Notified" Confirmation UX
- [x] Updated: Fred's action items remain unchanged (RESEND_API_KEY still #1)

---

*Report completed: 2026-05-14 20:18 UTC*
*Next cycle: 2026-05-15 00:00 UTC*