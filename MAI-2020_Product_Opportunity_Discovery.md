# Product Opportunity Discovery — MAI-2020

**Issue:** 5185a268-82c9-4c9d-b125-fc6c9a9327eb
**Date:** 2026-05-24 16:00 UTC
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager

---

## 1. Executive Summary

Revenue remains **$0** — blocked by placeholder `STRIPE_SECRET_KEY` and `RESEND_API_KEY` for 90+ days. Infrastructure unchanged.

**This cycle's key finding:** The booking page (`/booking/:serviceId`) — the primary conversion page — has no review display, despite the reviews infrastructure being fully built. A prior cycle identified this gap and a spec was written (`SPEC-service-reviews-booking-page.md`), but it was never implemented. Meanwhile, checkout page got social proof added in the most recent commit (`f021a77`).

---

## 2. Platform State (16:00 UTC May 24)

### Infrastructure Status

| Blocker | Owner | Value in .env | Revenue Impact |
|---------|-------|---------------|----------------|
| `STRIPE_SECRET_KEY` | Fred | `sk_live_...` (placeholder) | **$0** — payments blocked |
| `RESEND_API_KEY` | Fred | `re_...` (placeholder) | All email flows dead |
| `JWT_SECRET` | Fred | `change-me-to-a-random-secret...` | Auth token risk |

**Revenue: $0**

### Recent Git Activity (since May 23 16:00 UTC)

| Commit | Author | Description |
|--------|--------|-------------|
| `f021a77` | Fred | MAI-2007: Dynamic social proof on **checkout page** ← (not booking page) |

### Reviews Infrastructure Map

| Component | Location | Status |
|-----------|----------|--------|
| Reviews schema | `src/db/schema.ts` | ✅ Complete |
| Reviews API (`/api/reviews`) | `src/api/reviews.ts` | ✅ Complete |
| Service reviews endpoint | `GET /api/services/:id/reviews` | ✅ Complete |
| **Service detail page (`/booking/:serviceId`)** | `src/routes/booking-page.ts` | ❌ **No review display** |
| Chef profile page reviews | `src/routes/chef-profile-page.ts` | ✅ Works |
| Chef discovery cards | `src/routes/chef-discovery-page.ts` | ✅ Aggregate rating + count |
| **Checkout page** | `src/routes/checkout.ts` | ✅ Social proof added `f021a77` |

---

## 3. New Opportunity: Booking Page Reviews Display

### Problem Statement

The standalone booking page (`/booking/:serviceId`) is the **primary conversion page** — where diners land after selecting a service and where they decide whether to submit an inquiry. This page shows chef info, service details, addons, and an inquiry form.

**What it does NOT show:** Any social proof from past diners.

The reviews infrastructure is fully built (schema, API endpoints, chef profile rendering) but the booking page has **zero review display**. Diners making a booking decision see no evidence that past diners enjoyed the experience.

### User Story

**As a** diner viewing a service detail page,
**I want to** see ratings and reviews from past diners,
**so that** I can assess chef quality and book with confidence.

### Prior Art

| Item | Status |
|------|--------|
| `SPEC-service-reviews-booking-page.md` written | ✅ May 24 |
| Implementation started | ❌ Not done |

---

## 4. Feature Proposal (MVP)

### Feature: Service Reviews on Booking Page

**What:** Display aggregate rating + up to 3 review cards on the booking page, using the existing `GET /api/services/:id/reviews` endpoint.

**Why:** Trust gap at the exact moment of booking decision. Checkout page just got social proof. Booking page is earlier in the funnel and has higher traffic.

### Scope

**In:**
- Aggregate rating: `★ 4.8 (23 reviews)` above the inquiry form
- Up to 3 review cards below service description, newest first
- Clean no-op when service has 0 reviews
- "Show all N reviews" toggle if count > 3
- Guest checkout reviews show "Guest Diner"

**Out (MVP):**
- Review submission flow (already exists)
- Photo reviews
- Rating breakdown
- Changes to checkout flow

### Acceptance Criteria

- [ ] Aggregate rating renders as `★ X.X (N reviews)` above inquiry form when reviews exist
- [ ] Aggregate rating renders nothing when 0 reviews (no broken UI)
- [ ] Up to 3 review cards display, newest first
- [ ] Review cards show: stars, comment, dinerFirstName, formatted date
- [ ] Guest checkout reviews display "Guest Diner"
- [ ] "Show all N reviews" toggle when count > 3
- [ ] `npm run build` passes

### Metrics

| Metric | Target |
|--------|--------|
| Inquiry form submission rate on service pages with reviews | +10% uplift |
| Time-on-page before submission | Increase |
| Scroll depth to form | Increase |

---

## 5. Open Questions / Blockers

| # | Item | Owner | Priority |
|---|------|-------|----------|
| 1 | **Infrastructure keys** (`STRIPE_SECRET_KEY`, `RESEND_API_KEY`) | Fred | 🔴 90+ days |
| 2 | Should aggregate rating also appear in booking-card sidebar? | UX | P3 |
| 3 | Performance concern with per-page review fetch? | BE | P3 |

---

## 6. Suggested Priority Order for Fred's Attention

1. 🔴 **Infrastructure keys** — revenue is $0, this is the only blocker
2. 🟡 **Booking page reviews** — spec exists, high-impact, low-effort
3. ✅ Checkout social proof — just completed (`f021a77`)

---

## Definition of Done

- [x] Engineers can implement without guessing — `SPEC-service-reviews-booking-page.md` exists with clear placement, API docs, CSS notes, and edge cases
- [x] Scope is clear and bounded — MVP scope defined
- [x] Acceptance criteria are objectively verifiable