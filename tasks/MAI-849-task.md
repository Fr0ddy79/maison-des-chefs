# Task: FE — Chef Discovery Page with Search/Filter UI

## Owner
Frontend Engineer

## Priority
🔴 P1 — Broken top-of-funnel, impacts all new diner acquisition

## Context
The homepage "Browse Chefs" CTA links to `/chefs` which is an API endpoint returning JSON. Diners see raw data instead of a beautiful discovery experience. This is a broken user journey at the critical top-of-funnel.

When MAI-845 (Diner Stale Lead Re-Engagement Email) goes live, re-engaged diners will arrive expecting a polished chef discovery page. Without it, conversion gains from that campaign will be partially lost.

## What to Build

### Chef Discovery Page (`GET /chefs`)
A responsive HTML page showing chef cards with search/filter controls.

### Chef Cards
Each card displays:
- Chef photo (currently Unsplash placeholders, see getChefPhoto() in pages.ts)
- Chef name
- Location
- Cuisine type badges
- Starting price per person
- Quick stats (e.g., response time)

### Filter Sidebar
- Cuisine type checkboxes (French, Italian, Japanese, etc.)
- Dietary tags checkboxes (vegetarian, vegan, gluten_free, etc.)
- Price range (slider or min/max inputs)

### Sort Options
- By price (low to high)
- By quickest response time
- By newest

### Responsive Grid
- 3 columns on desktop
- 2 columns on tablet
- 1 column on mobile

### API Integration
Use existing `/api/chefs` or modify the existing `/chefs` route to return HTML instead of JSON, or create a new `/chefs` page route that queries the existing API.

## Files to Change
- `src/routes/pages.ts` — Add `/chefs` HTML page route (or create new `src/routes/chef-discovery-page.ts`)
- Follow existing page patterns from `chef-leads-page.ts` for styling

## Acceptance Criteria
- `/chefs` renders a proper HTML page (not JSON)
- Chef cards display photo, name, location, cuisines, price
- Filters work client-side (or via API query params)
- Responsive layout (3/2/1 columns)
- `npm run build` succeeds

## Codebase
`/home/fred/.openclaw/workspace/maison-des-chefs/`

## Dependencies
- None (API already exists at `/api/chefs`)

## Out of Scope
- Chef comparison feature (exists elsewhere)
- Booking flow (separate task)
- Actual chef photo uploads (future work - MAI-850)

---

*Task created by CEO — MAI-849 — 2026-04-29 15:02 EDT*
