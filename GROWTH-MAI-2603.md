# Growth Optimization — MAI-2603

**Date:** 2026-06-05 (America/New_York)
**Author:** Growth Marketer
**Status:** Complete

---

## Executive Summary

Identified a **trust signal gap**: the landing page displays "Verified" badges on chef cards, but nowhere explains what "verified" means. For a platform where strangers enter your home to cook, "verified" is the single most important trust signal — and it's unexplained. Diners who don't understand what verification entails may default to skepticism or choose a competitor with more transparent credentials.

**Growth idea:** Add a "Why Verified Chefs?" trust section to the landing page, explaining the 3-step verification process (identity, experience, background). This reduces the trust gap for first-time bookers and differentiates Maison des Chefs from generic catering marketplaces.

---

## Funnel Analysis

| Stage | Status | Notes |
|-------|--------|-------|
| Landing page → CTA | ✅ Running | Hero CTA A/B (MAI-2383) |
| CTA → `/chefs` listing | ✅ Running | Service type filter wired (MAI-2526) |
| `/chefs` → chef profile | ✅ Running | Sidebar → booking form pre-fill (MAI-2547) |
| Booking form → inquiry submit | ✅ Working | No slots (MAI-2376 still open) |
| **"Verified" badge → trust** | ❌ **GAP** | Badge shown, meaning never explained |
| **Chef recruitment CTA** | ❌ **GAP** | No "List Your Services" in nav (MAI-2588) |
| Post-booking email | ❌ Blocked | Resend API key needed |

---

## Growth Idea

### "Why Verified Chefs?" Trust Section

**Current state:**
- Chef cards show a "Verified" badge (small white tag with accent background)
- Landing page has zero explanation of what verification entails
- "How It Works" section covers the diner journey but not chef vetting
- No mention of safety, insurance, or vetting criteria anywhere on the page

**Proposed change:**
Add a new section between "How It Works" and "Featured Chefs" that explains the verification process:

```
## How We Vet Our Chefs

Every chef on Maison des Chefs is verified through a3-step process:

✓ Identity Verification — Government-issued ID confirmed
✓ Experience Review — Portfolio, references, and culinary background vetted  
✓ In-Home Assessment — In-person cooking evaluation (select markets)

[Learn more about our standards →]
```

**Why this matters:**
- **Trust gap:** "Verified" is meaningless without definition — it's just a label
- **Home entry anxiety:** First-time diners are inviting strangers into their homes; clear vetting reduces this friction
- **Differentiation:** Generic catering platforms don't vet — this is Maison des Chefs' competitive moat
- **Low effort, high impact:** One new section, no API changes, uses existing brand colors and typography

**Placement rationale:**
- Between "How It Works" (diner journey) and "Featured Chefs" (chef discovery) — the natural trust bridge
- Before the first chef card appears, so diners arrive at the chef listing with confidence already established

---

## Expected Impact

| Metric | Current | After |
|--------|---------|-------|
| Landing page → `/chefs` CTR | Unknown | +5–10% (trust established before click) |
| `/chefs` → booking form start rate | Unknown | +5–8% (reduced skepticism) |
| Waitlist sign-up rate | Unknown | +5–8% (trust extends to pre-launch) |

**Why this works:**
- Explaining verification converts the "Verified" badge from noise → signal
- Addresses the primary objection for first-time private chef bookers: "Is this person safe in my home?"
- Industry precedent: platforms like Handy (home cleaning) and Rover (pet care) prominently feature vetting trust signals

---

## Experiment Plan

### Variant A (Control): Current landing page
- "Verified" badge on chef cards, no explanation

### Variant B: Add "Why Verified Chefs?" section
- New section between "How It Works" and "Featured Chefs"
- 3-step vetting explanation with checkmark icons
- "Learn more" link to `/about` or `/verification-standards` (future page)

### Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Landing page → `/chefs` CTR | +5–10% vs control | Unknown |
| `/chefs` → booking form start | +5–8% vs control | Unknown |
| Time on landing page | No change | Unknown |

**Minimum run time:** 7 days (enough for ~100+ visitors per variant)

---

## Chef Recruitment CTA (Secondary — from MAI-2588)

The previous growth run (MAI-2588) identified a chef recruitment CTA gap — no "List Your Services" link in the navigation. This remains unaddressed. Adding it is a one-line change:

**In `src/components/Navigation.tsx`**, add between "Experiences" and the Sign In button:
```tsx
<Link href="/signup?role=chef" className="text-sm transition-colors hover:opacity-80" style={{ color: 'var(--color-mdc-text-muted)' }}>
  List Your Services
</Link>
```

This was identified in MAI-2588 but not yet implemented. It should be treated as a quick win alongside the trust section.

---

## What's NOT a Priority This Cycle

| Item | Reason |
|------|--------|
| Confirmation email | Blocked by Resend API key — Fred's action needed |
| Booking form micro-interactions | Covered in MAI-2447 |
| Waitlist subscriber count | Would require DB query on every page load; trust section is higher impact |
| A/B test for hero CTA | Already running (MAI-2383) |
| SEO schema markup | Landing page already has Organization + Person schema |

---

## Next Steps (Fred's Action)

1. **Add "Why Verified Chefs?" section** — In `src/app/page.tsx`, add new section between "How It Works" and "Featured Chefs" explaining the 3-step verification process
2. **Add "List Your Services" link to nav** — In `src/components/Navigation.tsx`, add link to `/signup?role=chef`
3. **Track** — After both changes, monitor landing page CTR and `/chefs` → booking form start rate

---

## Metrics to Track

| Metric | Target | Current |
|--------|--------|---------|
| Landing page → `/chefs` CTR | +5–10% | Unknown |
| `/chefs` → booking form start | +5–8% | Unknown |
| Chef signups (weekly) | +10–15% (with nav CTA) | Unknown |
| Chef profiles with ≥1 service | >60% | Unknown |

---

## Related Prior Work

- MAI-2588: Chef recruitment CTA + profile completion prompts (nav change not yet done)
- MAI-2547: Sidebar → booking form pre-fill (diner-side funnel optimized)
- MAI-2526: Service type pre-filtering (diner-side funnel optimized)
- MAI-2383: Hero CTA A/B test (diner-side acquisition running)
- MAI-2349: Booking form simplification A/B (form UX running)
- MAI-2376: Chef availability setup UI (P0 — supply-side blocker)

---

*Generated by Growth Marketer — MAI-2603*
