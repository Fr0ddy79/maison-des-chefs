# Growth Optimization: Service Type Badges on Chef Cards — MAI-2434

**Date:** 2026-06-02  
**Analyst:** Growth Marketer  
**Status:** Complete

---

## Executive Summary

The landing page organizes chefs by **4 experience types** (Intimate Prix Fixe, Cocktail & Hors d'oeuvres, Cooking Class, Celebration & Events), but the `/chefs` listing page shows chefs as undifferentiated cards. This disconnects the value proposition users arrived with. Adding **service type badges** to chef cards creates continuity between discovery and browsing, helping diners self-select faster and improving conversion to chef detail pages.

---

## Funnel Analysis

```
Landing Page
    ↓ (Arrived with intent for a specific experience type)
    Experience Type Cards (Prix Fixe | Cocktail | Cooking Class | Celebration)
    ↓
Chef Listing (/chefs)
    ↓ ← Current gap: no service type signal on chef cards
Chef Detail → Booking Form
    ↓
Inquiry Submitted
```

**Problem:** Users who arrived via an experience-type-specific intent (e.g., "I want a cocktail party") see chef cards with no service type indicator. They must click into each chef detail page to discover whether that chef offers their desired experience. This adds friction and increases drop-off between listing → detail page.

---

## Growth Idea: Service Type Badges on Chef Cards

### Rationale

1. **Journey continuity** — Landing page sets expectation of distinct experience types. Chef listing should reinforce this.
2. **Faster self-selection** — Users with specific event types (birthday dinner = Prix Fixe, networking event = Cocktail party) can filter visually, reducing "I'll check later" drop-off.
3. **Click quality improvement** — Users who click chef cards with matching service types are higher intent, more likely to reach the booking form.
4. **Low implementation effort** — Already have service data in `services` table; just surfacing it on the listing card.
5. **Enables A/B testing** — Clear variant difference (with/without badges) for measurable impact.

### Design

**On `/chefs` listing cards**, in the cuisine tags area (or just above price):

| Badge | When | Color |
|-------|------|-------|
| Prix Fixe | Chef has a service titled/similar to "Prix Fixe Dinner" | Gold |
| Cocktail | Chef has a cocktail/canapé service | Purple |
| Cooking Class | Chef has a cooking class service | Teal |
| Celebration | Chef has an events/catering service | Blue |

**Implementation approach:**

1. Fetch chef's services alongside chef profile in `/chefs/page.tsx`
2. Map each chef's services to experience type categories
3. Update chef card UI to show top 1-2 service type badges
4. For chefs with multiple service types, show primary badge + "+N more" pill

---

## Implementation

### Files to Modify

| File | Change |
|------|--------|
| `src/app/chefs/page.tsx` | Fetch services per chef, render service type badges on cards |

### Updated Chef Card

```tsx
{/* Replace current badge area or add above price */}
<div className="flex flex-wrap gap-1.5 mt-2">
  {chef.services?.slice(0, 2).map((service) => (
    <span
      key={service.id}
      className="text-xs px-3 py-1 rounded-full"
      style={{
        backgroundColor: serviceTypeColors[service.category],
        color: 'white',
      }}
    >
      {service.typeLabel}
    </span>
  ))}
  {chef.services?.length > 2 && (
    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
      +{chef.services.length - 2}
    </span>
  )}
</div>
```

### Service Type Mapping

Map `services.title` to experience categories:

```typescript
const SERVICE_TYPES = {
  'prix fixe': { label: 'Prix Fixe', color: 'rgba(201, 168, 76, 0.15)', textColor: '#A68A3A' },
  'cocktail': { label: 'Cocktail', color: 'rgba(139, 92, 246, 0.15)', textColor: '#7C3AED' },
  'cooking class': { label: 'Cooking Class', color: 'rgba(20, 184, 166, 0.15)', textColor: '#0D9488' },
  'celebration': { label: 'Celebration', color: 'rgba(59, 130, 246, 0.15)', textColor: '#2563EB' },
}
```

---

## Experiment Plan: A/B Test

### Hypothesis

"Showing service type badges on chef listing cards will increase click-through rate from listing → chef detail pages, because users can quickly identify chefs matching their desired experience type."

### Variant Details

| Element | Control | Variant |
|---------|---------|---------|
| Chef card | No service badges | Service type badges (e.g., "Prix Fixe", "Cocktail") |
| Cuisine area | Cuisine tags only | Cuisine tags + service type badges |

### Traffic Split

- 50/50 cookie-based assignment (`ab_service_badges`)
- Track: card click → chef detail view → booking form start

### Metrics

| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| Chef detail page CTR | +15% vs control | Baseline | Primary metric |
| Booking form starts | +10% vs control | Baseline | Downstream |
| Bounce rate (listing page) | Track | Baseline | Secondary |

### Analytics Events

```typescript
// Extend existing analytics to add badge variant
{
  event: 'chef_card_clicked',
  chef_id: string,
  service_types: string[],   // ['prix fixe', 'cocktail']
  has_badge_variant: boolean,
  timestamp: ISO8601
}
```

### SQL to Query Results

```sql
-- Service badge impact on click-through
SELECT 
  date_trunc('day', created_at) as day,
  COUNT(DISTINCT user_id) as unique_clickers,
  COUNT(*) as total_clicks
FROM page_views
WHERE page LIKE '/chefs/%'
  AND action = 'card_click'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY day
ORDER BY day;

-- CTR: card clicks / listing views
SELECT 
  variant,
  COUNT(DISTINCT session_id) as sessions,
  COUNT(CASE WHEN action = 'card_click' THEN 1 END) as card_clicks,
  ROUND(
    COUNT(CASE WHEN action = 'card_click' THEN 1 END)::NUMERIC /
    COUNT(DISTINCT session_id), 3
  ) as ctr
FROM analytics
WHERE date > NOW() - INTERVAL '7 days'
  AND experiment = 'ab_service_badges'
GROUP BY variant;
```

---

## Dependencies & Blockers

| Item | Status | Notes |
|------|--------|-------|
| Chef services data | ✅ Available | `services` table with title, description |
| Supabase fetch | ✅ Working | Already fetches chef_profiles |
| MAI-2349 (booking form A/B) | Running | Coordinates but no dependency |
| A/B infrastructure | ✅ Available | Cookie-based like HeroCTA and BookingForm |

---

## Acceptance Criteria

| Criteria | Status | Notes |
|----------|--------|-------|
| Chef cards show service type badges | To implement | Based on services table |
| Click-through rate increases | Target: +15% | Measured via A/B test |
| No degradation to bounce rate | Track | Guardrail metric |

---

## Related Issues

- MAI-2349: Booking form A/B test (running)
- MAI-2383: Hero CTA A/B test (completed)
- MAI-2410: Availability status badges (identified, pending MAI-2376)
- MAI-2376: Chef availability setup UI (P0 blocker)

---

## Next Steps

1. **Implement** service type fetching in `/chefs/page.tsx`
2. **Add** service type badges to chef cards
3. **Integrate** A/B traffic split for `ab_service_badges`
4. **Track** `chef_card_clicked` with `has_badge_variant` field
5. **Monitor** CTR uplift vs control

---

*Generated by Growth Marketer — MAI-2434*
