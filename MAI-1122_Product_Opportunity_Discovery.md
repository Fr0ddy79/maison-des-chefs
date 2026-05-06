# Product Opportunity Discovery — MAI-1122

**Issue:** 974a737f-12cf-422d-b407-54e262827f3f
**Date:** 2026-05-05 12:00 UTC
**Status:** ✅ Complete
**Analyst:** Product Manager Agent (Max)
**Model:** MiniMax-M2.7

---

## Executive Summary

**Platform:** Maison des Chefs — two-sided marketplace connecting Montreal diners with verified private chefs.
**Current stage:** Feature-complete MVP, blocked on deployment (RESEND_API_KEY + STRIPE_SECRET_KEY missing).

**New opportunities identified this cycle:**
1. **Homepage CTA Click Tracking** — Add missing event tracking to hero CTAs (P1)
2. **Multi-Chef Compare Bar UI verification** — Confirm UI is present and functional in compiled build (P2)
3. **Repeat Booking Pre-fill Validation** — Verify Book Again flow pre-fills contact fields from cookies (P2)

**Previously flagged items now confirmed built:**
- ✅ Personalized Chef Recommendations — MAI-1120 shipped (homepage pre-fill + services personalization banner)
- ✅ Repeat Booking Shortcut — Book Again button exists in `/diner/bookings`
- ✅ Service Photo Gallery — Frontend complete with lightbox (MAI-926)
- ✅ Homepage CTA click tracking for service CTAs — MAI-1021 bridge exists

---

## Current Platform State

### What's Built ✅

| Module | Status |
|--------|--------|
| Landing Page + Hero Search | Live |
| Services Catalog (`/services`) | Live |
| Chef Compare Checkboxes + Compare Bar | ✅ Built |
| Multi-Chef Inquiry Backend (`POST /api/multi-inquiry`) | ✅ Complete |
| Service Detail Pages (A/B CTA testing) | Live |
| Booking Flow (lead capture → checkout) | Live |
| Stripe Checkout Integration | Built (blocked - no key) |
| Booking Confirmation Emails | ✅ Built (MAI-1104, committed) |
| Chef Dashboard + Waitlist | Live |
| Lead Response SLA Cron | Scheduled |
| Booking Status Page (token-based) | Live |
| Booking Reschedule Flow | ✅ Complete |
| Booking History CSV Export | ✅ Built |
| Diner Preferences System + Personalization | ✅ Built (MAI-1120) |
| Service Photo Gallery + Lightbox | ✅ Complete |
| Homepage Pre-fill from Preferences | ✅ Built (MAI-1120) |
| Personalized Services Banner | ✅ Built |
| Repeat Booking ("Book Again") Button | ✅ Built |
| CTA Click Analytics Bridge | ✅ Built (MAI-1021, MAI-1075) |

### Critical Blockers 🔴

| Blocker | Impact | Owner | Status |
|---------|--------|-------|--------|
| `RESEND_API_KEY = re_placeholder` | All transactional emails blocked | Fred | 17+ days unchanged |
| `STRIPE_SECRET_KEY = empty` | Payment processing blocked | Fred | 17+ days unchanged |
| Platform not deployed | No live conversion path | Fred | Unchanged |

---

## Funnel Analysis

| Step | Event | Count | Rate |
|------|-------|-------|------|
| Homepage views | `page_view` | 40 | 100% |
| Services catalog | `page_view` | ~27 est. | ~67% |
| Service page view | `service_page_view` | 27 | ~67% of homepage |
| CTA click | `cta_click` | 2 | 7.4% of service visitors |
| Booking created | `booking_created` | 11 | Anomalous |

**Known gaps:**
1. Homepage hero CTA buttons have **NO click tracking** — can't measure which CTA (Browse Chefs vs View Services) drives most catalog traffic
2. All service views have `variant: unknown` — A/B variant assignment not working correctly

---

## Opportunity 1: Homepage CTA Click Tracking (P1)

### Problem Statement

The homepage has two prominent hero CTAs ("Browse Chefs" and "View Services") that drive traffic to the services catalog. However, there is zero click tracking on these buttons. We cannot answer: which hero CTA generates the most catalog traffic? This blind spot prevents optimization of the highest-traffic page on the site.

### User Story

> **As a** growth analyst,
> **I want** to track clicks on homepage hero CTAs,
> **so that** I can understand which path diners prefer and optimize the homepage conversion funnel.

### Scope

