# Product Opportunity Discovery — MAI-1805

**Issue:** 5ea3e302-04c0-4eba-a7d1-365850e369cf
**Date:** 2026-05-20 00:00 UTC
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager

---

## Executive Summary

Two opportunities identified. One is a critical wiring gap — infrastructure exists but calls are missing. The other is partially implemented but has a data gap that limits effectiveness.

| # | Opportunity | Effort | Impact | Status |
|---|-------------|--------|--------|--------|
| 1 | Chef in-app notification on lead creation | ~1h BE | **High** | **New Discovery — needs implementation** |
| 2 | Referral share prompt for non-converted leads | Partial | Medium | ⚠️ Frontend done, referral code missing for new diners |

---

## 1. Platform State (2026-05-20 00:00 UTC)

| Metric | Value | Notes |
|--------|-------|-------|
| RESEND_API_KEY | Missing | 🔴 60+ days — all email flows dead |
| STRIPE_SECRET_KEY | Missing | 🔴 Payments blocked |
| Published services | 1 | Chef Marcel, French cuisine, $95/person |
| Leads submitted | 8 | 1 converted, 7 expired |
| Chef responses | 0/8 (0%) | Marcel not responding |
| Bookings confirmed | 0 | Revenue = $0 |
| `createNotification()` | ✅ Exported | `src/api/notifications.ts:11` |
| `new_lead` notification type | ⚠️ Expected by FE, missing from BE type | Frontend renders it; BE doesn't define it |
| Chef notification endpoints | ✅ Wired | `GET/PATCH/POST /api/chef/notifications` (chef-leads.ts:658+) |
| Referral share for converted bookings | ✅ Working | MAI-1799 extended to non-terminal statuses |
| **Chef in-app notification on lead creation** | ❌ Missing | Not called in inquiry.ts or multi-inquiry.ts |
| **Referral code for new inquiry diners** | ❌ Missing | Code only created on booking conversion |

---

## 2. Discovery: Opportunity #1 — Chef In-App Notification on Lead Creation 🔴 HIGH IMPACT

### Problem

When a diner submits an inquiry via `POST /api/inquiry` or `POST /api/multi-inquiry`:
- Chef receives an **email** via `sendChefNewBookingEmail()` — dead without RESEND_API_KEY
- Chef receives **no in-app notification** — `createNotification()` is not called

The chef has no way to know a new lead arrived except by manually checking the dashboard. With 0 chef responses across 8 leads, this is clearly not happening.

### Confirmed Gap in Codebase

**inquiry.ts** — No `createNotification` import or call:
```typescript
// Line 6: imports leads, services, users — NOT createNotification
import { leads, services, users } from "../db/schema.js";

// Lines 79-117: creates lead, sends emails, returns response
// Missing: createNotification({ userId: chef.id, type: 'new_lead', ... })
```

**multi-inquiry.ts** — No `createNotification` call for any leads:
```typescript
// Creates multiple leads for multiple chefs
// Each lead creation emails the chef via sendChefNewBookingEmail()
// Missing: createNotification({ userId: chefId, type: 'new_lead', ... })
```

**Infrastructure verified working:**
- `createNotification()` exists at `src/api/notifications.ts:11` — exported and used in bookings.ts and leads.ts
- `GET /api/chef/notifications` endpoint exists at `chef-leads.ts:659` — fully wired
- Frontend `new_lead` icon at `chef-leads-page.ts:257` and `chef-bookings-page.ts:205` — already implemented
- `notifications.metadata` column exists (`schema.ts:161`) — stores leadId for deep-link

### Root Cause

`NotificationType` in `notifications.ts` does NOT include `'new_lead'`:
```typescript
// Current — missing 'new_lead'
export type NotificationType = 'booking_confirmed' | 'booking_declined' | 'booking_completed' | 'review_request' | 'lead_expired';
```

The frontend already renders `new_lead` notifications (bell icon + "🔔"), but the BE never created that notification type, so the type definition was never added.

### Scope (MVP)

**In:**
- Add `'new_lead'` to `NotificationType` in `src/api/notifications.ts`
- `POST /api/inquiry`: Call `createNotification()` for chef after lead creation
- `POST /api/multi-inquiry`: Call `createNotification()` for each chef after their lead is created
- Notification type: `new_lead`
- Notification title: "New Inquiry Received"
- Notification body: "{dinerName} is interested in your {serviceName} for {guestCount} guests on {eventDate}. Tap to view."
- Metadata: `{ leadId: number }` for deep-link

