# GROWTH-MAI-2863: Sticky CTA Bar — /chefs Urgency A/B Test

**Created:** 2026-06-10 18:00 America/New_York
**Status:** Implemented
**Type:** Growth Optimization

## Context

**Funnel Stage:** Mid-funnel / consideration (page = `/chefs`)
**Problem identified:** High-intent users land on `/chefs` after browsing but leave without taking action. The existing top CTA banner is static and not instrumented for optimization. There's no persistent conversion prompt as users scroll through chef results.

**What existed:**
- Static CTA banner at the top of `/chefs` ("Book a Chef" + "Join Waitlist")
- Sticky CompareBar (bottom) for users who selected chefs for comparison
- No sticky booking CTA for users who haven't selected chefs
- No A/B testing on CTA messaging for the `/chefs` page

**Gap:** No persistent, optimizable conversion prompt after users scroll past the hero banner.

---

## What Was Implemented

### Sticky CTA Bar on `/chefs`

A full-width sticky bar appears at the bottom of the viewport after users scroll 400px.

**Two variants (50/50 cookie-based split):**

| Variant | Headline | CTA Button |
|---------|----------|------------|
| `control` | "Ready to find your perfect chef?" | "Browse & Book →" |
| `urgency` | "Weekend slots are filling fast — book now to secure your date" | "Check Availability →" |

**Implementation details:**
- Cookie-based deterministic assignment (`ab_sticky_cta_variant`, 30-day expiry)
- URL param override for testing (`?sticky_cta_variant=urgency`)
- Scroll-triggered visibility (appears after 400px scroll)
- `sticky_cta_click` event fired on CTA click with `variant` + `page` fields
- Fixed to bottom of viewport, above CompareBar z-index (`z-40`)
- Debug badge in development mode showing current variant

### Files Changed

| File | Change |
|------|--------|
| `src/components/StickyCTABar.tsx` | New component (~120 lines) |
| `src/app/chefs/page.tsx` | Import and render `<StickyCTABar />` before `<Footer />` |

---

## Why This Works

1. **Captures mid-scroll abandonment** — Most users who scroll 400px+ are actively browsing; a sticky CTA captures intent at peak engagement
2. **Urgency messaging creates action motivation** — "Weekend slots are filling fast" creates scarcity + social proof pressure that generic copy lacks
3. **Zero disruption to browse flow** — CompareBar handles chef-selection flow; this bar is additive for booking-intent users
4. **Analytics-ready** — `sticky_cta_click` events tracked per variant for direct measurement
5. **Low implementation risk** — Purely additive UI, no changes to existing components, cookie-based assignment is already proven in the codebase

---

## Experiment Plan

### Phase 1: Measure (7–14 days)

- **Primary metric:** `sticky_cta_click` rate = clicks / unique sticky CTA impressions
  - Tracked via: `SELECT variant, COUNT(*) FROM events WHERE event_type='sticky_cta_click' AND created_at > NOW() - INTERVAL '7 days' GROUP BY variant`
- **Secondary metric:** `/book` pageviews attributed to sticky CTA clicks vs. other referrers
- **Secondary metric:** Booking form submission rate from `sticky_cta_click` referrers
- **Guardrail metric:** `/chefs` bounce rate (no negative impact expected)

**To force a variant for testing:**
- Control: `/chefs?sticky_cta_variant=control`
- Urgency: `/chefs?sticky_cta_variant=urgency`

**To reset assignment:**
```javascript
document.cookie = 'ab_sticky_cta_variant=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
```

### Phase 2: Iterate

- If urgency wins (>15% lift in click rate) → make it the control, test new urgency angle
- If no difference → test CTA placement (above CompareBar vs. floating bottom-right)
- If control wins → explore other messaging (e.g., "Free cancellation" as trust signal)
- If click-through is high but bookings don't follow → investigate booking flow drop-off

---

## Funnel Stage Coverage

| Stage | Existing | New Addition |
|-------|----------|--------------|
| **Acquisition** | Hero CTA (4 variants), SEO schema | — |
| **Consideration** | Service-type links, Featured Chefs, Browse by Cuisine | **Sticky CTA Bar** |
| **Conversion** | Booking form A/B test | — |

---

## Differentiation from Previous Growth Work

| Experiment | Funnel Stage | Status |
|------------|--------------|--------|
| Hero CTA A/B (4 variants) | Top (acquisition) | Running |
| Booking Form A/B (3 vs 4 steps) | Mid (conversion) | Running |
| Schema.org markup | SEO | Done |
| Browse by Cuisine | Mid (consideration) | Done |
| Sticky CTA Bar | Mid (consideration) | **Implemented** |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Bar annoys users and increases bounce | Appears only after 400px scroll (genuine engagement signal); CompareBar coexists without conflict |
| Control variant is already strong | A/B test confirms whether urgency adds lift; if not, urgency is simply deactivated |
| Low click-through overall | Analytics will reveal if bar position or copy is wrong; no downside to measuring |

---

## Pre-Launch Validation Checklist

- [x] Sticky bar appears after 400px scroll (verified in dev)
- [x] Cookie-based assignment is deterministic (same user = same variant)
- [x] URL param override works for forced testing
- [x] `sticky_cta_click` event fires on button click
- [x] Bar z-index (40) is above CompareBar (no overlap)
- [x] Build passes with no errors
- [x] Committed to main branch

---

## Summary

**Growth idea:** Add a sticky CTA bar to `/chefs` that appears after 400px of scroll, with an A/B test comparing generic copy ("Ready to find your perfect chef?") vs. urgency copy ("Weekend slots are filling fast — book now to secure your date").

**Implementation:** 2 files changed — new `StickyCTABar.tsx` component + render in `/chefs/page.tsx`.

**Expected impact:** Urgency variant should increase CTA click-through rate by 15–25% vs. control, driving more users to the booking flow from the mid-consideration stage.

**Effort:** Low — single new component + one-line import/render.

**Owner:** Growth Marketer (implemented) → Fred to monitor via analytics

---

*Generated by Growth Marketer — MAI-2863*