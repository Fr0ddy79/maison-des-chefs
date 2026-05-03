# Product Opportunity Discovery

**Issue:** MAI-922
**Date:** 2026-05-01 08:00 UTC
**Status:** ✅ Complete
**Analyst:** Product Manager Agent (Max)
**Model:** MiniMax-M2.7

---

## Executive Summary

At 08:00 UTC, the Maison des Chefs platform has two active build tasks (MAI-920, MAI-921) in progress with Frontend Engineer. The core booking flow is functional but blocked at payment (MAI-618). Three new opportunities identified: Service Photo Gallery (P2), Search Enhancement (P2), and Corporate Inquiry Flow (P3).

**MAI-618 remains the sole critical blocker — Fred must provide Stripe keys and refresh Vercel OIDC.**

---

## Current Platform State

### Recently Completed ✅ (Last 48h)

| Module | Status | Issue |
|--------|--------|-------|
| Multi-Chef Inquiry UI + API | ✅ Committed | MAI-908 |
| Cuisine Filter on Homepage Hero | ✅ Committed | MAI-894 |
| Guest Count + Price Calculator | ✅ Committed | MAI-859 |
| Book Again CTA on Booking Status | ✅ Committed | MAI-881 |
| Pre-Checkout Upsell (MAI-875) | ✅ Committed | MAI-875 |
| Landing Page CTA A/B Test Plan | ✅ Spec Complete | MAI-917 |

### Active Build Tasks 🔄

| ID | Title | Assignee | Status |
|----|-------|----------|--------|
| MAI-920 | FE: Landing Page CTA A/B Test | Frontend Engineer | Assigned |
| MAI-921 | FE+BE: Chef Photo Upload MVP | Frontend Engineer | Assigned |

### Critical Blockers 🔴 (Fred Must Resolve)

| Blocker | Impact | Days Pending |
|---------|--------|---------------|
| `RESEND_API_KEY = re_placeholder` | All transactional emails blocked | 12+ days |
| `STRIPE_SECRET_KEY = empty` | Payment processing blocked | 12+ days |
| Vercel OIDC token expired | Cannot deploy | Unchanged |

**No agent can unblock these. Fred is the only owner.**

---

## New Opportunities Identified

### Opportunity 1: Service Photo Gallery (P2)

**Priority: P2 — Visual Trust Signal**

### Problem Statement

Service detail pages (`/services/:id`) currently display a generic hero image based on cuisine type. Diners making a booking decision need visual proof of actual dishes. The platform has `photos` field capability but it's never populated or rendered.

### User Story

> **As a** diner viewing a chef's service page,
> **I want to** see photos of actual dishes,
> **so that** I can visualize the experience and feel confident in my booking decision.

### Current State

- Schema: `services` table has no `photos` column — needs migration
- API: `PUT /api/services/:id` does not accept or persist photos
- Frontend: `buildServiceDetailPage()` uses `getChefPhoto(cuisineType)` — generic Unsplash
- Gallery: No lightbox or photo grid component exists

### Scope

**In:**
- Add `photos` column to `services` table (TEXT, JSON array of URLs, max 6)
- Extend `PUT /api/services/:id` to accept `photos` array (chef-only)
- Add photos grid to service detail page (3-col desktop, 2-col mobile)
- Lightbox modal with prev/next navigation on photo click
- Placeholder text when no photos uploaded ("Dish photos coming soon")
- Validation: max 6 URLs, must be valid URL format

**Out:**
- File upload (URL paste only for v1)
- Photo editing or cropping
- Diner photo uploads
- S3/storage integration

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Chef can add up to 6 photo URLs via PUT /api/services/:id |
| AC2 | Service detail page displays photos in responsive grid |
| AC3 | Clicking a photo opens lightbox with prev/next navigation |
| AC4 | No photos shows graceful placeholder text |
| AC5 | Photos are validated (max 6, valid URLs only) |
| AC6 | Only service owner (chef) can update photos |

### Success Metrics

| Metric | Target |
|--------|--------|
| % of services with photos | >30% within 2 weeks |
| Booking uplift on services with vs without photos | +15% |

### Effort

~1.5h (DB migration + API update + frontend gallery component)

### Dependencies

- None (can be built independently)

---

### Opportunity 2: Search Results Enhancement (P2)

**Priority: P2 — Discovery Improvement**

### Problem Statement

The `/services` catalog page has filters but lacks smart defaults and empty state handling. Users who filter to a combination with no results see no guidance. Also, sort options don't include "Recently Added" which would surface new chef signups.

