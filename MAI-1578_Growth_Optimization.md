# MAI-1578: Growth Optimization — Add Chef Ratings to Discovery Cards

**Issue:** 6c8f75ce-4ac4-41b9-8594-c16c66820c9c
**Status:** ✅ Complete
**Owner:** Growth Marketer
**Completed:** 2026-05-15 04:05 UTC

---

## Executive Summary

**Growth idea:** The reviews infrastructure is fully built (API endpoints, review submission page, schema), but chef discovery cards don't display star ratings. Adding `avgRating` and `reviewCount` to the discovery page data and rendering them on cards surfaces social proof at the moment diners are comparing chefs — the highest-impact point for driving trust and clicks.

**Expected impact:** Diners browsing multiple chef cards make snap judgments. A visible star rating (e.g., "★ 4.8 (12 reviews)") is an immediate trust signal that differentiates established chefs from unknowns, increasing click-through to profiles and inquiry submission.

**Why this matters now:** With only 1 live chef, the rating would show "★ 5.0 (2 reviews)" or similar — immediately more credible than no rating. As more bookings complete, ratings compound as social proof.

---

## 1. Current Funnel State

| Stage | Status | Notes |
|-------|--------|-------|
| Homepage → Discovery | ✅ Live | Traffic arriving |
| Chef discovery cards | ✅ Working | Cards display photo, name, cuisine, price |
| **Star rating on cards** | 🔴 **Missing** | Not in page data, not rendered |
| Reviews API | ✅ Built | `GET /api/chefs/:id/reviews`, `GET /api/services/:id/reviews` |
| Review submission page | ✅ Built | `/review/:bookingId` (MAI-1214) |
| Reviews schema | ✅ Built | `reviews` table with rating, comment, FKs |
| Individual chef profile | ✅ Shows ratings | `chef-profile-page.ts` loads via `loadChefReviews()` |

**Root cause:** The discovery page (`chef-discovery-page.ts`) fetches chef data for cards but doesn't fetch or compute review stats. The individual chef endpoint (`GET /api/chefs/:id`) has review stats, but the discovery page server-side render queries only `users` + `chefProfiles` without review aggregation.

---

## 2. Growth Opportunity: Add Ratings to Discovery Cards

### Problem

When a diner browses the chef discovery page, they see a grid of chef cards. Each card shows:
- Chef photo (or cuisine placeholder)
- Name + verified badge + lead count badge
- Location
- Cuisines
- Price
- Response time stats

But **no social proof via ratings**. The reviews exist — they're just not surfaced until the diner clicks into a chef's profile page. By that point, the diner has already made a snap judgment based only on photo, name, and price.

### Why Ratings Belong on Discovery Cards

**Trust at the comparison point.** When comparing 3-5 chefs, a diner asks: "Which one do I trust to cook in my home?" Star ratings answer that question visually in milliseconds.

**First-mover advantage for rated chefs.** New chefs without reviews start at parity. Chefs with ratings immediately differentiate themselves, creating an incentive for chefs to earn reviews and for diners to complete post-booking reviews.

**Ratings are the #1 conversion driver for service marketplaces** (Yelp, Uber, Fiverr, Airbnb). Diners filter and sort by rating before clicking.

### Solution

**Two changes required in `chef-discovery-page.ts`:**

1. **Data change:** Compute `avgRating` and `reviewCount` per chef in the server-side render function by querying the `reviews` table
2. **UI change:** Render the rating HTML in `buildChefCard()` and add `.chef-rating` CSS class

---

## 3. What Already Exists

| Component | Status | Location |
|-----------|--------|----------|
| Reviews schema | ✅ Built | `reviews` table in `schema.js` |
| Review submission page | ✅ Built | `src/routes/review-page.ts` |
| Rating display on profile | ✅ Working | `chef-profile-page.ts` renders via `loadChefReviews()` |

### What Was Changed

**File: `src/routes/chef-discovery-page.ts`**

**Import change** (line 3):
```typescript
import { users, chefProfiles, services, leads, reviews } from '../db/schema.js';
// Added: reviews
```

