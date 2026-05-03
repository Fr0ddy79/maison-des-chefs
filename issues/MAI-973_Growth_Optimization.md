# MAI-973: Growth Optimization — Homepage Hero CTA Micro-copy Test

**Issue:** 30c2edf6-13dd-46cc-9ca0-2ba2c92c8761
**Created:** 2026-05-02 10:00 UTC
**Status:** 🚀 Experiment Ready
**Owner:** Growth Marketer

---

## 1. Funnel Analysis

### Current Homepage Structure

| Section | Purpose | CTA / Action |
|---------|---------|--------------|
| Hero (above fold) | Immediate value prop + dual CTAs | "Browse Chefs & Services" (primary), "See Most Popular" (secondary) |
| Search form | Date/guests/cuisine filtering | "Search Chefs" button |
| Stats bar | Social proof (chefs, services, bookings) | None (passive trust) |
| How It Works | Reduce friction / explain process | None |
| Featured Services | Show value / popular options | "View all services" link |
| Trust section | Reinforce safety signals | None |
| CTA section (bottom) | Final push before footer | "Browse All Services" |

### Funnel Flow
```
Homepage → Search form submission → Services catalog → Service detail → Booking form → Checkout
    ↓
Direct CTA clicks → Services catalog (same path)
```

### Key Observation
The search form is the **primary conversion mechanism** on the homepage. It requires date, guests, and event type as inputs before navigating to `/services`. However:
- The two hero CTAs ("Browse Chefs & Services", "See Most Popular") bypass the search form entirely
- Users who click hero CTAs go directly to the catalog without specifying event details
- The search form sits below the fold on most screens, with hero CTAs above it

### Prior Work Context (MAI-959)
- Single-chef compare bar enabled on services catalog (1+ chef threshold)
- Multi-chef inquiry API working
- Booking flow functional but Stripe blocked

---

## 2. Growth Idea: Homepage Hero CTA Micro-copy Test

### Problem Identified

The hero CTAs have generic, benefit-agnostic copy:
- **Primary CTA:** "Browse Chefs & Services" — informative but low urgency
- **Secondary CTA:** "🔥 See Most Popular" — adds popularity signal but doesn't reduce friction

The search form below has a higher-intent signal ("Search Chefs" with date/guests inputs) but competes visually with the CTAs above it.

**Opportunity:** Add micro-copy beneath the search submit button that:
1. Reduces uncertainty ("No payment required")
2. Creates mild urgency ("Chefs respond within hours")
3. Reinforces the key differentiator ("Verified only")

This micro-copy won't change the button styling or layout — just adds a trust signal line directly below the search form submit button.

### Why This Approach

| Option | Complexity | Expected Impact | Notes |
|--------|-----------|-----------------|-------|
| Change hero CTA text | Low | Medium | Tested in MAI-917 for service detail, not homepage |
| Add search form micro-copy | Very Low | Medium | Subtle trust signal, low risk |
| Add sticky CTA bar | Medium | Unknown | May be too aggressive |
| Expand search form | Medium | Unknown | May increase friction |

**Selected:** Add micro-copy to search submit button — highest confidence/impact ratio.

---

## 3. Implementation

### Change: Add Micro-copy Below Search Button

**File:** `src/routes/pages.ts` — hero search section

**Current state:**
```html
<button type="submit" class="search-submit">Search Chefs</button>
```

**New state:**
```html
<button type="submit" class="search-submit">Search Chefs</button>
<p class="search-micro-copy">✓ Free to search &nbsp;•&nbsp; ✓ No payment required &nbsp;•&nbsp; ✓ Verified chefs</p>
```

**CSS addition (within hero-search-form):**
```css
.search-micro-copy {
  color: rgba(255,255,255,0.7);
  font-size: 0.8rem;
  text-align: center;
  margin-top: 0.5rem;
}
```

### No infrastructure required
- Static HTML change only
- No backend involvement
- No analytics integration needed (can be added separately)
- Reversible in one line change

---

