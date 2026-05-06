# Product Opportunity Discovery — MAI-1102

**Issue:** 0295219a-ac0b-4ddc-9f49-314ae46ff7db  
**Date:** 2026-05-05 04:00 UTC  
**Status:** ✅ Complete  
**Analyst:** Product Manager Agent (Max)  
**Model:** MiniMax-M2.7  

---

## Executive Summary

At 04:00 UTC on 2026-05-05, the most pressing issue is **uncommitted work** — 6 files modified across 3 modules (onboarding wizard, analytics, pages) plus one new email service. This code represents real work in progress and is at risk of drift or conflict. Beyond that, 12 previously identified opportunities remain unactioned, the analytics chef discovery funnel is broken (low-level likely, not code), and critical Fred-owned blockers (Resend, Stripe) persist at 22+ days.

---

## Current Platform State

### maison-des-chefs — Uncommitted Work 🔴

| File | Status | What Changed |
|------|--------|--------------|
| `src/api/onboarding-wizard.ts` | Modified | Chef onboarding wizard — multi-step flow |
| `src/routes/analytics.ts` | Modified | A/B test variant + booking attribution tracking |
| `src/routes/pages.ts` | Modified | Page routing |
| `src/services/chef-onboarding-complete-email.ts` | **New** | Onboarding completion email (Resend) |
| `MAI-1096_Chef_Onboarding_Workflow_Audit.md` | **New** | Audit doc in repo root |
| `MAi-1084_Growth_Optimization.md` | **New** | Growth work (note: filename typo) |
| `reports/` | **New** | New directory |

### maison-des-chefs — Analytics Pipeline 🟡

| Event Type | Implemented | Persisting | Status |
|------------|-------------|------------|--------|
| `service_page_view` | ✅ | ✅ | 27 records in JSONL |
| `chef_discovery_view` | ✅ | ❌ | Not appearing |
| `chef_card_view` | ✅ | ❌ | Not appearing |
| `chef_select` | ✅ | ❌ | Not appearing |
| `filter_applied` | ✅ | ❌ | Not appearing |
| `booking_created` | ✅ | ❌ | Not appearing |

**Root Cause Assessment (MAI-1091):** Code uses identical `sendBeacon` pattern as `service_page_view` which works. Most likely cause: **low traffic volume to chef discovery page**, not a code bug. `service_page_view` only has 27 events over several days — chef discovery page visits may be near-zero during collection period.

### saas/Velocity — Stripe Billing 🔴

| Module | Status |
|--------|--------|
| Auth (JWT + refresh tokens) | ✅ Complete |
| Pricing page spec | ✅ Complete |
| Stripe products/prices spec | ✅ Complete |
| Stripe Checkout integration | ❌ Not started |
| Customer Portal integration | ❌ Not started |

### Critical Blockers 🔴 (Fred Must Resolve — No Change)

| Blocker | Impact | Days Pending |
|---------|--------|---------------|
| `RESEND_API_KEY = re_placeholder` | All transactional emails blocked | 22+ days |
| `STRIPE_SECRET_KEY = empty` | Payment processing + Velocity revenue blocked | 22+ days |
| Vercel OIDC token expired | Cannot deploy | Unknown |

**No agent can unblock these. Fred is the only owner.**

---

## Uncommitted Work Detail

### 1. Chef Onboarding Wizard (`src/api/onboarding-wizard.ts`)

The file shows a multi-step wizard with:
- **Step 1:** Display name, bio, cuisine tags, location
- **Step 2:** Service creation (name, description, price, guest range, category)
- **Step 3:** Blocked dates management
- **Step 4:** Review & publish
- `chef-onboarding-complete-email.ts` supports this with a welcome email

**This is significant new functionality** — a structured onboarding flow replacing the previous ad-hoc chef setup. Must be committed.

### 2. Analytics Routes (`src/routes/analytics.ts`)

Changes include:
- A/B test variant tracking from cookie (MAI-1074)
- `last_viewed_service_id` cookie for booking attribution (MAI-1075)
- `trackChefDiscoveryEvent` function using `sendBeacon` (MAI-1079)
- `trackBookingCreatedEvent` with originating service attribution

### 3. Chef Onboarding Complete Email (`src/services/chef-onboarding-complete-email.ts`)

New file — sends a welcome email when chef completes onboarding. Depends on Resend being configured (currently blocked).

---

## Previously Identified Opportunities (Not Yet Actioned)

### High Priority (P2)

