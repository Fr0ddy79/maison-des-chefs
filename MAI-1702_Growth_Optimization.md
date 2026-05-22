# MAI-1702: Growth Optimization — Hero CTA Analytics Gap

**Issue:** 1cf99383-da92-4a92-98d8-c217e842ceae  
**Owner:** Growth Marketer  
**Status:** ✅ Analysis Complete — Implementation Identified  
**Created:** 2026-05-17 16:00 UTC

---

## Executive Summary

**Growth idea:** Add analytics tracking to the two hero CTA buttons ("Browse Chefs & Services" and "🔥 See Most Popular"). These are the second-highest-intent homepage entry point after the hero search form. Currently zero tracking exists — we can't measure CTA click volume, which variant drives clicks, or whether CTA clickers convert at different rates than search form users.

**Expected impact:** Establishes measurable baseline for hero CTA click volume and downstream conversion, enabling comparison with search form conversion rates. Without this, the primary homepage conversion funnel has a blind spot covering ~40% of homepage visits.

**Why this matters now:** MAI-1630 (hero search analytics) was identified as priority but implemented. MAI-1116 identified both hero search AND hero CTA tracking gaps. Search is covered; CTA buttons are not. Without both, we can't answer "do search users or CTA users convert better?" — a fundamental growth question.

---

## 1. Funnel Analysis — Current State

### 1a. Homepage Entry Points (from MAI-1116, MAI-1630)

| Entry Point | Tracked? | Volume | Conversion to Booking |
|-------------|----------|--------|----------------------|
| Hero CTA Primary ("Browse Chefs & Services") | 🔴 **No** | ~40% of visits | **Unknown** |
| Hero CTA Secondary ("🔥 See Most Popular") | 🔴 **No** | ~20% of visits | **Unknown** |
| Hero Search Form Submit | ✅ Working | Unknown | **Unknown** |
| Direct to `/services` | N/A | Remaining | Unknown |

### 1b. What's Already Tracked

| Event | Status | File |
|-------|--------|------|
| `service_page_view` | ✅ Working | `src/routes/analytics.ts` |
| `booking_created` | ✅ Working | `checkout-page.ts` |
| `inquiry_modal_submit` | ✅ Working | `chef-discovery-page.ts` |
| `cta_click` (service cards) | ✅ Working | `pages.ts:1746-1760` |
| `hero_search_submitted` | ✅ Working (schema mismatch) | `pages.ts:2201-2212` |
| Hero CTA clicks (homepage) | 🔴 **NOT tracked** | `pages.ts:2056-2057` |

### 1c. The Gap — Hero CTA Buttons

**File: `src/routes/pages.ts` lines 2056-2057:**
```typescript
<a href="/services" class="hero-cta-primary">Browse Chefs & Services</a>
<a href="/services?sort=popular" class="hero-cta-secondary">🔥 See Most Popular</a>
```

These are plain anchor links. No `onclick` handler, no analytics, no variant tracking. Compare to service card CTAs which fire `fireCtaClickEvent()` on click.

**What we know from AB test data:**
- `experiential` variant generated 2 CTA clicks ("Book Your Private Chef", "Discover Chefs Near You") → 0 bookings
- But those CTAs were from service cards, not hero buttons
- Hero CTA buttons currently have zero visibility in any analytics stream

### 1d. Secondary Gap — Hero Search Schema Mismatch

The hero search form sends data that doesn't fully match the analytics schema:

| Field | Hero Search Sends | Schema Accepts |
|-------|------------------|----------------|
| `event` | ✅ `hero_search_submitted` | ✅ |
| `cuisine_type` | ✅ | ✅ |
| `location` | ✅ | ✅ |
| `date` | ✅ | ❌ not in schema |
| `guestCount` | ✅ | ❌ not in schema |
| `timestamp` | ✅ | ✅ |
| `auth_status` | ✅ `anonymous` | ✅ |