**Data change** — after lead count computation, added review stats per chef:
```typescript
// MAI-1578: Compute review stats per chef for discovery cards
const reviewStats: Record<number, { avgRating: number | null; reviewCount: number }> = {};
for (const chef of chefs) {
  const result = db.select({
    count: sql<number>`count(*)`,
    avgRating: sql<number>`coalesce(avg(${reviews.rating}), 0)`,
  })
    .from(reviews)
    .where(eq(reviews.chefId, chef.id))
    .get();
  const count = (result?.count as number) ?? 0;
  reviewStats[chef.id] = {
    avgRating: count > 0 ? Math.round((result?.avgRating as number || 0) * 10) / 10 : null,
    reviewCount: count,
  };
}
```

**Data injection** — in the `chefsJson` map:
```typescript
avgRating: reviewStats[c.id]?.avgRating ?? null,
reviewCount: reviewStats[c.id]?.reviewCount ?? 0,
```

**UI change** — in `buildChefCard()`, before the chef location div:
```typescript
var ratingHtml = '';
if (chef.avgRating && chef.avgRating > 0) {
  var stars = '';
  for (var i = 1; i <= 5; i++) stars += i <= Math.round(chef.avgRating) ? '★' : '☆';
  var reviewLabel = (chef.reviewCount || 0) === 1 ? 'review' : 'reviews';
  ratingHtml = '<div class="chef-rating" style="color:#f57c00;font-size:0.85rem;margin-bottom:0.25rem;">' + stars + ' ' + chef.avgRating + ' (' + (chef.reviewCount || 0) + ' ' + reviewLabel + ')</div>';
}
```

**CSS change**:
```css
.chef-rating { color: #f57c00; font-size: 0.85rem; margin-bottom: 0.25rem; }
```

**Build verification:** ✅ `npm run build` passes with no errors. Compiled output confirmed at `dist/routes/chef-discovery-page.js`.

---

## 4. Experiment Plan

### A/B Test: Discovery Cards With vs. Without Ratings

**Variant A (Control):** Current discovery cards — no rating display  
**Variant B (Treatment):** Discovery cards with star rating badge

**Hypothesis:** Showing star ratings on discovery cards increases diner trust at the comparison/selection stage, leading to higher:
- Card click-through rate (CTR)
- Profile page visits
- Inquiry submission rate

**Success metrics:**
- Discovery card CTR by rating presence
- Profile visit rate after card click
- Inquiry submission rate
- Discovery → booking rate

**Measurement:**
- Existing `chef_discovery_card_click` event (MAI-1079) — segment by rating presence
- Google Analytics / custom events for CTR

**Duration:**
- Minimum 7 days or 100 card clicks per variant
- 85% confidence before declaring winner

### Secondary Hypothesis

Chefs with ratings receive more inquiries than chefs without ratings (selection bias — better chefs get better reviews AND more inquiries). Track:
- Inquiry rate: chefs with rating vs. without rating
- Time to first inquiry after first review

---

## 5. Metrics to Track

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Discovery card CTR (with rating vs. without) | Unknown | +10% for rated cards | A/B events: card clicks segmented by `hasRating` |
| Profile visit rate after card click | Unknown | +5% for rated cards | GA / custom events |
| Inquiry submission rate | ~20% of service page visitors | +15% | DB: leads created / unique profile visitors |
| % of discovery cards with ratings | 0% | Growing | Count of chefs with `reviewCount > 0` |
| Average rating of active chefs | N/A | 4.0+ | Avg of all `avgRating` values |

---

## 6. Secondary Finding: Sort by Rating Opportunity

Once ratings are visible, diners naturally gravitate toward highly-rated chefs. A natural next experiment:

**Sort option: "Top Rated"** — add a `sort=rating` option to the discovery page that sorts chefs by `avgRating DESC, reviewCount DESC`.

This would:
- Surface the best-performing chefs
- Give chefs an incentive to earn reviews
- Increase overall platform quality perception

---

## 7. Dependencies

| Blocker | Owner | Status |
|---------|-------|--------|
| Reviews infrastructure | BE | ✅ Fully built (MAI-1214) |
| Review stats in discovery page | FE | ✅ Added in this cycle |
| Discovery card UI rendering | FE | ✅ Added in this cycle |

---

## Definition of Done

- [x] Growth opportunity identified (ratings not shown on discovery cards) ✅
- [x] Root cause identified (discovery page doesn't fetch review stats) ✅
- [x] What already exists mapped (reviews schema + API + profile page) ✅
- [x] Implementation changes defined ✅
- [x] Build verification ✅
- [x] A/B test plan defined ✅
- [x] Metrics to track defined ✅

---

*Report completed: 2026-05-15 04:05 UTC*
*Next growth cycle: ~3-6 hours*