**Out:**
- Push notifications (email, SMS)
- Notification settings UI
- Changes to email flows
- Diner notification on lead creation

### Files to Modify

| File | Change |
|------|--------|
| `src/api/notifications.ts` | Add `'new_lead'` to `NotificationType` union |
| `src/api/inquiry.ts` | Import `createNotification`, call it after lead creation |
| `src/api/multi-inquiry.ts` | Import `createNotification`, call it for each chef after leads creation |

### Acceptance Criteria

- [ ] `NotificationType` includes `'new_lead'`
- [ ] Single inquiry: chef receives in-app notification within seconds of lead creation
- [ ] Multi inquiry: each chef receives notification for their respective lead
- [ ] Notification appears in `GET /api/chef/notifications` response
- [ ] Notification includes: lead ID, diner email/name, service name, guest count, event date
- [ ] Notification metadata includes leadId for deep-link
- [ ] No external dependencies (works without RESEND_API_KEY)
- [ ] TypeScript compiles with no errors

### User Value

Chef learns about new leads immediately via in-app notification — the platform's most basic reactivation mechanism. With 0 chef responses across 8 leads, any notification is better than none. Email is dead; in-app is the only lever. $0 revenue impact of adding chef notifications vs. current $0.

### Effort

~1h backend. Two insertion points. Notification type update + two `createNotification()` calls.

---

## 3. Discovery: Opportunity #2 — Referral Code for New Inquiry Diners ⚠️ PARTIALLY DONE

### What MAI-1799 Did

MAI-1799 modified `booking-status-page.ts` to show the referral CTA for non-terminal lead statuses (`new`, `pending`, `quoted`, `accepted`) in addition to `converted`. This is already implemented in the current codebase (lines 603-605):
```typescript
const nonTerminalStatuses = ['new', 'pending', 'quoted', 'accepted'];
const showReferralCta = isConverted || nonTerminalStatuses.includes(lead.status);
```

### The Remaining Gap

The referral share prompt renders conditionally:
```typescript
${lead.referralCode ? `
  <div class="referral-code-section">
    <p class="referral-code-label">Your Referral Code:</p>
    <div class="referral-code-box">${lead.referralCode}</div>
  </div>
` : ''}
```

**Problem:** `leads.referralCode` is only set when a lead is created with a referral code passed via URL parameter (MAI-1778). The code is captured at inquiry submission time (`body.referralCode`) but the **diner's own referral code** is never created or shown.

**The data flow issue:**
1. Diner submits inquiry with referral code → `leads.referralCode` stores the *source* code (who referred them)
2. Diner's own referral code (for sharing) is created only on first **booking conversion** via `POST /api/diner/referral-code`
3. Most leads expire before conversion → diner never gets a shareable code
4. Share prompt shows but the code box is empty/missing

**Current state:**
- Referral CTA shows for `new`, `pending`, `quoted`, `accepted` ✅
- But `lead.referralCode` is the *source* code, not the diner's own code
- A new diner who was referred sees the referrer's code, not their own
- A new diner who was NOT referred has no code at all → empty code box

### What Needs to Happen

The share prompt needs the **diner's own referral code** to be displayable. Options:
1. **Pre-create referral code on diner account creation** — would require diner auth at inquiry time (not currently required)
2. **Create referral code on first inquiry submission** — requires authenticated diner OR anonymous code generation
3. **Fetch diner's existing referral code via email cookie** — check if diner (identified by email cookie) already has a code, and if so display it; if not, show a "join the referral program" prompt that creates the code

**Recommended approach (Option 3):** When rendering the booking status page for a lead with `referralCode` source tracking, also check if the diner (identified by email cookie) has a generated referral code. If they do, display it. If they don't, show a "share and earn $25" prompt that calls `POST /api/diner/referral-code` to generate one.

### Scope (Future Enhancement — Out of Scope for This POD)

This POD marks Opportunity #2 as partially done (frontend display condition) with a remaining data gap. The full fix requires:
- Backend: Endpoint or query to get a diner's referral code by email (without authentication)
- Frontend: On booking-status-page.ts load, check if diner has a referral code; if not, offer to create one

### Effort

~2h full-stack. Needs a minor BE addition + FE fetch call on page load.

