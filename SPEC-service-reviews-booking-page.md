# Service Detail Page — Reviews Display
## Product Specification

**Issue:** MAI-2010 (Product Opportunity Discovery)
**Owner:** Product Manager
**Date:** 2026-05-24
**Status:** Spec Draft for Engineering Review

---

## Problem Statement

The standalone booking page (`/booking/:serviceId`) is the **primary conversion page** — where diners land after selecting a service and where they decide whether to submit an inquiry. Despite the reviews infrastructure being fully built (schema, API endpoints, chef profile rendering), the service detail page displays **zero social proof**.

Diners making a booking decision see no evidence that past diners enjoyed the experience. This creates a trust gap at the exact moment when diners are most likely to bounce.

---

## User Story

**As a** diner viewing a service detail page,
**I want to** see ratings and reviews from past diners,
**so that** I can assess chef quality and book with confidence.

---

## Scope

### In Scope
- Aggregate rating display above the inquiry form: "★ 4.8 (23 reviews)" — clickable, scrolls to reviews
- Individual review cards below the service description (up to 3, newest first)
- Review cards show: star rating, comment text, diner first name, date
- Load reviews via existing `GET /api/services/:id/reviews` endpoint
- Clean fallback when service has 0 reviews (show nothing — no broken UI)
- Guest checkout reviews show "Guest Diner" as dinerFirstName

### Out of Scope (MVP)
- Review submission flow (already exists via `POST /api/reviews/lead/:leadId`)
- Photo reviews
- Review responses from chef
- Rating breakdown (5/4/3/2/1 star distribution)
- Changes to checkout flow
- Rating display on chef discovery cards (already done)

---

## API Integration

**Endpoint:** `GET /api/services/:id/reviews`

**Response shape:**
```json
{
  "reviews": [
    {
      "id": "uuid",
      "rating": 5,
      "comment": "Incredible meal!",
      "createdAt": "2026-05-07T12:00:00Z",
      "dinerName": "Sarah M.",
      "chefName": "Chef Marco"
    }
  ],
  "avgRating": 4.8,
  "reviewCount": 23,
  "featuredReview": {
    "id": "uuid",
    "rating": 5,
    "comment": "Incredible meal!",
    "createdAt": "2026-05-07T12:00:00Z",
    "dinerName": "Sarah M.",
    "dinerFirstName": "Sarah"
  }
}
```

**Key notes:**
- `dinerName` may be `null` for guest checkout reviews → display "Guest Diner"
- Reviews are sorted newest first
- Aggregate stats (avgRating, reviewCount) are calculated server-side

---

## UI Placement

### Layout Location
```
┌─────────────────────────────────────────────────────────────┐
│  Service Hero / Chef Info                                     │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ★ 4.8 (23 reviews)                    [Read all ▼]   │   │  ← Aggregate rating (clickable)
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  Service Description                                          │
│  Dietary tags, addons                                         │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Review Card 1                                         │   │  ← First review
│  │ ★★★★★ — Sarah, May 2026                              │   │
│  │ "Incredible meal..."                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Review Card 2                                         │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Review Card 3                                         │   │
│  └─────────────────────────────────────────────────────┘   │
│  [Show all 23 reviews ▼] (if count > 3)                     │
│                                                              │
│  ┌─ Inquiry Form ────────────────────────────────────────┐ │
│  │ Your Details                                            │ │
│  │ [Name] [Email] [Phone]                                 │ │
│  │ [Guest Count] [Date] [Message]                         │ │
│  │ [Get Your Quote]                                        │ │
│  └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Aggregate Rating Section
- Format: `★ 4.8 (23 reviews)` — bold, gold accent color
- If no reviews: render nothing (no broken UI, no "0.0 ★ (0 reviews)")
- Click scrolls to reviews section (smooth scroll anchor)
- Located immediately above the inquiry form, within the `form-section`

### Review Cards
- Located between the service description and the inquiry form
- Show first 3 reviews newest-first
- "Show all N reviews" link if `reviewCount > 3` → expands to show all (no pagination needed for MVP)
- Each card:
  ```
  ★★★★★  — 5 stars
  "Comment text here, max 1000 chars..."
  — FirstName, Month Year
  ```
- "Guest Diner" shown for guest checkout reviews (dinerName is null)
- Empty comment: valid — show stars only, no quote marks

---

## Acceptance Criteria

- [ ] Aggregate rating renders as `★ 4.8 (23 reviews)` above the inquiry form when reviews exist
- [ ] Aggregate rating section renders nothing (clean no-op) when service has 0 reviews
- [ ] Up to 3 review cards display below the service description, newest first
- [ ] Review cards show: filled stars, comment (if exists), dinerFirstName, formatted date
- [ ] Guest checkout reviews display "Guest Diner" as the author name
- [ ] "Show all N reviews" toggle appears when reviewCount > 3
- [ ] `npm run build` passes with no new TypeScript or lint errors

---

## Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Primary:** Inquiry form submission rate on service detail pages with reviews | +10% uplift | A/B or before/after comparison |
| **Secondary:** Time-on-page before inquiry submission | Increase (more reading = more confidence) | Analytics event |
| **Secondary:** Scroll depth to form | Increase | Analytics event |

---

## Implementation Pattern

1. **In booking-page.ts** — add a `<div id="reviewsSection">` in the HTML between service description and inquiry form
2. **Add a `<div id="aggregateRating">`** in the form-section header area (above the form fields)
3. **Add inline JS functions** (following the existing `updateEstimatedTotal()` pattern):
   - `loadServiceReviews()` — fetch from `/api/services/${serviceId}/reviews`
   - `renderAggregateRating(data)` — render the aggregate badge or nothing
   - `renderReviewCards(data)` — render up to 3 review cards
   - `renderStars(rating)` — render ★ symbols
   - `formatDate(dateStr)` — "May 2026" format
4. **Call `loadServiceReviews()`** on page load (within the existing IIFE or at the end of the script)
5. **Add CSS styles** for `.reviews-section`, `.review-card`, `.aggregate-rating-badge`

**Reference pattern:** `chef-profile-page.ts` lines 146, 202-210 — the same `loadChefReviews` / `renderReviews` pattern but scoped to the booking page's service reviews endpoint.

---

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| 0 reviews for service | Render nothing — clean no-op for both aggregate and review cards |
| 1 review | "★ 5.0 (1 review)" — singular "review" |
| 100+ reviews | "★ 4.8 (127 reviews)" — aggregate to 1 decimal |
| Empty comment | Valid — show stars only, no empty quote block |
| Very long comment (>1000 chars) | Already truncated by API (max 1000 chars enforced on submission) |
| Guest checkout review (dinerId=null) | Display "Guest Diner" as the author name |
| API returns error | Silently fail — no broken UI, reviews section simply doesn't appear |
| Page load with slow network | Reviews section appears after fetch resolves — acceptable for MVP |

---

## Open Questions

| # | Question | Owner | Priority |
|---|----------|-------|----------|
| 1 | Should aggregate rating also appear in the `booking-card` sidebar? | UX | P3 |
| 2 | Is there a performance concern with fetching reviews on every booking page load? | BE | P3 — consider caching if issue arises |

---

## Definition of Done

- [ ] Engineers can implement without guessing
- [ ] UI placement is unambiguous (sections identified by HTML structure)
- [ ] API integration is clear (existing endpoint documented)
- [ ] Edge cases are defined and testable
- [ ] Acceptance criteria are objectively verifiable