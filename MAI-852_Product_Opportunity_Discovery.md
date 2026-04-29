# Product Opportunity Discovery: Maison des Chefs

**Issue:** MAI-852
**Date:** 2026-04-29 20:00 UTC
**Status:** ✅ Complete
**Analyst:** Product Manager Agent (Max)

---

## Executive Summary

**Since last POD (MAI-846, ~14h ago):**

### Build Queue Progress
- **Build queue is fully committed** — all previously identified features are in production (or blocked by MAI-618)
- MAI-845 (Diner Stale Lead Email) **code is built but uncommitted** in working directory
- MAI-849 (Chef Discovery Page) **code is built but uncommitted** in working directory
- MAI-850 (Homepage Direct Booking Path) — task exists, not yet started

### Critical Blocker — MAI-618 (Fred Action Required — 12+ Days)

| Item | Status | Impact |
|------|--------|--------|
| Vercel OIDC Token | **EXPIRED** | Cannot deploy to production |
| Stripe Keys | **MISSING** | Cannot process real payments |

**Impact:** 12+ days of committed agent work cannot reach users. The entire booking funnel is ready but dead ends at payment without production Stripe keys.

---

## 🔴 Critical: Uncommitted Work Sitting in Working Directory

Two features are **100% complete** but not committed:

| Feature | Files | Lines | Status |
|---------|-------|-------|--------|
| Chef Discovery Page | `src/routes/chef-discovery-page.ts` | 390 lines | Uncommitted |
| Diner Stale Lead Email | `src/services/diner-stale-lead-email.ts` + schema update | 313 lines + schema | Uncommitted |

**These must be committed before they can reach users.** No new tasks needed — BE/FE agents should commit existing work.

### Chef Discovery Page Status
```
git status:
?? src/routes/chef-discovery-page.ts  (390 lines, ready to commit)
 M src/routes/pages.ts                (modified, needs review)
 M src/server.ts                      (modified, needs review)
```

### Diner Stale Lead Email Status
```
git status:
?? src/services/diner-stale-lead-email.ts  (313 lines, ready to commit)
 M src/db/schema.ts                         (+staleLeadReengagementSentAt column)
```

---

## Build Queue Status

| Feature | Status | Notes |
|---------|--------|-------|
| Checkout Flow + Stripe (MAI-839) | ✅ Committed | Ready for deployment |
| Chef Stale Lead Alert (MAI-841) | ✅ Committed | Ready for deployment |
| Referral CTA (MAI-823) | ✅ Committed | Ready for deployment |
| Guest Booking Recovery (MAI-805) | ✅ Committed | Ready for deployment |
| Chef Quote Customization (MAI-806) | ✅ Committed | Ready for deployment |
| Chef Lead Response Dashboard (MAI-766) | ✅ Committed | Ready for deployment |
| Auth Gate Removal (MAI-834) | ✅ Committed | Ready for deployment |
| Review Collection Automation (MAI-816) | ✅ Committed | Ready for deployment |
| Services Catalog Route Fix (MAI-813) | ✅ Committed | Ready for deployment |
| **Chef Discovery Page** | ✅ Built (UNCOMMITTED) | Needs commit + deploy |
| **Diner Stale Lead Email** | ✅ Built (UNCOMMITTED) | Needs commit + deploy |
| Homepage Direct Booking Path | 🔲 Not started | Task exists (MAI-850) |
| **MAI-618: Vercel + Stripe** | ❌ **BLOCKED** | **Fred must act — 12+ days** |

---

## 🟡 Priority #1 (Uncommitted Work): Commit Chef Discovery Page + Diner Stale Lead Email

**Action Required:** Spawn BE + FE agents to commit uncommitted work

The code is built and sitting in the working directory. No new implementation needed — just:
1. Review modified files (`pages.ts`, `server.ts`, `analytics.ts`)
2. Commit `chef-discovery-page.ts` + `diner-stale-lead-email.ts`
3. Commit schema migration for `staleLeadReengagementSentAt`

---

## 🟡 Priority #2: Chef Pipeline Summary Widget for Chef Dashboard

**Type:** Chef Retention + Funnel Optimization
**Effort:** ~2h (backend aggregation + frontend widget)
**Priority:** 🟡 P2

### Problem Statement

Chefs have no visibility into their overall lead pipeline. They see individual leads but not aggregate metrics: how many leads → quotes → bookings. Without pipeline visibility, there's no sense of conversion performance or urgency.

