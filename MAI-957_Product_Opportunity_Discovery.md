# Product Opportunity Discovery

**Issue:** MAI-957
**Date:** 2026-05-02 04:00 UTC
**Status:** ✅ Complete
**Analyst:** Product Manager Agent (Max)
**Model:** MiniMax-M2.7

---

## Executive Summary

At 04:00 UTC on 2026-05-02, the platform has significant uncommitted work including Reviews System (MAI-940) and Chef Photo Upload (MAI-921). MAI-948 (Multi-Chef Inquiry Validation) task exists but has not been started. Three opportunities identified: **Best Value Sort (P2)**, **Service Category Landing Pages (P3)**, and **Empty State UX Improvements (P3)**. Critical blockers (Stripe/Resend keys) remain Fred's responsibility with no change in status.

---

## Current Platform State

### Recently Completed ✅ (Last 24h)

| Module | Status | Issue |
|--------|--------|-------|
| Landing Page CTA A/B Test | ✅ Committed | MAI-917 |
| Chef Photo Upload MVP | ✅ Uncommitted | MAI-921 |
| Reviews System | ✅ Uncommitted | MAI-940 |
| Multi-Chef Inquiry UI + API | ✅ Committed | MAI-908 |
| Service Photo Gallery | ✅ Complete | MAI-926 |
| Cuisine Filter on Hero | ✅ Committed | MAI-894 |

### Uncommitted Work 🔴

| Module | Files | Priority | Owner |
|--------|-------|----------|-------|
| Reviews System | `src/api/reviews.ts` | P1 | BE+FE |
| Chef Photo Upload | `src/api/chef-photo.ts` | P1 | BE |
| Chef Profile Page | `src/routes/chef-profile-page.ts` | P1 | FE |
| Multi-Chef Inquiry Validation | `tasks/MAI-948-task1-multi-chef-inquiry-validation.md` | P1 | BE+FE |

### Critical Blockers 🔴 (Fred Must Resolve — No Change)

| Blocker | Impact | Days Pending |
|---------|--------|---------------|
| `RESEND_API_KEY = re_placeholder` | All transactional emails blocked | 20+ days |
| `STRIPE_SECRET_KEY = empty` | Payment processing blocked | 20+ days |
| Vercel OIDC token expired | Cannot deploy | Unknown |

**No agent can unblock these. Fred is the only owner.**

---

## New Opportunities Identified

### Opportunity 1: "Best Value" Sort Option (P2)

**Priority: P2 — Discovery Improvement**

### Problem Statement

Current sort options let diners filter by price or popularity, but there's no "best value" option that considers both price AND chef responsiveness. A chef who responds quickly AND has reasonable pricing provides better overall value than a cheaper chef who is slow to respond.

### User Story

> **As a** diner searching for a private chef,
> **I want to** sort by "Best Value" so I can find chefs who offer great service at reasonable prices,
> **so that** I can make a confident booking decision without extensive research.

### Current State

- Sort options: `newest`, `popular`, `price_asc`, `price_desc`
- Response time tier exists per service via `getChefResponseTimeTier()`
- No computed value score combining price + response time

### Scope

**In:**
- Add "Best Value" sort option to services catalog (5th option, after "Price: High to Low")
- Computation: `valueScore = normalizedPriceScore (0-1) * 0.6 + normalizedResponseScore (0-1) * 0.4`
  - Lower price = higher price score
  - Faster response = higher response score
- Tiebreaker: alphabetically by chef name

**Out:**
- Rating/review integration (covered by MAI-940)
- Price-per-person trends or history

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | "Best Value" appears as a sort option in the dropdown |
| AC2 | Best Value sort returns services ordered by value score (highest first) |
| AC3 | "Newest" remains default when no sort selected |
| AC4 | Value computation is deterministic |

### Success Metrics

| Metric | Target |
|--------|--------|
| Best Value sort usage | >15% of catalog sessions |
| Best Value → booking conversion | Establish baseline |

### Effort

~45 min (frontend sort option + value computation function)

### Dependencies

- None (fully independent)

---

### Opportunity 2: Service Category Landing Pages (P3)

**Priority: P3 — SEO + Discovery**

### Problem Statement

The homepage has cuisine quick-filter pills but no dedicated landing pages per cuisine type. Search engines have no deep pages to index. When diners search "French private chef Montreal," they land on the generic homepage instead of a curated category page.

### User Story

> **As a** diner searching for "French private chef Montreal",
> **I want to** land on a French cuisine category page,
> **so that** I can quickly browse relevant services with curated copy.

### Current State

- Homepage hero has cuisine quick-filter pills (French, Italian, Asian, etc.)
- `/services?cuisine=Italian` works but has no SEO metadata
- No `/cuisine/italian` route with dedicated page content

### Scope

**In:**
- New route: `/cuisine/:cuisineType` (e.g., `/cuisine/italian`)
- Dynamic `<title>` and `<meta description>` per cuisine
- Services filtered to that cuisine with sort options
- Canonical URL for each cuisine page
- Homepage cuisine pills link to `/cuisine/X` routes

**Out:**
- Multiple cuisine selection
- Cuisine-specific banners/images
- Blog content integration

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | `/cuisine/italian` renders with Italian services only |
| AC2 | Page has cuisine-specific `<title>` and `<meta description>` |
| AC3 | Sort options work on cuisine pages |
| AC4 | Homepage cuisine pills link to `/cuisine/X` pages |

