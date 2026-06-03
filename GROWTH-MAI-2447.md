# Growth Optimization — MAI-2447

**Date:** 2026-06-02 (America/New_York)
**Author:** Growth Marketer
**Status:** Completed

---

## Funnel Analysis

### Current Funnel Stages

| Stage | Page | Status | Notes |
|-------|------|--------|-------|
| **1. Awareness** | Landing page (`/`) | ✅ Active | Hero, How It Works, Featured Chefs, Experiences, Testimonials, CTA |
| **2. Discovery** | Chef browse (`/chefs`) | ✅ Active | Filter by cuisine, sort by rating/price, compare up to 4 chefs |
| **3. Consideration** | Chef profile (`/chefs/[id]`) | ✅ Active | Bio, gallery, reviews, pricing, inquiry form |
| **4. Booking Request** | Book flow (`/book`) | ✅ Active | 3-step (simplified) or 4-step (standard) multi-step form |
| **5. Confirmation** | Success state | ✅ Active | Confirmation card, next steps, trust signals |
| **6. Post-Submit** | Email confirmation | ⚠️ Partial | Backend support exists (Resend), confirmation email implemented |

### Existing A/B Tests

| Test | Variants | Traffic | Metric |
|------|----------|---------|--------|
| Hero CTA | `find_your_chef` vs `browse_available` | 50/50 | CTR on hero section |
| Booking Form | `standard` (4-step) vs `simplified` (3-step) | 50/50 | Form completion rate |

---

## Growth Idea

### "Show Chef Photos in Booking Form + Real-Time Availability Hint"

**Funnel stage:** Step 1 of booking form — Chef Selection

**Problem identified:**
The chef selection grid in the booking form (`/book`) shows only text:
```
[ Chef Name ]
[ cuisine, cuisine ]
[ From $X / event ]
```

Meanwhile, the `/chefs` browse page shows full chef cards with photos, ratings, and cuisine tags — and users arriving from chef profiles or direct links have already seen the chef's photo. When they hit the booking form and see a text-only list, it breaks visual continuity and reduces confidence in the chef selection.

**What to test:**
Add the chef's `hero_image_url` thumbnail (64x64 avatar) and star rating inline in each chef selection button. This creates visual continuity from the chef profile → booking form, reduces cognitive load, and increases selection confidence.

**Control (A):** Text-only chef selection buttons
**Treatment (B):** Chef photo + name + rating in selection buttons

---

## Expected Impact

| Metric | Current | Expected | Rationale |
|--------|---------|----------|-----------|
| Form step 1 → 2 completion | Baseline | +5–10% | Visual trust cues reduce abandonment at first decision point |
| Overall booking form completion | Baseline | +3–7% | Higher step-1 confidence correlates with better completion |
| Chef selection errors (back-navigation) | Baseline | -15% | Users confirm the right chef visually |

**Secondary effect:** If users feel more confident selecting a chef, they may also be less likely to abandon mid-form when they "change their mind" about the chef.

---

## Experiment Plan

### Implementation (Low Effort)

In `BookPageContent.tsx`, chef selection grid:

**Control A — current code (simplified for reference):**
```tsx
<button onClick={() => setFormData({ ...formData, chefId: chef.id })} ...>
  <p className="font-medium">{chef.display_name || 'Chef'}</p>
  <p className="text-sm">{chef.cuisines?.join(', ')}</p>
  <p className="text-sm mt-2">From ${chef.price_per_event || '—'} / event</p>
</button>
```

**Treatment B — with photo + rating:**
```tsx
<button
  onClick={() => setFormData({ ...formData, chefId: chef.id })}
  className="p-4 rounded border text-left transition-colors flex items-center gap-4"
  style={{
    borderColor: formData.chefId === chef.id ? 'var(--color-mdc-accent)' : 'var(--color-mdc-border)',
    backgroundColor: formData.chefId === chef.id ? 'rgba(201, 168, 76, 0.05)' : 'transparent',
  }}
>
  <img
    src={chef.hero_image_url}
    alt={chef.display_name}
    className="w-16 h-16 rounded-full object-cover flex-shrink-0"
  />
  <div className="flex-1 min-w-0">
    <div className="flex items-center gap-2">
      <p className="font-medium">{chef.display_name || 'Chef'}</p>
      {chef.is_verified && <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--color-mdc-accent)', color: 'white' }}>Verified</span>}
    </div>
    <p className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>{chef.cuisines?.join(', ')}</p>
    <div className="flex items-center gap-3 mt-1">
      <StarRatingInline rating={Math.round(chef.avg_rating)} />
      <span className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>{chef.avg_rating} ({chef.review_count})</span>
    </div>
  </div>
  <div className="text-right flex-shrink-0">
    <p className="font-medium">From ${chef.price_per_event || '—'}</p>
    <p className="text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>/ event</p>
  </div>
</button>
```

### Analytics Hook
The existing `trackBookingFormSubmitted` already captures `form_variant` — no new analytics needed. Compare:
- `form_variant=standard` with control → baseline conversion
- `form_variant=standard` with treatment → +X%?
- `form_variant=simplified` with control → baseline conversion
- `form_variant=simplified` with treatment → +X%?

### Traffic Split
Can be tested as a new dimension within existing form variant cookie, or as a separate 50/50 test on the chef selection step specifically.

### Rollout Criteria
- **Minimum sample:** 50 submissions per variant before evaluating
- **Success threshold:** >5% improvement in step-1→step-2 completion rate
- **Kill condition:** >2% drop in completion rate (visual treatment backfires)

---

## Metrics to Track

| Metric | Source | Target |
|--------|--------|--------|
| Booking form step 1 → 2 completion rate | Existing analytics (`/api/analytics/booking-form/viewed` + `/submitted`) | +5% |
| Overall form submission rate | Existing analytics | +3% |
| Chef selection back-navigation (step 2 → 1) | New: custom event on Back button click | -10% |
| Variant badge in UI (for QA) | `?variant=simplified&debug=1` | Confirms split works |

---

## Secondary Observations (Not Implemented — Flag for Future Cycles)

1. **Experiences section has no path to booking** — "Curated Experiences" shows 4 experience types but none link to specific chefs or a filtered `/chefs` list. Opportunity: filter chefs by experience type or link to a pre-filled booking.

2. **"How It Works" step 2 says "Receive confirmation within hours"** — This is vague. If the system can show a real SLA ("Chef confirms within 24 hours"), it reduces anxiety and sets expectations.

3. **Hero CTA "Browse Available Chefs" variant** — This implies real-time availability, but no availability slots exist in the database yet (MAI-2376 is P0). The variant may be misleading until that is resolved.

---

*Analysis complete. Ready for implementation review.*