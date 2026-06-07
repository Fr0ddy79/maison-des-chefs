# GROWTH-MAI-2677: Urgency Messaging on Chef Cards

**Created:** 2026-06-07 16:00 UTC
**Status:** Strategy
**Type:** Growth Optimization

## Context

Previous growth work (MAI-2667, MAI-2666, MAI-2654, MAI-2646) covered:
- Mobile Sticky CTA Bar → Proposed
- Social Proof Expansion → Strategy
- Exit Intent Popup → Proposed
- Social Proof Notifications → In Progress (not yet built)
- Hero CTA A/B test (3 variants) → ✅ Running
- Booking form A/B test → ✅ Running
- Schema.org markup → ✅ Implemented

This run identifies a new growth opportunity: **Urgency messaging on chef listing cards**.

---

## Growth Idea: "Last Available" / Scarcity Signals on Chef Cards

### What

Add subtle urgency indicators to chef listing cards on `/chefs` — specifically:
1. **"Last available this week"** badge on chefs with only 1-2 open slots remaining
2. **"Booking up fast"** badge on chefs with high inquiry volume (top20% by inquiry count)
3. **"X spots left this month"** on chef cards with low availability

### Why It Works

1. **Scarcity drives action** — E-commerce and travel sites use availability signals because they work. "Only 2 left" converts.
2. **Dual urgency** — Both availability scarcity ("last slot") and popularity scarcity ("booking up fast") create urgency from different angles.
3. **Low friction** — These are informational badges, not aggressive popups. They help users make decisions faster.
4. **Complements the booking flow** — The inquiry system already has availability tracking; this surfaces that data at the browse stage.
5. **Industry benchmark** — Scarcity messaging can improve CTR by **10-20%** on listing pages.

### Where It Goes

Chef listing cards (`/chefs` page). Badges appear:
- Top-right corner of card image
- Color: accent or warm red/orange for urgency
- Text: short, clear (e.g., "Last slot this week", "Popular", "2 spots left")

---

## Expected Impact

| Metric | Current | Expected | Lift |
|--------|---------|----------|------|
| /chefs → booking form CTR | baseline | +10-15% | +10-15% |
| Card click-through rate | baseline | +8-12% | +8-12% |
| Inquiry submission rate | baseline | +5-8% | +5-8% |

**Estimated effort:** 3-4 hours (backend availability query + frontend badge component)
**Confidence:** Medium-High

---

## Experiment Plan

### Phase 1: Build (2-3 hours)

**Backend:**
- Extend `GET /api/availability` to return, per chef:
  - `slots_this_week` — count of unbooked slots in next 7 days
  - `inquiry_rank` — percentile rank of chef's inquiry volume (top 20% = "Popular")

**Frontend:**
- New `UrgencyBadge` component in `src/components/ui/UrgencyBadge.tsx`
- Three badge types:
  - `last_slot` — appears when `slots_this_week === 1`
  - `popular` — appears when chef is in top 20% by inquiry volume
  - `few_spots` — appears when `slots_this_week` is 2-3
- Display on chef cards in `/chefs` grid
- Badge text: "Last slot this week" | "Popular" | "2 spots left"

**Files:**
| File | Action |
|------|--------|
| `src/app/api/availability/route.ts` | Modify — add slot count + inquiry rank |
| `src/components/ui/UrgencyBadge.tsx` | Create — badge component |
| `src/app/chefs/page.tsx` | Modify — add UrgencyBadge to cards |

### Phase 2: Test (1 hour)

**A/B Test Design:**
- Control: No urgency badges on chef cards
- Variant: Urgency badges enabled
- Primary metric: Chef card click-through rate
- Secondary: Booking form view rate, inquiry submission rate
- Track: `urgency_badge_shown`, `urgency_badge_type`, `chef_card_clicked`

**Implementation:**
- Cookie-based variant assignment
- Run for 7 days or until statistical significance (95% confidence, min 500 visitors per variant)

### Phase 3: Ship (if positive)

- Roll out to 100% traffic
- Monitor /chefs → booking form conversion for 2 weeks
- Document badge type performance for future optimization

---

## Differentiation from Other Growth Work

| Feature | Stage | Focus |
|---------|-------|-------|
| Hero CTA A/B | ✅ Running | Homepage CTA copy |
| Booking Form A/B | ✅ Running | Booking flow friction |
| Social Proof Notifications | In Progress | Trust during browse |
| Mobile Sticky CTA | Proposed | Mobile CTA persistence |
| Exit Intent Popup | Proposed | Bounce recovery |
| **Urgency Badges** | **This** | **Decision acceleration on /chefs** |

The urgency badges are distinct from all other active/proposed work — they operate at the `/chefs` listing level, not the homepage or booking form. They accelerate the browse-to-card-click transition.

---

## Risks& Mitigations

| Risk | Mitigation |
|------|------------|
| Fake scarcity damages trust | Use real availability data from the `availability` table |
| Badge overload on cards | One badge per card max; priority: last_slot > popular > few_spots |
| Chefs with no availability data | Don't show badge if no data; degrades gracefully |
| Low availability data quality | Fallback: hide badges if<50% of listed chefs have availability data |

---

## Open Questions

1. **Data source:** Does the `availability` table have enough data to power these badges? (If chefs haven't set up availability, badges won't show — which is actually fine for MVP)
2. **Badge priority:** If a chef qualifies for multiple badges, which takes precedence? (Last slot > Popular > Few spots)
3. **Popularity metric:** Should "Popular" be based on total inquiries received, bookings completed, or something else?
4. **Mobile layout:** Do badges fit on mobile card thumbnails without obscuring the chef photo?

---

## Summary

Urgency messaging on chef listing cards addresses a specific gap in the current funnel: **users browse chefs but don't always click through**. Adding scarcity signals ("Last slot this week", "Popular") gives users a reason to act now rather than delay.

This is complementary to the Hero CTA A/B test (homepage level) and Booking Form A/B test (form level) — it works at the browse level where users are actively comparing options.

**Estimated effort:** 3-4 hours
**Expected impact:** +10-15% card CTR, +5-8% inquiry submissions
**Next step:** Backend Engineer extends availability API + Frontend Engineer builds UrgencyBadge component

---

*Generated by Growth Marketer — MAI-2677*
