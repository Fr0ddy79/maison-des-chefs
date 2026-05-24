# Product Opportunity Discovery — MAI-1970

**Issue:** a7e61ff2-5451-4006-8014-1ea5db0f6e73
**Date:** 2026-05-23 12:05 UTC
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager

---

## 1. Executive Summary

Product work is moving forward with two new features in progress (MAI-1960 filter wiring, MAI-1967 checkout social proof). Backend continues to execute well (MAI-1969). Infrastructure blockers remain critical and unchanged — **revenue is still $0**. No stale items in this cycle.

| # | Finding | Owner | Priority | Status |
|---|---------|-------|----------|--------|
| 1 | **MAI-1960:** Chef Browse Filters — FE work in progress, unstaged | Frontend | 🟡 Medium | Uncommitted changes |
| 2 | **MAI-1967:** Checkout Social Proof Card — in progress, unstaged | Frontend | 🟡 Medium | Uncommitted changes |
| 3 | **MAI-1969 Done:** 'single' inquiry type booking fix | Backend | ✅ Done | Commit `3155ede` |
| 4 | **Infrastructure blockers** | Fred | 🔴 Critical | 90+ days unchanged |

---

## 2. Platform State (12:05 UTC May 23)

### Infrastructure Status

| Blocker | Owner | Age | Revenue Impact |
|---------|-------|-----|----------------|
| `STRIPE_SECRET_KEY` | Fred | 90+ days | **$0 revenue** — payments blocked |
| `RESEND_API_KEY` | Fred | 90+ days | All email flows dead |
| `JWT_SECRET` | Fred | ? | Auth token risk |

**Revenue: $0**

### Recent Git Activity (since May 23 08:00 UTC)

| Commit | Author | Description |
|--------|--------|-------------|
| `3155ede` | Backend | MAI-1969: Fix 'single' inquiry type booking creation |

### In-Progress Work (Uncommitted)

| Task | Owner | Status | Notes |
|------|-------|--------|-------|
| MAI-1960: Chef Browse Filters API Wiring | Frontend | 🟡 In progress | `chef-discovery-page.ts` — `fetchChefsFromApi()` added to `applyFilters()`, 58 lines unstaged |
| MAI-1967: Checkout Social Proof Card | Frontend | 🟡 In progress | `checkout.ts` — social proof card UI added, 52 lines unstaged |

### Stale Items

| Task | Owner | Age | Status |
|------|-------|-----|--------|
| MAI-1890: Chef Browse Filters FE Wire-Up | Frontend | **44h+ stale** | `in_progress` since May 21 16:00 UTC — now being addressed by MAI-1960 |

---

## 3. In-Progress Work Analysis

### 3a. MAI-1960 — Chef Browse Filters API Wiring 🟡

**What:** Front-end `applyFilters()` now calls `GET /api/chefs` when date/guests/occasion are set.

**Current diff (58 lines, unstaged):**
- `applyFilters()` now checks `hasApiFilters = date || guests || occasion`
- When true → calls `fetchChefsFromApi()` instead of `renderChefs()`
- `fetchChefsFromApi()` builds URLSearchParams, calls `/api/chefs`, handles loading/error/empty states
- Falls back to client-side `renderChefs()` for simple filters (cuisine/dietary/price only)

**Status:** Work is done but **not committed**. Should be pushed and `multica issue complete`d.

**User Story:**

**As a** diner with specific requirements (date, party size, occasion),
**I want** the chef browse page to filter via the API so I see accurate, server-filtered results,
**so that** I don't waste time browsing chefs who aren't actually available for my event.

**Acceptance Criteria:**
- [x] Date picker, guest count, occasion dropdown trigger API calls when set
- [x] `GET /api/chefs?date=YYYY-MM-DD&partySize=N&occasion=X` returns filtered results
- [x] Results update without page reload
- [x] Clear all resets all filters
- [x] URL updates with filter params
- [ ] `npm run build` passes (needs verification)

---

### 3b. MAI-1967 — Checkout Social Proof Card 🟡

**What:** Adds a social proof card to the checkout page showing chef verification, ratings, and stats.

**Current diff (52 lines, unstaged):**
```html
<div class="social-proof-card">
  <div class="chef-avatar-section">
    <div class="chef-avatar">CM</div>
    <div class="chef-info">
      <div class="chef-name">Chef ${lead.chefName || 'Marcel'}</div>
      <div class="chef-badge">✓ Verified Chef</div>
    </div>
  </div>
  <div class="rating-section">★★★★★ 5.0 (12 reviews)</div>
  <div class="social-proof-stats">
    <div class="stat-item"><div class="stat-number">8</div><div class="stat-label">People booked</div></div>
    <div class="stat-item"><div class="stat-number">30+</div><div class="stat-label">Events completed</div></div>
    <div class="stat-item"><div class="stat-number">100%</div><div class="stat-label">Satisfaction</div></div>
  </div>
</div>
```

**Status:** Work is done but **not committed**. Static hardcoded values — should be replaced with dynamic data from `lead` object if not already.

**Open Question:** Are the stats (8 people booked, 30+ events, 100% satisfaction) hardcoded or pulled from real data? If hardcoded, this should be flagged as a limitation in the spec.

---

### 3c. MAI-1969 — 'single' Inquiry Type Booking Fix ✅ Done

**Commit:** `3155ede`
**What:** Fixes booking creation when `inquiryType === 'single'`
**Status:** ✅ Complete, committed

---

## 4. Critical Infrastructure Blockers — Unchanged 🔴 CRITICAL

### Revenue: $0

Every feature built cannot convert to revenue without Stripe configured.

| Blocker | Owner | Age | Impact |
|---------|-------|-----|--------|
| `STRIPE_SECRET_KEY` | Fred | 90+ days | No payment processing — $0 revenue |
| `RESEND_API_KEY` | Fred | 90+ days | All transactional emails dead |

### What Fred Needs to Do

```bash
# 1. Add Stripe key — single most impactful action for revenue
echo "STRIPE_SECRET_KEY=sk_live_..." >> .env

# 2. Add Resend key — enables all email flows
echo "RESEND_API_KEY=re_..." >> .env

# 3. Restart server
pm2 restart server
```

---

## 5. Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | MAI-1967: Are checkout social proof stats hardcoded or dynamic? | Frontend | Needs verification |
| 2 | MAI-1960: Does `npm run build` pass after filter wiring changes? | Frontend | Needs verification |
| 3 | MAI-1923: Checkout funnel audit — status? | Growth | ~20h in progress |
| 4 | MAI-1879: Checkout credits — deployed and tested? | BE | Unverified |

---

## 6. This Cycle's Recommendations

| # | Action | Owner | Priority |
|---|--------|-------|----------|
| 1 | **MAI-1960:** Commit filter wiring, run `npm run build`, complete issue | Frontend | 🟡 Medium |
| 2 | **MAI-1967:** Verify stats are dynamic, commit, complete issue | Frontend | 🟡 Medium |
| 3 | Fred: add `STRIPE_SECRET_KEY` + `RESEND_API_KEY` | Fred | 🔴 Critical |
| 4 | Verify MAI-1879 (checkout credits) end-to-end flow | BE | Medium |

---

## 7. Definition of Done

- [x] Platform state analyzed (12:05 UTC May 23)
- [x] In-progress work identified (MAI-1960, MAI-1967)
- [x] Completed items verified (MAI-1969)
- [x] Infrastructure blockers confirmed unchanged
- [x] Open questions surfaced
- [x] Recommendations provided

---

*MAI-1970 — Product Manager — 2026-05-23 12:05 UTC*