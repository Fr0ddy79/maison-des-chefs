# GROWTH-MAI-2890: Compare Page Summary CTA — A/B Test

**Created:** 2026-06-11 12:00 America/New_York
**Status:** Todo
**Type:** Growth Optimization

## Context

**Funnel Stage:** Mid-funnel / consideration (page = `/compare`)
**Problem identified:** Users who reach `/compare` are among the highest-intent visitors — they've browsed chefs, narrowed down to 2–4 options, and are actively evaluating. But the `/compare` page offers no clear conversion path: it's a pure information table with small "Book Now" links at the bottom of each chef column. There's no summary, no recommendation, and no prominent CTA to drive the user to a decision and booking.

**What existed:**
- Side-by-side chef comparison table: photo, name, location, rating, cuisines, price, experience, max guests, bio, services
- "Book Now" links at the bottom of each column — buried in a table, no prominence
- No A/B testing infrastructure on the compare page
- No urgency messaging or social proof

**Gap:** The compare page is a decision-support tool but not a conversion tool. High-intent users leave without a clear next step.

---

## What to Implement

### CompareSummaryCTA Component

A summary header that appears above the comparison table, highlighting the top recommended chef with a direct booking CTA.

**Two variants (50/50 cookie-based split):**

| Variant | Name | Content |
|---------|------|---------|
| `control` | None | No summary block added — pure comparison table |
| `summary_cta` | Summary + CTA | Summary bar with top chef recommendation + "Book [Chef] →" button |

**`summary_cta` variant content:**
```
[Summary block — full width, above table]
Left: "You're comparing {N} chefs" + "Top pick: {ChefName} — {rating} stars, ${price}"
Right: Primary "Book {ChefName} →" CTA button
Below: compact row with all N chefs as clickable pills (photo + name + price)
```

The "top chef" is determined by: highest avg_rating, then highest review_count (deterministic for the set of chefs being compared).

### Implementation Details

- Cookie `ab_compare_summary_variant`, 30-day expiry, deterministic
- URL param override (`?compare_summary_variant=summary_cta`)
- `compare_summary_view` event fired on render with `variant` field
- `compare_summary_cta_click` event on primary "Book" CTA click (includes `chef_id`)
- `compare_summary_chef_click` event on chef pill clicks

### Files to Change

| File | Change |
|------|--------|
| `src/lib/useCompareSummaryVariant.ts` | New hook (~40 lines, mirrors useABVariant pattern) |
| `src/components/compare/CompareSummaryCTA.tsx` | New component (~100 lines) |
| `src/app/compare/page.tsx` | Import and render `<CompareSummaryCTA />` below the header |

---

## Why This Works

1. **Captures peak-intent users** — Compare page visitors have done research; they're 1 step from booking. A clear CTA converts the intent into action.
2. **Reduces decision fatigue** — "Top pick" gives the user a default choice, anchoring the decision rather than leaving them paralyzed between equal options.
3. **Direct booking path** — The primary CTA goes directly to `/book?chef_id={topChefId}`, skipping the chef selection step on the booking form.
4. **Leverages existing data** — The top-chef logic uses `avg_rating` + `review_count` already fetched for the table; no new data needed.
5. **Analytics-ready** — Three new events track views, primary CTA clicks, and pill clicks independently.

---

## Experiment Plan

### Phase 1: Measure (7–14 days)

- **Primary metric:** `compare_summary_cta_click` rate = clicks / unique compare page visits
  - Query: `SELECT variant, COUNT(*) FROM analytics_events WHERE event_name='compare_summary_cta_click' AND created_at > NOW() - INTERVAL '7 days' GROUP BY variant`
- **Secondary metric:** `/book` pageviews attributed to compare page (compare_page → book page conversion rate)
- **Secondary metric:** Inquiry submissions from compare page referrers
- **Guardrail metric:** `/compare` page bounce rate (ensure no negative impact); CompareBar usage rate (ensure CompareBar isn't displaced)

**To force a variant:**
- Summary CTA: `/compare?chefs=id1,id2&compare_summary_variant=summary_cta`
- Control: `/compare?chefs=id1,id2&compare_summary_variant=control`

**To reset assignment:**
```javascript
document.cookie = 'ab_compare_summary_variant=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
```

### Phase 2: Iterate

- If summary_cta wins (>10% lift in compare→book conversion) → ship as default, test new CTA copy
- If no difference → test different CTA positioning (below table vs. floating bottom-right)
- If pill clicks dominate → users want to review individual chefs; consider adding "View Profile" as primary action
- If click-through is high but bookings don't follow → investigate booking flow drop-off from compare referrer

---

## Funnel Stage Coverage

| Stage | Existing | New Addition |
|-------|----------|--------------|
| **Acquisition** | Hero CTA (4 variants), SEO schema | — |
| **Consideration** | Service-type links, Featured Chefs, Browse by Cuisine, Sticky CTA Bar, Chef Profile Sticky CTA | **Compare Page Summary CTA** |
| **Conversion** | Booking form A/B test | — |
| **Post-Conversion** | None | — |

---

## Differentiation from Previous Growth Work

| Experiment | Funnel Stage | Status |
|------------|--------------|--------|
| Hero CTA A/B (4 variants) | Top (acquisition) | Running |
| Booking Form A/B (3 vs 4 steps) | Mid (conversion) | Running |
| Schema.org markup | SEO | Done |
| Browse by Cuisine | Mid (consideration) | Done |
| Sticky CTA Bar (`/chefs`) | Mid (consideration) | Implemented |
| Chef Profile Sticky CTA (mobile) | Mid (consideration) | Implemented |
| **Compare Page Summary CTA** | Mid (consideration) | **Todo** |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Summary block competes with the table for attention | Control variant is "no block added" — if control wins on any metric, just don't ship it |
| "Top pick" might feel arbitrary or wrong to users | Uses deterministic formula (rating + review_count) that matches displayed data; users can see the same logic in the table |
| Low click-through on summary CTA | Analytics will reveal; "Book {Name} →" personalized CTA has historically outperformed generic in other tests |
| CompareBar usage drops | CompareBar is still functional; summary CTA is additive, not a replacement |

---

## Implementation Checklist

- [ ] Create `useCompareSummaryVariant` hook (cookie-based, URL override, ~40 lines)
- [ ] Build `CompareSummaryCTA` component with `summary_cta` + `control` variants (~100 lines)
- [ ] Import and render in `src/app/compare/page.tsx` below header
- [ ] Fire `compare_summary_view` on mount
- [ ] Fire `compare_summary_cta_click` on primary CTA click
- [ ] Fire `compare_summary_chef_click` on chef pill clicks
- [ ] Build passes with no errors
- [ ] Commit to main branch

---

## Summary

**Growth idea:** Add a "Top Pick" summary header above the `/compare` table with a prominent "Book [ChefName] →" CTA button, A/B tested against a no-summary control to measure compare→book conversion lift.

**Expected impact:** +10–20% increase in compare page → booking form conversion rate for the `summary_cta` variant; direct measurement via `compare_summary_cta_click` events.

**Effort:** Low — new hook + one component + ~15 lines in compare page.

**Owner:** Growth Marketer → Frontend if implementation needed

---

*Generated by Growth Marketer — MAI-2890*