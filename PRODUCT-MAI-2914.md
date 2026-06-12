# PRODUCT-MAI-2914: Product Opportunity Discovery

**Created:** 2026-06-12 04:00 America/New_York
**Status:** Complete
**Type:** Product Opportunity Discovery

## Context

This POD builds on MAI-2905 (2026-06-12 00:00) which identified Scarcity Signals on /chefs (GROWTH-MAI-2902). That opportunity has since been implemented (commit 7fdcbda).

This session finds **one actionable opportunity** that was partially identified but stalled: completing the Service Image Gallery wiring that is already in-flight but stale.

---

## Opportunity #1: Complete Service Image Gallery Wiring (MAI-2832 — Stale)

### Problem Statement

MAI-2837 (Phase 1) added an `image_url` column to the `services` table. MAI-2832 (Phase 2) was created to wire it up in the UI but has been in_progress since 2026-06-10 11:07 with no subsequent commits. The `image_url` field exists in the database but is completely absent from the API layer, chef dashboard, and diner-facing chef profile page.

**Diners cannot see photos of the food or experience they're booking.** Service cards on `/chefs/[id]` display only text — title, description, duration, max guests, and price. For a premium dining marketplace, this is a significant conversion gap.

### User Story

**As a** diner
**I want to** see photos of the dining experience offered by a chef
**So that** I can visualize what I'm booking and feel confident submitting an inquiry

**Currently:** A diner reads text descriptions on the chef profile page's "Services & Pricing" section. Without photos, they must mentally extrapolate from text alone — reducing confidence and increasing drop-off.

### Root Cause

The `image_url` column was added to the DB but never integrated into:
1. `/api/chef/services` POST/PUT handlers — `image_url` is not in the request body destructuring or validation
2. `ChefServicesPage` (`/dashboard/chef/services`) — `Service` interface lacks `image_url`, no input field in the form
3. `ChefProfileClient` (`/chefs/[id]`) — `Service` interface lacks `image_url`, service cards render no image

### Scope

**In:**
- Add `image_url` to `Service` interface in `ChefProfileClient.tsx`
- Add `image_url` to `Service` interface in `ChefServicesPage.tsx`
- Display service image (or placeholder) on service cards in chef profile page
- Add `image_url` field to service creation/edit form in chef dashboard
- Add `image_url` to POST/PUT handlers in `/api/chef/services` route
- Show placeholder: `https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop` (fine dining default)
- Build must pass

**Out:**
- Multiple images per service
- File upload API (URL input only for now)
- Image optimization/CDN
- Changes to booking flow

### Acceptance Criteria

- [ ] `image_url` field appears in service creation form at `/dashboard/chef/services`
- [ ] `image_url` field appears in service edit form at `/dashboard/chef/services`
- [ ] Service cards on `/chefs/[id]` display the service image (or placeholder)
- [ ] POST `/api/chef/services` accepts and stores `image_url`
- [ ] PUT `/api/chef/services/[id]` accepts and updates `image_url`
- [ ] Build passes with no errors
- [ ] Commit to main branch

### Metrics

- **Primary:** Booking form start rate after viewing chef profile (target: +10%)
- **Secondary:** Service card CTR from /chefs listing (target: +15%)
- **Guardrail:** `/chefs/[id]` bounce rate (no negative reaction to image loading)

### Open Questions

- Should the placeholder image be cuisine-specific? (e.g., French cuisine gets a different default than Japanese)
- Should service images appear in the `/chefs` listing cards, or only on the detail page?
- Do we need image dimension validation to avoid broken layouts?

---

## No Other Opportunities Found

After reviewing all system areas — booking flow, email system, dashboards (chef/diner/admin), growth/SEO, analytics — **no additional high-impact opportunities were identified**.

The platform remains feature-complete for v1 scope. All revenue-generating features are built and committed.

---

## Blockers (Fred's Action Required — Unchanged 90+ Days)

| Item | Status | Impact |
|------|--------|--------|
| RESEND_API_KEY | Placeholder | All transactional email dead in production |
| STRIPE_SECRET_KEY | Placeholder | No real payments |
| Production deployment | Never done | Platform invisible, €0 revenue |

### Revenue Path

The only steps between this codebase and revenue:
1. Fred provides real `RESEND_API_KEY` (enables transactional email)
2. Fred provides real `STRIPE_SECRET_KEY` (enables payment processing)
3. Fred runs `vercel --prod`

Everything else is built. Every revenue-generating feature is in the codebase. The platform is ready to ship.

---

## Notes

- MAI-2832 is the only in-flight work item with a clear frontend gap
- The stale status (24+ hours without update) suggests the Frontend Engineer may need to be steered back to it
- This POD run confirms GROWTH-MAI-2902 (Scarcity Signals) is now built and committed
- The recurring POD task continues to run every 2–4 hours; future runs will reassess if new gaps emerge or if Fred provides the missing API keys and deploys

---

*Generated by Product Manager — MAI-2914*
