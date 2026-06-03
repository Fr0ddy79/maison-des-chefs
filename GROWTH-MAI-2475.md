# Growth Optimization — MAI-2475

**Date:** 2026-06-03 (America/New_York)
**Author:** Growth Marketer
**Status:** Analysis Complete

---

## Funnel Analysis

| Stage | Page | Status |
|-------|------|--------|
| 1. Awareness | Landing page (`/`) | ✅ Active |
| 2. Discovery | Chef browse (`/chefs`) | ✅ Active |
| 3. Consideration | Chef profile (`/chefs/[id]`) | ✅ Active |
| 4. Booking Request | Booking form (`/book`) | ✅ Active (A/B running) |
| 5. Inquiry Submitted | API endpoint | ✅ Active |
| 6. Post-submit | Email confirmation | ⚠️ Resend not configured |

### Active A/B Tests

| Test | Variants | Metric | Status |
|------|----------|--------|--------|
| Hero CTA | `find_your_chef` vs `browse_available` | CTR | Running |
| Booking Form | `standard` vs `simplified` | Form completion | Running |
| Booking Form Chef Cards | MAI-2447 idea (not implemented) | Step 1→2 completion | Not implemented |

---

## Growth Idea: Add Social Proof Counter ("X Chefs Available | Y Dinners Booked")

### Hypothesis

High-intent visitors to the landing page who see a live **social proof counter** — specifically a "X Chefs Available" metric — will have higher confidence in the platform's legitimacy and be more likely to click through to `/chefs`. The counter must be honest and accurate (fetched from Supabase), not a hardcoded fake number.

### Why This Works

- **Trust signal** — A marketplace with zero or few chefs feels abandoned. Showing a real count signals "real people are using this."
- **Specificity** — Generic copy like "Join 47+ food lovers" is broad. "12 Verified Chefs Available" is concrete and specific.
- **Friction-free** — No extra click or form required. Passive signal that reinforces intent.
- **A/B testable** — Easy to measure with existing analytics infrastructure.

### What to Test

**Control (A):** No counter — landing page as-is.

**Variant (B):** Add a "X Chefs Available" counter in the hero section, directly below the CTA.

### Implementation

#### Step 1: API endpoint to fetch real chef count

In `src/app/api/stats/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/client'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()

  // Count verified chefs
  const { count: chefCount } = await supabase
    .from('chef_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_verified', true)

  // Count completed bookings
  const { count: bookingCount } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')

  return NextResponse.json({
    chefs_available: chefCount || 0,
    dinners_booked: bookingCount || 0,
  })
}
```

#### Step 2: StatsBar component

In `src/components/StatsBar.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'

export function StatsBar() {
  const [stats, setStats] = useState({ chefs_available: 0, dinners_booked: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats')
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch {
        // Non-critical — hide on failure
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) return null

  return (
    <div className="flex items-center gap-6 text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
      <div className="flex items-center gap-2">
        <span className="font-semibold" style={{ color: 'var(--color-mdc-accent)' }}>
          {stats.chefs_available}
        </span>
        <span>Verified Chef{stats.chefs_available !== 1 ? 's' : ''} Available</span>
      </div>
      {stats.dinners_booked > 0 && (
        <div className="hidden sm:flex items-center gap-2">
          <span className="font-semibold" style={{ color: 'var(--color-mdc-accent)' }}>
            {stats.dinners_booked}
          </span>
          <span>Dinner{stats.dinners_booked !== 1 ? 's' : ''} Booked</span>
        </div>
      )}
    </div>
  )
}
```

#### Step 3: Integrate into hero section

In `src/app/page.tsx`, add `<StatsBar />` below the CTA:

```tsx
{/* Below HeroCTA component */}
<div className="mt-6">
  <StatsBar />
</div>
```

#### Step 4: A/B test traffic split

Extend the existing hero CTA variant cookie (`ab_hero_cta_variant`) to also control whether the stats bar appears, OR create a new cookie `ab_hero_stats_variant` with 50/50 split.

For simplicity, reuse the hero CTA variant — when variant = `browse_available`, also show the stats bar. This keeps the test aligned with the existing CTA test.

### Analytics

Existing `hero_cta_click` event already fires. No new events needed. Compare:
- Sessions with stats bar → CTR to /chefs
- Sessions without stats bar → CTR to /chefs

### Expected Impact

| Metric | Current | Expected | Rationale |
|--------|---------|----------|-----------|
| Hero CTA CTR | Baseline (from MAI-2383 test) | +5–10% | Social proof counter increases trust |
| Hero section dwell time | Baseline | +3–5% | Counter creates visual pause/interest |
| `/chefs` bounce rate | Unknown | -5% | Visitors who see chef count may be more qualified |

### Rollout Criteria

- **Minimum sample:** 200 hero section views per variant
- **Success threshold:** >5% lift in CTA CTR
- **Kill condition:** >2% drop in CTR (counter may distract)

---

## What's NOT a Good Fit Right Now

| Idea | Reason |
|------|--------|
| Booking form chef card photos (MAI-2447) | Already partially implemented — photos exist, just small |
| Service type badges on chef cards (MAI-2434) | Already designed in prior cycle |
| Experiences section → booking links (MAI-2447 secondary) | Medium effort, lower priority than hero CTR |
| Referral mechanics | Too early — need actual booking volume first |

---

## Dependencies & Blockers

| Item | Status | Notes |
|------|--------|-------|
| Supabase connection | ✅ Working | Real-time data available |
| Analytics infrastructure | ✅ Working | Hero CTA click tracking in place |
| MAI-2376 (chef availability) | P0 Blocker | Funnel still broken for actual bookings |
| Resend API key | Not configured | Email confirmation blocked |

---

## Next Steps (Fred's Action)

1. **Create** `src/app/api/stats/route.ts` — real-time chef + booking counts
2. **Create** `src/components/StatsBar.tsx` — non-blocking fetch + display
3. **Update** `src/app/page.tsx` — add StatsBar below HeroCTA, wrapped in variant conditional
4. **Validate** — visit `/` and confirm stats bar shows (or shows nothing if API fails)
5. **Monitor** — review hero CTA click-through after 48h

---

*Generated by Growth Marketer — MAI-2475*