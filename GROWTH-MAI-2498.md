# Growth Optimization — MAI-2498

**Date:** 2026-06-03 (America/New_York)
**Author:** Growth Marketer
**Status:** Analysis Complete

---

## Funnel Analysis

| Stage | Page | Status | Notes |
|-------|------|--------|-------|
| 1. Awareness | Landing page (`/`) | ✅ Active | Hero, How It Works, Featured Chefs, Experiences, Testimonials |
| 2. Discovery | Chef browse (`/chefs`) | ✅ Active | Filter by cuisine, sort by rating/price |
| 3. Consideration | Chef profile (`/chefs/[id]`) | ✅ Active | Bio, gallery, reviews, pricing, inquiry form |
| 4. Booking Request | Booking form (`/book`) | ✅ Active | A/B test running: standard (4-step) vs simplified (3-step) |
| 5. Inquiry Submitted | `/api/inquiry` → DB | ✅ Active | No email confirmation yet (Resend not configured) |
| 6. Post-submit | Email confirmation | ⚠️ Blocked | Resend API key not set |

### Active A/B Tests

| Test | Variants | Metric | Status |
|------|----------|--------|--------|
| Hero CTA (MAI-2383) | `find_your_chef` vs `browse_available` | CTR to /chefs | Running — migration needed |
| Booking Form (MAI-2349) | `standard` (4-step) vs `simplified` (3-step) | Form completion | Running |
| StatsBar | Implemented | Non-blocking social proof | Live, no A/B |

### Existing Improvements Already Shipped

| Initiative | Status | Notes |
|------------|--------|-------|
| Hero CTA A/B (MAI-2383) | ✅ Implemented | Cookie-based 50/50 split |
| Booking Form A/B (MAI-2349) | ✅ Implemented | Standard vs simplified form |
| StatsBar (MAI-2475) | ✅ Implemented | Shows real chef count from DB |
| Service Type Badges (MAI-2434) | ✅ Planned | Identified, not yet fully wired to `/chefs` page |
| Chef Photo in Booking Form (MAI-2447) | ✅ Planned | Identified, not yet implemented |

---

## Growth Idea: Service Type → Chef Links (Pre-Filtered `/chefs` by Experience)

### Hypothesis

The landing page's **"Curated Experiences"** section presents 4 distinct experience types (Prix Fixe Dinner, Cocktail & Hors d'oeuvres, Cooking Class, Celebration & Events). Currently, each card links to `/chefs?cuisine=French` or `/chefs?cuisine=Italian` — but that's a **cuisine filter**, not an experience type filter. Diners looking for a cocktail party don't necessarily want French cuisine. The mismatch between intent (experience type) and filtering (cuisine) creates unnecessary friction and drop-off between landing page → chef listing.

**Adding a service-type filter** to the `/chefs` listing and wiring the Experience cards to use it will send users directly to chefs who offer their desired experience. This improves click quality, reduces unnecessary listing browsing, and creates a smoother intent-to-book path.

### Current State

**Experience cards' links (broken intent mapping):**
```
Prix Fixe Dinner → /chefs?cuisine=French
Cocktail & Hors d'oeuvres → /chefs?cuisine=French
Cooking Class Experience → /chefs?cuisine=Italian
Celebration & Events → /chefs?cuisine=Italian
```

Problem: All four experience types map to only French or Italian cuisine — but chef services (from the `services` table) are not surfaced in the experience card links. A chef could offer Prix Fixe AND Cocktail services under the same cuisine, but the current link mapping is random at best.

### What to Test

**Control (A):** Experience cards → `/chefs?cuisine=...` (current state)

**Variant (B):** Experience cards → `/chefs?service_type=prix-fixe` (or similar service-based filter)

### Implementation Steps

**Step 1: Add service_type to `/chefs` listing page**

In `src/app/chefs/page.tsx` and/or the chef listing API, add a `service_type` filter parameter alongside `cuisine`. This requires:

1. Fetch services per chef (already identified in MAI-2434)
2. Map services to a service type label (Prix Fixe, Cocktail, Cooking Class, Celebration)
3. Add `?service_type=` to the filter logic in the chefs API
4. Pre-filter the chefs listing when `service_type` param is present

