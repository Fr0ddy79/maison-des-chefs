# GROWTH-MAI-2902: Scarcity Signals on /chefs Listing Page

**Created:** 2026-06-11 22:00 America/New_York
**Status:** Todo
**Type:** Growth Optimization

## Context

**Funnel Stage:** Mid-funnel / consideration (page = `/chefs`)
**Problem identified:** The `/chefs` listing page fetches availability data per chef but uses it only for binary badge states ("Available" / "Fully Booked" / "Inquire"). There is zero urgency signaling — a visitor can browse 20 chef cards and leave without any nudge toward immediate action. The homepage leverages "Available This Weekend" to create FOMO, but `/chefs` — the highest-traffic conversion page — shows no scarcity pressure whatsoever.

**What existed:**
- `availability` API returns `{ [chefId]: { total, available } }` for each chef (fetched on page load)
- `AvailabilityBadge` component renders three states: `available` (green), `fully_booked` (gray), `inquire` (yellow)
- No scarcity tier, no demand indicator, no urgency copy

**Gap:** High-intent visitors browse, compare, and leave. No urgency mechanism converts their latent demand into a booking request.

---

## What to Implement

### Scarcity Tier for Availability Badge

Extend the `AvailabilityBadge` component and `getBadgeStatus` logic to add two new scarcity states:

| Status | Trigger | Badge Style |
|--------|---------|-------------|
| `almost_gone` | 1–2 available slots in next 14 days | Red-ish bg, "Only X slots left" text |
| `popular` | ≥5 total slots in next 14 days AND ≥80% booked | Gold-ish bg, "Popular this week" text |
| `available` | >2 slots available, not popular | Green bg, "Available" (existing) |
| `fully_booked` | 0 available slots | Gray bg, "Fully Booked" (existing) |
| `inquire` | No availability data | Yellow bg, "Inquire for Dates" (existing) |

**Implementation in `src/app/chefs/page.tsx`:**

1. **Extend `ChefAvailability` type** (already imported): `{ total: number; available: number }` — no schema change needed
2. **Update `getBadgeStatus`** to compute scarcity tiers from availability data:

```typescript
function getBadgeStatus(chefId: string): BadgeType {
  const slot = availability[chefId]
  if (!slot || slot.total === 0) return 'inquire'
  if (slot.available === 0) return 'fully_booked'
  if (slot.available <= 2) return 'almost_gone'   // NEW
  if (slot.total >= 5 && slot.available / slot.total <= 0.2) return 'popular'  // NEW
  return 'available'
}
```

3. **Extend `BadgeType` union** to include `'almost_gone' | 'popular'`
4. **Add styles** for new badge states in `AvailabilityBadge` (same pattern as existing):

```typescript
// almost_gone: bg '#ef44441a', text '#dc2626' — urgency red
// popular: bg 'rgba(201,168,76,0.15)', text '#A68A3A' — gold
```

**No new files. No API changes. One function updated, one component extended.**

---

## Why This Works

1. **Captures mid-funnel FOMO** — Homepage "Available This Weekend" creates urgency on the landing page; scarcity badges extend that urgency into the browsing phase where decisions are made
2. **Converts undecided visitors** — A user comparing 3 chefs with no date commitment doesn't have external pressure to act. "Only 2 slots left" creates internal pressure
3. **Uses existing data, no backend changes** — The `availability` API already returns `{ total, available }`; the scarcity logic is pure client-side computation
4. **Low risk** — It's additive display logic; no changes to booking flow, no CTA changes, no removal of existing information
5. **Measurable** — Track `availability_badge_hover` events (or rely on existing `/chefs` → `/book` conversion rate as proxy metric)

---

## Experiment Plan

### Phase 1: Measure (7–14 days)

- **Primary metric:** `/chefs` → `/book` pageview conversion rate (scarcity badge users vs. no-badge baseline)
  - Note: Without cookie-based assignment, this is a **observational study** — comparing conversion rates for chefs WITH scarcity badges vs. WITHOUT, across all visitors
- **Secondary metric:** Inquiry submission rate for chefs with `almost_gone` badges
- **Secondary metric:** CompareBar usage rate (ensure CompareBar isn't displaced by scarcity signal)
- **Guardrail metric:** `/chefs` bounce rate (ensure no negative reaction to "salesy" badges)

**To observe effect:**
- Identify chefs where `slot.available <= 2` → expect higher `/book` click-through
- Query: `SELECT chef_id, COUNT(*) as conversions FROM booking_pageviews WHERE referrer LIKE '%/chefs%' AND created_at > NOW() - INTERVAL '7 days' GROUP BY chef_id`

### Phase 2: Iterate

- If `almost_gone` chefs show >15% higher `/chefs` → `/book` CTR → consider adding "Book Now" shortcut link in badge hover tooltip
- If `popular` badge drives incremental traffic → expand to show "Trending in [cuisine]" signals
- If badges feel "salesy" (bounce rate increase) → reduce badge prominence or limit to `almost_gone` only

---

## Funnel Stage Coverage

| Stage | Existing | New Addition |
|-------|----------|--------------|
| **Acquisition** | Hero CTA (4 variants), SEO schema | — |
| **Consideration** | Browse by Cuisine, Sticky CTAs, CompareBar | **Scarcity badges on /chefs** |
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
| Sticky CTA Bar (`/chefs`) | Mid (consideration) | Done |
| Chef Profile Sticky CTA (mobile) | Mid (consideration) | Done |
| Compare Page Summary CTA (MAI-2890) | Mid (consideration) | Todo |
| Confirmation Trust Reinforcement (MAI-2883) | Post-conversion | Todo |
| **Scarcity Badges on /chefs** | Mid (consideration) | **Todo** |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| "Salesy" feel damages brand trust | Scarcity is data-driven, not fabricated — real slots, real dates; no fake urgency |
| High-intent users ignore badges | Badge is a subtle addition to existing AvailabilityBadge; doesn't replace existing info |
| No backend changes means no way to A/B test | Observational study: compare conversion rates for scarce vs. non-scarce chefs across same time window |
| "Popular" badge may be wrong for low-traffic chefs | Uses `total >= 5 slots AND <=20% remaining` threshold — requires meaningful sample size before labeling |

---

## Implementation Checklist

- [ ] Extend `BadgeType` to include `'almost_gone' | 'popular'`
- [ ] Update `getBadgeStatus()` to compute scarcity tiers from `availability[chefId]` data
- [ ] Add styles for `almost_gone` (red tint) and `popular` (gold tint) in `AvailabilityBadge`
- [ ] Update badge label text to show slot count: `"Only {N} slots left"` for `almost_gone`
- [ ] Build passes with no errors
- [ ] Commit to main branch

---

## Summary

**Growth idea:** Extend the availability badge on `/chefs` chef cards from a binary indicator to a scarcity signal — showing "Only X slots left" for nearly-booked chefs and "Popular this week" for high-demand chefs. Converts undecided mid-funnel visitors by creating urgency using existing availability data (no backend changes required).

**Expected impact:** +10–15% increase in `/chefs` → `/book` conversion rate for chefs with `almost_gone` badges vs. `available` chefs; measurable via existing pageview analytics.

**Effort:** Very Low — one function updated, two badge states added, ~20 lines of code.

**Owner:** Growth Marketer → Frontend if implementation needed

---

*Generated by Growth Marketer — MAI-2902*