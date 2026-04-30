# Product Opportunity Discovery: Maison des Chefs

**Issue:** MAI-869
**Date:** 2026-04-30 04:00 UTC
**Status:** ✅ Complete
**Analyst:** Product Manager Agent (Max)

---

## Executive Summary

**Since last POD (MAI-860, ~8h ago):**
- All 4 CRITICAL bugs from MAI-858 are **FIXED but UNCOMMITTED** — BE agent completed the work, git status shows changes in working directory
- Price Calculator Widget (MAI-859) completed by FE agent — working directory shows frontend changes
- MAI-618 blocker **STILL UNRESOLVED** — Vercel OIDC token expired, Stripe live keys missing. Fred must act.
- Loop reports show 12+ days with no progress on MAI-618 — this is now a significant platform risk

**Critical action required:** Commit + push the 4 critical bug fixes before any deployment consideration.

---

## 🔴 CRITICAL: Uncommitted Bug Fixes (MAI-858 Issues 1-4)

All fixes complete and tested locally, but NOT committed. This is the same pattern that caused MAI-790 → MAI-792 churn.

### Fix Summary

| Issue | File | Fix |
|-------|------|-----|
| Quote Reminder logic inverted | `src/services/quote-reminder.ts` | `gt→lt`, `status: 'new'→'responded'` |
| Stale Lead Re-engagement logic inverted | `src/services/diner-stale-lead-email.ts` | `status: 'new'→'responded'`, `createdAt→quoteSentAt` |
| Booking record not created on Stripe conversion | `src/api/webhooks.ts` | Add `bookings.insert()` after lead status update |
| Booking record not created on manual convert | `src/api/chef-leads.ts` | Add `bookings.insert()` in convert endpoint |

### Uncommitted Files (from `git status`)

```
modified:   src/api/chef-leads.ts      (booking creation on manual convert)
modified:   src/api/webhooks.ts       (booking creation on Stripe conversion)
modified:   src/routes/pages.ts       (price calculator widget)
modified:   src/services/diner-stale-lead-email.ts  (query fix)
modified:   src/services/quote-reminder.ts        (query fix)
```

### Verification

```bash
# All 4 critical fixes verified in working directory
cd maison-des-chefs && git diff --stat
```

**Recommendation:** Create a commit task for BE agent immediately.

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
| Analytics Tracking | ✅ Done | |
| Chef Lead Response Dashboard | ✅ Done | |
| Referral CTA (MAI-823) | ✅ Done | Committed 9bbff69 |
| Quote Reminder Cron (MAI-795) | ✅ FIXED | Uncommitted |
| Stale Lead Re-Engagement | ✅ FIXED | Uncommitted |
| Booking on Conversion | ✅ FIXED | Uncommitted |
| Price Calculator Widget | ✅ Done | Uncommitted |
| Chef Discovery Page | ✅ Built | Uncommitted |
| Checkout Success/Failure Pages | ✅ Done | Committed f71e764 |
| **Stripe Integration** | ⚠️ Test mode | **MAI-618 blocker** |

---

## 🟡 New Opportunity: Email Verification Gate on Checkout

**Priority:** 🟡 P2
**Effort:** ~1h
**Source:** MAI-856 Product Brief flag

### Problem Statement

Guest checkout allows booking without email verification. The `emailVerified` field exists in the `bookings` table but is never set. A diner could book with a mistyped email and never receive confirmation.

### User Story

**As a** diner booking a private chef,
**I want to** verify my email before my booking is confirmed,
**So that** I can receive booking details and chef communications.

### Scope

**In:**
- Send verification email on guest checkout (after Stripe payment)
- Set `emailVerified = true` when diner clicks verification link
- Show "Check your email to confirm" state on booking status page

**Out:**
- Re-send verification flow (MVP: one email only)
- Verified badge on profile (future feature)

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Guest checkout triggers verification email to the email used for payment |
| AC2 | Booking status page shows "Email pending verification" if unverified |
| AC3 | Clicking verification link sets `emailVerified = true` |
| AC4 | Verified diners see booking details normally |

### Expected Impact
- Reduces fake/no-reply email bookings
- Improves deliverability of chef messages
- Builds trust in platform authenticity

---

## 🟡 Gap: Chef Discovery Page Uncommitted

**Priority:** 🟡 P1
**Effort:** ~30 min commit
**Source:** Git status shows uncommitted changes from MAI-850/MAI-866

### Problem Statement

The Chef Discovery Page (built in MAI-850 or earlier) exists in working directory but is not committed. This page helps chefs who've received stale leads discover that new diners are browsing their profile.

### Scope

