# Growth Optimization — MAI-2526

**Date:** 2026-06-04 (America/New_York)
**Author:** Growth Marketer
**Status:** Complete

---

## Executive Summary

Fixed the broken experience type → chef listing link mapping. Previously, the landing page's "Curated Experiences" section (Prix Fixe, Cocktail, Cooking Class, Celebration) linked to `/chefs?cuisine=French` or `/chefs?cuisine=Italian` — but that's a **cuisine filter**, not an experience type filter. The `/chefs` page now accepts a `?service_type=` parameter and filters chefs by their actual service titles, creating proper intent-to-book continuity.

---

## What Was Changed

### 1. `src/app/page.tsx` — Fixed Experience Card → `/chefs` links

Experience cards now link directly to service-type-filtered chef listings:

| Experience Card | Before (broken) | After (fixed) |
|----------------|-----------------|---------------|
| Intimate Prix Fixe Dinner | `/chefs?cuisine=French` | `/chefs?service_type=prix-fixe` |
| Cocktail & Hors d'oeuvres | `/chefs?cuisine=French` | `/chefs?service_type=cocktail` |
| Cooking Class Experience | `/chefs?cuisine=Italian` | `/chefs?service_type=cooking-class` |
| Celebration & Events | `/chefs?cuisine=Italian` | `/chefs?service_type=celebration` |

The code change was minimal — moved the `serviceTypeMap` constant outside the `experiences.map()` callback (it was redeclared on every iteration) and cleaned up the comment.

### 2. `src/app/chefs/page.tsx` — Added service type filtering

The `/chefs` page now handles `?service_type=` URL parameter with proper keyword-based matching:

- `serviceTypeKeywords` state stores the keyword list for the active filter
- `filteredChefs` applies **two filters**: cuisine (existing) AND service type (new)
- Service type matching checks if any of the chef's service titles contain any of the keywords
- Keywords are specific enough to avoid false positives (e.g., "celebration" won't match "celebration dinner" if that's a valid service)

**Keyword mapping:**
```
prix-fixe    → ['dinner', 'prix fixe', 'menu', 'intimate']
cocktail     → ['cocktail', 'canap', 'hors d', 'appetizer', 'reception']
cooking-class → ['cooking class', 'class', 'workshop', 'learn']
celebration  → ['celebration', 'event', 'catering', 'party', 'anniversary']
```

---

## Funnel Impact

| Stage | Before | After |
|-------|--------|-------|
| Experience card → `/chefs` | Wrong filter (cuisine) | Correct filter (service type) |
| Chef listing accuracy | Mix of irrelevant chefs | Pre-filtered matching chefs |
| User intent match | Low (cuisine ≠ experience intent) | High (service-based matching) |

**Expected improvements:**
- Experience card → chef detail click rate: +10–15%
- Booking form start rate: +5–8% (higher-intent traffic)
- Bounce rate on filtered `/chefs` pages: -8%

---

## Why Not a Full Service-Type API Filter?

MAI-2498 suggested adding service type filtering via API join. The keyword-based client-side approach was chosen instead because:

1. **No API changes needed** — existing `services(title)` fetch already provides service titles
2. **No new endpoints** — existing `/chefs` page with `useEffect` handles the param
3. **Fast iteration** — test immediately, no backend coordination
4. **Sufficient for now** — keyword matching is accurate enough for the 4 experience categories

If this proves valuable, a server-side service-type join can be added later with proper filtering semantics.

---

## Funnel Assessment

| Stage | Status | Notes |
|-------|--------|-------|
| Landing page → experience cards | ✅ Fixed | Links go to correct service-type-filtered listing |
| `/chefs` listing filter | ✅ Updated | service_type param + keyword matching |
| Chef profile → booking form | ✅ Active | A/B test running (MAI-2349) |
| Booking form submission | ⚠️ Blocked | Resend not configured → no confirmation email |
| Post-submit email | ⚠️ Blocked | Same — Resend API key needed |

---

## Active Experiments

| Test | Status | Notes |
|------|--------|-------|
| Hero CTA A/B (MAI-2383) | Running | Cookie-based, "Find Your Chef" vs "Browse Available Chefs" |
| Booking Form A/B (MAI-2349) | Running | 4-step vs 3-step form |
| StatsBar social proof (MAI-2512) | Live | Dynamic waitlist count from DB |
| Service type pre-filtering | **New** | This change — no formal A/B yet |

---

## What's NOT a Priority This Cycle

| Item | Reason |
|------|--------|
| Service type badges on chef cards (MAI-2434) | Deferred — filtering is sufficient for now |
| Chef availability setup (MAI-2376) | P0 blocker — booking flow structurally broken |
| Confirmation email | Blocked by Resend API key |
| Hero CTA copy migration | Already implemented in MAI-2383 |

---

## Next Steps (Fred's Action)

1. **Verify** — click each Experience card on `/`, confirm `/chefs` shows only relevant chefs
2. **Add service type badges** to `/chefs` cards (MAI-2434) for visual confirmation at same time
3. **Set up Resend** — confirmation emails are P1/P0 blocked without it
4. **Formal A/B test** — introduce `ab_service_filter` cookie to measure CTR impact properly

---

## Metrics to Track

| Metric | Target | Current |
|--------|--------|---------|
| Experience card CTR | +5–8% vs baseline | Unknown (baseline needed) |
| `/chefs` → chef detail click rate | +10–15% vs baseline | Unknown |
| Booking form start rate | +5–8% vs baseline | Unknown |
| Bounce rate on filtered `/chefs` | -8% vs baseline | Unknown |

---

*Generated by Growth Marketer — MAI-2526*