| # | Opportunity | Identified | Status | Notes |
|---|-------------|------------|--------|-------|
| 1 | Booking Follow-up Reminder | MAI-977 | Not started | 48h reminder to diners when chef hasn't responded. Needs Resend. |
| 2 | Pre-Booking Chef Messaging | MAI-987 | Not started | "Ask a Question" on chef profile before committing to booking |
| 3 | Diner Inquiry Competition Indicator | MAI-987 | Not started | Show popularity/competition signal on chef cards |
| 4 | Diner Booking Confidence Score | MAI-966 | Not started | Composite score on service cards (response time + profile completeness + acceptance rate) |
| 5 | Chef Verification Badges | MAI-966 | Not started | Leverage existing `verified` field — low effort, high trust impact |

### Medium Priority (P3)

| # | Opportunity | Identified | Status | Notes |
|---|-------------|------------|--------|-------|
| 6 | Chef Decline Reason Capture | MAI-977 | Not started | Add decline reasons to booking rejection flow |
| 7 | Repeat Booking Analytics Dashboard | MAI-977 | Not started | Admin dashboard for repeat booking rate by chef/event type |
| 8 | Chef Market Rate Benchmark | MAI-987 | Not started | Show chef their price vs cuisine median |
| 9 | Booking Date Flexibility Indicator | MAI-966 | Not started | Availability flexibility badge on service cards |
| 10 | Service Category Landing Pages | MAI-957 | Not started | Dedicated landing pages per cuisine type |
| 11 | Empty State UX Improvements | MAI-957 | Partial | Partially done |
| 12 | Chef Portfolio / Signature Dishes | MAI-946 | Committed | MAI-1047 done |

---

## New Opportunities

No genuinely new opportunities beyond what was identified in MAI-1091 and earlier PODs. The most actionable findings at this cycle are:

### Opportunity 1: Close Uncommitted Work — Onboarding Wizard 🔴

**Priority: P0 — Risk Mitigation**

This is the most urgent action. The onboarding wizard and supporting email service represent significant new functionality sitting uncommitted. The longer this drifts, the higher the conflict risk.

### Problem Statement

6 files modified or new, sitting in working tree with no commit. Any parallel work on these modules risks merge conflicts. The chef onboarding flow is incomplete without the email being functional.

### Scope

**In:** Commit the onboarding wizard changes, the new `chef-onboarding-complete-email.ts` service, and related docs  
**Out:** Deploy to production (blocked on Resend key)

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | `src/api/onboarding-wizard.ts` committed with clear commit message referencing MAI |
| AC2 | `src/services/chef-onboarding-complete-email.ts` committed as new file |
| AC3 | `MAI-1096_Chef_Onboarding_Workflow_Audit.md` moved/cleaned up (consider moving to issues/ directory) |
| AC4 | `src/routes/analytics.ts` and `src/routes/pages.ts` committed with related changes |
| AC5 | `MAi-1084_Growth_Optimization.md` filename typo corrected if committed |

### Owner

**BE** for onboarding wizard + email service  
**FE** for pages.ts routing changes

---

### Opportunity 2: Analytics Funnel — Confirm Chef Discovery Page Traffic 🔴

**Priority: P0 — Data-Driven Decisions**

### Problem Statement

Chef discovery analytics events (`chef_discovery_view`, `chef_card_view`, etc.) are not appearing in `analytics_events.jsonl` despite identical `sendBeacon` patterns to `service_page_view` which works. Without discovery funnel visibility, the team cannot measure A/B tests on the chef discovery experience or understand the discovery → select → inquire → booking conversion path.

### Root Cause (Most Likely)

**Low traffic volume**, not code bug. The `service_page_view` event has only 27 records spanning multiple days — this is a very low-traffic site. The chef discovery page may simply not be getting visited during the data collection window.

### Investigation Steps

1. **Server access log analysis** — Check `/chef/discovery` page request logs to confirm traffic
2. **Temporary debug logging** — Add `console.log` at `sendBeacon` call in `trackChefDiscoveryEvent`
3. **Client-side test** — Manually visit chef discovery page and check if event fires (dev tools network tab)
4. **If no traffic confirmed** — Document as "measurement problem, not code bug" and close

### Scope

**In:** Debug the analytics gap; confirm root cause; document findings  
**Out:** Full analytics dashboard, event attribution beyond first-touch

### Owner

**BE** for server log analysis + endpoint debug logging  
**FE** for client-side verification

---

### Opportunity 3: Chef Onboarding Complete Email with Resend Fallback (P2)

**Priority: P2 — Chef Experience**

### Problem Statement

The new `chef-onboarding-complete-email.ts` file sends a welcome email when a chef finishes onboarding. However, Resend is blocked (placeholder key). The email service should be built with graceful degradation — if Resend isn't configured, the onboarding wizard should still work (email queued or skipped with a note).