### User Story

**As a** chef, **I want to** see my lead pipeline summary (leads received, response rate, quote rate, booking rate) on my dashboard, **so that** I understand my conversion funnel and stay motivated to respond quickly.

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Widget shows leads received (last 30 days) |
| AC2 | Widget shows response rate (% of leads responded within 24h) |
| AC3 | Widget shows quote rate (% of leads with quote sent) |
| AC4 | Widget shows booking rate (% of quotes that converted) |
| AC5 | Widget displays at top of chef leads dashboard |
| AC6 | Metrics update when new leads/quotes/bookings are created |

### Scope

**In:**
- New API endpoint: `GET /api/chefs/me/pipeline-stats`
- Pipeline summary widget on chef leads dashboard
- 30-day rolling window

**Out:**
- Historical comparison (future enhancement)
- Export functionality
- Email reports

### Metrics

| Metric | Target |
|--------|--------|
| Chef 24h response rate | >80% after dashboard visibility |
| Lead → Quote rate | +10% lift |
| Quote → Booking rate | +5% lift |

---

## 🟡 Priority #3: Chef Photo Upload System

**Type:** Trust & Conversion
**Effort:** ~3h (BE file upload + FE display)
**Priority:** 🟡 P2

### Problem Statement

Every chef currently displays the **same hardcoded stock photo** based on cuisine type. A French chef and an Italian chef show the same Unsplash images. Real chef photos are the #1 trust signal — the absence of real photos directly undermines payment conversion.

### Current State

```typescript
// src/routes/pages.ts - getChefPhoto()
const photos: Record<string, string> = {
  'French': 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&h=400&fit=crop&crop=face',
  'Italian': 'https://images.unsplash.com/photo-1583394293214-28ez6f5b5b96?w=400&h=400&fit=crop&crop=face',
  // Every chef of same cuisine gets identical photo
};
```

### User Story

**As a** diner, **I want to** see real photos of the chef I'm booking, **so that** I trust who is cooking for my event and feel confident in my choice.

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Chef can upload a profile photo via `POST /api/chefs/me/photo` |
| AC2 | Uploaded photo is stored and served via `photo_url` field |
| AC3 | Chef profile page displays real photo (not Unsplash placeholder) |
| AC4 | Chef discovery page cards show real chef photo |
| AC5 | Graceful fallback to Unsplash if no photo uploaded |

### Scope

**In:**
- `POST /api/chefs/me/photo` endpoint with file upload handling
- `photo_url` field on chef profiles
- Update profile page and chef cards to use real photo
- File storage (base64 initially; cloud storage can come later)

**Out:**
- Multi-photo gallery (future)
- Photo cropping/resizing UI
- Cloud storage integration (base64 sufficient for MVP)

### Dependencies
- None — can be built independently of MAI-618

---

## 🟢 Priority #4: Booking Success Page with Referral Share

**Type:** Referral Activation
**Effort:** ~1.5h (frontend only)
**Priority:** 🟢 P3

### Problem Statement

The referral infrastructure (codes, tracking) exists but is never surfaced to diners. Diners who complete a booking have no share mechanism and no incentive to refer friends.

### User Story

**As a** diner who just booked a chef, **I want to** share my excitement with friends via WhatsApp/email with a referral code, **so that** I can earn a reward and they can get a discount.

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Success page shows "Booking Confirmed ✓" with booking summary |
| AC2 | Referral code displayed with one-click share buttons (WhatsApp, email) |
| AC3 | Pre-filled share message: "I'm hosting a private chef dinner! Use [CODE] for $X off your first booking" |
| AC4 | Referral code is generated on lead when booking transitions to `converted` |

### Scope

**In:**
- Success page referral share block
- Referral code generation on booking confirmation
- WhatsApp + email share buttons with pre-filled copy

**Out:**
- Referral reward mechanics (discount structure — needs Fred decision)
- Referral analytics dashboard (future)

### Note on Rewards
Fred needs to decide: what incentive does the referrer get? Options:
- Fixed discount ($25 off)
- Percentage (10% off)
- Credit toward future booking

Until this is decided, share CTA can say "Share with friends and get a reward!" without a specific dollar amount.

---

## Priority Matrix

