# GROWTH-MAI-2732: Add Primary CTA to /chefs Listing Page Header

**Created:** 2026-06-08 12:00 America/New_York
**Status:** Strategy
**Type:** Growth Optimization

## Context

Previous growth work covered:
- Hero CTA A/B test (3 variants) → ✅ Running
- Booking Form A/B test (simplified vs standard) → ✅ Running
- Schema.org markup → ✅ Implemented
- Urgency Badges on Chef Cards → Strategy (MAI-2654)
- Chef Profile Quick-View Modal → Strategy (MAI-2709)
- Social Proof Notifications → In Progress (MAI-2693)
- Social Proof Expansion → Strategy (MAI-2677)
- Exit Intent Popup → Proposed (MAI-2667)
- Mobile Sticky CTA → Proposed (MAI-2666)
- "What Happens Next" Trust Section → Strategy (MAI-2720)
- Waitlist → Soft CTA replacement → Strategy (MAI-2646)

This run identifies a new growth opportunity: **adding a primary CTA to the /chefs listing page**.

---

## Growth Idea: "Book a Chef" CTA in /chefs Page Header

### What

Add a prominent "Book a Chef" call-to-action button in the `/chefs` listing page header, above the chef grid. This gives users a clear, direct path to start booking without needing to first click into a specific chef profile.

**Current state of /chefs header:**
```
Our Chefs
Discover Montreal's finest private chefs for your next dining experience
```

**Proposed state:**
```
Our Chefs                                           [Book a Chef →]
Discover Montreal's finest private chefs for your next dining experience
```

The CTA anchors to `/chefs` listing (no filter) so all chefs are in scope. Clicking it could:
- **Option A (simpler):** Scrolls to the chef grid (lowest friction, no page change)
- **Option B (more actionable):** Opens a chef discovery modal or pre-fills the booking form with default values
- **Option C (recommended):** Anchors to grid + shows a tooltip "Browse a chef and click Book on their profile to get started" — guides users without adding new pages

### Why It Works

1. **Captures high-intent users earlier** — Some visitors arrive at /chefs already ready to book. They shouldn't need to click into a profile first. The CTA gives them an acknowledged entry point.
2. **Reduces "browse paralysis"** — A prominent CTA signals "it's easy to book here." Anonymous browsers who feel overwhelmed may be converted by a clear action cue.
3. **Primes the booking mindset** — Even if users don't click immediately, seeing the CTA frames /chefs as a booking destination, not just a research tool.
4. **Industry benchmark** — E-commerce product listing pages always have "Shop Now" / "Add to Cart" CTAs. Marketplace listings (Airbnb, Rover, TaskRabbit) have prominent booking CTAs.
5. **Complements urgency badges** — When users see "Only 2 slots left this week" on a chef card AND a "Book a Chef" CTA at the top, the urgency signal has a clear action to attach to.

### Where It Goes

Above the chef grid on `/chefs`, right-aligned in the header row alongside the "X chefs found" counter.

---

## Expected Impact

| Metric | Current | Expected | Lift |
|--------|---------|----------|------|
| /chefs → booking form start rate | baseline | +10-15% | +10-15% |
| /chefs bounce rate | baseline | -5-8% | -5-8% |
| CTA click-through rate | N/A | ~2-4% of visitors | New signal |
| Overall booking inquiries/week | baseline | +8-12% | +8-12% |

**Estimated effort:** 1 hour (small UI addition)
**Confidence:** Medium (no existing CTA to compare against, baseline is 0)

---

## Experiment Plan

### Phase 1: Build (30-60 min)

**Implementation:**
- Modify `src/app/chefs/page.tsx` — add "Book a Chef" button in the header row
- Right-aligned, primary gold button style (`var(--color-mdc-accent)` background)
- Label: "Book a Chef" with arrow icon
- On click: scroll to chef grid + show a one-time tooltip bubble "Found your chef? Click Book on their card to get started"

**Files:**
| File | Action |
|------|--------|
| `src/app/chefs/page.tsx` | Modify — add CTA button to header |

### Phase 2: Measure (2 weeks post-launch)

- Google Analytics event: `chefs_page_cta_clicked`
- Primary: `/chefs` → `/book` conversion rate (booking form starts from /chefs referrer)
- Secondary: Bounce rate on /chefs, time on page, CTA click rate
- Compare 2 weeks before vs 2 weeks after

### Phase 3: Iterate (if positive)

- If CTA click rate is high but booking form starts don't increase → CTA is helping discovery but not conversion → try Option C (tooltip guiding to profile booking)
- If both metrics increase → CTA is working as expected
- Consider adding a secondary CTA for chef-side: "Are You a Chef? Join Us"

---

## Differentiation from Other Growth Work

| Feature | Stage | Funnel Stage |
|---------|-------|--------------|
| Hero CTA A/B | ✅ Running | Top of funnel (homepage) |
| Booking Form A/B | ✅ Running | Mid-funnel (booking flow) |
| Urgency Badges | Strategy | /chefs listing (scarcity signal) |
| Quick-View Modal | Strategy | /chefs listing (friction reduction) |
| **/chefs Primary CTA** | **This** | **/chefs listing (action signal)** |

This is a simple action signal on the /chefs listing page, distinct from the Hero CTA (homepage), Booking Form A/B (conversion), and other /chefs improvements that focus on reducing friction or adding information.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| CTA without clear destination confuses users | Add tooltip on click explaining "browse chefs, then click Book on their card" |
| Low click rate because users still need to pick a chef | The CTA is for users already in research mode — it validates their intent |
| Doesn't actually increase bookings | A/B test with GA events to isolate impact |

---

## Open Questions

1. **Fred's input needed:** Should the CTA anchor to the chef grid (scroll) or link somewhere else?
2. **Tooltip copy:** What messaging would be clearest for the tooltip? "Select any chef and click Book on their profile to get started"?
3. **Chef-side CTA:** Should there be a matching "Join as a Chef" link for prospective chef visitors?

---

## Summary

The `/chefs` listing page is the highest-traffic page after the homepage but has **no primary CTA**. Every other step in the funnel (homepage, chef profile, booking form) has clear calls-to-action. Adding a "Book a Chef" CTA to the /chefs header gives high-intent users a direct action cue and frames the page as a booking destination, not just a research tool.

This is the lowest-effort growth experiment in the current queue (30-60 min to implement) and provides a new GA event signal for measuring /chefs → booking conversion.

**Estimated effort:** 30-60 minutes
**Expected impact:** +10-15% /chefs → booking form start rate
**Next step:** Fred approves → Frontend Engineer implements

---

*Generated by Growth Marketer — MAI-2732*