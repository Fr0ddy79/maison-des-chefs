# GROWTH-MAI-2667: Mobile Sticky CTA Bar

**Created:** 2026-06-07 10:00 UTC
**Status:** Proposed
**Type:** Growth Optimization

## Context

Previous growth work (GROWTH-MAI-2654) covered:
- Exit Intent Popup for Waitlist Capture → Proposed
- Social Proof Notifications → In Progress
- Schema.org markup expansion → ✅ Implemented
- Hero CTA A/B test (3 variants) → ✅ Running

This run identifies a new growth opportunity: **Mobile Sticky CTA Bar**.

---

## Growth Idea: Sticky Mobile CTA for Persistent Booking CTA

### What

Add a fixed bottom-of-screen CTA bar on mobile devices that persists as users scroll the landing page. The bar shows the primary CTA ("Find Your Chef →") and appears after the user scrolls past the hero section.

### Why It Works

1. **Persistence** — Desktop users see the CTA in the hero and can always navigate. Mobile users scroll down and lose access to the primary action.
2. **Zero friction** — Single tap sends user directly to `/chefs` listing page.
3. **Non-intrusive** — Only appears after scrolling past hero (not on initial load), avoids annoying users who haven't even seen the page.
4. **Industry benchmark** — Sticky mobile CTAs can improve mobile conversion rates by **10-20%** on content-heavy landing pages.

### Where It Goes

- Fixed position, bottom of viewport
- Full-width bar with centered CTA button
- Appears after scrolling100vh (past hero section)
- Dismisses when user is near bottom of page (last20%)
- Only on mobile (CSS media query or JS detection)
- z-index below modals but above content

---

## Expected Impact

| Metric | Current (Mobile) | Expected | Lift |
|--------|-----------------|----------|------|
| Mobile → /chefs navigation rate | baseline | +12-18% | +12-18% |
| Overall mobile conversion | ~2-3% (est.) | ~2.4-3.5% | +10-20% |
| Bounce rate (mobile) | baseline | -5-8% | -5-8% |

**Estimated effort:** 2-3 hours (single component + scroll detection)
**Confidence:** Medium-High

---

## Experiment Plan

### Phase 1: Build (1.5 hours)

**Implementation:**
- New `StickyMobileCTA` client component
- Uses `IntersectionObserver` or scroll position to detect when hero is scrolled past
- CSS `position: fixed; bottom: 0` with slide-up animation
- Only renders on mobile (via CSS `display: none` on desktop or JS detection)
- Single CTA: "Find Your Chef →" linking to `/chefs`
- Dismisses when user scrolls to bottom 20% of page
- Shows once per session (sessionStorage flag)

**Files:**
| File | Action |
|------|--------|
| `src/components/StickyMobileCTA.tsx` | Create |
| `src/app/page.tsx` | Modify — add `<StickyMobileCTA />` inside main layout |

### Phase 2: Test (1 hour)

**A/B Test Design:**
- Control: No sticky CTA (existing mobile experience)
- Variant: Sticky mobile CTA bar enabled
- Primary metric: Mobile traffic to `/chefs` page
- Secondary: Mobile booking inquiry submissions
- Track: `sticky_cta_shown`, `sticky_cta_clicked`, `sticky_cta_dismissed`

**Implementation:**
- Cookie-based variant assignment (consistent experience)
- Run for 7 days or until statistical significance (95% confidence, min 300 mobile visitors per variant)

### Phase 3: Ship (if positive)

- Roll out to 100% mobile traffic
- Monitor mobile conversion rate for 2 weeks
- Document open/click rates for future mobile optimization experiments

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/StickyMobileCTA.tsx` | Create — sticky mobile CTA client component |
| `src/app/page.tsx` | Modify — add `<StickyMobileCTA />` inside main layout (bottom of div) |

---

## Differentiation from Existing CTAs

| CTA Location | Device | Behavior | Status |
|-------------|--------|----------|--------|
| Hero CTA | All | Visible in hero section, disappears on scroll | ✅ Running A/B |
| Navigation "Browse Chefs" | Desktop | Sticky nav, always visible | ✅ Existing |
| Sticky Mobile CTA | Mobile only | Appears after hero scroll, fixed bottom | ✏️ This proposal |
| Experience card links | All | Clickable cards throughout page | ✅ Existing |

The sticky mobile CTA fills the gap for mobile users specifically — desktop has the sticky nav, but mobile users lose the hero CTA once they scroll.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Annoying if shows too early | Only triggers after scrolling 100vh (past hero) |
| Covers content at bottom | Auto-dismisses when near bottom 20% of page |
| Covers footer/navigation | Add bottom padding equal to CTA height |
| Low click-through | A/B test first, keep design minimal |

---

## Open Questions

1. Should the sticky CTA show a secondary action like "Join Waitlist" as well? (Would make it wider)
2. Should we track which section the user was in when they clicked the sticky CTA? (hero vs. testimonials vs. how-it-works)
3. What's the fallback for users with JS disabled? (Currently: no sticky CTA — acceptable)

---

## Summary

Mobile users currently have a degraded experience compared to desktop — the primary CTA is only visible in the hero section. This proposal adds a sticky bottom CTA bar that:
- Appears after scrolling past the hero
- Persists as users scroll through the landing page
- Captures mobile users who are engaged but haven't taken action
- Can be A/B tested with clear success metrics
- Complements the existing Hero CTA A/B test running on desktop

**Next step:** Frontend Engineer builds StickyMobileCTA component.
