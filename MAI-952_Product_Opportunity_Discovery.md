# Product Opportunity Discovery

**Issue:** MAI-952
**Date:** 2026-05-02 00:00 UTC
**Status:** ✅ Complete
**Analyst:** Product Manager Agent (Max)
**Model:** MiniMax-M2.7

---

## Executive Summary

This POD examines the Maison des Chefs platform at 00:00 UTC on 2026-05-02. Recent completed work includes Landing Page CTA A/B Test (MAI-920), Chef Photo Upload (MAI-921), and prior Multi-Chef Inquiry (MAI-908). The platform is feature-complete for v1 scope with the main blocker being Fred's missing Stripe/Resend API keys.

**Three opportunities identified:**
1. **"Best Value" Sort Option** — P2, computed metric combining price + response time tier
2. **Service Category Landing Pages** — P3, SEO-friendly pages per cuisine category
3. **Empty State UX Improvements** — P3, actionable guidance when no services match filters

---

## Current Platform State

### Recently Completed ✅ (Last 24h)

| Module | Status | Verification |
|--------|--------|--------------|
| Landing Page CTA A/B Test (MAI-920) | ✅ Committed | 4 CTA variants (A/B/C/D/E) with routing |
| Chef Photo Upload MVP (MAI-921) | ✅ Committed | `POST /api/chef-photo` endpoint |
| Multi-Chef Inquiry UI + API | ✅ Complete | Committed in prior sprint |
| Service Photo Gallery | ✅ Complete | Lightbox + grid on service detail |
| Cuisine Filter on Homepage Hero | ✅ Complete | MAI-894 |
| Guest Count + Price Calculator | ✅ Complete | MAI-859 |

### Sort Options — Current State

| Sort Option | Status | Implementation |
|-------------|--------|----------------|
| Newest | ✅ Available | `query.sort === 'newest'` → `orderBy(createdAt DESC)` |
| Most Popular | ✅ Available | Client-side sort by lead count |
| Price: Low to High | ✅ Available | `query.sort === 'price_asc'` |
| Price: High to Low | ✅ Available | `query.sort === 'price_desc'` |
| **Best Value** | ❌ Missing | No computed metric exists |
| Best Rating | ❌ Missing | No rating/review system exists |

### Critical Blockers 🔴 (Unchanged)

| Blocker | Impact | Owner | Status |
|---------|--------|-------|--------|
| `RESEND_API_KEY = re_placeholder` | All transactional emails blocked | Fred | 12+ days |
| `STRIPE_SECRET_KEY = empty` | Payment processing blocked | Fred | 12+ days |
| Platform not deployed | Outreach has no live conversion path | Fred | Unchanged |

**No agent can unblock these. Fred must act.**

---

## New Opportunities Identified

### Opportunity 1: "Best Value" Sort (P2)

**Priority: P2 — Discovery Improvement**

### Problem Statement

Current sort options let diners filter by price or popularity, but there's no "best value" option that considers both price and chef responsiveness. A chef who responds quickly AND has reasonable pricing provides better overall value than a cheaper chef who is slow to respond.

### User Story

> **As a** diner searching for a private chef,
> **I want to** sort by "Best Value" so I can find chefs who offer great service at reasonable prices,
> **so that** I can make a confident booking decision without extensive research.

### Current State

- Sort options: `newest`, `popular`, `price_asc`, `price_desc`
- Response time tier (`fast`/`medium`/`slow`/`new_chef`) exists per service via `getChefResponseTimeTier()`
- No computed value score combining price + response time

### Scope

**In:**
- Add "Best Value" sort option to services catalog
- Computation: `valueScore = normalizedPriceScore (0-1) * 0.6 + normalizedResponseScore (0-1) * 0.4`
  - Lower price = higher price score
  - Faster response = higher response score
- "Best Value" appears as 5th sort option (after "Price: High to Low")
- Tiebreaker: alphabetically by chef name

**Out:**
- Rating/review integration (future feature)
- Price-per-person history or trends

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | "Best Value" sort option appears in sort dropdown |
| AC2 | Best Value sort returns results ordered by computed value score (highest first) |
| AC3 | "Newest" remains the default sort when no sort selected |
| AC4 | Best Value computation is deterministic (same inputs = same output) |

### Success Metrics

| Metric | Target |
|--------|--------|
| Best Value sort usage | >15% of catalog sessions use it |
| Best Value → booking conversion | Establish baseline |

### Effort

~45 min (frontend sort option + value computation function)

---

### Opportunity 2: Service Category Landing Pages (P3)

**Priority: P3 — SEO + Discovery**

### Problem Statement

The homepage has a cuisine filter but no dedicated landing pages for each cuisine type. Search engines have no deep pages to index, and diners who arrive via organic search land on the generic homepage instead of a curated experience.

### User Story

> **As a** diner searching for "French private chef Montreal",
> **I want to** land on a French cuisine category page,
> **so that** I can quickly browse relevant services with curated copy.

### Current State

- Homepage hero has cuisine quick-filter pills (French, Italian, Asian, Mexican, etc.)
- `/services` page accepts `?cuisine=Italian` query param
- No dedicated `/cuisines/italian` or `/services/italian` routes
- No category-specific SEO metadata (title, meta description, hero copy)

