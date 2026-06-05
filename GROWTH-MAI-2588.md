# Growth Optimization — MAI-2588

**Date:** 2026-06-05 (America/New_York)
**Author:** Growth Marketer
**Status:** Complete

---

## Executive Summary

Identified a **supply-side discovery gap**: the landing page and chef listing are optimized for diner acquisition, but the platform has a supply constraint — few chefs have complete profiles or availability slots configured. This means even acquired diners hit a dead end. The growth lever isn't more diner traffic; it's **getting more chefs to complete their profiles** so there's something to book.

**Growth idea:** Add a chef-facing call-to-action in the navigation (and optionally on the landing page) targeting culinary professionals, shifting some marketing spend/personnel toward chef recruitment. Additionally, add a "Complete Your Profile" nudge for chefs who are registered but haven't added availability.

---

## Funnel Analysis

| Stage | Status | Notes |
|-------|--------|-------|
| Landing page → CTA | ✅ Running | Hero CTA A/B (MAI-2383) |
| CTA → `/chefs` listing | ✅ Running | Service type filter wired (MAI-2526) |
| `/chefs` → chef profile | ✅ Running | Sidebar pre-fill (MAI-2547) |
| Booking form → inquiry submit | ✅ Working | Works but may 409 (no slots) |
| Inquiry → chef accepts | ⚠️ No UI | Chef dashboard (MAI-2549) shows pending inquiries |
| Post-booking | ⚠️ Email blocked | Resend API key needed |
| **Chef profile completion** | ❌ **GAP** | No push for chefs to complete profiles |
| **Chef availability setup** | ❌ **GAP** | MAI-2376 still open — all slots empty |

---

## Growth Idea

### 1. Chef Recruitment CTA — "Cook with Us" Nav Link

**Current state:**
- Navigation has: Home, Chefs, How It Works, [Login / Sign Up]
- No explicit "List Your Services" or "Become a Chef" link
- Culinary professionals visiting the site have no clear path to onboard as chefs

**Proposed change:**
Add a subtle "List Your Services" link in the navigation (or a link in the footer) targeting professional chefs. This could be:
- A link to `/chef/apply` or a chef signup flow
- A link to `/signup?role=chef` with role pre-selection

**Why this matters:**
- Platform is only as good as its supply of complete chef profiles
- A chef who completes their profile AND adds availability slots = bookable inventory
- Each new complete chef profile is worth multiple potential bookings

**Implementation:**
```tsx
// In Navigation.tsx — add to nav links
<Link href="/signup?role=chef" className="text-sm hover:underline" style={{ color: 'var(--color-mdc-text-muted)' }}>
  List Your Services
</Link>
```

Or as a secondary CTA in the footer:
```tsx
<a href="/signup?role=chef" className="block text-sm hover:underline" style={{ color: 'var(--color-mdc-text-muted)' }}>
  Are you a chef? Join Maison des Chefs →
</a>
```

---

### 2. Chef Dashboard "Complete Your Profile" Prompt

**Current state:**
- Chef signs up → redirected to `/dashboard/chef` → sees placeholder text
- No prompt to add services, set availability, upload hero image
- Many chefs may be registered but have empty profiles

**Proposed change:**
Add a profile completion checklist banner in the chef dashboard when key fields are missing:
- No services added → "Add your first service to start receiving bookings"
- No availability slots → "Add your availability to allow diners to book"
- No hero image → "Upload a photo to build trust with diners"

**Why this matters:**
- Reduces the chef-side drop-off between signup and first booking
- Each chef who adds availability = potential booking inventory
- Directly addresses the root cause of the "NO_AVAILABILITY_SLOT" 409 errors

**Implementation:**
In `src/app/dashboard/chef/page.tsx`, add a `ProfileCompletionChecklist` component that:
1. Checks if chef has services, availability slots, and hero image
2. Shows a dismissible banner with specific gaps
3. Links to the relevant completion action

---

## Expected Impact

| Metric | Current | After |
|--------|---------|-------|
| Chef profiles with ≥1 service | Unknown | +15–25% within 2 weeks |
| Chef profiles with ≥1 availability slot |0% (all empty) | +10–20% within 2 weeks |
| Booking requests submitted | Low (no slots) | +10–20% as slots improve |
| Chef dashboard return rate | Unknown | +20–30% (clearer next action) |

**Why this works:**
- The diner-side funnel is optimized (MAI-2547, MAI-2526, MAI-2383)
- The bottleneck is now supply: no complete chef profiles = nothing to book
- Completing chef profiles is a one-time action that unlocks ongoing bookings

---

## Experiment Plan

### Variant A (Control): Current behavior
- No chef recruitment CTA in nav
- Chef dashboard shows placeholder text (no completion prompts)

### Variant B: Chef recruitment + completion prompts
- "List Your Services" link in nav
- Profile completion checklist in chef dashboard
- Tracked via analytics events

### Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Chef signups (weekly) | +20–30% vs control | Unknown |
| Chef profiles with services added | +15–25% | Unknown |
| Chef profiles with availability added | +10–20% | Unknown |
| Booking requests submitted | +10–20% | Unknown |

---

## What's NOT a Priority This Cycle

| Item | Reason |
|------|--------|
| Confirmation email | Blocked by Resend API key — Fred's action needed |
| A/B test for hero CTA | Already running (MAI-2383) |
| Booking form micro-interactions | Covered in MAI-2447 |
| SEO schema markup | Landing page already has Organization + Person schema |
| Review solicitation at confirmation | Covered in MAI-2560 |

---

## Next Steps (Fred's Action)

1. **Add "List Your Services" link** — In Navigation.tsx or Footer, add link to `/signup?role=chef`
2. **Add profile completion checklist** — In chef dashboard, detect missing services/availability/hero image and prompt chef to complete
3. **Track chef profile completion rate** — Query `chef_profiles` table for % with services, availability slots

---

## Metrics to Track

| Metric | Target | Current |
|--------|--------|---------|
| Chef signups (weekly) | +20–30% vs baseline | Unknown |
| Chef profiles with ≥1 service | >60% | Unknown |
| Chef profiles with ≥1 availability slot | >40% | Unknown |
| Booking requests submitted (weekly) | +10–20% | Unknown |

**Query to get baseline:**
```sql
-- Chef profile completion
SELECT 
  COUNT(*) as total_chefs,
  COUNT(CASE WHEN EXISTS (SELECT 1 FROM services WHERE chef_id = cp.id)) as with_services,
  COUNT(CASE WHEN EXISTS (SELECT 1 FROM availability WHERE chef_id = cp.id)) as with_availability,
  COUNT(CASE WHEN hero_image_url IS NOT NULL) as with_photo
FROM chef_profiles cp;
```

---

## Related Prior Work

- MAI-2376: Chef availability setup UI (P0 — still open, supply-side blocker)
- MAI-2547: Sidebar → booking form pre-fill (diner-side funnel optimized)
- MAI-2526: Service type pre-filtering (diner-side funnel optimized)
- MAI-2383: Hero CTA A/B test (diner-side acquisition running)
- MAI-2560: Review solicitation at confirmation (post-booking engagement)

---

*Generated by Growth Marketer — MAI-2588*
