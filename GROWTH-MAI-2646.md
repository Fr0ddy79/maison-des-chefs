# GROWTH-MAI-2646: Social Proof Notifications

**Created:** 2026-06-06 22:00 UTC
**Status:** In Progress
**Type:** Growth Optimization

## Context

Previous growth work (GROWTH-MAI-2631) covered:
- Schema.org markup expansion → ✅ Implemented
- Chef recruitment CTA visibility → ✅ Implemented
- robots.txt + sitemap → ✅ Implemented

This run identified a new growth opportunity: **Social Proof Notifications**.

---

## Growth Idea: Live Booking Activity Notifications

### What

Add a subtle notification toast that appears periodically showing recent booking activity:
- "Someone in Westmount just booked a chef for this Saturday"
- "A private dinner for 6 was just confirmed in Old Montreal"
- "Chef Laurent received a new booking request"

### Why It Works

1. **Social validation** — Shows the product is actively used and trusted
2. **Urgency** — Creates mild scarcity pressure ("others are booking")
3. **Geographic relevance** — Mentions real Montreal neighborhoods
4. **Low friction** — Non-intrusive, fades naturally

Industry benchmarks show social proof notifications can improve conversion rates by **8-15%** on service marketplaces.

### Where It Goes

- Bottom-left corner toast, appears every 45-60 seconds
- Auto-dismisses after 5 seconds
- Does not interrupt user flow
- Only shows for new visitors (not returning)

---

## Expected Impact

| Metric | Current | Expected | Lift |
|--------|---------|----------|------|
| Landing page conversion | ~2-3% (est.) | ~2.3-3.5% | +8-15% |
| CTA click-through | baseline | +10% | +10% |
| Booking submissions | baseline | +5-8% | +5-8% |

**Estimated effort:** 4-6 hours (API endpoint + client component)
**Confidence:** Medium-High

---

## Experiment Plan

### Phase 1: Build (2-3 hours)

**Backend:**
- New endpoint `GET /api/recent-activity` 
- Returns last 5 anonymized bookings/inquiries from past 24h
- Fields: location (neighborhood only), time_ago, party_size (optional), event_type

**Frontend:**
- New `SocialProofToast` component
- Polls `/api/recent-activity` every 60 seconds
- Displays one notification at a time with slide-in animation
- Only shows for users with no session cookie (new visitors)

### Phase 2: Test (1-2 hours)

**A/B Test Design:**
- Control: No social proof toast
- Variant: Social proof toast enabled
- Primary metric: CTA button clicks
- Secondary: Booking inquiry submissions

**Implementation:**
- Cookie-based variant assignment (consistent experience)
- Track `social_proof_toast_shown` in analytics events
- Run for 7 days or until statistical significance (95% confidence, min 500 visitors)

### Phase 3: Ship (if positive)

- Roll out to 100% traffic
- Monitor conversion rate for 2 weeks
- Document learnings for future social proof experiments

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/app/api/recent-activity/route.ts` | Create - returns anonymized recent activity |
| `src/components/SocialProofToast.tsx` | Create - toast component with polling |
| `src/app/page.tsx` | Modify - add `<SocialProofToast />` inside main layout |
| `src/middleware.ts` | Modify - add variant assignment for A/B test |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Notifications feel spammy | Keep subtle, 5s display, muted styling |
| No recent bookings to show | Fallback to static message: "247 dinners booked" |
| Performance impact from polling | Debounce, cache endpoint, minimal re-renders |

---

## Open Questions

1. Should we show inquiries or only confirmed bookings? (Confirmed is stronger social proof)
2. Do we need a "pause" button for users who find it annoying?
3. What's the fallback message if no recent activity exists?

---

## Summary

Social proof notifications are a proven growth technique for marketplace products. This implementation:
- Creates urgency without being pushy
- Uses real Montreal geographic references for authenticity
- Can be A/B tested with clear success metrics
- Has fallback for low-activity periods

**Next step:** Backend Engineer picks up API endpoint + Frontend Engineer builds toast component.