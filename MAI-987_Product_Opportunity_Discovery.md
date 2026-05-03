# Product Opportunity Discovery

**Issue:** MAI-987
**Date:** 2026-05-02 16:00 UTC
**Status:** ✅ Complete
**Analyst:** Product Manager Agent (Max)
**Model:** MiniMax-M2.7

---

## Executive Summary

At 16:00 UTC on 2026-05-02, 307 lines of new work are uncommitted across 7 files, primarily the MAI-948 Multi-Chef Inquiry Validation feature (BE+FE code written, migration ready). Previous POD sessions identified 9 opportunities ranging from P2–P3, none yet actioned. Three **new** opportunities identified: **Diner Inquiry Competition Indicator (P2)**, **Pre-Booking Chef Messaging (P2)**, and **Chef Market Rate Benchmark (P3)**. Focus is on closing MAI-948 and escalating high-value trust/conversion features.

---

## Current Platform State

### Recently Completed ✅ (Last 24h)

| Module | Status | Issue |
|--------|--------|-------|
| Chef Response Time Tier | ✅ Committed | MAI-933 |
| Reviews on Service Detail | ✅ Committed | MAI-940 |
| Chef Photo Upload MVP | ✅ Committed | MAI-921 |
| CTA A/B Test Routing | ✅ Committed | MAI-917 |
| Multi-Chef Compare Bar | ✅ Committed | MAI-908 |
| Cuisine Filter on Hero | ✅ Committed | MAI-894 |
| Book Again CTA | ✅ Committed | MAI-881 |

### In Flight 🔄

| ID | Title | Status | Owner |
|----|-------|--------|-------|
| MAI-948 | Multi-Chef Inquiry Validation | 🟡 Working tree (307 lines, not committed) | BE+FE |
| MAI-963 | Verify CTA A/B Test | Todo | FE |

### Uncommitted Work 🔴 (307 Lines, 7 Files — MAI-948)

| File | Change |
|------|--------|
| `src/api/chef-leads.ts` | Add `inquiryType`, `multiInquiryId`, `competingChefCount` |
| `src/api/multi-inquiry.ts` | Chef diversity, availability, guest count validations + UUID linking |
| `src/routes/chef-discovery-page.ts` | Best Value sort option, response time badges, empty state CTAs |
| `src/routes/chef-leads-page.ts` | Multi-chef badge display |
| `src/services/diner-confirmation-email.ts` | Multi-chef confirmation email template |
| `src/routes/pages.ts` | Best value sort routing |
| `data/maison.db` | Migration applied |

### Critical Blockers 🔴 (Fred Must Resolve — No Change)

| Blocker | Impact | Days Pending |
|---------|--------|---------------|
| `RESEND_API_KEY = re_placeholder` | All transactional emails blocked | 22+ days |
| `STRIPE_SECRET_KEY = empty` | Payment processing blocked | 22+ days |
| Vercel OIDC token expired | Cannot deploy | Unknown |

**No agent can unblock these. Fred is the only owner.**

---

## Previously Identified Opportunities (Not Yet Actioned)

| # | Opportunity | Priority | Status |
|---|-------------|----------|--------|
| 1 | Booking Follow-up Reminder System | P2 | Not started |
| 2 | Chef Decline Reason Capture | P3 | Not started |
| 3 | Repeat Booking Analytics Dashboard | P3 | Not started |
| 4 | Diner Booking Confidence Score | P2 | Not started |
| 5 | Chef Verification Badges | P2 | Not started |
| 6 | Booking Date Flexibility Indicator | P3 | Not started |
| 7 | Best Value Sort Option | P2 | ⚠️ FE done, BE missing |
| 8 | Service Category Landing Pages | P3 | Not started |
| 9 | Empty State UX Improvements | P3 | Partially done |

---

## New Opportunities Identified

### Opportunity 1: Diner Inquiry Competition Indicator (P2)

