# Product Opportunity Discovery — MAI-1571

**Issue:** 809f967e-1c5f-4625-946e-eb8a01bf15e5
**Date:** 2026-05-15 00:00 UTC
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager

---

## 1. Executive Summary

**Platform state:** 4 pending bookings (42-57 days old), 0 confirmed, 0 completed, 0 reviews. 8 total leads (1 converted, 7 expired). RESEND_API_KEY still in stub mode.

**This cycle's findings:**

- **MAI-1562 gap confirmed:** `diner-stagnation-alert.ts` is built (MAI-1548), but the "Chase the Chef" button in `booking-status.ts` (MAI-1535) does NOT call `markStagnationAlertSent(bookingId)` — creating a duplicate email risk. **This is the #1 integration fix to complete.**

- **NEW OPPORTUNITY #1:** Abandoned Booking Check-in — Auto-detect pending bookings > 7 days old and prompt diners to confirm they're still interested, reducing silent abandonment.

- **NEW OPPORTUNITY #2:** Lead Re-engagement for Declined/Expired — Allow chefs to re-open declined/expired leads with a "Request Another Quote" flow, recovering leads that were lost prematurely.

- **NEW OPPORTUNITY #3:** Review Collection Trigger — Set up automated review requests for completed bookings to start building social proof (blocked at 0 reviews since launch).

**Prior cycle status (MAI-1562):**
| Action Item | Status |
|-------------|--------|
| Stagnation Alert Integration Fix (MAI-1535 + MAI-1548) | 🔴 **PENDING** — `markStagnationAlertSent` not called in reengage endpoint |
| Chef Response Dashboard Metric | ⚠️ Not started |
| "Chef Notified" Confirmation UX | ⚠️ Not started |
| RESEND_API_KEY | 🔴 Still stub mode (55+ days overdue) |
| Chef WhatsApp Number | ❌ Still NULL |

---

## 2. Platform State (00:00 UTC May 15)

| Metric | Value | Change Since MAI-1562 |
|--------|-------|----------------------|
| Leads total | 8 | No change |
| Leads converted | 1 | No change |
| Leads expired | 7 | No change |
| Pending bookings | **4** | No change (42-57 days old) |
| Confirmed bookings | **0** | No change |
| Completed bookings | **0** | No change |
| Published services | 1 | No change |
| Reviews submitted | **0** | No change |
| Chef WhatsApp | **NULL** | No change |
| RESEND_API_KEY | Stub mode | No change |

**Key observation:** Platform has 8 leads but 0 completed bookings and 0 reviews. This is a conversion funnel breakdown — inquiries are dying at the "pending" stage. The stagnant pending bookings are a symptom of the chef not responding AND no automated recovery system for diners who gave up.

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

### The Fix
In `src/api/booking-status.ts`, after `sendChefStaleLeadEmail(lead)` succeeds and `staleLeadReengagementSentAt` is set:

```typescript
// If lead has an associated booking, mark stagnation alert as sent to prevent duplicate auto-alert
if (lead.bookingId) {
  await markStagnationAlertSent(lead.bookingId);
}
```

This is a 3-line fix that prevents confusing duplicate emails.

### Scope
- **In:** Add `markStagnationAlertSent(lead.bookingId)` call after successful reengage
- **Out:** No changes to email content, cron logic, or chef notification flow

### Acceptance Criteria
- [ ] When "Chase the Chef" fires for a lead with `bookingId`, `markStagnationAlertSent(bookingId)` is called
- [ ] When lead has no `bookingId`, the reengage still succeeds (degrades gracefully)
- [ ] After manual Chase, the auto-cron skips that booking (idempotency confirmed)

---

## 4. Opportunity #1: Abandoned Booking Check-in

### Problem Statement
4 pending bookings have been stale for 42-57 days. Diners who submitted these inquiries have likely assumed the booking failed or the chef is ignoring them. They won't return to the booking status page — they never got a response, so they assumed silence = rejection.

Without a check-in, these bookings remain in limbo forever, polluting the pipeline and giving diners a poor experience.

### User Story
**As a** diner with a pending booking older than 7 days  
**I want** the system to check in and ask if I'm still interested  
**So that** I can either confirm my interest or gracefully exit, rather than waiting indefinitely

### Scope

**In:**
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
```typescript
// New service: diner-check-in.ts
interface CheckInParams {
  dinerEmail: string;
  dinerFirstName: string;
  chefName: string;
  serviceName: string;
  eventDate: string;
  bookingStatusUrl: string;
}

// Cron: "0 9 * * *" (daily at 9 AM UTC)
// Finds: status='pending' AND createdAt < NOW()-7d AND checkInSentAt IS NULL
// Sends check-in email, sets checkInSentAt = NOW()
```

Add `checkInSentAt` column to `bookings` table (nullable timestamp).

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

## 5. Opportunity #2: Lead Re-engagement for Declined/Expired

### Problem Statement
7 leads have expired/declined status. Some of these were declined prematurely — the chef may have been unavailable for the specific date but could be open to alternative dates. Currently, once a lead is `declined` or `expired`, there's no recovery path.

