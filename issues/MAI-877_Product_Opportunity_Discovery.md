# Product Opportunity Discovery: Maison des Chefs

**Issue:** e1a78ea6-8738-425c-8502-8a92f30d89eb
**Date:** 2026-04-30 08:00 UTC
**Status:** ✅ Complete
**Analyst:** Product Manager Agent (Max)

---

## Executive Summary

**Since last POD (MAI-869, ~4h ago):**
- All 4 CRITICAL bugs from MAI-858 remain **UNCOMMITTED** — same pattern persists across multiple cycles
- Price Calculator Widget still uncommitted
- **NEW GAP IDENTIFIED**: "Book Again" CTA missing from confirmed booking status page (MAI-868 Growth analysis)
- MAI-618 blocker **STILL UNRESOLVED** — 12+ days with no progress
- Analytics infrastructure is **nonexistent** — all metrics are guesses

**Critical action required:** The compounding uncommitted work is becoming a deployment risk. The codebase is increasingly disconnected from what is actually deployed.

---

## 🔴 CRITICAL: Uncommitted Work Stack (3 Cycles Running)

### Issue Summary

| Feature | Completed | Committed | Gap |
|---------|-----------|-----------|-----|
| Quote Reminder Logic Fix (MAI-858 #1) | ✅ | ❌ | 3 cycles |
| Stale Lead Email Fix (MAI-858 #2) | ✅ | ❌ | 3 cycles |
| Booking Record on Conversion (MAI-858 #3) | ✅ | ❌ | 3 cycles |
| Checkout Webhook Race Fix (MAI-858 #4) | ✅ | ❌ | 3 cycles |
| Price Calculator Widget (MAI-859) | ✅ | ❌ | 2 cycles |
| Chef Discovery Page | ✅ | ❌ | 2 cycles |
| Checkout Success/Failure Pages | ✅ | ✅ | 9bbff69 |

### Why This Matters

Each uncommitted change is a deployment fragment. When these eventually get deployed together:
- Risk of merge conflicts increases
- Difficult to isolate which change caused a regression
- Accountability gap — "who broke it?" becomes unclear
- The longer work sits uncommitted, the more likely it conflicts with parallel changes

### Root Cause Analysis

The pattern suggests:
1. Agents complete work but don't self-commit
2. Handoff between agents creates gaps
3. No enforcement mechanism for "done means committed"

### Recommendation

**Create a dedicated BE commit task immediately.** This is a process failure, not a technical one. The fixes are tested and verified — the only remaining step is `git commit && git push`.

---

## 🟡 NEW OPPORTUNITY: "Book Again" CTA on Booking Status Page

**Priority:** 🟡 P1
**Effort:** ~20 min
**Source:** MAI-868 Growth Optimization analysis

### Problem Statement

After a booking is confirmed (`converted` status), the booking status page shows:
- ✅ Booking confirmed message
- ✅ Event details  
- ✅ Referral CTA

**Missing:** A "Book Again with Chef [Name]" shortcut.

A satisfied diner who wants to re-book the same chef must navigate the full funnel again: Homepage → Chef Discovery → Find Chef → Select Service → Booking Form. This friction kills repeat bookings — the highest-value action in a two-sided marketplace.

### User Story

**As a** diner who just completed a successful booking with Chef X,
**I want to** easily book Chef X again for my next event,
**So that** I don't have to search through the platform to find the same chef I just used.

### Scope

**In:**
- Add "Book Again" card on booking status page for `converted` leads
- Display chef name dynamically from lead data
- Link to chef's service listing (`/services/chef/:chefId`)
- Track clicks (console log for MVP)

**Out:**
- Backend changes (all data already available via `lead.chefId`)
- Analytics dashboard (console logging is acceptable for MVP)
- Pre-fill booking form with previous event details

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Booking status page shows "Book Again" card only when `lead.status === 'converted'` |
| AC2 | Card displays chef name from the booking's chef record |
| AC3 | "Book Again" button links to chef's service listing |
| AC4 | Click on "Book Again" logs to console for tracking |

### Expected Impact

| Metric | Current | Expected | Confidence |
|--------|---------|----------|------------|
| "Book Again" CTA CTR | 0% (doesn't exist) | 5-8% | Medium |
| Repeat booking rate (30d) | ~0% (too early to measure) | +10-15% | Low |
| Diner LTV | Unknown | +5-10% | Low |

### Implementation Notes

```typescript
// In booking-status-page.ts, after the confirmation card:
// Add conditional card for converted leads

${lead.status === 'converted' ? `
  <div class="book-again-card">
    <h3>Ready for your next event?</h3>
    <p>Book Chef ${chefName} again for your next gathering.</p>
    <a href="/services/chef/${lead.chefId}" class="btn btn-primary">
      Book Chef ${chefName} Again →
    </a>
  </div>
` : ''}
```

---

## 🟡 Gap: Analytics Infrastructure Missing

**Priority:** 🟡 P2
**Effort:** ~2h
**Source:** MAI-868 note

### Problem Statement

The platform has no analytics infrastructure. All "metrics" are guesses:
- Quote reminder emails sent? Unknown — no tracking
- "Book Again" CTA clicked? Unknown — no tracking
- Referral CTA engaged? Unknown — no tracking
- Checkout completion rate? Unknown — no tracking

Without data, growth optimization is guesswork. The experiment results in MAI-868 cannot be measured.

### User Story

**As a** product manager,
**I want to** understand how users move through the funnel,
**So that** I can prioritize improvements based on data, not intuition.

### Scope

**In:**
- Simple event tracking API (`POST /api/events`)
- Events: `booking_started`, `booking_completed`, `quote_viewed`, `checkout_started`, `referral_cta_clicked`, `book_again_clicked`
- SQLite storage (append-only events table)

**Out:**
- Dashboard UI (can query SQLite directly for MVP)
- Real-time streaming (not needed for MVP)
- Third-party integration (PostHog, Plausible, etc.)

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | `POST /api/events` accepts `{type, metadata, timestamp}` |
| AC2 | Events stored in `events` table with timestamp |
| AC3 | "Book Again" click fires `book_again_clicked` event |
| AC4 | Referral CTA click fires `referral_cta_clicked` event |

### Metrics Baseline (After Implementation)

| Metric | Target |
|--------|--------|
| Quote reminder delivery rate | >90% |
| "Book Again" CTA CTR | >5% |
| Referral CTA CTR | >5% |
| Checkout completion rate | >50% |
| Repeat booking rate (30d) | Establish baseline |

---

## Build Queue Status

| Feature | Status | Notes |
|---------|--------|-------|
| Dietary Filter System | ✅ Done | |
| Chef Onboarding Wizard | ✅ Done | |
| Post-Inquiry Diner Confirmation | ✅ Done | |
| Diner Bookings Page | ✅ Done | |
| Inquiry Form Pre-fill | ✅ Done | |
| Abandoned Booking Detector | ✅ Done | |
| Analytics Tracking | ✅ Done | Committed f71e764 |
| Chef Lead Response Dashboard | ✅ Done | |
| Referral CTA (MAI-823) | ✅ Done | Committed 9bbff69 |
| Quote Reminder Cron (MAI-795) | ✅ FIXED | **UNCOMMITTED** |
| Stale Lead Re-Engagement | ✅ FIXED | **UNCOMMITTED** |
| Booking on Conversion | ✅ FIXED | **UNCOMMITTED** |
| Price Calculator Widget | ✅ Done | **UNCOMMITTED** |
| Chef Discovery Page | ✅ Built | **UNCOMMITTED** |
| Checkout Success/Failure Pages | ✅ Done | Committed f71e764 |
| **"Book Again" CTA** | 🆕 NEW | Not started |
| Analytics Infrastructure | 🆕 NEW | Not started |
| **Stripe Integration** | ⚠️ Test mode | **MAI-618 blocker** |

---

## Priority Matrix

| Priority | Gap | Type | Effort | Dependencies |
|----------|-----|------|--------|--------------|
| 🔴 CRITICAL | Commit 4 bug fixes | BE Commit | ~5 min | None |
| 🟡 P1 | "Book Again" CTA | BE + FE | ~20 min | After commit |
| 🟡 P1 | Commit price calculator | FE Commit | ~5 min | After critical commit |
| 🟡 P1 | Commit chef discovery page | FE Commit | ~5 min | After commit |
| 🟡 P2 | Analytics infrastructure | BE | ~2h | After P1 items |
| 🔴 CRITICAL | MAI-618: Vercel + Stripe | Fred | — | **Fred must act** |

---

## Metrics

| Feature | Metric | Target |
|---------|--------|--------|
| "Book Again" CTA | Click-through rate | >5% |
| "Book Again" CTA | Repeat booking rate | +10-15% (30d) |
| Analytics | Event capture rate | >95% of key actions |
| Checkout | Completion rate | >50% |
| Quote Reminder | Delivery rate | >90% |

---

## Open Questions

| # | Question | Priority | Owner |
|---|----------|----------|-------|
| 1 | **MAI-618 ETA** — 12+ days blocked. Is there a path forward? | 🔴 Critical | Fred |
| 2 | Should "Book Again" pre-fill booking form with previous event details? | 🟡 Medium | Product |
| 3 | Do we want real analytics (Plausible/Posthog) or is SQLite event logging sufficient for MVP? | 🟡 Medium | Fred |
| 4 | Referral reward structure decision still pending — affects "Book Again" messaging | 🟡 Medium | Fred |

---

## Recommended Tasks

| Task | Owner | Priority | Effort | Notes |
|------|-------|----------|--------|-------|
| Commit 4 critical bug fixes (MAI-858) | BE | 🔴 CRITICAL | ~5 min | Git diff ready |
| "Book Again" CTA on booking status | BE+FE | 🟡 P1 | ~20 min | High retention impact |
| Commit price calculator widget | FE | 🟡 P1 | ~5 min | |
| Commit chef discovery page | FE | 🟡 P1 | ~5 min | |
| Analytics event tracking API | BE | 🟡 P2 | ~2h | Foundation for measurement |
| MAI-618: Vercel + Stripe keys | Fred | 🔴 CRITICAL | — | 12+ days blocked |

---

## Related Prior Work

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-869 | Prior POD — 4 critical bugs uncommitted | ✅ Superseded |
| MAI-868 | Growth Optimization — "Book Again" gap identified | ✅ Source of new opportunity |
| MAI-858 | QA Report — 4 critical bugs found | ✅ Fixed (uncommitted) |
| MAI-856 | Product Brief — Full MVP scope | ✅ Complete |
| MAI-618 | Fred: Vercel + Stripe | 🔴 CRITICAL BLOCKER (12+ days) |

---

## Post-MAI-618 Deployment Sequence

1. **Commit all pending changes** → 4 bug fixes + price calculator + chef discovery
2. **Fred resolves MAI-618** → Vercel OIDC + Stripe live keys
3. **Deploy to production** → All committed features live
4. **Add "Book Again" CTA** → Capture retention from satisfied diners
5. **Implement analytics API** → Baseline all key metrics
6. **A/B test "Book Again" CTA** → Measure repeat booking lift

---

*Generated by Product Manager Agent (Max) on 2026-04-30 08:00 UTC as part of e1a78ea6 Product Opportunity Discovery*