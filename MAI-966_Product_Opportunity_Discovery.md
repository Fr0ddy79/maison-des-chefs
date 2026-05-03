# Product Opportunity Discovery

**Issue:** MAI-966
**Date:** 2026-05-02 08:00 UTC
**Status:** ✅ Complete
**Analyst:** Product Manager Agent (Max)
**Model:** MiniMax-M2.7

---

## Executive Summary

At 08:00 UTC on 2026-05-02, MAI-917 (CTA A/B Test) and MAI-908 (Multi-Chef Compare Bar) are now committed. Uncommitted work includes MAI-940 (Reviews), MAI-921 (Chef Photo Upload), and MAI-948 (Multi-Chef Inquiry Validation). MAI-963 (CTA Verification) and MAI-962 (Reviews Breakdown) were created by CEO Loop. Three opportunities identified: **Diner Booking Confidence Score (P2)**, **Chef Verification Badges (P2)**, and **Booking Date Flexibility Indicator (P3)**.

---

## Current Platform State

### Recently Completed ✅ (Last 4h)

| Module | Status | Issue |
|--------|--------|-------|
| CTA A/B Test Routing | ✅ Committed | MAI-917 |
| Multi-Chef Compare Bar | ✅ Committed | MAI-908 |
| Cuisine Filter on Hero | ✅ Committed | MAI-894 |
| Guest Count Calculator | ✅ Committed | MAI-859 |
| Book Again CTA | ✅ Committed | MAI-881 |
| Quote Reminder Emails | ✅ Committed | MAI-795 |
| Service Photo Gallery | ✅ Complete | MAI-926 |

### In Flight 🔄

| ID | Title | Status |
|----|-------|--------|
| MAI-963 | Verify CTA A/B Test (MAI-917) | Todo — assigned to FE |
| MAI-962 | Break Down MAI-940 Reviews | Todo — assigned to PM (me) |
| MAI-948 | Multi-Chef Inquiry Validation | Task exists, not started |

### Uncommitted Work 🔴

| Module | Files | Priority | Owner |
|--------|-------|----------|-------|
| Reviews System | `src/api/reviews.ts` | P1 | BE+FE |
| Chef Photo Upload | `src/api/chef-photo.ts` | P1 | BE |
| Chef Profile Page | `src/routes/chef-profile-page.ts` | P1 | FE |

### Critical Blockers 🔴 (Fred Must Resolve)

| Blocker | Impact | Days Pending |
|---------|--------|---------------|
| `RESEND_API_KEY = re_placeholder` | All transactional emails blocked | 22+ days |
| `STRIPE_SECRET_KEY = empty` | Payment processing blocked | 22+ days |
| Vercel OIDC token expired | Cannot deploy | Unknown |

**No agent can unblock these. Fred is the only owner.**

---

## New Opportunities Identified

### Opportunity 1: Diner Booking Confidence Score (P2)

**Priority: P2 — Trust Signal / Conversion**

### Problem Statement

Diners browsing services have no aggregate signal to gauge booking reliability. They see price, cuisine type, and chef bio — but not a综合 indicator of how likely they are to have a smooth, confirmed booking experience. This creates hesitation on high-value transactions where diners are committing $200–$500+.

### User Story

> **As a** diner browsing private chef services,
> **I want to** see a booking confidence indicator on each service,
> **so that** I can quickly assess risk and make a confident booking decision.

### Current State

- Services show: price, cuisine, chef bio, max guests, response time tier
- No composite "booking confidence" score exists
- Response time tier exists (`calculate_response_time_tier()`)
- Booking acceptance rate is not tracked per chef
- Service completion rate is not tracked

### Scope

**In:**
- Add `booking_confidence_score` field to service listing (0–100 scale)
- Score computation (initial, MVP):
  - 40% weight: Response time tier (faster = higher)
  - 30% weight: Profile completeness (bio, photo, cuisine tags present)
  - 30% weight: Historical booking acceptance rate (if bookings exist)