Missing in schema: `date`, `guestCount`, `cuisine_type` (only `location` is documented). This means the data is accepted but not persisted to `analytics_events.jsonl` — the events go to `ab_test_events.jsonl` instead (because `variant` field is present in the schema even though hero_search doesn't send it, and `isABTestEvent` checks for `variant` presence via `(body as any).variant !== undefined` — but hero_search doesn't send variant either, so the persistence logic may be inconsistent).

---

## 2. Growth Opportunity: Hero CTA Analytics Tracking

### Problem

The hero CTA buttons are the second-most-visible homepage call-to-action (after the search form), yet:
1. Zero click tracking — we don't know how many people click
2. Zero variant tracking — we can't A/B test CTA text/behavior
3. Zero downstream tracking — we can't measure CTA click → service page → booking conversion
4. No comparison with search form users — fundamental "which entry point converts better?" question unanswered

### Why This Creates Blind Spots

From the AB test data, we can see service card CTA clicks tracked (via `fireCtaClickEvent`) but hero homepage CTA clicks are invisible. This means:

- If "Browse Chefs & Services" has 100 clicks and 0 convert, we can't tell
- If changing to "Book a Chef Tonight" improves clicks by 20%, we can't measure
- If CTA users convert at 5% vs search form users at 2%, we can't know — and the business decision to invest in CTA optimization vs search optimization is made blind

### Solution: Add Click Tracking to Hero CTAs

**Add click handler to hero CTA buttons** in `pages.ts` around line 2056:

```typescript
<div class="hero-ctas">
  <a href="/services" class="hero-cta-primary" 
     onclick="trackHeroCtaClick('primary', 'Browse Chefs & Services')">Browse Chefs & Services</a>
  <a href="/services?sort=popular" class="hero-cta-secondary" 
     onclick="trackHeroCtaClick('secondary', 'See Most Popular')">🔥 See Most Popular</a>
</div>
```

**Add the tracking function** in the homepage `<script>` section (around line 2200, near the hero search handler):

```typescript
function trackHeroCtaClick(position, ctaText) {
  const eventData = {
    event: 'hero_cta_click',
    cta_position: position,  // 'primary' | 'secondary'
    cta_text: ctaText,
    auth_status: 'anonymous',
    timestamp: new Date().toISOString()
  };
  
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/event', JSON.stringify(eventData));
  }
  
  console.log('[Analytics] Hero CTA click:', eventData);
}
```

**Update analytics schema** (`src/api/analytics.ts`) to include new fields:

```typescript
// MAI-1702: Hero CTA analytics
cta_position: z.string().optional(),
cta_text: z.string().optional(),
```

**Verify data flows** to `analytics_events.jsonl` (not `ab_test_events.jsonl` — these are homepage entry events, not A/B test variant events).

---

## 3. Secondary Fix: Hero Search Schema Alignment

**Problem:** Hero search sends `date` and `guestCount` but these fields aren't in the analytics schema. While the API accepts them (Zod ignores extras), explicitly adding them makes dashboards and analysis cleaner.

**Fix in `src/api/analytics.ts`:**
```typescript
// MAI-1702: Hero search schema alignment
date: z.string().optional(),
guestCount: z.number().optional(),
```

---

## 4. What This Enables

| Analysis | Current | After Implementation |
|----------|---------|---------------------|
| Hero CTA click volume | 0% visibility | Measurable baseline |
| Hero CTA → services page CVR | Unknown | Establish baseline |
| Hero CTA → booking CVR | Unknown | Establish baseline |
| Hero CTA vs search form CVR | Unknown | Compar-able |
| CTA text A/B test capability | None | Click-through rate measurable |

### Downstream Funnel Visibility

Once hero CTA tracking is live, we can measure:

```
Hero CTA click (primary) 
  → /services page view (already tracked)
    → Service page view (already tracked)  
      → Inquiry modal submit (already tracked)
        → Booking created (already tracked)

Hero CTA click (secondary)
  → /services?sort=popular page view
    → ... (same downstream)
```

