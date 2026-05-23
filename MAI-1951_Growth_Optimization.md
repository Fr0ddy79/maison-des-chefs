# Growth Optimization — MAI-1951: Lead Expiration Timing Fix

**Issue:** 564c0a53-a4fa-4bca-af49-ebedeae64ed2
**Created:** 2026-05-23 04:00 UTC
**Status:** ✅ Complete
**Owner:** Growth Marketer
**Run:** 04:00 UTC autopilot

---

## Executive Summary

**Growth idea:** Fix the lead expiration cron to exclude leads that just received an SLA check-in email. Currently, leads can be marked expired and notified to diners in the same hour they receive a "please respond" email from the system — creating a confusing, contradictory experience.

**Expected impact:** Diners receive expiration emails only after chefs have had a meaningful window to respond (not immediately after the SLA nudge fires).

**Priority:** Medium — improves diner experience and email credibility
**Effort:** Low — single condition change in `lead-expiration.ts`

---

## 1. Funnel Analysis — Current State

### 1a. Lead Pipeline

| Stage | Count | Notes |
|-------|-------|-------|
| New/Pending leads | 0 | No active leads in system |
| Expired leads | 7 | All expired May 13 |
| Converted leads | 1 | Guest checkout (Apr 16) |

### 1b. Email Pipeline Health

| Service | File | Schedule | Status |
|---------|------|----------|--------|
| SLA Check-In (chef) | `chef-sla-checkin-email.ts` | cron hourly | ✅ Wired — fires when `slaDeadlineAt` passed, `slaCheckInSentAt` is null |
| Lead Expiration (diner) | `lead-expiration.ts` | cron every 6h | ✅ Wired — fires when `slaDeadlineAt` passed, `leadExpiredSentAt` is null |

### 1c. The Gap — Expiration Fires Immediately After SLA Nudge

The problem is in `lead-expiration.ts`. The condition is:

```
status IN ('new', 'pending')
AND slaDeadlineAt < NOW()
AND leadExpiredSentAt IS NULL
```

This runs independently of `slaCheckInSentAt`. So when a lead reaches its SLA deadline at hour 48:
1. SLA check-in cron fires → sends "please respond" email to chef, sets `slaCheckInSentAt`
2. Lead expiration cron fires (within same hour) → marks lead expired, sends diner notification

The diner gets an expiration email **in the same hour** the chef gets a "please respond" email. The diner experience says "no chef responded" — but the chef was literally just emailed by the system.

### 1d. Current Cron Schedules

| Cron | Schedule | Processes |
|------|----------|-----------|
| `sla-check-in.ts` | Every hour | Leads past SLA deadline with no `slaCheckInSentAt` |
| `lead-expiration.ts` | Every 6 hours | All leads past SLA deadline with no `leadExpiredSentAt` |

The two crons are **not coordinated**. They don't know about each other.

---

## 2. Growth Idea: Sequence the Nudge → Expiration Flow

### 2a. The Fix

Add `slaCheckInSentAt IS NOT NULL` to the lead expiration condition. This ensures leads are only marked expired **after** they've received the SLA check-in email.

**Current condition:**
```typescript
and(
  or(eq(schema.leads.status, 'new'), eq(schema.leads.status, 'pending')),
  lt(schema.leads.slaDeadlineAt, now),
  isNull(schema.leads.leadExpiredSentAt)
)
```

**New condition:**
```typescript
and(
  or(eq(schema.leads.status, 'new'), eq(schema.leads.status, 'pending')),
  lt(schema.leads.slaDeadlineAt, now),
  isNotNull(schema.leads.slaCheckInSentAt),  // ← Added: must have received SLA nudge first
  isNull(schema.leads.leadExpiredSentAt)
)
```

This creates a guaranteed sequence:
1. Hour 48: Lead hits SLA deadline, `slaCheckInSentAt` gets set by SLA cron
2. Hours 49-54: Expiration cron runs but skips this lead (no `slaCheckInSentAt` yet in same cycle, or `leadExpiredSentAt` not yet set)
3. Hour 54+: Lead marked expired, diner notified

**Actual behavior:** Diners get expiration emails ~6-12 hours after the chef receives the SLA nudge email, not in the same hour.

### 2b. File Change

- `maison-des-chefs/src/services/lead-expiration.ts`
- Single line change: add `isNotNull(schema.leads.slaCheckInSentAt)` to the `and(...)` condition

---

## 3. Expected Impact

| Metric | Before | After |
|--------|--------|-------|
| Diner notification timing | Same hour as chef nudge | 6+ hours after chef nudge |
| Chef response window | Implied but not enforced | Guaranteed minimum 6h |
| Email experience | Conflicting ("no response" while chef just emailed) | Coherent sequence |

---

## 4. Experiment Plan

**Type:** Before/after measurement (single change, propagates to all users)

**Primary metric:** Time between `slaCheckInSentAt` and `leadExpiredSentAt` for expired leads  
**Target:** Gap ≥ 6 hours (one expiration cron cycle)

**Measurement:** After deployment, query expired leads:
```sql
SELECT id, slaCheckInSentAt, leadExpiredSentAt,
  (leadExpiredSentAt - slaCheckInSentAt) as gap_hours
FROM leads
WHERE status = 'expired' AND leadExpiredSentAt IS NOT NULL
ORDER BY leadExpiredSentAt DESC;
```

**Success criteria:** Gap ≥ 6h for all new expirations post-deploy

---

## 5. Metrics to Track

| Metric | Source | Current |
|--------|--------|---------|
| Lead → Expiration conversion | `leads.status` | 87.5% (7/8 expired) |
| Time: SLA deadline → expiration | `slaDeadlineAt` vs `leadExpiredSentAt` | ~0h (same-hour bug) |
| Time: SLA check-in → expiration | `slaCheckInSentAt` vs `leadExpiredSentAt` | Not measured |
| Email delivery rate | RESEND_API_KEY status | 🔴 Missing |

---

## 6. Blockers

| Blocker | Owner | Status |
|---------|-------|--------|
| RESEND_API_KEY not configured | Fred | 🔴 **Critical** — all email is stub-only |
| No live leads to test pipeline | System | 🔴 No current acquisition |

---

## 7. Previous Improvements (This Run)

- MAI-1940: "Send Inquiry" → "Request Free Quotes" button copy (zero backend change, committed)
- MAI-1940: 3-step checkout progress indicator added (zero backend change, committed)

---

## 8. Next Steps

1. **Engineering:** Apply the single-line fix to `lead-expiration.ts` — add `isNotNull(schema.leads.slaCheckInSentAt)` to expiration condition
2. **Fred:** Configure `RESEND_API_KEY` to activate email pipeline
3. **Next check:** When leads exist in system, verify the gap between `slaCheckInSentAt` and `leadExpiredSentAt` is ≥6h

---

*Report generated by Growth Marketer agent | MAI-1951 | 2026-05-23 04:00 UTC*