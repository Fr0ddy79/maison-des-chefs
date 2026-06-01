# A/B Test: Booking Form Simplification (MAI-2349)

## Experiment Overview

**Hypothesis:** A simplified booking form with fewer steps (3 steps vs 4 steps) will have a higher submission rate than the standard form due to reduced friction.

**Control:** Standard booking form (4-step multi-step flow)
- Step 1: Select Chef
- Step 2: Choose Date & Time
- Step 3: Guest Details
- Step 4: Confirm

**Variant:** Simplified booking form (3-step combined flow)
- Step 1: Select Chef & Schedule (combined)
- Step 2: Guest Details
- Step 3: Confirm

**Primary Metric:** Conversion Rate = `booking_form_submitted` / `booking_form_viewed`

## Traffic Split Implementation

### Mechanism
- Cookie-based deterministic assignment: `ab_booking_variant`
- 50/50 random split on first visit
- 30-day cookie expiry for consistency
- Same user always sees same variant

### Variant Assignment Logic (`src/lib/useABVariant.ts`)
```
1. Check URL param ?variant=simplified (for forced testing)
   → Use if present, don't persist
2. Check existing cookie 'ab_booking_variant'
   → Return cookie value if valid ('standard' or 'simplified')
3. No existing cookie?
   → Random 50/50 assignment
   → Set cookie with 30-day expiry
   → Return assignment
```

### Testing Specific Variants
To force a specific variant for testing:
- Standard: `/book`
- Simplified: `/book?variant=simplified`

To reset your variant assignment:
```javascript
// Browser console
document.cookie = 'ab_booking_variant=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
```

## Analytics Events

Both variants fire identical events with `form_variant` field:

### `trackBookingFormViewed`
Fired on component mount (first step rendered)
```typescript
{
  event: 'booking_form_viewed',
  chef_id: string,
  service_id: string,
  form_variant: 'standard' | 'simplified',
  referrer: string | null,
  timestamp: ISO8601
}
```

### `trackBookingFormSubmitted`
Fired on form submission (confirm step)
```typescript
{
  event: 'booking_form_submitted',
  chef_id: string,
  service_id: string,
  form_variant: 'standard' | 'simplified',
  lead_id: string | null,
  guest_count: number,
  event_date: string,
  timestamp: ISO8601
}
```

## How to Validate

### 1. Verify Traffic Split Integrity
```bash
# Visit /book multiple times - you should always get the same variant
# To test simplified directly: /book?variant=simplified
# To reset and get new assignment: clear ab_booking_variant cookie
```

### 2. Verify Analytics Events
Open browser DevTools → Network tab and filter for `/api/analytics/booking-form/*`
- On page load: verify POST to `/api/analytics/booking-form/viewed` with correct `form_variant`
- On submit: verify POST to `/api/analytics/booking-form/submitted` with correct `form_variant`

### 3. Check Variant Display
A badge appears at the top of the form showing current variant:
```
Form Variant: standard
Form Variant: simplified
```

## Metrics to Track

### Primary
| Metric | Control (Standard) | Variant (Simplified) |
|--------|-------------------|---------------------|
| `booking_form_viewed` count | | |
| `booking_form_submitted` count | | |
| Conversion Rate | submitted / viewed | submitted / viewed |

### Secondary (if data available)
| Metric | Description |
|--------|-------------|
| Drop-off per step | Which step do users abandon? |
| Time to submit | How long from view to submit? |
| Guest count | Any correlation with form variant? |

### Statistical Significance
Minimum sample size per variant: **100 views** (for ~10% effect size at 95% confidence)

Run for **minimum 48 hours** or until statistical significance is reached.

## Expected Outcome

If hypothesis is correct:
- Simplified variant should show **higher conversion rate**
- Reduction from 4 to 3 steps reduces cognitive load/friction

If hypothesis is incorrect:
- Standard variant performs same or better
- Users may prefer seeing info broken out (more transparent)

## Files Changed

| File | Change |
|------|--------|
| `src/lib/useABVariant.ts` | New - cookie-based traffic splitting hook |
| `src/app/book/BookPageContent.tsx` | Simplified form variant + variant hook integration |
| `src/lib/analytics.ts` | No changes (already supported form_variant) |
| `src/app/api/analytics/booking-form/*` | No changes (already stored form_variant) |
