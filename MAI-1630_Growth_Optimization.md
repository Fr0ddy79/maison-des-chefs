# MAI-1630: Growth Optimization — Hero Search Form Analytics Implementation

**Issue:** 6df0aaac-3d3e-41a6-9fff-e62f88feeac1
**Owner:** Growth Marketer
**Status:** ✅ Analysis Complete — Implementation Identified
**Created:** 2026-05-16 04:00 UTC

---

## Executive Summary

**Growth idea:** Implement the hero search form analytics tracking that was identified in MAI-1116 but never implemented. The search form currently logs submission data to `console.log` only — it does NOT send events to the analytics API. Adding `trackEvent` calls connects the highest-intent homepage entry point to the full conversion funnel, enabling measurement of search → services → inquiry → booking conversion rates.

**Expected impact:** Establishes measurable baseline for search form conversion rate (currently 0% visibility), enables A/B testing of search form optimization, and fills the #1 analytics gap identified in MAI-1116.

**Why this matters now:** The hero search form is the highest-intent homepage entry point — users who fill in date, guest count, and event type are showing concrete purchase intent. Without tracking, we can't answer: how many search, what they search for, whether search users convert at higher rates than CTA clickers, or which fields cause abandonment.

---

## 1. Funnel Analysis — Current State

### 1a. Homepage Entry Points (from MAI-1116)

| Entry Point | Tracked? | Volume | Conversion to Booking |
|-------------|----------|--------|----------------------|
| Hero CTA Primary ("Browse Chefs & Services") | ❌ No | ~50% of visits | Unknown |
| Hero CTA Secondary ("🔥 See Most Popular") | ❌ No | ~25% of visits | Unknown |
| **Hero Search Form Submit** | ❌ **Console only** | **Unknown** | **Unknown** |
| Direct to `/services` | N/A | Remaining | Unknown |

### 1b. What's Already Tracked

| Event | Status | File |
|-------|--------|------|
| `service_page_view` | ✅ Working | `src/routes/analytics.ts` |
| `booking_created` | ✅ Working | `checkout-page.ts` |
| `inquiry_modal_submit` | ✅ Working | `chef-discovery-page.ts` |
| `chef_discovery_view` | ✅ Working | `chef-discovery-page.ts` |
| `hero_search_submitted` | 🔴 **NOT sent to analytics** | `pages.ts:2197` (console.log only) |

### 1c. The Gap

**File: `src/routes/pages.ts` lines 2197-2203:**
```typescript
document.querySelector('.hero-search-form').addEventListener('submit', function(e) {
  const formData = new FormData(this);
  console.log('[EVENT] homepage_search_submitted', {
    cuisine: formData.get('cuisine'),
    guests: formData.get('guests'),
    date: formData.get('date'),
    eventType: formData.get('type')
  });
  // ❌ MISSING: trackEvent() call to send data to analytics API
});
```

The search form submit handler captures all the data we need but only writes to console. The MAI-1116 recommendation to add `trackEvent('hero_search_submitted', ...)` was never implemented.

---

## 2. Growth Opportunity: Hero Search Form Analytics

### Problem

The hero search form is the **highest-intent homepage entry point** — users filling in date, guest count, and event type are showing concrete purchase intent. Yet:
1. We can't measure search form submission rate
2. We can't compare search-form users vs. CTA-click users for conversion
3. We can't identify which search fields cause abandonment
4. We can't A/B test search form optimizations with confidence

### Solution: Add Analytics Tracking

**Import the tracking function** in `pages.ts`:
```typescript
import { trackEvent } from './analytics.js';
```

**Replace the console.log with trackEvent call:**
```typescript
document.querySelector('.hero-search-form').addEventListener('submit', function(e) {
  const formData = new FormData(this);
  const searchData = {
    cuisine: formData.get('cuisine') || 'any',
    guests: formData.get('guests') || '0',
    date: formData.get('date') || 'none',
    eventType: formData.get('type') || 'none',
    timestamp: Date.now()
  };
  
  // MAI-1630: Send hero search event to analytics API
  trackEvent('hero_search_submitted', searchData);
  
  // Debug log (remove in production)
  console.log('[EVENT] homepage_search_submitted', searchData);
});
```

**Add `hero_search_started` for field-level engagement:**
```typescript
['search-date', 'search-guests', 'search-type', 'search-cuisine'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('focus', () => {
      trackEvent('hero_search_field_focus', {
        field: id.replace('search-', ''),
        timestamp: Date.now()
      });
    });
  }
});
```

### What This Enables

| Analysis | Current | After Implementation |
|----------|---------|---------------------|
| Search form submission rate | 0% visibility | Measurable baseline |
| Search → services CVR | Unknown | Establish baseline |
| Search → booking CVR | Unknown | Establish baseline |
| Field abandonment rate | Unknown | Identified via field focus events |
| Search vs CTA click CVR | Unknown | Compar-able |

### Expected Impact