Diners who've invested time submitting an inquiry for a specific chef may be open to re-engaging, but the system gives them no option to do so.

### User Story
**As a** diner whose lead was declined or expired  
**I want** the option to request another quote or try a different date  
**So that** I'm not forced to start from scratch or abandon the platform

### Scope

**In:**
- On booking status page for `declined` or `expired` leads, show: "This chef isn't available for [date]. Would you like to explore other dates or services?"
- "Browse Other Chefs" CTA → Discovery page
- "Request Different Date" CTA → Opens a simple form (date picker + message) that creates a NEW lead
- NEW lead links to original lead via `inquiryType='re_engagement'` and `originalLeadId`
- Chef receives notification of re-engagement (separate from new inquiry flow)

**Out:**
- Direct booking update flow (requires chef confirmation)
- Automatic date availability checking
- Re-opening the same lead (leads are append-only)

### Acceptance Criteria
- [ ] Declined/expired lead booking status page shows re-engagement option
- [ ] "Request Different Date" creates a new linked lead
- [ ] Chef receives notification of re-engagement inquiry
- [ ] Original lead preserved (audit trail)

---

## 6. Opportunity #3: Review Collection Trigger

### Problem Statement
Platform has 0 reviews since launch. Even with 1 converted booking and potential future completed bookings, there's no automated mechanism to collect reviews. Without social proof, new diners have no trust signal beyond photos.

### User Story
**As a** diner who completed a booking  
**I want** to be asked to leave a review  
**So that** I can share my experience and help future diners choose

**As a** chef with completed bookings  
**I want** reviews displayed on my service page  
**So that** I can build reputation and attract more diners

### Scope

**In:**
- After booking status changes to `completed`, set a `reviewRequestDueAt = completedAt + 24h`
- Cron job (runs daily): Find bookings WHERE `status='completed'` AND `reviewRequestDueAt < NOW()` AND `reviewRequestSentAt IS NULL`
- Send review request email to diner with star rating (1-5 clickable) + comment field
- One review per booking (prevents spam)
- Display on service/chef page: aggregate rating + individual review cards

**Out (MVP):**
- Photo reviews
- Review responses from chef
- Review edit/delete by diner
- Rating breakdown (5/4/3/2/1 distribution)
- Rich text formatting (plain text only)

### Acceptance Criteria
- [ ] Review request email sent ~24h after booking completion
- [ ] Email includes 1-5 star selection and comment field
- [ ] Submission creates review record linked to booking
- [ ] Aggregate rating displayed on service detail page
- [ ] One review per booking enforced (idempotency)

### Edge Cases
| Scenario | Behavior |
|----------|----------|
| Diner has multiple completed bookings | Each gets its own review request |
| Booking cancelled before review sent | No review request sent |
| Chef has 0 reviews | Show "Be the first to review" empty state |

---

## 7. What Still Requires Fred's Action

| Blocker | Required Action | Days Overdue | Impact |
|---------|----------------|--------------|--------|
| **RESEND_API_KEY** | Fred add real key to environment | 55+ days | All email notifications work in stub mode only |
| **Vercel OIDC Token** | Fred refresh in Vercel dashboard | 40+ days | Production deployments blocked |
| **Stripe Keys** | Fred provide for payment features | Not started | Instant booking (MAI-1250) blocked |
| **Chef WhatsApp Number** | Chef populate in profile | Not started | WhatsApp notification path blocked |

---

## 8. Recommendations for Next Cycle (04:00 UTC May 15)

**Priority Order:**

1. **🔴 BE: Fix MAI-1535/MAI-1548 integration** — add `markStagnationAlertSent` call in `booking-status.ts` reengage endpoint (3-line fix, high impact)
2. **🟡 FE/BE: Abandoned Booking Check-in** — daily cron + email flow, cleans up stale pipeline
3. **🟡 FE: Review Collection Trigger** — start building social proof
4. **🟡 FE: Lead Re-engagement for Declined/Expired** — recovery path for lost leads
5. **🔴 Fred: Add RESEND_API_KEY** — #1 blocker, enables all email features
6. **🔴 Fred: Refresh Vercel token** — deployments blocked

---

## 9. Acceptance Criteria (This Cycle)

- [x] Confirmed: `diner-stagnation-alert.ts` (MAI-1548) and "Chase the Chef" (MAI-1535) exist but are not integrated
- [x] Identified: 3-line fix needed to add `markStagnationAlertSent` call in reengage endpoint
- [x] Spec'd: Abandoned Booking Check-in (Opportunity #1) with full scope and acceptance criteria
- [x] Spec'd: Lead Re-engagement for Declined/Expired (Opportunity #2) with user story and scope
- [x] Spec'd: Review Collection Trigger (Opportunity #3) to build social proof
- [x] Updated: Fred's action items unchanged (RESEND_API_KEY still #1 blocker)

---

*Report completed: 2026-05-15 00:12 UTC*
*Next cycle: 2026-05-15 04:00 UTC*