- Display as a badge/indicator on service cards and service detail page
- Score categories: Low (0–39), Medium (40–69), High (70–100)

**Out:**
- Predictive booking success modeling
- Real-time score updates
- Chef-facing confidence dashboard

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Service cards display confidence score badge |
| AC2 | Score computation is deterministic and documented |
| AC3 | Missing data (no bookings yet) yields neutral score (50) |
| AC4 | Score visible without authentication |

### Success Metrics

| Metric | Target |
|--------|--------|
| Confidence score → booking conversion lift | +5–10% vs no-score baseline |
| Score distribution | Mostly Medium/High (platform is early) |

### Effort

~1h (new computation function + badge in service cards)

### Dependencies

- None (uses existing data: response time tier, profile data)

---

### Opportunity 2: Chef Verification Badges (P2)

**Priority: P2 — Trust / Credibility**

### Problem Statement

The platform has a `verified` flag on chef profiles but it's not prominently displayed. Diners don't know what "verified" means or what it guarantees. Unverified chefs may be penalized in conversion even if they're legitimate — while the trust signal is buried in data models, not surfaced in UI.

### User Story

> **As a** diner evaluating a chef,
> **I want to** understand what verification badges mean and see them clearly,
> **so that** I can trust the chef's legitimacy and book with confidence.

### Current State

- `chef_profiles.verified` field exists in schema
- No visible badge on chef cards or profile pages
- No explanation of what "verified" means (background check? identity? skills?)
- "Verified" could mean: identity confirmed, payment verified, background check done, skills validated

### Scope

**In:**
- Visual "Verified" badge on chef profile pages (next to name/photo)
- Tooltip on hover explaining what verification means
- Badge also shown on chef cards in search/compare results
- Define 3 badge tiers:
  - 🟡 "Identity Verified" — email + phone confirmed
  - 🟢 "Payment Verified" — payment method on file
  - 🔵 "Background Checked" — (future, placeholder for now)
- Show all applicable badges per chef

**Out:**
- Badge on booking confirmation emails (future)
- Verification status in chef dashboard
- Automated verification workflows

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Verified badge appears on chef profile pages |
| AC2 | Badge explanation tooltip on hover |
| AC3 | Badges shown on chef cards in search results |
| AC4 | Unverified chefs show no badge (neutral) |

### Success Metrics

| Metric | Target |
|--------|--------|
| Verified chef → booking conversion | +15% vs unverified |
| Badge tooltip engagement rate | >20% hover |

### Effort

~45 min (badge component + tooltip + placement on profile/cards)

### Dependencies

- None (backend `verified` field already exists)

---

### Opportunity 3: Booking Date Flexibility Indicator (P3)

**Priority: P3 — UX / Discovery**

### Problem Statement

Diners searching for a chef often don't have a fixed date. They're browsing "sometime in June" but the current UI assumes a specific date is known. Services with broader availability are displayed the same as those with narrow windows, creating disappointment when a seemingly available chef can't actually accommodate the diner's flexible timeline.

### User Story

> **As a** diner with flexible timing,
> **I want to** see which chefs have wide availability windows,
> **so that** I can find someone who can actually accommodate my schedule.

### Current State

- Service detail page requires an event date to check availability
- No "availability score" or flexibility indicator on service cards
- Chefs manage availability via `available` boolean
- No granularity: wide-open availability vs. limited slots shown identically

### Scope

**In:**
- Add `availability_flexibility` indicator to service cards:
  - "High": Available most weekends + weekdays
  - "Medium": Available some weekends or weekday evenings
  - "Low": Limited availability (very few open slots)
- Based on chef's typical response and existing booking patterns
- Shown as a small icon/text on service cards
- Filter option: "Show only High/Flexible availability"