### Success Metrics

| Metric | Target |
|--------|--------|
| Organic search impressions (cuisine pages) | >50 within 2 weeks |
| Cuisine page → catalog exit rate | <20% |

### Effort

~1h (new route + page template + SEO metadata)

### Dependencies

- None (fully independent)

---

### Opportunity 3: Empty State UX Improvements (P3)

**Priority: P3 — Conversion Optimization**

### Problem Statement

When a diner's filter combination returns zero services, the empty state shows generic messaging. It doesn't provide contextual guidance or suggest alternatives, causing frustrated diners to leave instead of adjusting their search.

### User Story

> **As a** diner whose filter combination returned no results,
> **I want to** see helpful suggestions for finding alternatives,
> **so that** I don't leave the site frustrated.

### Current State

```typescript
// Current empty state in pages.ts
${currentDietaryTags.length > 0 ? '<p class="no-results-hint">Try removing dietary filters or adjusting your search.</p>' : ''}
<a href="/services" class="reset-link">Clear filters</a>
```

Only dietary tag hint is shown. No guidance for price range, guest count, or other filter combinations.

### Scope

**In:**
- Contextual empty state messages based on active filters:
  - Price too high: "No chefs in this price range. [See chefs under $X] or [Clear price filter]"
  - Dietary + price: "No chefs match these filters. [Try removing dietary] or [See more affordable options]"
  - Guest count: "No chefs available for [X] guests. [Adjust guest count] or [See parties up to Y]"
- "Reset all filters" button always visible in empty state
- Show count of matching services if constraints relaxed (e.g., "No French chefs for 8 guests, but 3 Italian chefs available")

**Out:**
- Personalized recommendations based on past behavior
- Email capture on empty state

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Empty state shows filter-specific guidance |
| AC2 | "Reset all filters" button always visible in empty state |
| AC3 | Suggested alternatives shown when possible |
| AC4 | Empty state consistent across all filter combinations |

### Success Metrics

| Metric | Target |
|--------|--------|
| Empty state → reset filter rate | >40% |
| Empty state → search abandonment | <15% (lower is better) |

### Effort

~30 min (contextual message logic + updated template)

### Dependencies

- None (fully frontend, no API changes)

---

## Priority Matrix

| Priority | Feature | Effort | Impact | Dependencies |
|----------|---------|--------|--------|--------------|
| **P2** | Best Value Sort | ~45min | MEDIUM | None |
| **P3** | Service Category Landing Pages | ~1h | MEDIUM | None |
| **P3** | Empty State UX Improvements | ~30min | LOW | None |

---

## Open Questions

| # | Question | Priority | Owner | Status |
|---|----------|----------|-------|--------|
| 1 | ETA for Stripe live keys + Resend API key? | 🔴 Critical | Fred | 20+ days pending |
| 2 | Platform deployment status? | 🔴 Critical | Fred | Unknown |
| 3 | Should "Best Value" computation weight price vs response time? | 🟡 Medium | Product | Proposed 60/40 split |
| 4 | MAI-940 (Reviews) — status update needed | 🟡 High | BE+FE | Uncommitted |
| 5 | MAI-948 (Multi-Chef Validation) — should this be prioritized? | 🟡 Medium | BE+FE | Task exists, not started |

---

## Recommended Tasks

| Task | Owner | Priority | Effort | Dependencies |
|------|-------|----------|--------|--------------|
| Commit Reviews System (MAI-940) | BE+FE | P1 | ~15min | None |
| Commit Chef Photo Upload (MAI-921) | BE | P1 | ~10min | None |
| Implement Multi-Chef Inquiry Validation (MAI-948) | BE+FE | P1 | ~1.5h | None |
| Best Value Sort | FE | P2 | ~45min | None |
| Service Category Landing Pages | FE | P3 | ~1h | None |
| Empty State UX Improvements | FE | P3 | ~30min | None |

---

## Prior PODs (Recent)

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-952 (00:00 UTC) | Best Value Sort, Category Landing Pages, Empty State UX | ✅ Identified |
| MAI-946 (20:00 UTC) | Multi-Chef Validation, Diner Preferences, Chef Portfolio | ✅ Identified |
| MAI-938 (16:00 UTC) | Quote View Analytics, Stale Lead Escalation, Diner Timeline | ✅ Completed |
| MAI-930 (12:00 UTC) | Chef Response Time Display, Availability Calendar, Saved Search Alerts | ✅ Completed |
| MAI-922 (08:00 UTC) | Service Photo Gallery, Search Enhancement, Corporate Inquiry | ✅ Completed |

---

## Notes

1. **MAI-948 (Multi-Chef Validation)** task exists but has not been started. Given its P1 priority and that it directly prevents bad data from entering the system, it should be prioritized before new opportunities.

2. **Uncommitted work**: The most immediate action is committing MAI-940 (Reviews System) and MAI-921 (Chef Photo Upload). These are verified complete but not accessible to users.

3. **Best Value sort** is genuinely new — existing sorts don't combine price + response time into a single metric. The P2 priority is justified by low effort and measurable impact on discovery.

4. **Cuisine filter already works via query param** — the homepage cuisine pills link to `/services?cuisine=X`. Category Landing Pages (Opportunity 2) extends this to dedicated URLs with SEO metadata.

---

_Generated by Product Manager Agent (Max) on 2026-05-02 04:00 UTC as part of MAI-957 Product Opportunity Discovery_