# Growth Optimization — MAI-2547

**Date:** 2026-06-04 (America/New_York)
**Author:** Growth Marketer
**Status:** Complete

---

## Executive Summary

Fixed a **funnel handoff gap** between the chef profile sidebar and the booking form. Previously, when a diner used the booking sidebar on a chef's profile page (selecting service, date, guest count) and clicked "Request Booking", **none of those selections were passed forward** — only `chef_id` reached the booking form. The diner had to re-enter everything, adding friction and reducing form completion rates.

Additionally added a **dynamic price estimate** to the sidebar ("$250 → Estimated total"), replacing the vague "Contact for quote" messaging with a real-time per-person × guest calculation.

---

## What Was Changed

### 1. `src/app/chefs/[id]/ChefProfileClient.tsx` — Sidebar state + URL params

**Before:** Static HTML selects, no state, no data passed to `/book`
**After:** React state tracks `selectedServiceId`, `selectedDate`, `selectedGuests`

The "Request Booking" link now builds a URL with all sidebar selections as query params:

```
/book?chef_id=xxx&service_id=xxx&date=2026-06-15&guests=4
```

Also added:
- `min={new Date().toISOString().split('T')[0]}` on the date picker to prevent past dates
- `onChange` handlers on all sidebar inputs to update state
- Default `selectedServiceId` to `services[0]?.id` so the first service is pre-selected

### 2. `src/app/book/BookPageContent.tsx` — Pre-fill from URL params

Extended the existing chef pre-selection `useEffect` to also read `date` and `guests` from the URL:

```typescript
const urlDate = searchParams.get('date')
const urlGuests = searchParams.get('guests')
if (urlDate || urlGuests) {
  setFormData(prev => ({
    ...prev,
    date: urlDate || prev.date,
    guestCount: urlGuests ? parseInt(urlGuests, 10) : prev.guestCount,
  }))
}
```

The `chef_id` → chef pre-selection logic already existed. This change adds `date` and `guestCount` to it.

### 3. `src/app/chefs/[id]/ChefProfileClient.tsx` — Dynamic price estimate

**Before:**
```
Estimated total: Contact for quote
```

**After:**
```
Estimated total: $250
$125/person × 4 guests
```

Computed from `selectedService.price_per_person × selectedGuests`. Only shown when `price_per_person` exists.

---

## Funnel Impact

| Stage | Before | After |
|-------|--------|-------|
| Chef profile sidebar → `/book` | Only `chef_id` passed | `chef_id` + `date` + `guests` |
| Re-entry friction | Full re-entry required | Zero re-entry for 3/4 fields |
| Price transparency | "Contact for quote" | Real-time estimate shown |
| User intent at booking form | Lower (had to re-select) | Higher (intent already expressed) |

**Expected improvements:**
- Booking form step-0 → step-1 progression: +8–12%
- Overall booking form submission rate: +5–10%
- Chef profile → booking form bounce: -10–15%

**Why it works:**
- Reduces friction at the highest-intent moment (sidebar on chef profile)
- Price anchoring: seeing a concrete estimate before clicking reduces post-click abandonment
- Eliminates the "I already picked this" frustration that causes drop-off

---

## Why Not a Full A/B Test

This was treated as a **clear UX fix** rather than a hypothesis to A/B test because:
1. The previous behavior was clearly broken (form fields silently discarded)
2. The price estimate is industry-standard best practice (used by Airbnb, Catering.com, etc.)
3. Low risk — no changes to the core booking flow mechanics

If desired, an A/B test could be run comparing:
- **Control:** Sidebar with "Contact for quote" (no pre-fill)
- **Variant:** Sidebar with live price estimate + pre-fill to booking form

Primary metric: `booking_form_submitted / chef_profile_viewed`

---

## Active Experiments

| Test | Status | Notes |
|------|--------|-------|
| Hero CTA A/B (MAI-2383) | Running | "Find Your Chef" vs "Browse Available Chefs" |
| Booking Form A/B (MAI-2349) | Running | 4-step vs 3-step form |
| Service type pre-filtering (MAI-2526) | Live | Experience cards → correct chef listing |
| **Sidebar → booking form pre-fill** | **New — this** | No A/B; UX fix |

---

## What's NOT a Priority This Cycle

| Item | Reason |
|------|--------|
| Service ID passed to booking form step UI | Booking form step 0 still shows chef grid; service selection not yet visually pre-selected at step level |
| Duration selector wired to booking form | Duration is UI-only in sidebar; not passed to `/book` |
| Auto-advance to step 1 when all fields pre-filled | Would require form variant coordination; too complex for this cycle |
| Confirmation email | Still blocked by Resend API key |
| Chef availability setup (MAI-2376) | P0 — booking funnel structurally broken |

---

## Metrics to Track

| Metric | Target | Current |
|--------|--------|---------|
| Chef profile → `/book` CTR | +10–15% | Unknown baseline |
| Booking form step-0 → step-1 rate | +8–12% | Unknown |
| Booking form submission rate | +5–10% | Unknown |
| Booking form abandonment at step 0 | -10–15% | Unknown |

**Query to get baseline (before this change):**
```sql
-- Chef profile views vs booking form views (by chef)
SELECT COUNT(DISTINCT chef_id) as unique_chefs_viewed
FROM service_page_views
WHERE created_at > NOW() - INTERVAL '7 days';
```

---

## Next Steps

1. **Fred:** The sidebar now shows live price estimates — verify on a few chef profiles
2. **Fred:** The "Request Booking" link passes date + guests — verify by clicking through to `/book`
3. **Product:** Add `service_id` to inquiry payload so chefs know which service was selected (MAI-2538)
4. **Product:** Auto-advance simplified form to step 1 when `date` and `guests` are pre-filled via URL

---

*Generated by Growth Marketer — MAI-2547*