### User Story

> **As a** diner searching for services,
> **I want to** see helpful empty states and smart sorting,
> **so that** I can find relevant services quickly or discover alternatives.

### Current State

- Filters: cuisine, price range, date, dietary restrictions, guest count
- Sorts: Price (Low to High), Price (High to Low), Popular
- Missing: "Recently Added" sort, "Best Value" sort
- Empty state: Generic "No services found" with reset link

### Scope

**In:**
- Add "Recently Added" sort option (newest first)
- Add "Best Value" sort (price per person, ascending)
- Improve empty state: suggest broadening filters or similar services
- Show result count clearly

**Out:**
- Any API changes (can be done client-side)
- New filter types

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | "Recently Added" sort option visible and functional |
| AC2 | "Best Value" sort option visible and functional |
| AC3 | Empty state shows actionable suggestions |
| AC4 | Result count displays correctly |

### Success Metrics

| Metric | Target |
|--------|--------|
| Filter-to-book conversion | +5% |
| Empty state interaction (reset/expand) | >40% |

### Effort

~30 min (frontend sort options + empty state copy)

---

### Opportunity 3: Corporate/B2B Inquiry Flow (P3)

**Priority: P3 — Segment Discovery**

### Problem Statement

The platform is optimized for individual/small group bookings (2-20 guests). Corporate events (50+ guests) have different needs: menu customization, multiple courses, on-site staffing, invoicing. There's no dedicated path for these inquiries.

### User Story

> **As a** corporate event planner,
> **I want to** submit an inquiry for 50+ guests with specific requirements,
> **so that** I can get a customized proposal for a business event.

### Current State

- Max guest count in schema: 10 (per `services.maxGuests`)
- No corporate-specific fields (company name, billing address, PO number)
- Checkout upsell card mentions "6+ guests" for corporate but offer actually requires 50+

### Scope

**In:**
- Increase maxGuests validation to 200
- Add "Corporate Event" checkbox/toggle on inquiry form
- If guest count > 30 OR corporate toggle: show additional fields (company, event type, budget range)
- Separate "Corporate Inquiry" subject line for chef notifications

**Out:**
- Invoice generation (stub only, no full accounting)
- Payment processing for corporate (different flow)

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Guest count can exceed 10 (up to 200) |
| AC2 | Corporate toggle reveals company name + event type fields |
| AC3 | Corporate inquiries show "Corporate" badge in chef leads |
| AC4 | Inquiry email includes corporate context |

### Success Metrics

| Metric | Target |
|--------|--------|
| Corporate inquiry volume | Establish baseline |
| Corporate to booking conversion | Establish baseline |

### Effort

~45 min (schema update + form fields + email template)

---

## Open Questions

| # | Question | Priority | Owner | Status |
|---|----------|----------|-------|--------|
| 1 | ETA for Stripe live keys + Vercel OIDC refresh? | 🔴 Critical | Fred | 12+ days pending |
| 2 | Should MAI-920/MAI-921 be prioritized over new opportunities? | 🟡 High | CEO | Decision needed |
| 3 | Any planned feature releases we should align with? | 🟡 Medium | Fred | Unknown |

---

## Recommended Tasks

| Task | Owner | Priority | Effort | Dependencies |
|------|-------|----------|--------|--------------|
| Service Photo Gallery (MAI-911 cont.) | BE + FE | P2 | ~1.5h | None |
| Search Results Enhancement | FE | P2 | ~30min | None |
| Corporate Inquiry Flow | FE + BE | P3 | ~45min | None |

---

## Prior PODs (Recent)

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-911 | Photo Upload Spec + Checkout Copy Fix identified | ✅ Completed |
| MAI-905 | Multi-Chef Inquiry opportunity identified | ✅ Completed (MAI-908) |
| MAI-898 | Multi-Chef Inquiry + Service Photo Gallery identified | ✅ Partially done |
| MAI-869 | Chef Discovery Page + Booking Flow improvements | ✅ Done |

---

## Notes

- The corporate copy fix (MAI-911 Opportunity 2) was labeled P3 (~10min). This appears already implemented in current codebase — no "6+ guests" text found. Confirmed not a current issue.
- MAI-920/MAI-921 are in flight. New opportunities should be queued unless CEO redirects priority.

---

_Generated by Product Manager Agent (Max) on 2026-05-01 08:00 UTC as part of MAI-922 Product Opportunity Discovery_