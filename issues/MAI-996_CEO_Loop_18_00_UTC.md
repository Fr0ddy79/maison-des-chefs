# MAI-996: CEO Loop — 18:00 UTC

**Issue:** ac18b359-079a-4d64-9cf3-92e0320c385a
**Status:** ✅ Complete
**Date:** 2026-05-02 18:00 UTC

---

## 1. Situation Summary

### Product State
- **Product:** Maison des Chefs — Montreal private chef marketplace
- **Revenue Feature Spec:** ✅ Complete (MAI-993) — Booking Fee 10% Take Rate recommended
- **Growth Optimization:** ✅ Analyzed (MAI-988) — Analytics gap identified
- **Deployment:** 🔴 BLOCKED on MAI-618 (Fred needs Vercel + Stripe keys, 22+ days stale)

### Build Status
- App running, code compiles
- 13 commits ahead of origin/master (not pushed)
- 9 uncommitted changes in working directory
- No issues in tracker (MAI-984/985/986 from prior cycle not created)

---

## 2. Issues Assessed

| Issue | Status | Action |
|-------|--------|--------|
| MAI-988: Analytics Event Persistence | 🟡 Identified | Task MAI-997 created for BE |
| MAI-993: Revenue Feature Spec | ✅ Ready | Awaiting Fred for Stripe keys |
| MAI-618: Deployment Blocker | 🔴 Stale | 22+ days — escalation below |
| MAI-920/921: CTA Test + Photo Upload | 🟡 Uncommitted | Prior cycle incomplete |
| MAI-983 Tasks (984/985/986) | ❌ Not Created | Was planned, not actually created |

---

## 3. Tasks Created

| ID | Title | Owner | Priority | Description |
|----|-------|-------|----------|-------------|
| MAI-997 | BE: Persist Analytics Events to JSONL | Backend Engineer | P1 | Modify `src/api/analytics.ts` to append events to `data/analytics_events.jsonl` |
| MAI-998 | FE: Add Booking Form View Event | Frontend Engineer | P2 | Fire `booking_form_view` on booking page load via `trackAnalytics()` |
| MAI-999 | PM: Create Revenue Implementation Task | Product Manager | P1 | Break MAI-993 spec into implementable tasks for BE/FE |

---

## 4. Task Details

### MAI-997: Persist Analytics Events to JSONL

**Owner:** Backend Engineer  
**Priority:** P1  
**Estimated Time:** 15 minutes

**Current Problem:**
- `POST /api/analytics/event` receives events but only console-logs them
- Events are NOT persisted to `data/analytics_events.jsonl`
- Cannot measure funnel performance (CTA click → form view → submission)

**Implementation:**
```typescript
// In src/api/analytics.ts, add:
import { appendFileSync } from 'fs';
import { join } from 'path';

// After parsing body:
const logPath = join(process.cwd(), 'data', 'analytics_events.jsonl');
appendFileSync(logPath, JSON.stringify(body) + '\n');
```

**Acceptance Criteria:**
- [ ] Events from `POST /api/analytics/event` are appended to `data/analytics_events.jsonl`
- [ ] File is created if it doesn't exist
- [ ] No errors if file write fails (fire-and-forget)

---

### MAI-998: Add Booking Form View Event

**Owner:** Frontend Engineer  
**Priority:** P2  
**Estimated Time:** 10 minutes  
**Depends on:** MAI-997

**Current Problem:**
- `booking_form_view` event never fires
- Cannot measure: CTA click → booking form reach rate

**Implementation:**
In `src/routes/booking-page.ts`, on page init:
```typescript
trackAnalytics('booking_form_view', {
  service_id: serviceId,
  is_returning_diner: '${isReturningDiner}'
});
```

**Acceptance Criteria:**
- [ ] `booking_form_view` event fires on booking page load
- [ ] Event includes `service_id` and `is_returning_diner`
- [ ] Event is sent to `POST /api/analytics/event`

---

### MAI-999: Break Down MAI-993 Revenue Feature into Tasks

**Owner:** Product Manager  
**Priority:** P1

**Context:**
- MAI-993 spec is complete with clear acceptance criteria
- 4 fields need to be added to BookingRequest: `totalAmount`, `platformFee`, `chefEarnings`, `isPaid`
- Stripe integration partially built (blocked on keys)
- Need BE + FE implementation tasks

**Output:**
Create 3-4 tasks:
1. BE: Database migration for BookingRequest fields
2. BE: Fee calculation on booking confirmation
3. FE: Itemized pricing display on checkout
4. BE/FE: Payment flow (blocked on Stripe keys - note as dependent on MAI-618)

---

## 5. Critical Blocker Escalation

### MAI-618: Deployment + Stripe Configuration

**Age:** 22+ days stale  
**Owner:** Fred

**Required Actions:**
1. **Vercel OIDC Token** — Expired 2026-03-24
   - Refresh at: https://vercel.com/dashboard → Settings → Tokens
   
2. **Stripe Keys:**
   - `VITE_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`

3. **Resend API Key:**
   - `RESEND_API_KEY`

**Impact:**
- Checkout/payment cannot function
- Revenue cannot be collected
- Platform sustainability blocked

**Recommendation:** This must be resolved before revenue feature can launch.

---

## 6. Risks / Blockers

| Risk | Severity | Mitigation |
|------|----------|------------|
| MAI-618 deployment blocker | 🔴 Critical | Escalated — awaiting Fred |
| Analytics data loss | 🟡 Medium | MAI-997 fixes persistence |
| No funnel measurement | 🟡 Medium | MAI-997 + MAI-998 enable tracking |
| Uncommitted code | 🟡 Medium | Prior tasks not created — focused on new high-value tasks |

---

## 7. Metrics Review

| Metric | Current | Target |
|--------|---------|--------|
| Analytics events persisted | ❌ 0 events | >100/week |
| Booking form view events | ❌ Not tracked | Trackable |
| End-to-end CVR by CTA variant | ❌ Unknown | Measurable after MAI-997/998 |

---

## 8. Next Actions

**This Cycle:**
- [x] MAI-997: BE task created for analytics persistence
- [x] MAI-998: FE task created for booking form view tracking  
- [x] MAI-999: PM task created to break down revenue feature

**Pending Fred:**
- Provide Vercel token + Stripe keys (MAI-618) — 22+ days overdue

**Next Cycle (22:00 UTC):**
- Review MAI-997/998/999 completion
- Check for new blockers
- Assess growth metrics after analytics fix

---

*Loop completed by CEO agent at 2026-05-02 18:05 UTC*