| Priority | Opportunity | Type | Effort | Dependencies |
|----------|-------------|------|--------|--------------|
| 🔴 | Commit uncommitted work (MAI-845 + Discovery Page) | BE/FE | ~30min | Agent action |
| 🔴 | MAI-618 Fred blocker | Fred Action | — | **Fred must act** |
| 🟡 P2 | Chef Pipeline Dashboard | BE + FE | ~2h | None |
| 🟡 P2 | Chef Photo Upload | BE + FE | ~3h | None |
| 🟢 P3 | Booking Success Referral Share | FE | ~1.5h | Referral code exists |

---

## Open Questions

| # | Question | Priority | Owner |
|---|----------|----------|-------|
| 1 | **MAI-618 timeline** — Any ETA on Stripe keys from Fred? | 🔴 Critical | Fred |
| 2 | What referral reward structure should we use? | 🟡 Medium | Fred |
| 3 | Should photos be stored as base64 or use cloud storage? | 🟢 Low | Product |
| 4 | Does the chef pipeline dashboard need historical comparison? | 🟢 Low | Product |

---

## Metrics

| Feature | Metric | Target |
|---------|--------|--------|
| Chef Discovery Page | Page views / inquiry rate | Baseline needed |
| Diner Stale Lead Email | Quote rate from re-engaged leads | >10% |
| Chef Pipeline Dashboard | Chef 24h response rate | >80% |
| Chef Photo Upload | Booking conversion rate (with vs without photo) | +5% |
| Referral Share | Share clicks / confirmed bookings | >3% |
| Overall | Production deployment | **Blocked by MAI-618** |

---

## Recommended Tasks

| Task | Owner | Priority | Effort | Notes |
|------|-------|----------|--------|-------|
| Commit Chef Discovery Page | BE/FE | 🔴 P1 | ~30min | Code already built |
| Commit Diner Stale Lead Email | BE | 🔴 P1 | ~30min | Code already built |
| MAI-618 — Fred: Vercel + Stripe | Fred | 🔴 CRITICAL | — | **Fred must act — 12+ days** |
| Chef Pipeline Dashboard | BE + FE | 🟡 P2 | ~2h | Aggregate query + widget |
| Chef Photo Upload System | BE + FE | 🟡 P2 | ~3h | File upload + display |
| Booking Success Referral Share | FE | 🟢 P3 | ~1.5h | Share buttons + code generation |

---

## Notes for CEO Loop

1. **Most urgent action:** Two features are 100% complete but uncommitted. Spawn agents to commit immediately — no implementation needed, just review + push.

2. **MAI-618 is now 12+ days old.** This is the only thing preventing production deployment AND revenue. Fred must refresh the Vercel OIDC token and provide Stripe keys. Build team cannot test the full payment funnel without production Stripe keys.

3. **Three new product opportunities identified:**
   - Chef Pipeline Dashboard (~2h) — helps chefs optimize their side of the funnel
   - Chef Photo Upload (~3h) — trust signal at payment moment
   - Booking Success Referral Share (~1.5h) — activates referral channel

4. **Referral reward structure needs Fred's input.** What discount/credit should referrers and referees get?

5. **Build queue is complete for new features.** All items from prior PODs have been built. The team is blocked waiting for Fred on MAI-618.

---

## Post-MAI-618 Deployment Sequence

1. **Commit remaining uncommitted work** → Chef Discovery Page + Diner Stale Lead Email
2. **Deploy current code** → All committed features live
3. **Test checkout with Stripe test keys** → Verify full funnel
4. **Provide Stripe live keys** → Flip to production mode
5. **Build new opportunities** → Pipeline dashboard, photo upload, referral share

---

## Related Prior Work

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-846 | Prior POD — Build queue complete, MAI-618 critical | ✅ Superseded |
| MAI-839 | Checkout Flow + Stripe | ✅ Committed |
| MAI-841 | Chef Stale Lead Alert | ✅ Committed |
| MAI-845 | Diner Stale Lead Re-Engagement Email | ✅ Built, UNCOMMITTED |
| MAI-849 | Chef Discovery Page | ✅ Built, UNCOMMITTED |
| MAI-823 | Referral CTA | ✅ Committed |
| MAI-618 | Fred: Vercel + Stripe | 🔴 CRITICAL BLOCKER (12+ days) |

---

*Generated by Product Manager Agent (Max) on 2026-04-29 20:00 UTC as part of MAI-852 Product Opportunity Discovery*
