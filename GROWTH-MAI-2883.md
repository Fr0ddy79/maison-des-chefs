# GROWTH-MAI-2883: Booking Confirmation Trust Reinforcement — A/B Test

**Created:** 2026-06-11 06:00 America/New_York
**Status:** Todo
**Type:** Growth Optimization

## Context

**Funnel Stage:** Post-conversion (page = `/book`, after form submission)
**Problem identified:** When a diner successfully submits a booking inquiry, they land on a success state that shows "what happens next" but lacks social proof, trust reinforcement, or a next step. At this moment — highest intent, highest engagement — there's no reinforcing message that builds confidence in the decision they just made.

**What existed:**
- Booking form success state: checkmark + numbered next-steps + email confirmation mention
- No testimonial, no social proof count, no cross-sell, no share/referral prompt

**Gap:** Post-submission is a wasted trust moment. The diner just committed to a booking request — this is the perfect time to reinforce confidence and plant seeds for re-engagement.

---

## What to Implement

### Booking Confirmation Trust Reinforcement

Below the existing "What Happens Next" section, add a compact trust reinforcement block and a cross-sell prompt.

**Two variants (50/50 cookie-based split):**

| Variant | Name | Content |
|---------|------|---------|
| `social_proof` | Social proof | Stats bar + 1 testimonial + share prompt |
| `cross_sell` | Cross-sell | "Browse more chefs" + "Plan another event" + referral nudge |

**`social_proof` variant:**
```
[Stats bar: "247 dinners booked • 50+ verified chefs • 4.9 avg rating"]
[Testimonial: pull 1 recent review with star rating]
[Prompt: "Know someone hosting? Share Maison des Chefs →"]
```

**`cross_sell` variant:**
```
[Prompt: "Your event is in good hands. Browse more chefs for your next gathering."]
[Card 1: "Planning a larger celebration?" → link to /chefs?service_type=celebration]
[Card 2: "Gift a private chef experience" → link to /chef/apply (chef signup)]
```

### Implementation Details

- Cookie `ab_confirmation_variant`, 30-day expiry, deterministic
- URL param override for testing (`?confirmation_variant=social_proof|cross_sell`)
- `confirmation_variant_view` event fired on render with variant field
- `confirmation_cross_sell_click` event on cross-sell card clicks
- `confirmation_share_click` event on share prompt clicks

### Files to Change

| File | Change |
|------|--------|
| `src/app/book/BookPageContent.tsx` | Add confirmation variant block below "What Happens Next" (~80 lines) |

---

## Why This Works

1. **Highest-intent moment** — A user who just submitted a booking is maximally engaged; every additional impression at this moment has outsized impact
2. **Reduces post-submission anxiety** — "What happens next" is functional but doesn't answer "Did I make the right choice?" Social proof does that
3. **Lays groundwork for referrals** — The `social_proof` variant plants a share prompt at the moment of delight, which is the ideal referral trigger
4. **Opens re-engagement path** — The `cross_sell` variant gives the user a reason to return to the platform immediately vs. waiting passively for chef confirmation

---

## Experiment Plan

### Phase 1: Measure (7–14 days)

- **Primary metric:** `confirmation_cross_sell_click` + `confirmation_share_click` combined = post-confirmation engagement rate
- **Secondary metric:** Return visits within 7 days from confirmed booking users
- **Secondary metric:** `/chefs` pageviews attributed to confirmation variant clicks
- **Guardrail metric:** Booking form submission rate (ensure no negative impact on form completion)

**To force a variant:**
- Social proof: `/book?confirmation_variant=social_proof`
- Cross-sell: `/book?confirmation_variant=cross_sell`

**To reset assignment:**
```javascript
document.cookie = 'ab_confirmation_variant=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
```

### Phase 2: Iterate

- If social proof wins on engagement → add more testimonials, test star-rating prominence
- If cross-sell wins → add more event-type cards, test "Gift" vs "Refer" framing
- If combined engagement is high but bookings don't follow → variant is driving platform engagement but not revenue; iterate on CTA copy
- If neither variant shows lift → test reducing the block size (currently too prominent?)

---

## Funnel Stage Coverage

| Stage | Existing | New Addition |
|-------|----------|--------------|
| **Acquisition** | Hero CTA (4 variants), SEO schema | — |
| **Consideration** | Service-type links, Featured Chefs, Browse by Cuisine, Sticky CTAs | — |
| **Conversion** | Booking form A/B test | **Confirmation Trust Reinforcement** |
| **Post-Conversion** | None | **social_proof / cross_sell variants** |

---

## Differentiation from Previous Growth Work

| Experiment | Funnel Stage | Status |
|------------|--------------|--------|
| Hero CTA A/B (4 variants) | Top (acquisition) | Running |
| Booking Form A/B (3 vs 4 steps) | Mid (conversion) | Running |
| Schema.org markup | SEO | Done |
| Browse by Cuisine | Mid (consideration) | Done |
| Sticky CTA Bar (`/chefs`) | Mid (consideration) | Done |
| Chef Profile Sticky CTA (mobile) | Mid (consideration) | Done |
| **Confirmation Trust Reinforcement** | Post-conversion | **Todo** |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Confirmation page feels cluttered with variant block | Test both variants against a `none` control (no block added) — if control wins, just don't add it |
| Cross-sell card competes with "wait for chef confirmation" anxiety | Use low-pressure copy; cross-sell is additive, not required action |
| Low click-through on either variant | Analytics will reveal; low risk — no change to core booking flow |

---

## Implementation Checklist

- [ ] Add `useConfirmationVariant` hook (cookie-based, URL override, analytics event on view)
- [ ] Build `ConfirmationTrustBlock` component with `social_proof` and `cross_sell` variants
- [ ] Render below "What Happens Next" in `BookPageContent.tsx` only when `submitState === 'success'`
- [ ] Fire `confirmation_variant_view` on mount
- [ ] Fire `confirmation_cross_sell_click` on cross-sell card clicks
- [ ] Fire `confirmation_share_click` on share prompt clicks
- [ ] Build passes with no errors
- [ ] Commit to main branch

---

## Summary

**Growth idea:** Add a trust reinforcement + cross-sell block to the booking confirmation state (`/book` page, post-submission). A/B test two variants — `social_proof` (stats + testimonial + share prompt) vs. `cross_sell` (browse more chefs + plan another event) — to drive post-confirmation engagement and lay groundwork for referrals.

**Expected impact:** +5–10% increase in post-confirmation engagement (clicks on cross-sell/share prompts); measurable lift in return visits from confirmed booking users within 7 days.

**Effort:** Low — new hook + one component + ~20 lines in BookPageContent.tsx.

**Owner:** Growth Marketer → Backend/Frontend if implementation needed

---

*Generated by Growth Marketer — MAI-2883*