---

## 4. Critical Infrastructure Blockers — Not This Agent's Scope

| Blocker | Owner | Age | Impact |
|---------|-------|-----|--------|
| `RESEND_API_KEY` | Fred | 60+ days | All email flows dead |
| `STRIPE_SECRET_KEY` | Fred | 60+ days | Instant booking + payments blocked |
| Chef Marcel response | Marcel | 60+ days | 0/8 leads responded to |

**No agent can unblock these. Fred must act.**

---

## 5. Open Questions

| # | Question | Owner |
|---|----------|-------|
| 1 | Were chef notification calls ever implemented and then reverted? Or was the POD written in error? | Engineering |
| 2 | Should the `new_lead` notification also be sent to the chef's email as a fallback when RESEND is restored? | Product |
| 3 | Should expired leads be auto-declined, or remain as distinct `expired` state? | Product |
| 4 | Should diners be able to re-inquire after lead expires? | Product |
| 5 | RESEND_API_KEY timeline — is there a budget constraint? | Fred |
| 6 | Should the referral code be created earlier (at inquiry time) rather than at booking conversion? | Product |
| 7 | What is the plan to reactivate Chef Marcel (0/8 responses)? | CEO |

---

## 6. Priority Ranking

| # | Opportunity | Impact | Effort | Dependencies | Status |
|---|-------------|--------|--------|--------------|--------|
| 1 | Chef in-app notification on lead creation | High | ~1h BE | None | **Needs backend implementation** |
| 2 | Referral share prompt (frontend) | Medium | ~0 | MAI-1799 (✅ done) | ✅ Frontend done |
| 3 | Referral code for new inquiry diners | Medium | ~2h | MAI-1778 | ⚠️ Data gap — needs follow-up POD |
| 4 | RESEND_API_KEY | Critical | Manual | Fred | Fred must act |
| 5 | STRIPE_SECRET_KEY | Critical | Manual | Fred | Fred must act |

---

## 7. Definition of Done

- [x] Platform state documented (RESEND dead, 1 published service, 0 chef responses, $0 revenue)
- [x] Chef in-app notification gap confirmed in codebase (inquiry.ts, multi-inquiry.ts)
- [x] `createNotification()` infrastructure verified as working
- [x] `new_lead` type expected by frontend (chef-leads-page.ts:257, chef-bookings-page.ts:205)
- [x] `new_lead` missing from `NotificationType` union identified as root cause
- [x] Referral share frontend (MAI-1799) confirmed as implemented in current codebase
- [x] Referral code data gap identified (code only created on conversion, not inquiry)
- [x] Critical blockers noted (RESEND_API_KEY, STRIPE_SECRET_KEY, Chef Marcel non-response)
- [x] Open questions surfaced

---

## Appendix: Code Reference

**createNotification signature (notifications.ts:11-18):**
```typescript
export function createNotification(params: {
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
}) {
  db.insert(notifications).values({
    userId: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
  }).run();
}
```

**NotificationType (notifications.ts:4) — MISSING 'new_lead':**
```typescript
export type NotificationType = 'booking_confirmed' | 'booking_declined' | 'booking_completed' | 'review_request' | 'lead_expired';
// NOTE: 'new_lead' type not defined — add it
```

**Frontend new_lead expectation (chef-leads-page.ts:257):**
```typescript
if (type === 'new_lead') return '<div class="notif-icon notif-icon-new_lead">🔔</div>';
```

**Frontend new_lead expectation (chef-bookings-page.ts:205):**
```typescript
if (type === 'new_lead') return '<div class="notif-icon notif-icon-new_lead">🔔</div>';
```

**notifications table metadata (schema.ts:161):**
```typescript
metadata: text('metadata'), // JSON string with extra fields (leadId, etc.)
```

**Referral code creation (diner-referral.ts:22-60):**
```typescript
server.post('/referral-code', { preHandler: [server.authenticate] }, async (request, reply) => {
  // Idempotent — returns existing code or creates new one
  // Requires authenticated diner
});
```

**Current referral CTA condition (booking-status-page.ts:603-605):**
```typescript
const nonTerminalStatuses = ['new', 'pending', 'quoted', 'accepted'];
const showReferralCta = isConverted || nonTerminalStatuses.includes(lead.status);
```

---

*Product Opportunity Discovery — MAI-1805 — 2026-05-20 00:00 UTC*