**In:**
- Track click events for both hero CTAs ("Browse Chefs" → `/chefs`, "View Services" → `/services`)
- Fire `cta_click` event with: `cta_text`, `cta_location = "homepage_hero"`, `destination_path`
- Use same analytics bridge as service page CTA tracking (MAI-1021)
- Persist variant in `cta_variant` cookie for homepage variants (future A/B test)
- Track which CTA variant (if any) was shown when click occurs

**Out:**
- Changes to homepage layout or copy (separate project)
- Multi-variant A/B testing of homepage hero (future work)

### Acceptance Criteria

- [ ] Clicking "Browse Chefs" fires `cta_click` event with `cta_location: "homepage_hero"` and `destination: "/chefs"`
- [ ] Clicking "View Services" fires `cta_click` event with `cta_location: "homepage_hero"` and `destination: "/services"`
- [ ] Event includes `cta_text` and `cta_variant` if set
- [ ] Events appear in analytics pipeline (confirmed by checking analytics JSONL or dashboard)
- [ ] Unauthenticated (no token) diners also tracked

### Success Metrics

| Metric | Target |
|--------|--------|
| Homepage CTA click events logged | >0 per day once deployed |
| Hero CTA → catalog conversion rate measurable | Yes |
| Browse Chefs vs View Services click ratio | Actionable data |

### Effort

~30-45min (add onclick handlers to existing hero CTA anchors)

### Implementation Notes

1. In `buildHomePage()` in `pages.ts`, locate the two hero CTA `<a>` tags
2. Add `onclick="trackHomepageCTAClick(this)"` to each
3. Add `trackHomepageCTAClick()` function that fires `fetch('/api/analytics', { method: 'POST', body: JSON.stringify({ event: 'cta_click', ... }) })`
4. Use same event shape as service CTA tracking: `{ event: 'cta_click', cta_location: 'homepage_hero', cta_text: '...', destination: '...', variant: '...' }`

---

## Opportunity 2: Multi-Chef Compare Bar UI Verification (P2)

### Problem Statement

MAI-903 (multi-chef inquiry backend) and MAI-905 (compare bar UI) were marked complete in prior cycles. However, MAI-1112 noted the compare bar UI "appears absent from the compiled build." Given this is a critical path from catalog → inquiry, we need to verify the UI is actually present and functional.

### What's Built (per codebase)

From `pages.ts`:
- Line 671: `.compare-bar-chef-tag` CSS class exists
- Line 846: Compare bar renders chef tags with `removeChef()` handler
- Line 915: `multiInquiryForm` event listener wired
- Line 934: Fetch to `/api/multi-inquiry` exists
- Line 988: `<form id="multiInquiryForm">` exists

This confirms the compare bar HTML and JS are in the compiled build.

### What We Don't Know

1. **Is the compare bar visible?** — It may be hidden behind a CSS toggle or only renders when `selectedChefs.length > 0`
2. **Are the checkbox selectors on service cards working?** — Need to confirm `addChef()` and `removeChef()` JS functions are wired to service card checkboxes
3. **Does the compiled `dist/` contain the compare bar?** — Build artifacts may not include latest changes

### Scope (Verification + Fix)

**In:**
- Verify compare bar renders when chefs are selected (check `selectedChefs` state)
- Verify service card checkboxes call `addChef(chefId)` on change
- If UI is broken, fix the wiring between checkboxes and compare bar
- Confirm compare bar appears in `dist/` build output

**Out:**
- Any backend changes to multi-inquiry API
- New inquiry features

### Acceptance Criteria

- [ ] Selecting 2+ chefs on `/services` renders the compare bar below the filter section
- [ ] Compare bar shows selected chef tags with count
- [ ] "Compare & Inquire" button in compare bar opens/fills the inquiry form
- [ ] Removing all chefs hides the compare bar
- [ ] Works on mobile (responsive)

### Effort

~30min verification + ~1h fix if needed

### Implementation Notes

1. Check `pages.ts` `buildServicesPage()` — look for `compareBarHtml` rendering logic and whether it's conditional on `selectedChefs.length > 0`
2. Check if service card checkboxes have `onchange="addChef(...)"` wired
3. If compare bar HTML exists but is hidden, fix CSS or JS state
4. If checkboxes aren't wired, add the JS wiring

---

## Opportunity 3: Repeat Booking Pre-fill Validation (P2)

### Problem Statement

The "Book Again" button exists on past booking cards (MAI-993 or earlier). It links to `/book/{serviceId}?guests={guestCount}`. However, the lead form at `/book/:serviceId` pre-fills contact fields (name, email, phone) from cookies — but does it also pre-fill the guest count from the URL param? And does "Book Again" pre-fill the message field or event type from the original booking?

