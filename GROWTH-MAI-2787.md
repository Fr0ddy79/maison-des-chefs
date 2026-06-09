# GROWTH-MAI-2787: Weekend Availability CTA — Hero A/B Test

**Created:** 2026-06-09 06:00 America/New_York
**Status:** Strategy
**Type:** Growth Optimization

## Context

Active growth experiments:
- Hero CTA A/B (3 variants: find_your_chef / book_private_chef / exclusive_dining) — running
- Booking Form A/B (3-step vs 4-step) — running

Homepage already features an "Available This Weekend" section with real chef availability data. However, the hero CTA only offers generic paths ("Book a Chef / Browse Chefs") — it doesn't leverage the weekend availability signal at the moment of highest user attention.

**This experiment adds a 4th hero CTA variant** that speaks directly to users with weekend intent: "Book for This Weekend."

---

## Growth Idea: Time-Sensitive Hero CTA Variant

### What

Add a 4th variant to the existing HeroCTA A/B test that uses urgency and time specificity:

| Variant | Primary CTA | Trust Badges |
|---------|-------------|--------------|
| find_your_chef (existing) | "Book a Chef" | Generic trust badges |
| book_private_chef (existing) | "Book a Chef — Limited Availability" | Scarcity badge |
| exclusive_dining (existing) | "Book a Chef — Reserve Now" | Curated badge |
| **weekend_booking (new)** | **"Book for This Weekend"** | **"Available this weekend only"** |

### Why It Works

1. **Intent matching** — The homepage shows "Available This Weekend" chefs. Users who see that section and return to the hero have high weekend-intent. A direct weekend CTA matches that intent.
2. **Scarcity + time-boundedness** — "This Weekend" implies limited availability, creating natural urgency without being misleading.
3. **Reduces decision fatigue** — Generic "Book a Chef" requires the user to figure out what they want. "Book for This Weekend" removes that cognitive step.
4. **Low implementation risk** — Leverages existing HeroCTA A/B infrastructure (cookie-based assignment, analytics events already in place).

### Why Not Just Use book_private_chef Variant

"Limited availability" is vague — users don't know *what* is limited. "This Weekend" is specific and actionable — it answers the implicit question "when can I book?"

---

## Expected Impact

| Metric | Current (Variant avg) | Expected | Lift |
|--------|-----------------------|----------|------|
| Hero CTA primary click rate | baseline (from A/B test data) | +15-25% vs generic variants | +15-25% |
| Weekend section → booking conversion | baseline | +20-35% | +20-35% |
| Overall homepage → /book rate | baseline | +10-20% | +10-20% |

**Estimated effort:** 30-45 min (add one variant to existing component + add analytics event)
**Confidence:** Medium-High (specific CTAs outperform generic ones per industry benchmarks)
**Time to impact:** Immediate after implementation

---

## Experiment Plan

### Phase 1: Implement (30-45 min)

**Files to modify:**
| File | Change |
|------|--------|
| `src/components/HeroCTA.tsx` | Add `weekend_booking` variant to CTA_TEXT and TRUST_BADGES records |
| `src/components/HeroCTA.tsx` | Add `weekend_booking` to variant type, cookie assignment logic, and URL param override |
| `src/lib/analytics.ts` | Ensure `hero_cta_click` event already captures variant (verify) |

**Variant definition:**
```typescript
// CTA_TEXT addition
weekend_booking: {
  primary: 'Book for This Weekend',
  secondary: 'Browse All Chefs',
},

// TRUST_BADGES addition
weekend_booking: {
  badges: [
    '✓ Chefs available this weekend',
    '✓ No payment required today',
    '✓ Free cancellation up to 48h',
  ],
},
```

**Cookie assignment update:** Equal probability across 4 variants instead of 3.

**URL testing:** `/?hero_cta_variant=weekend_booking`

### Phase 2: Measure (7-14 days)

- **Primary metric:** Hero CTA primary click rate by variant
- **Secondary metric:** /book pageviews from homepage (funnel step)
- **Secondary metric:** Inquiry submissions from weekend-variant traffic
- **Guardrail metric:** Bounce rate on homepage (no negative impact)

**Statistical significance:** Minimum 100 clicks per variant before declaring winner. Run for 14 days or until significance.

### Phase 3: Iterate

- If `weekend_booking` wins → ship as default or test "Book for [Day Name]" (e.g., "Book for Saturday Night")
- If existing variants still win → consider removing the weakest variant and keeping 3

---

## Differentiation from Other Growth Work

| Experiment | Funnel Stage | Status |
|------------|--------------|--------|
| Hero CTA A/B (existing 3 variants) | Top (acquisition) | Running |
| Booking Form A/B | Mid (conversion) | Running |
| Schema.org markup | SEO | Done |
| Social Proof Notifications | Browse (validation) | In Progress |
| **Weekend CTA Variant** | **Top (immediate intent capture)** | **This** |

The existing hero A/B test focuses on copy tone (generic vs scarcity vs exclusive). This variant adds a **time-specific** dimension that directly complements the "Available This Weekend" section on the page.

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| "This Weekend" CTA is misleading if no chefs are actually available | Only show variant when weekend chef count > 0 (conditional rendering) |
| Variant cannibalizes existing variant traffic (dilutes test) | 4-way split keeps sufficient sample per variant; monitor for 3+ days before evaluating |
| Low weekend availability → CTA leads to dead end | Booking form shows available slots; if no weekend slots, the CTA still drives to /chefs page |
| "This Weekend" feels too pushy for brand tone | Use softer badge language: "Available this weekend" (descriptive, not urgent) |

---

## Pre-Launch Checklist

- [ ] Verify `hero_cta_click` analytics event captures all 4 variant values
- [ ] Test all 4 variants via URL params (`?hero_cta_variant=xxx`)
- [ ] Confirm cookie-based assignment handles 4-way split correctly
- [ ] Check StatsBar shows real data (no zeros) before activating weekend variant
- [ ] Set up GA4 event goal for hero_cta_click filtered by variant

---

## Summary

**Growth idea:** Add a 4th hero CTA variant ("Book for This Weekend") that leverages the existing "Available This Weekend" section and captures high-intent weekend users.

**Expected impact:** +15-25% hero CTA click rate, +10-20% homepage → /book conversion

**Effort:** 30-45 minutes — uses existing A/B infrastructure

**Owner:** Growth Marketer → Frontend for implementation

---

*Generated by Growth Marketer — MAI-2787*