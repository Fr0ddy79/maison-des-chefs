# GROWTH-MAI-2709: Chef Profile Quick-View Modal — Reduce Browse-to-Detail Friction

**Created:** 2026-06-08 08:00 UTC
**Status:** Strategy
**Type:** Growth Optimization

## Context

Previous growth work (MAI-2693, MAI-2677, MAI-2667, MAI-2666, MAI-2654, MAI-2646) covered:
- Urgency Badges on Chef Cards → Strategy
- Mobile Sticky CTA → Proposed
- Social Proof Expansion → Strategy
- Exit Intent Popup → Proposed
- Social Proof Notifications → In Progress
- Hero CTA A/B test (3 variants) → ✅ Running
- Booking Form A/B test (simplified) → ✅ Running
- Schema.org markup → ✅ Implemented
- WaitlistCapture replacement → Strategy

This run identifies a new growth opportunity: **Chef Profile Quick-View Modal** on the /chefs listing page.

---

## Growth Idea: Add Quick-View Modal to Chef Cards on /chefs Listing

### What

Add a "Quick View" button to each chef card on the `/chefs` listing page. When clicked, a modal opens showing:
- Chef hero image + name + location
- Star rating + review count
- Top3 cuisines
- Price range
- Services offered (as badges)
- Short bio excerpt (2-3 lines)
- "Book This Chef" primary CTA
- "View Full Profile" secondary link

**Users can evaluate a chef and start a booking without leaving the /chefs page.**

### Why It Works

1. **Reduces friction in the browse→inquiry funnel** — Currently, a user who wants to learn about a chef must navigate to a full profile page, then find their way back to start an inquiry. Quick-view keeps them in the listing context.
2. **Keeps users in flow state** — Bouncing between listing and profile pages breaks concentration. A modal lets users compare multiple chefs without losing context.
3. **Enables "micro-conversions"** — Even a click on Quick-View is an engagement signal. Users who open Quick-View are warm leads.
4. **Complements urgency badges** — When a user sees a "Last slot this week" badge AND can Quick-View to start a booking in one click, conversion likelihood increases.
5. **Industry benchmark** — E-commerce sites (Amazon, Wayfair) use Quick-View extensively because it reduces drop-off from product listing to product detail.

### Where It Goes

Each chef card on `/chefs` gets a "Quick View" button (eye icon or text link). Clicking opens a modal overlay with the chef summary.

---

## Expected Impact

| Metric | Current | Expected | Lift |
|--------|---------|----------|------|
| /chefs → booking form starts | baseline | +15-20% | +15-20% |
| Chef card click-through (full profile) | baseline | -10-15% (fewer full navigations) | -10-15% |
| Overall /chefs engagement | baseline | +20-30% | +20-30% |
| Modal → booking form CTR | baseline | +25-35% | +25-35% |

**Estimated effort:** 3-4 hours (new modal component + integration)
**Confidence:** Medium-High

---

## Experiment Plan

### Phase 1: Build (2-3 hours)

**Implementation:**
- New `ChefQuickViewModal.tsx` client component
- Triggered by "Quick View" button on each chef card
- Modal shows: hero image, name, location, rating, cuisines, price, services, bio excerpt, CTA buttons
- Uses existing data from the chef card (no new API calls needed)
- `aria-modal` for accessibility
- Closes on ESC key and backdrop click
- Tracks `quick_view_opened`, `quick_view_cta_clicked` analytics events

**Files:**
| File | Action |
|------|--------|
| `src/components/ChefQuickViewModal.tsx` | Create — modal component |
| `src/app/chefs/page.tsx` | Modify — add Quick View button to cards, wire up modal state |

### Phase 2: Test (1 hour)

**A/B Test Design:**
- Control: No Quick View button (existing experience)
- Variant: Quick View button enabled on chef cards
- Primary metric: `/chefs` → booking form view rate
- Secondary: Time on /chefs page, modal open rate
- Track: `quick_view_shown`, `quick_view_opened`, `quick_view_primary_cta_clicked`, `quick_view_secondary_cta_clicked`

**Implementation:**
- Cookie-based variant assignment (`ab_quickview_variant`)
- Run for 7 days or until statistical significance (95% confidence, min 500 visitors per variant)

### Phase 3: Ship (if positive)

- Roll out to100% traffic
- Monitor booking form starts from /chefs for 2 weeks
- Document open rates and CTA click rates

---

## Differentiation from Other Growth Work

| Feature | Stage | Focus |
|---------|-------|-------|
| Hero CTA A/B | ✅ Running | Homepage CTA copy |
| Booking Form A/B | ✅ Running | Booking flow friction |
| Urgency Badges | Strategy | Scarcity signals on /chefs |
| Mobile Sticky CTA | Proposed | Mobile CTA persistence |
| **Quick-View Modal** | **This** | **Browse→inquiry friction reduction** |

The Quick-View Modal is distinct from urgency badges (which are passive signals) — it's an active interaction that reduces the steps between browsing and booking.

---

## Risks& Mitigations

| Risk | Mitigation |
|------|------------|
| Modal feels like a popup ad | Tasteful design, no animations beyond fade-in, clear close button |
| Users prefer full profile pages | Keep both options — Quick View AND "View Full Profile" link |
| Accessibility issues | Use `aria-modal`, focus trap, keyboard navigation (ESC to close) |
| Performance impact | Modal is client-only, no new API calls, lazy state initialization |

---

## Open Questions

1. **Modal content:** Should we include availability status in the Quick View? (If a chef has "Last slot this week" from urgency badges, showing it in the modal would strengthen the urgency signal)
2. **Mobile behavior:** Should Quick View open as a bottom sheet on mobile instead of a centered modal?
3. **Secondary CTA:** Should "View Full Profile" in the modal link directly to the booking form on the chef's profile page?

---

## Summary

The Quick-View Modal addresses a specific friction point in the browse→inquiry funnel: **users must navigate away from the listing to learn about a chef**. Adding a modal that shows key chef info and a booking CTA keeps users in the listing context, reduces steps to conversion, and enables "micro-conversions" (engagement signals) even when users don't immediately book.

This complements the urgency badge strategy (MAI-2677) — the badge creates urgency, the Quick-View modal captures it with a direct booking CTA.

**Estimated effort:** 3-4 hours
**Expected impact:** +15-20% booking form starts from /chefs
**Next step:** Frontend Engineer builds ChefQuickViewModal component

---

*Generated by Growth Marketer — MAI-2709*
