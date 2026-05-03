# Product Opportunity Discovery

**Issue:** MAI-946
**Date:** 2026-05-01 20:00 UTC
**Status:** ✅ Complete
**Analyst:** Product Manager Agent (Max)
**Model:** MiniMax-M2.7

---

## Executive Summary

At 20:00 UTC, MAI-940 (Reviews System spec) is assigned to BE+FE and MAI-941 is in progress. The platform's core booking flow is functional with multi-chef inquiry and service photo gallery in-flight. Three new opportunities identified: **Multi-Chef Inquiry Validation + Cross-Chef View (P1)**, **Diner Preference Persistence (P2)**, and **Chef Portfolio Page (P3)**. MAI-618 (Stripe/Vercel) remains Fred's critical blocker at 20+ days.

---

## Current Platform State

### Recently Completed ✅ (Last 48h)

| Module | Status | Issue |
|--------|--------|-------|
| Reviews System Spec | ✅ Spec Complete | MAI-940 |
| Chef Photo Upload MVP | ✅ Committed | MAI-921 |
| Service Photo Gallery | ✅ BE done, FE in progress | MAI-926 |
| Multi-Chef Compare Bar UI | ✅ Committed | MAI-908 |
| Cuisine Filter on Hero | ✅ Committed | MAI-894 |
| Guest Count + Price Calculator | ✅ Committed | MAI-859 |

### In Flight 🔄

| ID | Title | Status |
|----|-------|--------|
| MAI-940 | BE+FE: Reviews System | Assigned to BE+FE |
| MAI-926 | Service Photo Gallery (FE) | FE in progress |

### Critical Blockers 🔴 (Fred Must Resolve)

| Blocker | Impact | Days Pending |
|---------|--------|---------------|
| `RESEND_API_KEY = re_placeholder` | All transactional emails blocked | 20+ days |
| `STRIPE_SECRET_KEY = empty` | Payment processing blocked | 20+ days |
| Vercel OIDC token expired | Cannot deploy | Unchanged |

**No agent can unblock these. Fred is the only owner.**

---

## Fresh Opportunities Identified

### Opportunity 1: Multi-Chef Inquiry Validation + Cross-Chef Visibility (P1)

**Priority: P1 — Data Integrity / UX**

### Problem Statement

The multi-chef inquiry API (`POST /api/multi-inquiry`) accepts any array of service IDs without validating:
1. That all services belong to different chefs
2. That the services are still available
3. That guest count is valid per service

Additionally, when a diner submits a multi-chef inquiry, no single chef can see that the same diner has inquired with other chefs. This creates a fragmented experience where chefs might waste time crafting quotes for diners who are comparison-shopping across multiple proposals simultaneously.

### User Story

> **As a** platform operator,
> **I want** multi-chef inquiries to be validated for chef diversity and availability,
> **so that** diners receive coherent responses and chefs don't waste time on invalid leads.

### Current State

- `POST /api/multi-inquiry` accepts `{ serviceIds: number[], guestCount: number, message: string }`
- No validation that services belong to different chefs
- No validation that services are available
- No mechanism for a chef to see competing inquiries from the same diner
- Lead schema does not track `multiChefInquiryId` or competing chef relationships

### Scope

**In:**
- Validate `serviceIds` — if any two services belong to the same chef, reject with clear error: "Please select chefs from different providers"
- Validate service availability — if any service has `available = false`, reject with: "One or more services are no longer available"
- Add `inquiryType: 'single' | 'multi'` to leads table
- Add `multiInquiryId` (nullable string UUID) to link related inquiries across chefs
- On lead detail: show "Part of multi-chef inquiry" badge with count of competing chefs
- Chef lead list: sort by `multiInquiryId` to group competing leads
- If diner submits multi-inquiry, generate `multiInquiryId` and attach to each lead

