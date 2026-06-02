# Growth Optimization: Hero CTA Copy A/B Test (MAI-2383)

**Date:** 2026-06-01  
**Analyst:** Growth Marketer  
**Status:** Complete

---

## Executive Summary

Implemented a cookie-based A/B test on the landing page hero section CTA button. The test measures whether changing "Find Your Chef" to "Browse Available Chefs" improves click-through rates, as recommended in MAI-2366.

---

## Funnel Analysis

```
Landing Page
    ↓
Hero CTA: "Find Your Chef" → /chefs  ← THIS TEST
    ↓
Chef Listing → filter/browse
    ↓
Chef Detail → "Book Now" CTA
    ↓
Booking Form (MAI-2349 A/B test running)
    ↓
[BLOCKED] No chef has availability slots → 409 NO_AVAILABILITY_SLOT
```

**Critical Blocker:** The booking funnel is fundamentally broken because no chef has set availability slots. Growth work on acquisition is meaningful only after chefs can actually receive bookings (MAI-2376).

---

## Implementation Summary

### Files Created

| File | Purpose |
|------|---------|
| `src/lib/useHeroCTAVariant.ts` | Hook + utilities for variant assignment |
| `src/components/HeroCTA.tsx` | Client-side CTA component with A/B logic |
| `src/app/api/analytics/hero-cta-click/route.ts` | Analytics event endpoint |
| `supabase/migrations/010_hero_cta_clicks.sql` | Analytics table for click storage |

### Files Modified

| File | Change |
|------|--------|
| `src/app/page.tsx` | Replaced static CTA div with `<HeroCTA />` component |

---

## Experiment Design

### Hypothesis

"**Browse Available Chefs**" signals immediacy and availability (slots are open), which is more compelling for diners ready to book. "Find Your Chef" implies search/exploration, which may attract browsers rather than high-intent bookers.

### Variant Details

| Element | Control | Variant |
|---------|---------|---------|
| **CTA Text** | Find Your Chef | Browse Available Chefs |
| **Page** | / (hero) | / (hero) |
| **Secondary CTA** | Are You a Chef? Apply | Are You a Chef? Apply (unchanged) |

### Traffic Split

- **Mechanism:** Cookie-based deterministic assignment (`ab_hero_cta_variant`)
- **Split:** 50/50 random on first visit
- **Cookie expiry:** 30 days
- **Consistency:** Same user always sees same variant

### Testing Specific Variants

- Control: `/` (default)
- Variant: `/?hero_cta_variant=browse_available`
- Debug badge: `/?debug` (shows current variant)

To reset variant assignment:
```javascript
document.cookie = 'ab_hero_cta_variant=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
```

---

## Analytics Implementation

### Event: `hero_cta_click`

**Endpoint:** `POST /api/analytics/hero-cta-click`

**Payload:**
```json
{
  "variant": "find_your_chef" | "browse_available",
  "cta_type": "primary" | "secondary",
  "timestamp": "2026-06-01T12:00:00.000Z"
}
```

### Metrics to Track

| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| Hero CTA click-through rate | +10% vs control | Baseline | Measure via `hero_cta_clicks` table |
| `/chefs` page bounce rate | < 40% | Unknown | Indicates landing page → listing intent match |
| Booking form start rate | > 60% of chef detail visitors | Unknown | MAI-2349 tracks this |

### SQL to Query Results

```sql
-- Click counts by variant
SELECT 
  variant,
  cta_type,
  COUNT(*) as clicks
FROM hero_cta_clicks
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY variant, cta_type
ORDER BY variant, cta_type;

-- CTR calculation (clicks / unique sessions)
-- Note: Need session data merged to calculate true CTR
```

---

## Migration Required

Before the A/B test can track data, the following migration must be applied to Supabase:

```sql
-- Migration: Add hero_cta_clicks table for A/B test analytics
CREATE TABLE IF NOT EXISTS public.hero_cta_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant TEXT NOT NULL CHECK (variant IN ('find_your_chef', 'browse_available')),
  cta_type TEXT NOT NULL CHECK (cta_type IN ('primary', 'secondary')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hero_cta_clicks_variant ON public.hero_cta_clicks(variant);
CREATE INDEX IF NOT EXISTS idx_hero_cta_clicks_created_at ON public.hero_cta_clicks(created_at);
```

**Owner:** Fred — apply via `supabase migration up` or through Supabase dashboard.

---

## Acceptance Criteria

| Criteria | Status | Notes |
|----------|--------|-------|
| Landing page hero CTA shows variant-specific copy | ✅ | Component renders based on variant |
| Variant persists across page reloads | ✅ | Cookie-based with 30-day expiry |
| URL param override works for testing | ✅ | `?hero_cta_variant=browse_available` |
| Analytics event fires on CTA click | ✅ | POST to `/api/analytics/hero-cta-click` |
| Analytics table created in Supabase | ⚠️ | Migration needs to be applied |

---

## Dependencies & Blockers

| Item | Status | Notes |
|------|--------|-------|
| MAI-2349 (booking form A/B) | Running | Coordinates with this test |
| MAI-2376 (chef availability) | **P0 Blocker** | Must be resolved before bookings work |
| Resend API key | Not configured | Blocks email confirmation to waitlist |

---

## Next Steps

1. **Fred:** Apply migration `010_hero_cta_clicks.sql` to Supabase
2. **Fred:** Add at least one chef availability slot so the funnel works
3. **Monitor:** Track click-through rate for 7 days
4. **Decide:** If CTR improves > 10%, roll out "Browse Available Chefs" permanently

---

*Generated by Growth Marketer — MAI-2383*