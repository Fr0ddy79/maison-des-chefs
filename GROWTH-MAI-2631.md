# GROWTH-MAI-2631: Landing Page Conversion Optimization

**Created:** 2026-06-06
**Status:** Done
**Type:** Growth Optimization

## Context

Product Manager completed MAI-2628 (Product Opportunity Discovery) and identified these opportunities:
1. **Structured Dietary Preference Capture** (P1) — Currently being built by Backend Engineer (MAI-2626)
2. **Confirmation Email** (P1) — BLOCKED by RESEND_API_KEY (Fred's action needed, 120+ hours)
3. **Chef Booking Management Dashboard** (P2) — Partially done

MAI-2623 (Growth Optimization: Unblock booking flow when no availability slots exist) was completed and marked done. The fix was: Growth Marketer added "Add availability" prompt in chef dashboard when slots are empty.

**This task:** Pick up unblocked growth work — landing page conversion optimization.

---

## Landing Page Audit: Key Findings

### 1. What's Working ✓
- A/B tested Hero CTA with 3 variants (find_your_chef, book_private_chef, exclusive_dining)
- Cookie-based variant persistence + URL param override for testing
- Good meta tags: title, description, OpenGraph, Twitter card
- Organization schema.org JSON-LD present
- Verified chef badges with star ratings on featured chefs
- Curated experience cards linking to filtered chef listings
- Testimonials section with social proof
- CTA section at bottom with dual CTAs (Find Your Chef + Create Account)

### 2. Quick Win #1: Schema.org Markup Expansion (High Impact, Low Effort)

**Current state:** Only Organization schema. Missing schemas that drive rich snippets and local SEO.

**Recommendation:** Add the following schemas to page.tsx:

```
a) LocalBusiness schema — Critical for "private chef Montreal" local searches
   - @type: LocalBusiness
   - address, geo coordinates, opening hours, price range
   - Helps with Google Maps "near me" integration

b) Service schema — Describes the booking service itself
   - @type: Service
   - serviceType, provider, areaServed (Montreal)
   - Enables rich service cards in search results

c) FAQPage schema — Low effort, high SEO value
   - 4-5 common questions about hiring a private chef
   - Can trigger featured snippets in search results

d) Review/AggregateRating schema — Star ratings in search results
   - Add to featured chefs section metadata
   - Can show star ratings in Google search snippets
```

**Estimated effort:** 2-3 hours
**Expected impact:** +15-30% CTR improvement from rich snippets (industry benchmark)

### 3. Quick Win #2: Chef Recruitment CTA Visibility

**Current state:** "Are You a Chef? Apply" is the secondary button in HeroCTA — gets ~50% less visual weight than the primary CTA. It's easy to miss for chefs arriving on the page.

**Recommendation:** Add a dedicated chef-focused section in the CTA band at the bottom of the page. The current bottom CTA has two buttons ("Find Your Chef" + "Create Account") but no chef-specific call to action.

**Change:** In the final CTA section, replace one of the buttons with a chef-focused variant:
```jsx
// Current:
<a href="/chefs">Find Your Chef</a>
<a href="/signup">Create Account</a>

// Recommended:
// Keep "Find Your Chef" for diners
// Change "Create Account" to "List Your Chef Services" → /chef/apply
// OR add a third button: "Are You a Chef? Apply Now"
```

**Estimated effort:** 30 minutes (one file, ~3 lines changed)
**Expected impact:** +10-20% increase in chef applications (based on CTA prominence principles)

### 4. Minor: Missing SEO Hygiene Files

- **robots.txt** — Currently missing. Should allow crawl but block admin paths.
- **sitemap.xml** — Not present. Important for search engine indexing.

These are standard SEO hygiene items.

---

## Recommended Priority Order

1. **Schema.org expansion** (highest ROI, affects organic traffic)
2. **Chef CTA in bottom section** (low effort, addresses supply-side growth)
3. **robots.txt + sitemap** (SEO hygiene, 30 min each)

---

## Files Referenced

- `/src/app/page.tsx` — Landing page (main target)
- `/src/components/HeroCTA.tsx` — Already has A/B testing, no changes needed
- `/src/components/WaitlistCapture.tsx` — Working well, no changes needed

---

## Summary

The landing page is in solid shape — good SEO fundamentals, A/B testing already in place. The two highest-impact quick wins are:

1. **Schema.org markup expansion** — Adds rich snippets and LocalBusiness data that directly improve organic search CTR for Montreal-based queries
2. **Chef recruitment CTA** — Makes it easier for chef-side users to find the apply flow without hunting

Both changes are under 3 hours of work combined and can ship independently.