**Out:**
- Calendar integration with real availability slots
- Booking hold/draft functionality
- Availability notifications or waitlist

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Availability flexibility badge appears on service cards |
| AC2 | Badge correctly categorizes chef availability |
| AC3 | Filter option shows only flexible chefs when selected |
| AC4 | Badge updates if chef's overall availability changes |

### Success Metrics

| Metric | Target |
|--------|--------|
| Availability filter usage | >10% of search sessions |
| Flexible availability → booking conversion | Establish baseline |

### Effort

~30 min (indicator computation + badge + filter option)

### Dependencies

- None (uses existing `available` field + booking patterns)

---

## Priority Matrix

| Priority | Feature | Effort | Impact | Dependencies |
|----------|---------|--------|--------|--------------|
| **P2** | Diner Booking Confidence Score | ~1h | MEDIUM | None |
| **P2** | Chef Verification Badges | ~45min | MEDIUM | None (field exists) |
| **P3** | Booking Date Flexibility Indicator | ~30min | LOW | None |

---

## Open Questions

| # | Question | Priority | Owner | Status |
|---|----------|----------|-------|--------|
| 1 | ETA for Stripe live keys + Resend API key? | 🔴 Critical | Fred | 22+ days pending |
| 2 | Platform deployment status? | 🔴 Critical | Fred | Unknown |
| 3 | MAI-962: Break Down MAI-940 Reviews into sub-tasks | 🟡 High | PM | In progress |
| 4 | MAI-963: CTA A/B Test verification — ETA? | 🟡 High | FE | Not started |
| 5 | MAI-948: Multi-Chef Inquiry Validation — priority? | 🟡 Medium | BE+FE | Task exists |

---

## Recommended Tasks

| Task | Owner | Priority | Effort | Dependencies |
|------|-------|----------|--------|--------------|
| Break Down MAI-940 Reviews (MAI-962) | PM | P1 | ~15min | None |
| Commit Reviews System (MAI-940) | BE+FE | P1 | ~15min | MAI-962 first |
| Commit Chef Photo Upload (MAI-921) | BE | P1 | ~10min | None |
| Implement Multi-Chef Inquiry Validation (MAI-948) | BE+FE | P1 | ~1.5h | None |
| Verify CTA A/B Test (MAI-963) | FE | P1 | ~20min | None |
| Diner Booking Confidence Score | BE | P2 | ~1h | None |
| Chef Verification Badges | FE | P2 | ~45min | None (field exists) |
| Booking Date Flexibility Indicator | FE | P3 | ~30min | None |

---

## Prior PODs (Recent)

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-957 (04:00 UTC) | Best Value Sort, Category Landing Pages, Empty State UX | ✅ Identified |
| MAI-952 (00:00 UTC) | Best Value Sort, Category Landing Pages, Empty State UX | ✅ Identified |
| MAI-946 (20:00 UTC) | Multi-Chef Validation, Diner Preferences, Chef Portfolio | ✅ Identified |
| MAI-938 (16:00 UTC) | Quote View Analytics, Stale Lead Escalation, Diner Timeline | ✅ Identified |
| MAI-930 (12:00 UTC) | Chef Response Time Display, Availability Calendar, Saved Search Alerts | ✅ Completed |

---

## Notes

1. **MAI-962 (Break Down Reviews)** is my immediate action item from CEO Loop. I'll create BE and FE sub-tasks.

2. **Diner Booking Confidence Score** is new and genuinely additive — it combines existing signals (response time tier, profile completeness, booking acceptance rate) into one visible metric.

3. **Chef Verification Badges** leverages existing `verified` field — low effort, high trust impact. The key is defining what "verified" means clearly so diners trust the signal.

4. **Multi-chef inquiry validation (MAI-948)** remains unstarted and is P1. It should be prioritized ahead of new opportunities.

---

_Generated by Product Manager Agent (Max) on 2026-05-02 08:00 UTC as part of MAI-966 Product Opportunity Discovery_