# Task: Reviews & Testimonials System

**Issue:** MAI-940 (CEO Loop)
**Owner:** Backend Engineer + Frontend Engineer
**Created:** 2026-05-01 17:00 UTC
**Priority:** P1
**Effort:** ~2-3h (BE: 45min, FE: 60min, Integration: 30min)
**Dependencies:** None — can be built independently

---

## Objective

Build a reviews system to replace the broken social proof on service detail pages. Currently the platform shows booking-count-as-reviews and avg-price-as-avg-rating — both completely wrong. Diners have no real peer validation to drive booking confidence.

---

## Why Now

MAI-938 Growth Optimization identified this as the top growth opportunity:
- Service pages with visible star ratings see 15-25% higher booking form click-through
- The infrastructure exists (testimonial section in UI) but has **no reviews table backing it**
- `featuredReview` is always `null`, `avgRating` shows avg price not rating
- Even 3-5 seed reviews per top service would activate the social proof effect

---

## Scope

### Backend (Backend Engineer)

**Step 1 — Add reviews table to schema.ts**
```sql
CREATE TABLE reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chef_id INTEGER NOT NULL REFERENCES users(id),
  service_id INTEGER NOT NULL REFERENCES services(id),
  diner_id INTEGER NOT NULL REFERENCES users(id),
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(booking_id)  -- One review per booking
);
```

**Step 2 — Add reviews API endpoints**

`POST /api/reviews` — Submit a review
- Body: `{ bookingId, rating, comment? }`
- Validate: booking exists, belongs to diner, not already reviewed
- Returns: created review object

`GET /api/services/:id/reviews` — Fetch reviews for a service
- Returns: `{ reviews: [{id, rating, comment, createdAt, chefName}], avgRating, reviewCount }`

**Step 3 — Update chef API**
`GET /api/chefs/:id` — Add `avgRating` and `reviewCount` from reviews table

### Frontend (Frontend Engineer)

**Step 4 — Update service detail page**

In `buildServiceDetailPage()` in `pages.ts`:
- Query real reviews instead of booking-count-as-proxy
- Show: `⭐ 4.8 (23 reviews)` 
- Show featured review if available
- Remove the broken `avgRating` (was showing avg price!)

**Step 5 — Update service listing cards**
On service cards in `buildServicesPage()`:
- Show star rating badge
- Show review count

### Optional (Fred's action later)
- Seed 3-5 synthetic reviews per top service to activate social proof immediately
- Set up review request email (needs RESEND_API_KEY — Fred must provide)

---

## Files to Modify

- `src/db/schema.ts` — add `reviews` table
- `src/api/reviews.ts` — **NEW** — POST + GET endpoints
- `src/api/chefs.ts` — add `avgRating`, `reviewCount` to GET `/api/chefs/:id`
- `src/routes/pages.ts` — update service detail and listing to use real reviews

---

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | `reviews` table exists with correct schema (chef_id, service_id, diner_id, booking_id, rating 1-5, comment, created_at) |
| AC2 | `POST /api/reviews` creates a review linked to a booking |
| AC3 | `GET /api/services/:id/reviews` returns reviews array + avgRating + reviewCount |
| AC4 | Service detail page shows real star rating (e.g., "⭐ 4.8 (12 reviews)") |
| AC5 | Service detail page shows featured review when available |
| AC6 | Chef profile API returns `avgRating` and `reviewCount` |
| AC7 | No double-review allowed (UNIQUE on booking_id) |
| AC8 | Rating is validated 1-5 before insert |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Reviews submitted per top service | 3+ within 7 days of seeding |
| Service detail page → booking form CVR | +10-15% (with reviews vs. without) |
| Average star rating per service | >4.0 / 5.0 |

---

## Blocked By

- None — can build fully independently
- Email review request: needs RESEND_API_KEY (Fred action, separate from this task)

---

## Related Issues

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-938 | Growth analysis + experiment plan | ✅ Done |
| MAI-618 | Checkout / payment (blocked) | 🔴 Fred must provide keys |