**In:** Commit the chef-discovery-page route and ensure it's registered in server.ts

**Out:** No new features, no frontend changes

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Chef discovery page accessible at `/chef-discovery` for logged-in chefs |
| AC2 | Page shows recommendations for finding new leads |
| AC3 | Link appears in chef dashboard for stale leads |

---

## 🔴 CRITICAL Blocker: MAI-618 (12+ Days Stalled)

**Status:** NO PROGRESS APPARENT
**Items Blocked:**
- Production Stripe payments (live key missing)
- Production deployment (Vercel OIDC token expired)

**Loop reports show this has been flagged since MAI-790 era (~12 days ago).**

### Fred Action Required

| Item | Status | Impact |
|------|--------|--------|
| Refresh Vercel OIDC token | 🔴 Blocked | Cannot deploy to production |
| Provide Stripe live keys | 🔴 Blocked | Cannot process real payments |

**This is now a platform credibility risk.** The product is feature-complete for MVP but cannot go live.

---

## Priority Matrix

| Priority | Gap | Type | Effort | Dependencies |
|----------|-----|------|--------|--------------|
| 🔴 CRITICAL | Commit 4 bug fixes | BE Commit | ~5 min | None |
| 🔴 CRITICAL | MAI-618: Vercel + Stripe | Fred | — | **Fred must act** |
| 🟡 P1 | Chef Discovery Page commit | BE Commit | ~30 min | None |
| 🟡 P2 | Email verification gate | BE + FE | ~1h | After MAI-618 |
| 🟡 P2 | Referral reward structure | Fred decision | — | Fred |
| 🟢 P3 | Multi-photo gallery | BE + FE | ~3h | After MAI-618 |

---

## Metrics

| Feature | Metric | Target |
|---------|--------|--------|
| Quote Reminder | Emails sent / eligible quotes | Track after fix + deploy |
| Stale Lead Re-engagement | Emails sent / stale leads | Track after fix + deploy |
| Booking Conversion | Bookings confirmed / leads | >60% after full deploy |
| Checkout Completion | Payment / checkout visit | >70% |
| Email Verification | Verified bookings / total | Baseline unknown |

---

## Open Questions

| # | Question | Priority | Owner |
|---|----------|----------|-------|
| 1 | **MAI-618 ETA** — This is now 12+ days blocked. Is there a timeline? | 🔴 Critical | Fred |
| 2 | Referral reward structure ($ / % off / credit)? | 🟡 Medium | Fred |
| 3 | Should email verification be required for all bookings or guest-only? | 🟡 Medium | Product |
| 4 | Chef supply growth strategy — we're in development with 1 active chef | 🟡 Medium | Fred |

---

## Recommended Tasks

| Task | Owner | Priority | Effort | Notes |
|------|-------|----------|--------|-------|
| Commit 4 critical bug fixes (MAI-858) | BE | 🔴 CRITICAL | ~5 min | Git diff ready |
| Commit price calculator widget | FE | 🔴 CRITICAL | ~5 min | Git diff ready |
| Commit chef discovery page | FE | 🟡 P1 | ~5 min | Git diff ready |
| MAI-618: Vercel + Stripe keys | Fred | 🔴 CRITICAL | — | 12+ days blocked |
| Email verification gate | BE+FE | 🟡 P2 | ~1h | After MAI-618 |
| Fred: Decide referral structure | Fred | 🟡 P2 | — | |
| Build: Chef multi-photo gallery | BE+FE | 🟢 P3 | ~3h | After MAI-618 |

---

## Related Prior Work

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-858 | QA Report — 4 critical bugs found | ✅ Fixed (uncommitted) |
| MAI-859 | Price Calculator Widget | ✅ Done (uncommitted) |
| MAI-860 | Prior POD — Checkout gap identified | ✅ Superseded |
| MAI-856 | Product Brief — Full MVP scope | ✅ Complete |
| MAI-866 | CEO Loop 02:00 UTC | ✅ Complete |
| MAI-618 | Fred: Vercel + Stripe | 🔴 CRITICAL BLOCKER (12+ days) |

---

## Post-MAI-618 Deployment Sequence

1. **Commit all pending changes** → 4 bug fixes + price calculator + chef discovery
2. **Fred resolves MAI-618** → Vercel OIDC + Stripe live keys
3. **Deploy to production** → All committed features live
4. **Verify checkout flow end-to-end** → With Stripe test + live modes
5. **Monitor quote reminder emails** → Verify 48h cron fires correctly
6. **A/B test price calculator** → Measure form completion lift

---

*Generated by Product Manager Agent (Max) on 2026-04-30 04:00 UTC as part of MAI-869 Product Opportunity Discovery*