**Out:**
- Notification to chefs about competing quotes (future feature)
- Price comparison UI (future feature)
- Auto-reject or waitlist logic for same-chef multi-inquiries

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Submitting multi-inquiry with services from same chef returns 400 with "different chefs" error |
| AC2 | Submitting multi-inquiry with unavailable service returns 400 with "not available" error |
| AC3 | Each lead created from multi-inquiry shares the same `multiInquiryId` |
| AC4 | Chef leads dashboard shows "Multi-chef" badge on grouped inquiries |
| AC5 | Guest count is validated against each service's `minGuests` / `maxGuests` |

### Success Metrics

| Metric | Target |
|--------|--------|
| Multi-inquiry validation errors caught | 100% |
| Duplicate chef selections in multi-inquiry | <5% of submissions |
| Chef time wasted on invalid inquiries | -50% |

### Effort

~1.5h (API validation + schema update + dashboard badge)

### Dependencies

- None (can be built independently)

---

### Opportunity 2: Diner Preference Persistence (P2)

**Priority: P2 — Conversion / UX**

### Problem Statement

Diners who browse services without booking lose their search context when they return. Filters like cuisine preference, dietary restrictions, date, and guest count are session-only. A diner who specified "French cuisine, 8 guests, next Saturday" must re-enter all of it on return visit. This friction reduces repeat engagement and increases drop-off.

### User Story

> **As a** returning diner who previously browsed services,
> **I want** my search preferences to be remembered,
> **so that** I can quickly resume my search without re-entering information.

### Current State

- Search preferences stored in URL params only
- No persistence across sessions
- No "recent searches" or "saved searches" functionality
- `diner_preferences` table exists but only stores onboarding responses (dietary restrictions, cuisine preferences)

### Scope

**In:**
- On search filter change: save preferences to `localStorage` with key `mdc_search_prefs`
- On homepage load: restore preferences from `localStorage` and pre-fill filters
- Store: `{ cuisineTypes: string[], dietaryRestrictions: string[], guestCount: number, date: string|null, priceRange: [min,max]|null }`
- Add "Clear saved preferences" link on homepage near filters
- On booking abandonment (detected via checkout page load without booking): save search context for re-engagement email
- Preference merge: if `diner_preferences` table has dietary/cuisine, merge with localStorage (localStorage wins for date/guest count)

**Out:**
- Account-based preference sync (requires auth — out of scope for v1)
- Push notifications for price drops
- Automated saved search emails

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Setting filters on `/services` page persists to localStorage immediately |
| AC2 | Returning to `/services` page restores previously selected filters |
| AC3 | "Clear preferences" link resets localStorage and UI filters |
| AC4 | Preferences survive page refresh and browser close |
| AC5 | Mobile localStorage works within Safari/Chrome privacy constraints |

### Success Metrics

| Metric | Target |
|--------|--------|
| Filter restoration rate (return visits with saved prefs) | >40% |
| Return visit → booking conversion | +10% vs cold visits |
| Time-to-first-search on return visits | <5 seconds |

### Effort

~45 min (localStorage read/write + UI reset link)

### Dependencies

- None (fully frontend, no API changes)

---

### Opportunity 3: Chef Portfolio / Showcase Page (P3)

**Priority: P3 — Discovery / Chef Marketing**

### Problem Statement

Current chef profiles (`/chefs/:id`) focus on the chef-as-service-provider — bio, cuisine, price range, services listed. But there's no "portfolio" view showcasing the chef's body of work: event photos, past menus, cooking style videos, or testimonials organized by event type. This is a missed differentiation opportunity — a chef who has done 50 corporate events is different from one who specializes in intimate anniversary dinners, but both show the same profile.

### User Story

> **As a** diner exploring a chef's profile,
> **I want** to see a portfolio of their past work organized by event type,
> **so that** I can quickly assess whether this chef fits my specific occasion.

### Current State

- Chef profile page shows: bio, cuisines, location, price range, services list
- Services are listed but not curated by occasion
- No gallery, video, or past work showcase
- Reviews are on service pages, not chef profile
- Chef can upload photos via `chef-photo.ts` but only for a single photo (not a gallery)

### Scope

