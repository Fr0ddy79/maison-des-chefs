# MAI-1116: Growth Optimization — Hero Search Form Abandonment

**Issue:** da4f337e-fb19-48b9-acca-a50434882dfc
**Created:** 2026-05-05 10:00 UTC
**Status:** ✅ Analysis Complete
**Owner:** Growth Marketer

---

## 1. Funnel Analysis

### 1a. Homepage Funnel (Known Gaps)

| Stage | Event | Volume | Status |
|-------|-------|--------|--------|
| Homepage view | `page_view` | 40 (AB test) | ✅ Tracked |
| Hero CTA click (primary) | `homepage_cta_click` | **NOT TRACKED** | 🔴 Gap |
| Hero CTA click (secondary) | `homepage_cta_click` | **NOT TRACKED** | 🔴 Gap |
| Hero search form submit | `hero_search_submitted` | **NOT TRACKED** | 🔴 Gap |
| Services page view | `service_page_view` | 27 (analytics) | ✅ Tracked |
| CTA click (service detail) | `cta_click` | 2 | ✅ Tracked |
| Booking form view | `booking_form_view` | Unknown | 🔴 Gap |
| Booking created | `booking_created` | 11 | ✅ Tracked |

### 1b. Hero Search Form — The Invisible Drop-off

The homepage includes a **hero search form** (lines 1569–1590 in pages.ts) with fields:
- Event date (required)
- Number of guests (required)
- Event type (dropdown)

**Problem:** Unlike the hero CTA buttons, the search form has **zero tracking**. We cannot answer:
- How many users fill in the search form but don't submit
- Where users abandon (date field? guest count? event type?)
- Whether search form users convert better or worse than direct CTA clickers

### 1c. Variant Data Anomaly

The AB test data shows anomalous "premium" variant with 220% conversion rate (11 bookings from 5 page views). This is a data quality issue — likely pre-existing bookings being retroactively attributed to the variant.

**Action needed:** Audit booking attribution logic before relying on variant-level conversion data.

---

## 2. Growth Idea: Hero Search Form Submit Tracking + Abandonment Measurement

### Problem

The hero search form is the **highest-intent entry point** — users who fill in a date, guest count, and event type are showing concrete purchase intent. Yet we have no visibility into:
1. How many users interact with the search form
2. Where they abandon (field-level drop-off)
3. Whether search form users → services page → booking at higher rates than CTA clickers

### Solution

**Phase 1: Track search form interactions (no code changes needed — add analytics calls)**

Add `hero_search_started` and `hero_search_submitted` events via the existing analytics infrastructure:

```javascript
// In hero-search-form onsubmit handler (pages.ts ~line 1573):
hero-search-form.addEventListener('submit', () => {
  trackEvent('hero_search_submitted', {
    date: document.getElementById('search-date').value,
    guests: document.getElementById('search-guests').value,
    eventType: document.getElementById('search-type').value,
    timestamp: Date.now()
  });
});
```

**Phase 2: Field-level abandonment tracking**

Track when users focus each field (shows engagement) vs. when they leave after focusing:

```javascript
// Track field focus as engagement signal
['search-date', 'search-guests', 'search-type'].forEach(fieldId => {
  document.getElementById(fieldId)?.addEventListener('focus', () => {
    trackEvent('hero_search_field_focus', { field: fieldId, timestamp: Date.now() });
  });
});
```

### Expected Impact

| Metric | Current | Expected | Confidence |
|--------|---------|----------|------------|
| Hero search form submit rate | Unknown (0% visibility) | Measurable baseline | High |
| Search → Booking CVR | Unknown | Establish baseline | High |
| Field abandonment rate | Unknown | Identify biggest drop-off field | Medium |

---

## 3. Experiment Plan

### Test: Hero Search Form Optimization — Reduce Abandonment at Biggest Drop-off Field