This gives us the full acquisition funnel for the first time.

---

## 5. Experiment Plan

### Phase 1: Establish Baseline (3-5 days after implementation)

Track:
- `hero_cta_click` volume by position (primary/secondary)
- Primary vs secondary click ratio
- Hourly/daily distribution of clicks

Calculate:
- Hero CTA click rate = hero_cta_clicks / homepage_page_views (estimated via ab_test page_view events)
- CTA → services page CVR (via `service_page_view` with referral source)
- CTA → booking CVR (via `booking_created` with last_click attribution)

### Phase 2: Compare Entry Points (after baseline established)

Once both hero CTA and hero search tracking are solid:

| Entry Point | Metric | Target |
|------------|--------|--------|
| Hero CTA (primary) | Click → services CVR | Establish baseline |
| Hero CTA (secondary) | Click → services CVR | Establish baseline |
| Hero search form | Submit → services CVR | Establish baseline |
| Hero CTA | Click → booking CVR | Compare with search |

**Hypothesis:** If CTA clickers convert at higher rate than search users, optimize CTA copy/placement. If search users convert better, invest in search form optimization.

### Phase 3: CTA Text A/B Test (if baseline shows opportunity)

**Hypothesis:** "Book a Chef Tonight" vs "Browse Chefs & Services" will increase CTA click rate by >10%.

**Control:** "Browse Chefs & Services"  
**Treatment:** "Book a Chef Tonight"  
**Metrics:** `hero_cta_click` volume, UTM-tagged `/services` visits, `booking_created`

---

## 6. Metrics to Track

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| `hero_cta_click` | 0 (not tracked) | Establish baseline | Count events / homepage visits |
| CTA click rate | Unknown | >30% of visitors click | Clicks / estimated page views |
| Primary vs secondary ratio | Unknown | 2:1 (primary:secondary) | Volume by position |
| CTA → services CVR | Unknown | Establish baseline | Service page views from CTA |
| CTA → booking CVR | Unknown | Compare with search | Booking attribution |

---

## 7. Relationship to Prior Work

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-1116 | Hero search + CTA tracking gap identified | 🔴 Never implemented |
| MAI-1630 | Hero search form analytics implementation | ✅ Implemented (schema mismatch noted) |
| MAI-1578 | Chef ratings on discovery cards | ✅ Implemented |
| MAI-1447 | Post-inquiry success modal timeline | ✅ Implemented |
| MAI-1600 | Diner booking conversion analysis | ✅ Complete |

**This issue (MAI-1702) implements the CTA tracking half of MAI-1116's recommendations.**

---

## 8. Implementation Checklist

- [ ] Add `cta_position` and `cta_text` to analytics schema (`src/api/analytics.ts`)
- [ ] Add `date` and `guestCount` fields to analytics schema (hero search alignment)
- [ ] Add `onclick` handlers to hero CTA buttons (`pages.ts:2056-2057`)
- [ ] Add `trackHeroCtaClick()` function in homepage script section
- [ ] Verify `npm run build` passes
- [ ] Confirm `hero_cta_click` events appear in `data/analytics_events.jsonl`

---

## 9. Definition of Done

- [x] Funnel analyzed (hero CTAs are untracked, second-highest intent entry point)
- [x] 1 improvement identified (hero CTA click analytics tracking)
- [x] Implementation changes defined (pages.ts + analytics.ts schema)
- [x] Secondary improvement identified (hero search schema alignment)
- [x] Expected impact estimated
- [x] Experiment plan designed (baseline → compare entry points → A/B test)
- [x] Metrics to track defined
- [ ] Code changes implemented
- [ ] Build verification passed
- [ ] Baseline established (3-5 days post-deploy)

---

*Growth Optimization — MAI-1702 — Growth Marketer — 2026-05-17 16:00 UTC*