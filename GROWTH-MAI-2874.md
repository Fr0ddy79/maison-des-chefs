# GROWTH-MAI-2874: Chef Profile Sticky Mobile CTA — A/B Test

**Created:** 2026-06-11 04:00 America/New_York
**Status:** Implemented
**Type:** Growth Optimization

## Context

**Funnel Stage:** Mid-funnel / consideration (page = `/chefs/[id]`)
**Problem identified:** Mobile users who land on a chef profile page scroll through the bio, services, and reviews — but the booking sidebar is at the top of the page (above the fold on desktop, inline on mobile). As users scroll down to read reviews, the primary conversion prompt disappears from view. High-intent users are lost because there's no persistent CTA on mobile.

**What existed:**
- Booking sidebar with "Request Booking" CTA — sticky on desktop (`sticky top-24`), inline/relative on mobile
- No A/B testing infrastructure on the chef profile page
- No mobile-specific conversion prompt

**Gap:** No persistent, optimizable conversion prompt for mobile users browsing chef profiles.

---

## What Was Implemented

### ChefProfileStickyCTA Component

A mobile-only (`lg:hidden`) sticky bar at the bottom of the viewport that appears after users scroll 300px.

**Two variants (50/50 cookie-based split):**

| Variant | Headline | CTA Button |
|---------|----------|------------|
| `personalized` | "Book {ChefName} Now" | "Book Now →" |
| `generic` | "Check Availability" | "Check Availability →" |

**Implementation details:**
- Cookie `ab_chef_sticky_cta_variant` — 30-day expiry, deterministic assignment
- URL param override for testing (`?chef_sticky_cta_variant=personalized|generic`)
- Scroll-triggered visibility (appears after 300px scroll)
- `chef_sticky_cta_click` event fired on CTA click with `variant` + `chef_id` fields
- Fixed to bottom of viewport, z-index 40
- Debug mode: `?debug` shows variant badge

### Files Changed

| File | Change |
|------|--------|
| `src/components/ChefProfileStickyCTA.tsx` | New component (~130 lines) |
| `src/app/api/analytics/chef-sticky-cta-click/route.ts` | New analytics tracking route |
| `src/app/chefs/[id]/ChefProfileClient.tsx` | Import and render `<ChefProfileStickyCTA />` before `<Footer />` |

---

## Why This Works

1. **Captures mid-scroll abandonment** — Mobile users who scroll 300px+ are actively reading chef details; a sticky CTA captures intent at peak engagement
2. **Personalized copy creates ownership** — "Book Chef Marie Now" feels specific and relevant vs. generic "Check Availability"
3. **Mobile-first** — Desktop already has a sticky sidebar; this fills the gap for mobile users
4. **Analytics-ready** — `chef_sticky_cta_click` events tracked per variant for direct measurement
5. **Low implementation risk** — Purely additive UI, no changes to existing components, uses existing analytics infrastructure

---

## Experiment Plan

### Phase 1: Measure (7–14 days)

- **Primary metric:** `chef_sticky_cta_click` rate = clicks / unique sticky CTA impressions
  - Query: `SELECT variant, COUNT(*) FROM analytics_events WHERE event_name='chef_sticky_cta_click' AND created_at > NOW() - INTERVAL '7 days' GROUP BY variant`
- **Secondary metric:** `/book` pageviews attributed to chef profile sticky CTA clicks vs. other referrers
- **Secondary metric:** Inquiry submissions from chef profile pages with sticky CTA
- **Guardrail metric:** Chef profile page bounce rate (no negative impact expected)

**To force a variant for testing:**
- Personalized: `/chefs/[id]?chef_sticky_cta_variant=personalized`
- Generic: `/chefs/[id]?chef_sticky_cta_variant=generic`

**To reset assignment:**
```javascript
document.cookie = 'ab_chef_sticky_cta_variant=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
```

### Phase 2: Iterate

- If personalized wins (>15% lift in click rate) → ship as default, test new personalization angle (e.g., "Book Your Dinner with {ChefName}")
- If no difference → test CTA placement (above content vs. floating bottom-right)
- If generic wins → explore other generic angles (e.g., "No payment today" as trust signal)
- If click-through is high but bookings don't follow → investigate booking flow drop-off

---

## Funnel Stage Coverage

| Stage | Existing | New Addition |
|-------|----------|--------------|
| **Acquisition** | Hero CTA (4 variants), SEO schema | — |
| **Consideration** | Service-type links, Featured Chefs, Browse by Cuisine, Sticky CTA Bar (`/chefs`) | **Chef Profile Sticky CTA** |
| **Conversion** | Booking form A/B test | — |

---

## Differentiation from Previous Growth Work

| Experiment | Funnel Stage | Status |
|------------|--------------|--------|
| Hero CTA A/B (4 variants) | Top (acquisition) | Running |
| Booking Form A/B (3 vs 4 steps) | Mid (conversion) | Running |
| Schema.org markup | SEO | Done |
| Browse by Cuisine | Mid (consideration) | Done |
| Sticky CTA Bar (`/chefs`) | Mid (consideration) | Done |
| **Chef Profile Sticky CTA** | Mid (consideration) | **Implemented** |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Bar annoys mobile users and increases bounce | Appears only after 300px scroll (genuine engagement signal); non-intrusive design |
| Personalized CTA feels too pushy for brand tone | Test includes generic variant as control; if control wins, generic is the direction |
| Low click-through overall | Analytics will reveal if bar position or copy is wrong; no downside to measuring |

---

## Pre-Launch Validation Checklist

- [x] Sticky bar appears after 300px scroll (verified in dev)
- [x] Cookie-based assignment is deterministic (same user = same variant)
- [x] URL param override works for forced testing
- [x] `chef_sticky_cta_click` event fires on button click
- [x] Bar is hidden on desktop (`lg:hidden`)
- [x] Build passes with no errors
- [x] Committed to main branch

---

## Summary

**Growth idea:** Add a mobile-only sticky CTA bar to the chef profile page (`/chefs/[id]`) that appears after 300px of scroll, with an A/B test comparing personalized copy ("Book {ChefName} Now") vs. generic copy ("Check Availability").

**Implementation:** 3 files changed — new `ChefProfileStickyCTA.tsx` component + new analytics route + integration in `ChefProfileClient.tsx`.

**Expected impact:** Personalized variant should increase CTA click-through rate by 10–20% vs. generic, driving more users from chef profile to the booking flow.

**Effort:** Low — single new component + one analytics route + one import/render line.

**Owner:** Growth Marketer (implemented) → Fred to monitor via analytics

---

*Generated by Growth Marketer — MAI-2874*