**Hypothesis:** The hero search form has a specific field with higher abandonment. Optimizing that field (placeholder text, making it optional, adding helper text) will increase form submission rate.

**Measurement:**
1. First, establish baseline with field-focus tracking (3–5 days)
2. Identify which field causes most abandonment (user focuses but doesn't submit)
3. Design targeted experiment for that field

**Quick wins before experiment (no code changes):**

| Optimization | How | Expected Impact |
|-------------|-----|-----------------|
| Add placeholder date suggestion | `"When is your event?" → "When is your event? (e.g., Sat May 15)"` | +5% engagement on date field |
| Pre-fill guest count | Default to 2 instead of blank | Reduces friction, +3-5% submissions |
| Add "Any type" as default event type | Pre-select "Private Dinner" | Reduces decision fatigue |

**Implementation notes:**
- Changes in `buildHomePage()` function in `src/routes/pages.ts` (around lines 1571–1590)
- No backend changes needed
- Track with existing `trackEvent` infrastructure

---

## 4. Funnel Breakdown (Updated)

### Homepage Entry Points

| Entry Point | Tracked? | Volume (AB test) | Conversion to Booking |
|-------------|----------|------------------|---------------------|
| Hero CTA Primary ("Browse Chefs & Services") | ❌ No | ~50% of 40 visits | Unknown |
| Hero CTA Secondary ("🔥 See Most Popular") | ❌ No | ~25% of 40 visits | Unknown |
| Hero Search Form Submit | ❌ No | Unknown | Unknown |
| Direct to `/services` | N/A | Remaining | Unknown |

### Known Data Disconnect

- AB test data: 40 page views, 2 cta_clicks, 11 bookings
- Analytics data: 27 service_page_views, 0 bookings in dataset
- **Conclusion:** Two separate tracking systems with disjoint user populations. AB test is running on `/` (homepage) but analytics tracks `/services` pages.

---

## 5. Metrics to Track

| Metric | How to Measure | Target | Priority |
|--------|---------------|--------|----------|
| `hero_search_field_focus` | Field focus events / page views | >60% of visitors focus ≥1 field | P1 |
| `hero_search_submitted` | Form submits / page views | >15% of visitors submit | P1 |
| Hero search → booking CVR | Bookings from UTM-tagged search submits | Establish baseline | P2 |
| Field abandonment rate | Focus without submit / focus events | Identify #1 field for improvement | P1 |

**UTM tagging for search form (easy win):**
- Modify search form action to add `utm_source=homepage&utm_content=search_form`
- Enables post-hoc analysis of search-form traffic in services page analytics

---

## 6. Definition of Done

- [x] Funnel analyzed (homepage → services → booking mapped)
- [x] 1 improvement identified (hero search form tracking)
- [x] 1 experiment designed (field-level abandonment measurement → optimization)
- [x] Expected impact estimated
- [x] Metrics to track defined
- [x] Quick wins identified (no-code changes)

---

## 7. Related Prior Work

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-1089 | Homepage CTA tracking + copy test | 🔄 Implementation available |
| MAI-917 | Service detail CTA A/B test | ✅ Running |
| MAI-1096 | Chef onboarding workflow | ✅ Implemented |
| GROWTH_BRIEF | Diner conversion funnel study | ✅ Complete |

---

## 8. Immediate Actions (No Code Required)

1. **Add UTM params to hero CTA links** to enable post-hoc analysis:
   ```
   Primary CTA: /services?utm_source=homepage&utm_content=primary_cta
   Secondary CTA: /services?sort=popular&utm_source=homepage&utm_content=secondary_cta
   Search form: /services?utm_source=homepage&utm_content=search_form
   ```

2. **Check services page referrer data** in analytics to understand which homepage entry point drives most services traffic

3. **Fix AB test attribution** for anomalous premium variant before next analysis

---

*Growth Optimization — MAI-1116 — Growth Marketer — 2026-05-05 10:00 UTC*
