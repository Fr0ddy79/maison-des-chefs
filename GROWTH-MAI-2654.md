# GROWTH-MAI-2654: Exit Intent Popup for Waitlist Capture

**Created:** 2026-06-07 04:00 UTC
**Status:** Proposed
**Type:** Growth Optimization

## Context

Previous growth work (GROWTH-MAI-2646) covered:
- Schema.org markup expansion → ✅ Implemented
- Chef recruitment CTA visibility → ✅ Implemented
- robots.txt + sitemap → ✅ Implemented
- Social Proof Notifications → In Progress

This run identifies a new growth opportunity: **Exit Intent Popup**.

---

## Growth Idea: Exit Intent Popup for Waitlist/CTA Capture

### What

Add an exit intent popup that triggers when a visitor shows signs of leaving the site without converting:
- **Desktop:** Mouse cursor moves toward browser top/tabs
- **Mobile:** Tab becomes hidden or visitor shows scroll-up-to-leave behavior

The popup offers a compelling reason to stay connected:
- "Before you go — get early access to our next chefs"
- Captures email for waitlist OR drives user to browse chefs immediately

### Why It Works

1. **Captures abandoning visitors** — Users who aren't ready to book yet can still join the community
2. **Non-intrusive for converters** — Only shows to users who haven't taken action
3. **Low friction** — Single email field, one-click dismiss
4. **Industry benchmark** — Exit intent popups convert at 2-5% on average for service marketplaces

### Where It Goes

- Full-screen overlay with semi-transparent backdrop
- Centered card with headline, value prop, email input, and CTA
- Close button (X) in top-right corner
- "No thanks" text link to dismiss without action
- Only triggers once per session (stored in sessionStorage)
- Only shows after15+ seconds on page (avoid annoying quick bounces)

---

## Expected Impact

| Metric | Current | Expected | Lift |
|--------|---------|----------|------|
| Email captures (waitlist) | baseline | +15-25 emails/week | +20-30% |
| CTA clicks (browse chefs) | baseline | +5-8% recovered | +5-8% |
| Overall waitlist growth | baseline | +25-35% | +25-35% |

**Estimated effort:** 3-4 hours (client component + session logic)
**Confidence:** Medium-High

---

## Experiment Plan

### Phase 1: Build (2 hours)

**Implementation:**
- New `ExitIntentPopup` client component
- Hook into `mouseenter` on document body (desktop) and `visibilitychange` (all devices)
- SessionStorage flag to prevent repeat triggering
- Delay of 15s before arming the popup
- Two CTA options: "Join Waitlist" (email capture) + "Browse Chefs Now" (direct navigation)
- "No thanks" dismiss link

**Files:**
| File | Action |
|------|--------|
| `src/components/ExitIntentPopup.tsx` | Create |
| `src/components/WaitlistCapture.tsx` | Reuse (already exists) |
| `src/app/page.tsx` | Modify — add `<ExitIntentPopup />` inside main layout |

### Phase 2: Test (1 hour)

**A/B Test Design:**
- Control: No exit intent popup
- Variant: Exit intent popup with email capture
- Primary metric: Waitlist email submissions
- Secondary: CTA button clicks (browse chefs)
- Track: `exit_intent_shown`, `exit_intent_dismissed`, `exit_intent_converted`

**Implementation:**
- Cookie-based variant assignment (consistent experience)
- Run for 7 days or until statistical significance (95% confidence, min 300 visitors per variant)

### Phase 3: Ship (if positive)

- Roll out to 100% traffic
- Monitor waitlist growth rate for2 weeks
- Document open/close rates for future popup experiments

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/ExitIntentPopup.tsx` | Create — exit intent client component |
| `src/app/page.tsx` | Modify — add `<ExitIntentPopup />` in layout |

---

## Differentiation from Social Proof Notifications (MAI-2646)

| Feature | Social Proof (MAI-2646) | Exit Intent (This) |
|---------|------------------------|-------------------|
| Trigger | Every 60s while on page | Visitor intent to leave |
| Goal | Build trust, create urgency | Capture abandoning visitors |
| Mechanic | Toast notification | Modal overlay |
| Audience | All new visitors | Non-converting visitors |
| Primary metric | CTA clicks | Email captures |

Both can run simultaneously without conflict.

---

## Risks& Mitigations

| Risk | Mitigation |
|------|------------|
| Popup feels annoying | 15s delay, one-per-session limit, easy dismiss |
| Low conversion rate | A/B test first, refine messaging based on data |
| Mobile mouse detection doesn't work | Use `visibilitychange` API instead for mobile |

---

## Open Questions

1. Should the popup offer a discount/incentive for joining waitlist? (e.g., "10% off your first booking")
2. Should we track which page the exit intent fired on? (homepage vs. chef listing vs. chef profile)
3. What's the fallback for users with JS disabled? (Currently: no popup — acceptable)

---

## Summary

Exit intent popups are a proven growth technique that captures value from visitors who would otherwise leave empty-handed. This implementation:
- Triggers on behavioral signals of abandonment (not on page load)
- Respects user experience (delay, one-per-session, easy dismiss)
- Offers dual CTA: waitlist capture OR immediate browse
- Can be A/B tested with clear success metrics
- Complements the Social Proof Notifications work in MAI-2646

**Next step:** Frontend Engineer builds ExitIntentPopup component.