### What's Built

From `server.ts` line 128:
```ts
const prefillGuestsParam = url.searchParams.get('guests');
const guestCount = prefillGuestsParam ? parseInt(prefillGuestsParam, 10) : undefined;
```
And from `pages.ts` `buildBookingPage()`, the guest count IS pre-filled from URL param.

**What's missing (unconfirmed):**
1. Does "Book Again" also pass `bookingId` in URL so we can look up additional pre-fill data (event type, message, dietary notes)?
2. Does the booking API (`/bookings`) return the original `message` or `eventType` so we can pre-fill those too?
3. Is there a "Re-booking [Chef Name]" contextual header in the lead form?

### Scope

**In:**
- Validate current "Book Again" pre-fill UX end-to-end
- If message/eventType are not pre-filled, add them (read from `/bookings/{bookingId}` API)
- Add "Re-booking [Chef Name]" header to lead form when `rebook=true` param is set
- URL param for "Book Again": `/book/{serviceId}?guests=N&bookingId=X&rebook=1`

**Out:**
- One-click booking (requires Stripe)
- Pre-filling chef notes or internal chef comments

### Acceptance Criteria

- [ ] "Book Again" navigates to lead form at `/book/{serviceId}?guests=N&bookingId=X&rebook=1`
- [ ] Lead form shows "Re-booking [Chef Name]" header when `rebook=1`
- [ ] Name, email, phone pre-filled from cookies
- [ ] Guest count pre-filled from URL param (already works)
- [ ] Message field pre-filled from original booking (if API returns it)
- [ ] Event date field cleared and focused

### Effort

~1h (extend API response + update Book Again URL + add contextual header)

---

## Priority Matrix

| Priority | Feature | Effort | Impact | Status |
|----------|---------|--------|--------|--------|
| **P1** | Homepage CTA Click Tracking | ~45min | HIGH | Not built |
| **P2** | Multi-Chef Compare Bar UI Verification | ~1.5h | HIGH | UI exists, needs verification |
| **P2** | Repeat Booking Pre-fill Validation | ~1h | MEDIUM | Partially built, needs UX check |

---

## Previously Identified — Now Confirmed Built ✅

| Item | Evidence |
|------|----------|
| Personalized Chef Recommendations | `pages.ts` lines 243-263 (autoPrefs), 475-480 (banner), 717 (banner rendered) |
| Repeat Booking Shortcut | `diner-bookings-page.ts` line 195 — Book Again button exists |
| Service Photo Gallery | `pages.ts` lines 1073-1132 — photo grid + lightbox JS |
| Homepage Pre-fill from Preferences | `server.ts` lines 120-140 — MAI-1120 |
| CTA Click Analytics Bridge | `pages.ts` lines 1304, 1386-1406 — MAI-1021 |

---

## Open Questions

1. **Homepage hero variants** — Should we A/B test "Browse Chefs" vs "View Services" copy, or just track current clicks first?
2. **Compare bar mobile UX** — Does the compare bar work on mobile or is it desktop-only?
3. **Book Again message pre-fill** — Does the `/bookings` API return the original `message` field from the lead?
4. **Analytics data freshness** — The analytics JSONL files show events from 2026-04-21 only. Is the pipeline actively receiving new events?

---

## Recommended Tasks

| Task | Owner | Priority | Notes |
|------|-------|----------|-------|
| Homepage CTA Click Tracking | Frontend | **P1** | Quick add, high measurement value |
| Multi-Chef Compare Bar UI Verification | Frontend | **P2** | Verify + fix if needed |
| Repeat Booking Pre-fill UX Validation | Frontend | **P2** | Check Book Again end-to-end flow |
| Fix A/B variant assignment for service pages | Frontend | **P2** | All service_page_view events show `variant: unknown` |

---

## Related Prior Work

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-1120 | Homepage pre-fill from preferences | ✅ Complete |
| MAI-1104 | Booking confirmation emails | ✅ Complete |
| MAI-1021 | CTA click analytics bridge | ✅ Built |
| MAI-926 | Service photo gallery frontend | ✅ Complete |
| MAI-905 | Multi-chef compare bar UI | ⚠️ Needs verification |
| MAI-903 | Multi-chef inquiry backend | ✅ Complete |

---

_Generated by Product Manager Agent on 2026-05-05 12:00 UTC as part of MAI-1122 Product Opportunity Discovery_