| Metric | Current | Expected | Confidence |
|--------|---------|----------|------------|
| Hero search submit rate | 0% (no tracking) | Measurable | High |
| Search → service page CVR | Unknown | Baseline established | High |
| Search → booking CVR | Unknown | Baseline established | High |
| Field abandonment identification | Unknown | 1 field identified | Medium |

---

## 3. Implementation

### Files Changed

**`src/routes/pages.ts`:**

1. **Add import** (after existing imports ~line 3):
```typescript
import { trackEvent } from './analytics.js';
```

2. **Replace submit handler** (around line 2197):
```typescript
document.querySelector('.hero-search-form').addEventListener('submit', function(e) {
  const formData = new FormData(this);
  const searchData = {
    event: 'hero_search_submitted',
    cuisine: formData.get('cuisine') || 'any',
    guests: parseInt(formData.get('guests')) || 0,
    date: formData.get('date') || 'none',
    eventType: formData.get('type') || 'none',
    auth_status: 'guest',
    timestamp: new Date().toISOString()
  };
  
  // MAI-1630: Track hero search form submissions
  if (typeof navigator !== 'undefined' && (navigator as any).sendBeacon) {
    (navigator as any).sendBeacon('/api/analytics/event', JSON.stringify(searchData));
  }
  
  console.log('[Analytics] Hero search submitted:', searchData);
});

// MAI-1630: Track field-level engagement for abandonment analysis
['search-date', 'search-guests', 'search-type', 'search-cuisine'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('focus', () => {
      const focusData = {
        event: 'hero_search_field_focus',
        field: id.replace('search-', ''),
        auth_status: 'guest',
        timestamp: new Date().toISOString()
      };
      if (typeof navigator !== 'undefined' && (navigator as any).sendBeacon) {
        (navigator as any).sendBeacon('/api/analytics/event', JSON.stringify(focusData));
      }
    });
  }
});
```

**Verification:**
- `npm run build` must pass
- Search form submission should appear in `data/analytics_events.jsonl`

---

## 4. Experiment Plan

### Phase 1: Establish Baseline (3-5 days after implementation)

Track:
- `hero_search_submitted` volume per day
- `hero_search_field_focus` breakdown by field
- Calculate: submission rate = submits / page views

### Phase 2: Identify Abandonment Point

Using field focus events, identify which field has highest focus-without-submit rate:
- High drop at date field → add placeholder suggestion or default date
- High drop at guest field → pre-fill default of 2
- High drop at event type → make optional or add "Any" default
- High drop at cuisine → make optional

### Phase 3: A/B Test Targeted Optimization

Once the biggest abandonment field is identified, design targeted test:
- **Hypothesis:** Optimizing the highest-abandonment field will increase search form submission rate by >10%
- **Control:** Current search form
- **Variant:** Optimized field with lower friction
- **Metrics:** `hero_search_submitted` rate, UTM-tagged services page visits

### Quick Wins (No A/B Test Required)

| Optimization | Implementation | Expected Impact |
|-------------|----------------|-----------------|
| Pre-fill guest count to 2 | `value="2"` on search-guests input | +3-5% submissions |
| Add date placeholder hint | `placeholder="When is your event?" → "When? (e.g., Sat May 16)"` | +5% date field completion |
| Add UTM params to search form action | `action="/services?utm_source=homepage&utm_content=search_form"` | Enables post-hoc conversion analysis |

---

## 5. Metrics to Track

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| `hero_search_submitted` | 0 (not tracked) | Establish baseline | Count events / page views |
| `hero_search_field_focus` | 0 (not tracked) | Identify #1 drop-off field | Focus events by field |
| Search submit rate | Unknown | >15% of visitors submit | submits / unique visitors |
| Search → services CVR | Unknown | Compare with CTA clickers | UTM-tagged traffic analysis |
| Field abandonment rate | Unknown | Identify field for A/B | Focus without submit |

---

## 6. Relationship to Prior Work

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-1116 | Hero search form tracking gap identified | 🔴 Never implemented |
| MAI-1578 | Chef ratings on discovery cards | ✅ Implemented |
| MAI-1447 | Post-inquiry success modal timeline | ✅ Implemented |
| MAI-1629 | Booking status URL prominently surfaced | ✅ Implemented |
| MAI-1600 | Diner booking conversion analysis | ✅ Complete |

**This issue (MAI-1630) implements the tracking half of MAI-1116's recommendations.**

---

## 7. Definition of Done

- [x] Funnel analyzed (hero search form is highest-intent entry, zero tracking)
- [x] 1 improvement identified (hero search form analytics tracking)
- [x] Implementation changes defined (pages.ts + analytics call)
- [x] Expected impact estimated
- [x] Experiment plan designed (baseline → field ID → A/B test)
- [x] Metrics to track defined
- [x] Quick wins identified (pre-fill guests, UTM params)
- [ ] Code changes implemented (pages.ts)
- [ ] Build verification passed
- [ ] Baseline established (3-5 days post-deploy)

---

*Growth Optimization — MAI-1630 — Growth Marketer — 2026-05-16 04:00 UTC*