### Current State

- `chef-onboarding-complete-email.ts` exists as new file
- Uses Resend SDK with `RESEND_API_KEY` env var
- `FROM_EMAIL` defaults to `onboarding@resend.dev` (Resend's test domain)
- No fallback if Resend is unconfigured

### Scope

**In:**
- Add a `emailEnabled` check before sending — if `!RESEND_API_KEY`, log a warning and skip (don't throw)
- Add admin notification (console/log file) when emails are skipped
- Document in onboarding wizard README/comment that Resend key is required for production

**Out:**
- Full email queueing system
- Retry logic for failed emails

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Onboarding wizard completes successfully even when RESEND_API_KEY is placeholder |
| AC2 | Warning logged when email is skipped due to missing Resend key |
| AC3 | Email sends successfully when real RESEND_API_KEY is provided |

### Owner

**BE**

### Effort

~15 minutes

---

## Priority Matrix

| Priority | Feature | Effort | Impact | Owner | Blocker |
|----------|---------|--------|--------|-------|---------|
| **P0** | Commit Onboarding Wizard Work | ~30 min | HIGH | BE+FE | None |
| **P0** | Analytics Funnel Investigation | ~1h | HIGH | BE+FE | None |
| **P1** | Booking Follow-up Reminder | ~1.5h | HIGH | BE+FE | Needs Resend |
| **P1** | Pre-Booking Chef Messaging | ~2h | HIGH | BE+FE | None |
| **P2** | Resend Graceful Degradation | ~15 min | MEDIUM | BE | None |
| **P2** | Chef Verification Badges | ~45 min | MEDIUM | FE | None |
| **P2** | Diner Booking Confidence Score | ~1h | MEDIUM | BE | None |
| **P3** | Chef Market Rate Benchmark | ~1.5h | MEDIUM | BE | None |
| **P3** | Repeat Booking Analytics Dashboard | ~1.5h | MEDIUM | BE+FE | None |

---

## Open Questions

| # | Question | Priority | Owner | Status |
|---|----------|----------|-------|--------|
| 1 | **ETA for Resend API key + Stripe keys?** | 🔴 Critical | Fred | 22+ days pending |
| 2 | **Vercel OIDC token** — has this been resolved? | 🔴 Critical | Fred | Unknown |
| 3 | **MAi-1084 filename typo** — should this be corrected? | 🟡 Low | BE | Note only |
| 4 | **MAI-1096 audit doc** — should it live in repo root or `issues/` directory? | 🟡 Low | PM | Decision needed |
| 5 | **Analytics gap root cause** — Is chef discovery page being visited at all? | 🟡 Medium | BE+FE | Needs investigation |
| 6 | **Onboarding wizard** — What MAI number does this correspond to? | 🟡 Medium | PM | Needs tracking |

---

## Recommended Immediate Actions

| # | Action | Owner | Priority | Effort |
|---|--------|-------|----------|--------|
| 1 | Commit `src/api/onboarding-wizard.ts` | BE | P0 | ~10 min |
| 2 | Commit `src/services/chef-onboarding-complete-email.ts` | BE | P0 | ~5 min |
| 3 | Commit analytics.ts and pages.ts changes | FE | P0 | ~10 min |
| 4 | Move/clean up `MAI-1096_*.md` and `MAi-1084_*.md` files | PM | P0 | ~5 min |
| 5 | Investigate chef discovery page traffic (access logs + manual test) | BE+FE | P0 | ~1h |
| 6 | Add Resend graceful degradation to email service | BE | P1 | ~15 min |
| 7 | Implement Pre-Booking Chef Messaging | BE+FE | P1 | ~2h |
| 8 | Implement Booking Follow-up Reminder | BE+FE | P1 | ~1.5h |

---

## Notes

1. **Uncommitted work is the most urgent issue.** 6 files in working tree represents real product work at risk. The onboarding wizard especially is significant new functionality.

2. **MAI-618 remains Fred's responsibility.** 22+ days with no change. No agent can unblock Resend or Stripe. This is the single biggest blocker to revenue and operational email.

3. **Analytics gap is likely a traffic problem, not a code problem.** The `sendBeacon` pattern is identical between `service_page_view` (works) and `trackChefDiscoveryEvent` (doesn't appear). Given only 27 service page view events in the entire dataset, traffic volume is the most likely explanation.

4. **Filename typo** in `MAi-1084_Growth_Optimization.md` (capital I instead of lowercase i) — minor but should be corrected if the file is committed.

---

_Generated by Product Manager Agent (Max) — MAI-1102 Product Opportunity Discovery — 2026-05-05 04:00 UTC_