**Step 2: Update experience card links in `page.tsx`**

Current code in `src/app/page.tsx`:
```tsx
const cuisineMap: Record<string, string> = {
  'Intimate Prix Fixe Dinner': 'French',
  "Cocktail & Hors d'oeuvres": 'French',
  'Cooking Class Experience': 'Italian',
  'Celebration & Events':       'Italian',
}
const href = `/chefs${cuisineParam ? `?cuisine=${encodeURIComponent(cuisineParam)}` : ''}`
```

New code:
```tsx
const serviceTypeMap: Record<string, string> = {
  'Intimate Prix Fixe Dinner':       'prix-fixe',
  "Cocktail & Hors d'oeuvres":       'cocktail',
  'Cooking Class Experience':        'cooking-class',
  'Celebration & Events':            'celebration',
}
// Link directly to service-type-filtered chef listing
const href = `/chefs?service_type=${encodeURIComponent(serviceTypeMap[exp.title])}`
```

**Step 3: Verify A/B clean test**

- Control group users get the old cuisine-param links
- Variant group users get service_type-param links
- Track: experience card click → `/chefs` listing view → chef detail click → booking form start

**Step 4: Optional enhancement — Add service badges on `/chefs` cards**

While not strictly a "growth optimization," MAI-2434 identified that chef cards on `/chefs` should show service type badges. If implemented alongside this change, users arrive at `/chefs?service_type=cocktail` and can immediately confirm via a visible badge that the chef offers cocktail services. This creates visual continuity and reduces the need to click into each chef profile to confirm.

### Expected Impact

| Metric | Current | Expected | Rationale |
|--------|---------|----------|-----------|
| Experience card → `/chefs` CTR | Baseline | +5–8% | More relevant listing (filtered by service) |
| `/chefs` → Chef detail click rate | Baseline | +10–15% | Users see pre-filtered results matching intent |
| Booking form start rate | Baseline | +5–8% | Higher-quality traffic due to better targeting |
| Bounce rate on `/chefs?service_type=...` | Unknown | -8% | Pre-filtered results feel more tailored |

### Analytics Hooks

No new analytics events needed — the existing funnel (`experience_card_click` → `/chefs` browse → chef detail → booking form start) already tracks the path. Just ensure UTM or referrer data can segment by `service_type` vs `cuisine` param.

### Rollout Criteria

- **Minimum sample:** 100 experience card clicks per variant
- **Success threshold:** >10% improvement in `/chefs`→chef detail click rate for variant group
- **Kill condition:** Bounce rate on pre-filtered `/chefs` pages increases >5% (indicates filter relevance is poor)

---

## What's Already Working (Not a Priority This Cycle)

| Idea | Reason to Defer |
|------|-----------------|
| Hero CTA copy A/B (MAI-2383) | Already implemented — just needs migration applied |
| Booking form simplification (MAI-2349) | Already running |
| StatsBar social proof (MAI-2475) | Already live |
| Chef photos in booking form (MAI-2447) | Higher-effort, lower priority — form is working |
| Testimonial expansion | Low urgency for growth |

---

## Dependencies & Blockers

| Item | Status | Notes |
|------|--------|-------|
| Supabase connection | ✅ Working | Real-time data available |
| Service data in `services` table | ✅ Available | Already in schema |
| `/chefs` page filter logic | ⚠️ Needs extension | Currently only filters by `cuisine` |
| A/B infrastructure | ✅ Available | Cookie-based splits work (reuse `ab_service_badges` from MAI-2434 if needed) |
| MAI-2376 (chef availability) | P0 Blocker | Booking funnel structurally broken until chefs have availability slots |

---

## Next Steps (Fred's Action)

1. **Add** `?service_type=` parameter handling to `/chefs/page.tsx` or the chefs API
2. **Map** experience card links in `page.tsx` from cuisine-param to service_type-param
3. **Validate** — visit Experience cards, verify pre-filter link works, confirm chefs with matching service type appear
4. **Consider** implementing service type badges on `/chefs` cards (MAI-2434) for visual continuity at same time

---

*Generated by Growth Marketer — MAI-2498*
