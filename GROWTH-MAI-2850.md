# GROWTH-MAI-2850: Browse by Cuisine Section — Implementation

**Created:** 2026-06-10 12:00 America/New_York
**Status:** Implemented
**Type:** Growth Optimization

## Context

**Funnel Stage:** Consideration (mid-funnel)
**Problem identified:** Users who know what cuisine they want have no clear path from the homepage to filtered chef results. They must either navigate to `/chefs` and use the filter, or guess from the featured chefs section.

**What existed:**
- Service-type quick links (Prix Fixe, Cocktail, Cooking Class) linking to `/book?service_type=xxx`
- Featured Chefs section (rating-sorted, no cuisine filtering)
- "Curated Experiences" section linking to `/chefs?service_type=xxx`

**Gap:** No cuisine-based browsing from the homepage. A user looking for "Italian private chef" must navigate to `/chefs` and select Italian from the filter — an extra step that creates friction in the consideration phase.

---

## What Was Implemented

### Browse by Cuisine Section

Added a new section between "Featured Chefs" and "Curated Experiences":

| Cuisine | Emoji | URL |
|---------|-------|-----|
| French | 🥐 | `/chefs?cuisine=French` |
| Italian | 🍝 | `/chefs?cuisine=Italian` |
| Japanese | 🍣 | `/chefs?cuisine=Japanese` |
| Mediterranean | 🫒 | `/chefs?cuisine=Mediterranean` |
| Seafood | 🦞 | `/chefs?cuisine=Seafood` |
| Vegetarian | 🥗 | `/chefs?cuisine=Vegetarian` |
| Asian Fusion | 🥡 | `/chefs?cuisine=Asian%20Fusion` |

**Location:** Between Featured Chefs and Curated Experiences sections
**Design:** 7-card grid, emoji + label per card, white bg, hover lift effect
**Link:** "View all cuisines →" below the grid

### Files Changed

| File | Change |
|------|--------|
| `src/app/page.tsx` | Added "Browse by Cuisine" section (~38 lines) |

---

## Why This Works

1. **Reduces consideration-phase friction** — Users with cuisine intent can jump directly to filtered results in one click vs. navigating to `/chefs` and filtering manually
2. **Makes cuisine browsing discoverable** — The filter exists on `/chefs` but wasn't visible from the homepage; this section exposes it
3. **Complements existing navigation** — Service-type links handle occasion intent; cuisine links handle food preference intent
4. **Low implementation risk** — Static section with links to existing filter functionality; no new components, no backend changes
5. **Tracking-ready** — Links pass `cuisine` URL param, which can be captured in analytics to measure cuisine-based acquisition volume

---

## Experiment Plan

### Phase 1: Measure (7–14 days)

- **Primary metric:** Clicks on cuisine cards (tracked via existing analytics infrastructure)
- **Secondary metric:** `/chefs?cuisine=XXX` pageviews from homepage cuisine section vs. direct `/chefs` navigation
- **Secondary metric:** Inquiry submissions from cuisine-filtered traffic
- **Guardrail metric:** Homepage bounce rate (no negative impact expected)

**Query to measure:**

```sql
SELECT
  REGEXP_REPLACE(page_url, '.*cuisine=([^&]+).*', '\1') as cuisine,
  COUNT(*) as pageviews
FROM pageviews
WHERE page_url LIKE '/chefs?cuisine=%'
  AND referrer LIKE '%/page%'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY cuisine
ORDER BY pageviews DESC;
```

### Phase 2: Iterate

- If cuisine section drives >15% of `/chefs` traffic → expand to 8-9 cuisines or add sub-cuisine filters
- If low click-through → test relocating section above "How It Works" (higher visibility)
- If certain cuisines dominate → consider featuring top cuisines in hero section

---

## Funnel Stage Coverage

| Stage | Existing | New Addition |
|-------|----------|--------------|
| **Acquisition** | Hero CTA (4 variants), SEO schema | — |
| **Consideration** | Service-type links, Featured Chefs | **Browse by Cuisine** |
| **Conversion** | Booking form A/B test | — |

---

## Differentiation from Previous Growth Work

| Experiment | Funnel Stage | Status |
|------------|--------------|--------|
| Hero CTA A/B (4 variants) | Top (acquisition) | Running |
| Booking Form A/B | Mid (conversion) | Running |
| Schema.org markup | SEO | Done |
| Browse by Cuisine | Mid (consideration) | **Implemented** |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Section adds visual clutter | Compact 7-card grid, placed between existing sections; doesn't interrupt flow |
| Cuisines don't match user intent distribution | Analytics will reveal actual distribution; low risk — wrong clicks just indicate wrong cuisine prioritization |
| Low click-through | "View all cuisines →" fallback ensures all users can access the filter |

---

## Pre-Launch Validation Checklist

- [x] All 7 cuisine cards link to valid `/chefs?cuisine=XXX` URLs
- [x] URL encoding handles "Asian Fusion" correctly (`%20`)
- [x] Grid is responsive (2 cols mobile → 7 cols desktop)
- [x] Hover effect matches existing card styling
- [x] Build passes with no errors
- [x] Committed to main branch

---

## Summary

**Growth idea:** Add a "Browse by Cuisine" section to the homepage to reduce consideration-phase friction for users with cuisine preferences.

**Implementation:** 1 file changed, ~38 lines of code added to `src/app/page.tsx`.

**Expected impact:** +10–20% of `/chefs` traffic from homepage originates via cuisine filter; improved consideration-phase conversion for cuisine-intent users.

**Effort:** Low — static section linking to existing filter infrastructure.

**Owner:** Growth Marketer (implemented) → Fred to monitor via analytics

---

*Generated by Growth Marketer — MAI-2850*