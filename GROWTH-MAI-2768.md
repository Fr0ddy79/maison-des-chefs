# GROWTH-MAI-2768: Homepage Waitlist CTA Copy Test

**Created:** 2026-06-09 04:00 America/New_York
**Status:** Strategy
**Type:** Growth Optimization

## Context

Previous growth work covered:
- Hero CTA A/B test (3 variants) → ✅ Running
- Booking Form A/B test (simplified vs standard) → ✅ Running
- Schema.org markup → ✅ Implemented
- Social Proof Notifications → In Progress (MAI-2693)
- Urgency Badges on Chef Cards → Strategy (MAI-2654)
- Chef Profile Quick-View Modal → Strategy (MAI-2709)
- Exit Intent Popup → Proposed (MAI-2667)
- Mobile Sticky CTA → Proposed (MAI-2666)
- "What Happens Next" Trust Section → Strategy (MAI-2720)
- /chefs Primary CTA → Strategy (MAI-2732)
- Post-Booking Review Collection → Strategy (MAI-2748)
- Waitlist Social Proof Expansion → Strategy (MAI-2666)

This run identifies a new growth opportunity: **homepage waitlist form CTA copy optimization**.

---

## Growth Idea: Homepage Waitlist CTA Copy Test

### What

The waitlist capture form at the bottom of the homepage currently has weak, vague copy:
- **Headline:** "Stay in the Loop"
- **Subheadline:** "Get early access updates and chef announcements"
- **Button:** "Notify Me"

This copy doesn't give visitors a concrete reason to hand over their email. "Early access updates" is generic and doesn't differentiate from every other waitlist email.

**Proposed variants to test:**

| Variant | Headline | Subheadline | Button |
|---------|----------|-------------|--------|
| Control (current) | "Stay in the Loop" | "Get early access updates and chef announcements" | "Notify Me" |
| Variant A | "Be the First to Know" | "Get early access when we launch in your neighborhood" | "Notify Me" |
| Variant B | "Join the Movement" | "Be first to access Montreal's private chef marketplace" | "Join Now" |

Variant A focuses on **geographic exclusivity** ("your neighborhood") — implies localized launch.
Variant B focuses on **movement/exclusivity** ("Join the Movement") — FOMO angle.

### Why It Works

1. **Specificity beats vagueness** — "early access updates" could mean anything. "When we launch in your neighborhood" implies location-based expansion and creates anticipation.
2. **Button copy matters** — "Notify Me" is passive. "Join Now" is active and implies membership. A/B tests across industries show 5-15% lifts from button copy changes.
3. **Low effort, clear signal** — This is a text change only. If it works, it ships in minutes. If it doesn't, no engineering time is lost.
4. **Supports waitlist growth metric** — Higher waitlist conversion = larger launch email list = more initial bookings when platform launches fully.

### Where It Goes

The waitlist section at the bottom of `/` (homepage), inside the `WaitlistCapture` component. The section container has:
- Headline: "Stay in the Loop"
- Subheadline: "Get early access updates and chef announcements"
- `WaitlistCapture` component with "Notify Me" button

The test changes the text content only — no layout or structural changes.

---

## Expected Impact

| Metric | Current (Est.) | Expected | Lift |
|--------|-----------------|----------|------|
| Waitlist form conversion rate | ~1.5-2% (est.) | ~2-2.5% | +25-40% relative |
| Email capture rate (homepage visitors) | baseline | +20-30% | +20-30% |
| Button click rate | baseline | +10-15% | +10-15% |

**Estimated effort:** 15-30 min (text change, no engineering needed)
**Confidence:** Medium (copy change without design review may have mixed results)
**Time to impact:** Immediate after change

---

## Experiment Plan

### Phase 1: Implement (15-30 min)

**Option A: Quick text change (no A/B test)**
- Change headline to "Be the First to Know"
- Change subheadline to "Get early access when we launch in your neighborhood"
- Change button to "Join Now" or keep "Notify Me" (test separately)

**Option B: A/B test with traffic splitting (preferred)**
- Create 2 variants in the `WaitlistCapture` component
- Use a cookie or session-based assignment for consistent experience
- Track `waitlist_cta_variant` in analytics events
- Test for 7 days or until statistical significance

**Files:**
| File | Change |
|------|--------|
| `src/app/page.tsx` | Change static headline/subheadline text in waitlist section |
| `src/components/WaitlistCapture.tsx` | Add variant support for button copy testing |
| `src/lib/analytics.ts` | Add `waitlist_cta_variant` to event tracking |

### Phase 2: Measure (7 days post-launch)

- Google Analytics event: `waitlist_form_viewed`, `waitlist_form_submitted`
- Add `cta_variant` field to both events
- Primary: Waitlist form submission rate by variant
- Secondary: Bounce rate on homepage (ensure no negative impact)

### Phase 3: Iterate

- If Variant A wins → ship it
- If no clear winner → test "Join Now" vs "Notify Me" button copy only
- If control wins → try a different angle (social proof: "247 food lovers already joined")

---

## Differentiation from Other Growth Work

| Feature | Stage | Funnel Stage |
|---------|-------|--------------|
| Hero CTA A/B | ✅ Running | Top of funnel (acquisition) |
| Booking Form A/B | ✅ Running | Mid-funnel (conversion) |
| Social Proof Notifications | In Progress | Browse (social validation) |
| **Waitlist CTA Copy Test** | **This** | **Bottom of funnel (email capture)** |

All other growth work focuses on getting users TO the booking flow. This experiment focuses on capturing the **email address** of visitors who don't convert immediately — building the launch list for future growth.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Copy change doesn't resonate | Test 2 variants + control to identify direction |
| Lower conversion on specific variant | A/B test ensures we don't ship a losing variant |
| Copy feels "salesy" and hurts brand | Keep tone warm and exclusive, not discount-driven |

---

## Open Questions

1. **Fred's input needed:** Should the copy lean toward "exclusive access" (membership feel) or "be first to know" (information feel)?
2. **Button copy:** "Notify Me" (passive) vs "Join Now" (active) vs "Get Early Access" (benefit-driven)?
3. **Longer headline option:** "Join 247 Food Lovers Waiting for Launch" — uses social proof number inline. Higher information density but may feel pushy.
4. **Is there a current waitlist conversion rate to compare against?** (No GA data visible in codebase — this is an estimate)

---

## Summary

The homepage waitlist form is a high-traffic, low-conversion element with vague copy that doesn't compel action. Testing specific, benefit-driven copy ("Be the First to Know" / "Get early access when we launch in your neighborhood") against the current generic copy ("Stay in the Loop" / "Get early access updates") is a quick win that could significantly improve email capture rate.

This is the **lowest-effort growth experiment in the current queue** (15-30 min to implement) and builds the email list that will drive first-wave bookings when the platform launches fully.

**Estimated effort:** 15-30 minutes
**Expected impact:** +20-30% waitlist conversion rate
**Next step:** Fred approves → quick text change ships immediately, A/B test optional

---

*Generated by Growth Marketer — MAI-2768*