**In:**
- Add `portfolioItems` field to `chef_profiles` (JSON array of `{ type: 'photo'|'menu'|'video', url: string, caption: string, occasion: string }`)
- Chef profile edit: allow adding up to 12 portfolio items
- New `/chefs/:id/portfolio` page with:
  - Filter tabs: "All", "Dinner Parties", "Corporate Events", "Weddings", "Private Classes"
  - Grid display of portfolio items with captions and occasion badges
  - Lightbox for photos/videos
  - Chef's stats: "X dinner parties", "Y corporate events" (aggregated from bookings with confirmed status)
- Portfolio section on chef profile page (abbreviated, link to full portfolio)

**Out:**
- Video hosting (YouTube/Vimeo embed URLs only for v1)
- Menu PDF generation
- Automated portfolio from past bookings (future)

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Chef can add portfolio items via profile edit (up to 12) |
| AC2 | Portfolio items have type (photo/menu/video), URL, caption, occasion |
| AC3 | Portfolio page has filter tabs by occasion |
| AC4 | Portfolio items display in lightbox on click |
| AC5 | Chef stats show past event counts by type |

### Success Metrics

| Metric | Target |
|--------|--------|
| Portfolio page → booking conversion | +20% vs non-portfolio profiles |
| Avg time on chef profile | +60 seconds |
| Portfolio completion rate (chefs with 3+ items) | >25% within 30 days |

### Effort

~2h (schema + API + portfolio page + filtering)

### Dependencies

- None (can be built independently)

---

## Open Questions

| # | Question | Priority | Owner | Status |
|---|----------|----------|-------|--------|
| 1 | ETA for Stripe live keys + Vercel OIDC refresh? | 🔴 Critical | Fred | 20+ days pending |
| 2 | Should MAI-940 (Reviews) be prioritized before new opportunities? | 🟡 High | CEO | In flight |
| 3 | Is there a limit on chef photo uploads (currently 1 photo per chef)? | 🟡 Medium | Unknown | Needs clarification |
| 4 | Should portfolio items be limited to URLs or allow file uploads? | 🟡 Medium | Product | Going with URL paste for v1 |

---

## Recommended Tasks

| Task | Owner | Priority | Effort | Dependencies |
|------|-------|----------|--------|--------------|
| Multi-Chef Inquiry Validation + Cross-Chef Visibility | BE + FE | P1 | ~1.5h | None |
| Diner Preference Persistence | FE | P2 | ~45min | None |
| Chef Portfolio Page | BE + FE | P3 | ~2h | None |

---

## Prior PODs (Recent)

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-938 (16:00 UTC) | Quote View Analytics, Stale Lead Escalation, Diner Timeline | ✅ Completed |
| MAI-930 (12:00 UTC) | Chef Response Time Display, Availability Calendar, Saved Search Alerts | ✅ Completed |
| MAI-922 (08:00 UTC) | Service Photo Gallery, Search Enhancement, Corporate Inquiry | ✅ Completed |
| MAI-911 (04:00 UTC) | Photo Upload Spec + Checkout Copy Fix | ✅ Completed |
| MAI-905 | Multi-Chef Inquiry opportunity identified | ✅ Completed |

---

## Notes

- **Multi-Chef Inquiry Validation** addresses a real data integrity gap. The API currently accepts any service combination without checking chef diversity. Implementing this prevents confusing scenarios where a diner selects two services from the same chef.
- **Diner Preference Persistence** is the lowest-effort, highest-frequency UX improvement. Every returning visitor benefits. 45 minutes of work for ongoing value.
- **Chef Portfolio Page** is a differentiation play. In a two-sided marketplace, the supply side (chefs) needs compelling reasons to maintain their profiles. A portfolio page gives chefs something to show off, which benefits both sides.
- MAI-940 (Reviews System) is in flight with BE+FE assigned — no conflict with these opportunities.
- MAI-618 (Stripe/Vercel) remains the only blocker that requires Fred action. All other work can proceed.

---

_Generated by Product Manager Agent (Max) on 2026-05-01 20:00 UTC as part of MAI-946 Product Opportunity Discovery_