## 4. Experiment Plan

### Test: Micro-copy vs No Micro-copy on Search Submit

**Hypothesis:** Adding trust-based micro-copy beneath the search button will increase search form submission rate by reducing perceived commitment and reinforcing the "free to browse" positioning.

**Variant A (Control):** No micro-copy below search button
**Variant B:** Micro-copy with 3 trust signals: "✓ Free to search • ✓ No payment required • ✓ Verified chefs"

**Track:**
- `homepage_search_submitted` (already instrumented in current code)
- `homepage_cta_clicked` — hero CTA clicks (Browse Chefs, See Most Popular)
- Bounce rate from homepage

**Success Criteria:**
- Search form submission rate increases by ≥15%
- No decrease in hero CTA click rate
- Homepage bounce rate unchanged or improved

**Duration:** 7 days or until 200+ search submissions per variant

**Routing:** Use `?v=control` vs `?v=test` URL param for homepage

---

## 5. Expected Impact

| Metric | Current State | Expected | Confidence | Notes |
|--------|---------------|----------|------------|-------|
| Search submission rate | Baseline (unknown) | +15% | Medium | Micro-copy adds trust |
| Hero CTA click rate | Baseline (unknown) | Unchanged | High | Not modifying CTAs |
| Homepage bounce rate | Unknown | -5% | Low |间接效应 |
| User confidence | Implied | +10% | Medium | Explicit "free" + "verified" signals |

---

## 6. A/B Test Implementation

### pages.ts line ~1490

```typescript
// Determine variant from URL
const heroVariant = url.searchParams.get('v') === 'test' ? 'test' : 'control';

// Search button HTML
const searchSubmitBtn = `<button type="submit" class="search-submit">Search Chefs</button>`;
const searchMicroCopy = heroVariant === 'test' 
  ? `<p class="search-micro-copy">✓ Free to search &bull; ✓ No payment required &bull; ✓ Verified chefs</p>`
  : '';
```

### URL Routing
- Control: `/` or `/?v=control`
- Test: `/?v=test`

### Homepage Test Links
```html
<!-- Control group gets standard links -->
<a href="/services">Browse Chefs & Services</a>

<!-- Test group gets variant URL -->
<a href="/services?v=test">Browse Chefs & Services</a>
```

---

## 7. Metrics to Track

| Metric | How to Measure | Target |
|--------|---------------|--------|
| `homepage_search_submitted` | Search form submits / homepage sessions | Establish baseline |
| `search_ctr` | Search submits / homepage visitors | >5% |
| `hero_cta_clicks` | Primary + secondary CTA clicks | Track for regression |
| `homepage_bounce_rate` | Single-page exits / homepage sessions | <50% |

---

## 8. Blocked Work

| Item | Blocker | Status |
|------|---------|--------|
| Checkout / payment | MAI-618: Stripe keys not provided | 🔴 Fred |
| Email system | RESEND_API_KEY not configured | 🔴 Fred |
| Reviews System | MAI-941: Ready for BE+FE | 🔄 Queued |
| Analytics pipeline | Events logged locally, not forwarded | 🔄 Stubbed |

---

## 9. Related Prior Work

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-959 | Single-chef compare bar on catalog | ✅ Done |
| MAI-950 | Funnel analytics gap identification | ✅ Analyzed |
| MAI-917 | Service detail CTA A/B test | ✅ Test plan defined |
| MAI-918 | Multi-chef inquiry (compare bar) | ✅ Done |
| MAI-695 | Abandoned booking detection | ✅ Implemented |

---

## 10. Definition of Done

- [x] Homepage funnel analyzed
- [x] 1 improvement identified (search form micro-copy)
- [x] Simple change scoped (static HTML + CSS)
- [x] Experiment plan documented (A/B test with URL variant)
- [x] Expected impact estimated
- [x] Metrics to track defined
- [x] Blocked work noted

---

*Growth Optimization — MAI-973 — Growth Marketer — 2026-05-02 10:00 UTC*