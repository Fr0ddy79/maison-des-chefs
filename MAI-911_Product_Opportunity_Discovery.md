# Product Opportunity Discovery

**Issue:** MAI-911
**Date:** 2026-05-01 04:07 UTC
**Status:** ✅ Complete
**Analyst:** Product Manager Agent (Max)
**Model:** MiniMax-M2.7

---

## Executive Summary

This POD examines the Maison des Chefs platform at 04:07 UTC. Recent completed work includes Multi-Chef Inquiry (MAI-908), Cuisine Filter (MAI-894), and Guest Count Price Calculator (MAI-859). The platform is in pre-launch with API key blockers unchanged.

**Two opportunities identified:**
1. **Chef Photo Upload + Service Gallery** — Add dish photography to service detail pages (P2, ~1.5h)
2. **Checkout Corporate Copy Fix** — Fix copy inconsistency in upsell card (P3, ~10min)

---

## Current Platform State

### Recently Completed ✅

| Module | Status | Issue |
|--------|--------|-------|
| Multi-Chef Inquiry UI + API | ✅ Committed | MAI-908 |
| Cuisine Filter on Homepage Hero | ✅ Committed | MAI-894 |
| Guest Count + Price Calculator | ✅ Committed | MAI-859 |
| Book Again CTA on Booking Status | ✅ Committed | MAI-881 |
| Multi-Chef Compare Bar HTML | ✅ Committed | MAI-908 |
| Auth Gate Removal + Trust Messaging | ✅ Committed | MAI-834 |

### Critical Blockers 🔴 (Unchanged)

| Blocker | Impact | Owner | Status |
|---------|--------|-------|--------|
| `RESEND_API_KEY = re_placeholder` | All transactional emails blocked | Fred | Day 12+ |
| `STRIPE_SECRET_KEY = empty` | Payment processing blocked | Fred | Day 12+ |
| Vercel OIDC token expired | Cannot deploy | Fred | Unchanged |

**No agent can unblock these. Fred must act.**

---

## New Opportunities

### Opportunity 1: Chef Photo Upload + Service Gallery (P2)

**Priority: P2 — Visual Trust Signal**

### Problem Statement

Service detail pages currently use a generic hero image based on cuisine type. Diners making a booking decision need visual proof — professional food imagery closes the trust gap and accelerates decisions. The platform has `photos` field in schema but it's never populated or rendered.

### User Story

> **As a** diner viewing a chef's service page,
> **I want to** see photos of the chef's actual dishes,
> **so that** I can visualize the experience and feel confident in my booking decision.

### Current State

- Schema: `services` table has no `photos` column — must add via migration
- API: `PUT /api/services/:id` does not accept or persist photos
- Frontend: `buildServiceDetailPage()` uses `getChefPhoto(cuisineType)` — generic Unsplash based on cuisine label, not actual dishes
- Gallery: No lightbox or photo grid component exists

### Scope

**In:**
- Add `photos` column to `services` table (TEXT, JSON array of URLs, max 6)
- Extend `PUT /api/services/:id` to accept `photos` array (chef-only)
- Add photos grid to service detail page (3-col desktop, 2-col mobile)
- Lightbox modal with prev/next navigation on photo click
- Placeholder banner when no photos uploaded ("Chef photo coming soon")
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

### Opportunity 2: Checkout Corporate Copy Fix (P3)

**Priority: P3 — Quick Fix**

### Problem Statement

The checkout upsell card has a condition mismatch:
- **Card shows:** "Perfect for groups of 6+ guests"
- **Actual offer:** Valid for events with 50+ guests (per corporate pricing rules)

This copy inconsistency creates confusion and potentially bad-fit leads for the corporate offering.

### Current State

- File: `src/routes/checkout.ts` (line ~untracked)
- Issue: Upsell card condition states "6+ guests" but upsell triggers at 50+ guests
- No acceptance criteria currently checked for this

### Scope

**In:**
- Change upsell card text from "6+ guests" to "50+ guests"
- Verify condition logic matches copy

**Out:**
- Any other copy changes
- Redesign of upsell card

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Upsell card copy states "50+ guests" (not "6+") |
| AC2 | Condition logic matches visible copy |

### Success Metrics

| Metric | Target |
|--------|--------|
| Corporate upsell confusion tickets | 0 |

### Effort

~10 min (single text change)

---

## Open Questions

| # | Question | Priority | Owner | Status |
|---|----------|----------|-------|--------|
| 1 | ETA for Stripe live keys + Vercel OIDC refresh? | 🔴 Critical | Fred | 12+ days pending |
| 2 | Photo upload method — URL paste only (v1) or file upload (v2)? | 🟡 Medium | Product | Going with URL paste for v1 |
| 3 | What referral reward structure? | 🟢 Low | Fred | Undecided |

---

## Recommended Tasks

| Task | Owner | Priority | Effort | Notes |
|------|-------|----------|--------|-------|
| Chef Photo Upload + Service Gallery | BE + FE | P2 | ~1.5h | DB migration + API + gallery component |
| Checkout Corporate Copy Fix | FE | P3 | ~10min | Single text change in checkout.ts |

---

## Prior PODs (Recent)

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-898 | Multi-Chef Inquiry (P1) + Service Photo Gallery (P2) identified | ✅ Completed |
| MAI-908 | Multi-Chef Compare Bar UI fix | ✅ Completed |
| MAI-894 | Cuisine Filter on Homepage Hero | ✅ Completed |
| MAI-859 | Guest Count Price Calculator | ✅ Completed |

---

_Generated by Product Manager Agent (Max) on 2026-05-01 04:07 UTC as part of MAI-911 Product Opportunity Discovery_