**Priority: P2 — Trust Signal / Conversion**

### Problem Statement

When a diner submits a multi-chef inquiry, they have no visibility into how their inquiry relates to others. Do many diners compete for the same chef on the same date? Is this chef very popular? This creates anxiety and prevents confident booking decisions — diners may either over-commit (booking too many chefs) or under-commit (not booking any, fearing competition they don't understand).

### User Story

> **As a** diner who submitted a multi-chef inquiry,
> **I want to** see how my inquiry relates to others (e.g., "3 other diners are considering this chef for the same weekend"),
> **so that** I can calibrate my expectations and decide whether to pursue this chef or pivot to alternatives.

### Current State

- MAI-948 introduces `multiInquiryId` linking leads from the same inquiry
- `competingChefCount` is computed on chef's lead dashboard (how many other chefs the diner contacted)
- **No diner-facing display** of competitive interest per chef/date
- No signal to diners that they are in a "competition" for a popular chef

### Scope

**In:**
- Add `competingInquiryCount` field to lead confirmation response: number of OTHER chefs the diner contacted in the same multi-inquiry
- On booking status page: display message like "You're comparing {N} chef{s}. {ChefName} is a popular choice — {M} other diners inquired this week."
- Compute `chefPopularityScore` per chef: number of unique multi-inquiry leads in last 7 days
- Show small "Popular" or "{M} interested" badge on chef cards when `chefPopularityScore > 3`

**Out:**
- Real-time availability竞争 (requires booking table changes)
- Per-date heatmap (complex, out of scope)
- Automated "you're outbid" notifications

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Diner sees "comparing N chefs" on booking status page after multi-inquiry |
| AC2 | Chef cards show popularity indicator when >3 inquiries in last 7 days |
| AC3 | Popularity data is computed from leads table (no new schema needed) |
| AC4 | No performance impact — aggregate counts cached or computed on write |

### Success Metrics

| Metric | Target |
|--------|--------|
| Diner confidence score (post-inquiry survey) | +10% vs baseline |
| Multi-inquiry → booking conversion | Establish baseline |

### Effort

~1h (compute aggregation + display on status page + chef card badge)

### Dependencies

- MAI-948 must be committed first (uses `multiInquiryId`)

---

### Opportunity 2: Pre-Booking Chef Messaging (P2)

**Priority: P2 — Discovery / Conversion**

### Problem Statement

The platform only allows diners to message chefs AFTER submitting a booking request. But diners often have pre-booking questions: "Do you accommodate gluten-free?", "Can you cook for 25 people?", "Do you bring your own equipment?". Without a way to ask, diners either guess wrong (leading to declined requests) or skip the chef entirely. This creates friction on both sides — chefs get requests that don't fit, diners get declined or don't bother inquiring.

### User Story

> **As a** diner browsing chef profiles,
> **I want to** send a quick question to a chef before committing to a booking request,
> **so that** I can determine if they're the right fit before investing time in a formal inquiry.

### Current State

- Messaging is tied to booking requests (`POST /api/leads/:id/messages`)
- No pre-booking inquiry channel exists
- Chef profile page has no "Ask a question" or "Contact chef" action
- Diners who want pre-booking info must navigate away (email, phone if listed)

### Scope

**In:**
- Add "Ask a Question" button on chef profile page and service detail page
- Opens a lightweight modal: textarea for question + send button
- Creates a lead with `inquiryType = 'pre_booking'` (new enum value) — not tied to a specific service/date
- Chef receives it in their lead dashboard with a "Pre-Booking" badge
- Chef can reply via the existing messaging flow
- Diner gets email notification with chef's reply
- **No date, guest count, or service selection required**

**Out:**
- Real-time chat (requires WebSocket or polling)
- Pre-booking leads visible in chef discovery search (future)
- Automated FAQs or chatbot

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | "Ask a Question" button visible on chef profile page |
| AC2 | Modal collects question and sends lead with `inquiryType = 'pre_booking'` |
| AC3 | Chef sees pre-booking leads in dashboard with distinct badge |
| AC4 | Diner receives email notification when chef replies |
| AC5 | Pre-booking leads don't appear in chef discovery search results |

### Success Metrics

| Metric | Target |
|--------|--------|
| Pre-booking messages sent per 100 chef profile views | Establish baseline |
| Pre-booking → booking request conversion | >30% |
| Decline rate on bookings from pre-booking inquiries | <15% (vs baseline) |

### Effort

~2h (new API endpoint + modal component + chef dashboard badge + email reply notification)

### Dependencies

- None (standalone feature, can ship independently)

---

### Opportunity 3: Chef Market Rate Benchmark (P3)

**Priority: P3 — Chef Retention / Empowerment**

### Problem Statement

Chefs on the platform have no context for whether their pricing is competitive. A chef pricing themselves at $120/person for Italian might be underpriced (market is $150) or overpriced (market is $80) — they have no signal. This leads to:
1. Underpriced chefs leaving money on the table
2. Overpriced chefs getting fewer booking requests and becoming frustrated
3. Platform-wide pricing inefficiency

### User Story

> **As a** chef setting my prices,
> **I want to** see how my pricing compares to other chefs of the same cuisine in Montreal,
> **so that** I can set competitive rates that attract bookings while reflecting my value.

### Current State

- Chef profile shows only their own `pricePerPerson`
- No aggregate pricing data surfaced to chefs
- Chef has no "pricing assistant" or benchmark tool
- `chefProfiles` stores price_per_person but no aggregation exists

### Scope

**In:**
- Add a "Pricing Benchmark" section in chef dashboard (accessible from profile editor)
- Display: median price per person for chef's cuisine type(s) in Montreal
- Show chef's own price relative to median: "Your price: $X — 15% above median"
- Display price range (10th–90th percentile) as context
- Update when chef updates their price (not real-time)
- **Only shown to chefs who have completed onboarding**

**Out:**
- Automated pricing recommendations or suggestions
- Dynamic repricing alerts
- Price-per-person for specific dates or events

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Chef dashboard shows cuisine-specific median price benchmark |
| AC2 | Chef sees their price vs median with percentage difference |
| AC3 | Benchmark updates when chef changes their own price |
| AC4 | Data is aggregated from published services only (not draft) |

### Success Metrics

| Metric | Target |
|--------|--------|
| Chefs who view pricing benchmark | >50% of active chefs |
| Post-benchmark price adjustment rate | >20% within 30 days |
| Booking rate change after chef price adjustment | Establish baseline |

### Effort

~1.5h (compute aggregation query + display in chef profile editor)

### Dependencies

- None (uses existing service data)

---

## Recommended Priority

| Priority | Opportunity | Rationale |
|----------|-------------|------------|
| **P1** | Close MAI-948 (Multi-Chef Validation) | 307 lines working, blocking other features |
| **P2** | Pre-Booking Chef Messaging | Direct conversion impact, low dependency |
| **P2** | Diner Inquiry Competition Indicator | Trust signal during critical decision moment |
| **P3** | Chef Market Rate Benchmark | Retention/empowerment, low effort |

---

## Open Questions

1. **Pre-booking messages** — Should these count toward "response time" metrics? Could affect chef behavior.
2. **Competition indicator** — Should we show the actual number of competing diners, or just a qualitative signal ("Popular")?
3. **MAI-618 blockers** — Resend + Stripe keys are 22+ days blocked. Should we suggest Fred a workaround (e.g., using a test/mock email provider for development)?

---

## Definition of Done

- [x] Platform state analyzed (uncommitted work, critical blockers, in-flight tasks)
- [x] Previously identified opportunities reviewed
- [x] 3 new opportunities identified with user stories, scope, and acceptance criteria
- [x] Priority recommendation provided
- [x] Dependencies and effort estimated