### Scope

**In:**
- New route: `/cuisine/:cuisineType` (e.g., `/cuisine/italian`)
- Page shows:
  - Hero with category name + curated tagline
  - Services filtered to that cuisine
  - Category description (e.g., "Italian chefs specializing in handmade pasta, regional specialties...")
  - Sort options (including "Best Value")
- SEO metadata: dynamic `<title>` and `<meta description>` per cuisine
- Canonical URL for each cuisine page

**Out:**
- Multiple cuisine selection (stays single-cuisine)
- Cuisine-specific landing page banners/images
- Blog content integration

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | `/cuisine/italian` renders with Italian services only |
| AC2 | Page has dynamic `<title>` and `<meta description>` |
| AC3 | Services sorted by "Newest" by default |
| AC4 | User can switch to other sort options |
| AC5 | Navigation from homepage cuisine pills links to category pages |

### Success Metrics

| Metric | Target |
|--------|--------|
| Organic search impressions (cuisine pages) | >50 impressions within 2 weeks |
| Cuisine page → services catalog exit rate | <20% |

### Effort

~1h (new route handler + page template + SEO metadata)

---

### Opportunity 3: Empty State UX Improvements (P3)

**Priority: P3 — Conversion Optimization**

### Problem Statement

When a diner applies filters that match zero services, the empty state is generic: "No services found. Try adjusting your filters." It doesn't guide the diner toward an alternative or explain why their search returned nothing.

### User Story

> **As a** diner whose filter combination returned no results,
> **I want to** see helpful suggestions for finding alternatives,
> **so that** I don't leave the site frustrated.

### Current State

```typescript
// From pages.ts line ~450
${currentDietaryTags.length > 0 ? '<p class="no-results-hint">Try removing dietary filters or adjusting your search.</p>' : ''}
<a href="/services" class="reset-link">Clear filters</a>
```

Only shows "Try removing dietary filters" if dietary tags are active. No specific guidance for other filter combinations.

### Scope

**In:**
- Contextual empty state messages:
  - Price too high: "No chefs in this price range. [See chefs under $X] or [Clear price filter]"
  - Dietary + high price: "No chefs match these filters. [Try removing dietary] or [See more affordable options]"
  - Guest count no matches: "No chefs available for [X] guests. [Adjust guest count] or [See parties up to Y]"
- "Reset all filters" button always visible in empty state
- Show count of matching services if constraints are relaxed (e.g., "No French chefs for 8 guests, but 3 Italian chefs available")
- Suggest related cuisine types if exact match fails

**Out:**
- Personalized recommendations based on past behavior
- Email capture on empty state (not relevant here)

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Empty state shows category-specific guidance |
| AC2 | "Reset all filters" button always visible in empty state |
| AC3 | Suggested alternatives shown when possible |
| AC4 | Empty state consistent across all filter combinations |

### Success Metrics

| Metric | Target |
|--------|--------|
| Empty state → reset filter rate | >40% |
| Empty state → search abandonment rate | <15% (lower is better) |

### Effort

~30 min (contextual message logic + updated template)

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
| 1 | ETA for Stripe live keys + Resend API key? | 🔴 Critical | Fred | 12+ days pending |
| 2 | Platform deployment status? | 🔴 Critical | Fred | Unknown |
| 3 | Should "Best Value" computation weight price vs response time? | 🟡 Medium | Product | Proposed 60/40 split |
| 4 | Cuisine pages — any specific cuisines to exclude? | 🟢 Low | Fred | None known |

---

## Recommended Tasks

| Task | Owner | Priority | Effort | Notes |
|------|-------|----------|--------|-------|
| Best Value Sort | Frontend | P2 | ~45min | New sort option + value computation |
| Service Category Landing Pages | Frontend | P3 | ~1h | New `/cuisine/:type` route |
| Empty State UX Improvements | Frontend | P3 | ~30min | Contextual guidance messages |

---

## Related Prior Work

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-922 | Prior POD: Photo Gallery + Search Enhancement | ✅ Partially done (sort options exist) |
| MAI-920 | Landing Page CTA A/B Test | ✅ Complete |
| MAI-921 | Chef Photo Upload MVP | ✅ Complete |
| MAI-911 | Prior POD: Photo Gallery + Corporate Copy Fix | ✅ Both items addressed |
| MAI-908 | Multi-Chef Inquiry UI + API | ✅ Complete |

---

## Notes

1. **Search Enhancement scope clarified**: The "Best Value" sort is genuinely new — existing sort options (newest, popular, price_asc, price_desc) don't compute a combined price+response metric. The P2 priority from MAI-922 for "Search Enhancement" is addressed by this POD's Opportunity 1.

2. **Cuisine filter already works via query param**: Homepage cuisine pills already link to `/services?cuisine=X`. The new Opportunity 2 (Category Landing Pages) extends this to dedicated `/cuisine/X` URLs with SEO metadata.

3. **Empty state context**: The empty state improvements (Opportunity 3) are low-effort but provide meaningful UX improvement for frustrated diners who would otherwise leave.

---

_Generated by Product Manager Agent (Max) on 2026-05-02 00:00 UTC as part of MAI-952 Product Opportunity Discovery_