# Product Opportunity Discovery — MAI-1033

**Issue:** cc4f92d3-07fc-4c0b-9f0b-cc822d92a6c0
**Date:** 2026-05-03 17:00 UTC
**Status:** ✅ Complete
**Analyst:** Product Manager Agent (Max)
**Model:** MiniMax-M2.7

---

## Executive Summary

MAI-1014 (Booking Status Visual Timeline) and MAI-1013 (Reviews on Chef Profile) committed by Fred. MAI-1031 (Service Page View Analytics Bridge) completed. MAI-618 remains Fred's sole critical blocker at 20+ days. Five opportunities identified: **Multi-Chef Funnel Attribution (P1)**, **Chef Quote Reminder Manual Trigger (P2)**, **Lead Engagement Unification (P2)**, **Service Detail Page Dietary Badges (P3)**, and **Lightbox Photo Navigation on Service Pages (P3)**.

---

## Current Platform State

### Recently Completed ✅ (Last 24h)

| Module | Status | Issue | Commit |
|--------|--------|-------|--------|
| Bridge Service Page View to Analytics API | ✅ Live | MAI-1031 | daa1ef0 |
| Bridge CTA Click Events to Analytics API | ✅ Live | MAI-1021 | a823273 |
| Booking Status Visual Timeline | ✅ Committed | MAI-1014 | 43602a3 |
| Reviews on Chef Profile Page | ✅ Committed | MAI-1013 | 9b59950 |
| Analytics Event Persistence (JSONL) | ✅ Live | MAI-1008 | f0e1f73 |
| avgResponseMinutes on Chef API | ✅ Committed | MAI-994 | eaa37f2 |
| Service Photo Gallery | ✅ Live | MAI-926 | — |

### In Flight 🔄

| Issue | Owner | Status | Age | Notes |
|-------|-------|--------|-----|-------|
| MAI-990: Audit & Commit Uncommitted Changes | BE | in_progress | — | Another agent working |
| MAI-1015: Corporate Inquiry Flow | BE+FE | todo | new | Ready to pick up, ~1hr |
| MAI-994: avgResponseMinutes on Chef API | BE | todo | new | Committed but MAI-942 unblocked? |
| MAI-985: Homepage Hero CTA Micro-copy | FE | todo | new | ~30 min task |

### Critical Blockers 🔴

| Blocker | Impact | Days Pending |
|---------|--------|---------------|
| `RESEND_API_KEY = re_placeholder` | All transactional emails blocked | 20+ days |
| `STRIPE_SECRET_KEY = empty` | Payment processing + revenue blocked | 20+ days |
| Vercel OIDC token expired | Cannot deploy | Unknown |

**No agent can unblock these. Fred is the only owner.**

---

## Analytics Pipeline Status

| Event | Tracked | Persisted | Issue |
|-------|---------|---------|-------|
| `service_page_view` | ✅ API call | ✅ Yes (27 events) | MAI-1031 — NOW COMPLETE |
| `cta_click` | ✅ API call | ✅ Yes | MAI-1021 |
| `booking_form_view` | ✅ API call | ✅ Yes | MAI-1010 |
| `booking_form_submit` | ✅ API call | ✅ Yes | Working |
| `multi_inquiry_view` | ❌ Not tracked | ❌ No | GAP |
| `multi_inquiry_submit` | ❌ Not tracked | ❌ No | GAP |
| `quote_reminder_sent` | ❌ Not tracked | ❌ No | GAP |
| `follow_up_sent` | ❌ Not tracked | ❌ No | GAP |

### Full Funnel (Now Measurable)

```
Service Page Views (100%) [TRACKED ✅ - MAI-1031]
    ↓ (CTR ~10-20% — NOW MEASURABLE)
CTA Clicks (10-20%) [TRACKED ✅ - MAI-1021]
    ↓ (Reach ~70%)
Booking Form Views (7-14%) [TRACKED ✅ - MAI-1010]
    ↓ (Submit ~30%)
Inquiry Submissions (2-4%) [TRACKED ✅]
    ↓
Multi-chef Inquiry (X%) [NOT TRACKED - GAP]
    ↓
Quote Received (X%) [NOT TRACKED - GAP]
    ↓
Checkout → Payment [🔴 BLOCKED MAI-618]
```

---

## 1. Opportunity: Multi-Chef Funnel Attribution (P1)

### Priority: P1 — Measurement Foundation

### Problem Statement

Multi-chef inquiry (MAI-990) is live and committed. However, we have **zero visibility** into multi-chef inquiry conversion patterns. We don't know:
- What % of multi-chef inquiries convert to bookings vs single-chef
- Which chefs receive the most multi-chef inquiries
- Whether multi-chef diners are more or less likely to book
- Attribution: which chef "won" the multi-chef inquiry

The `multi_inquiry_id` and `inquiry_type` fields exist on leads, but no analytics events track multi-chef behavior.

### Evidence

- `multi_inquiry_id` and `inquiry_type` fields exist in leads schema
- `inquiryType === 'multi'` checked in chef-leads-page.ts line 131 (renderLeadCard)
- No `multi_inquiry_view` or `multi_inquiry_submit` events in analytics.ts
- No `multiInquiryCount` in chef API responses
- No multi-chef funnel visibility in ab_test_events.jsonl or analytics_events.jsonl

### User Story

> **As a** platform operator,
> **I want to** understand multi-chef inquiry conversion patterns,
> **so that** I can optimize the feature and measure its ROI.

### Scope

**In:**
- Add `multi_inquiry_view` analytics event when diner views multi-chef compare bar (interacts with multi-chef UI)
- Add `multi_inquiry_submit` event when multi-inquiry is submitted
- Add `multi_inquiry_id` and `inquiry_type` to booking form view events (correlate with inquiry type)
- Backend: GET `/api/chefs/:id` includes `multiInquiryCount` (last 30 days)
- Chef leads dashboard: show multi-chef inquiry count badge on lead cards
- Track lead status by inquiry type to measure conversion rates

**Out:**
- Automatic winner selection or recommendation
- Multi-chef inquiry ranking algorithm
- Push notifications or real-time updates

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | `multi_inquiry_view` event tracked when multi-chef compare bar is opened |
| AC2 | `multi_inquiry_submit` event tracked on multi-chef inquiry submission |
| AC3 | `inquiry_type` included in booking form view events |
| AC4 | Chef leads dashboard shows "Multi-chef" badge on multi-inquiry leads |
| AC5 | `GET /api/chefs/:id` returns `multiInquiryCount` (last 30 days) |

### Success Metrics

| Metric | Target |
|--------|--------|
| Multi-chef → booking conversion rate | Establish baseline (0–100%) |
| Multi-chef vs single-chef CVR | Compare within 30 days |
| Average chefs per multi-inquiry | 2–4 range expected |
| Multi-chef inquiry volume | % of total inquiries |

### Effort

~1h (analytics events + dashboard badge + API field)

### Dependencies

- Analytics event persistence already live (MAI-1008)
- Multi-chef inquiry system live (MAI-990)
- MAI-990 "Audit & Commit" may resolve stale leads state

### Notes

- This is P1 because ALL other multi-chef optimizations depend on having baseline metrics
- Without this, we're flying blind on a feature we shipped
- The analytics infrastructure is already in place — just add events and fields

---

## 2. Opportunity: Chef Quote Reminder Manual Trigger (P2)

### Priority: P2 — Chef Empowerment

### Problem Statement

The quote reminder system (MAI-795) runs automatically every 6 hours via cron job. However, chefs have **no on-demand control** to manually trigger a "resend quote reminder" email to a diner who hasn't responded to a quote. An engaged chef may want to nudge a diner immediately rather than waiting for the next cron cycle. The chef leads dashboard has a "Send Quote" button for `responded` status leads, but no "Resend Reminder" for stale quoted leads.

### Evidence

Looking at `chef-leads-page.ts`:
- `sendQuote()` function handles sending/editing quotes (line 140)
- For leads in `responded` status with a quote sent, diners sometimes don't respond
- No button exists for "Resend Quote Reminder" on quoted leads
- `quoteReminderSentAt` field exists in leads schema (schema.ts line 165)
- Quote reminder email template exists (`src/services/quote-reminder.ts` line 47)
- Cron job sends reminders automatically, but manual trigger doesn't exist

### User Story

> **As a** chef who sent a quote,
> **I want to** manually resend a reminder to the diner with a single click,
> **so that** I can actively manage my pipeline without waiting for automated cron jobs.

### Scope

**In:**
- Add `POST /api/chef/leads/:id/resend-quote-reminder` endpoint
- Idempotent: updates `quoteReminderSentAt` only when actually sent
- Rate limited: max 1 manual reminder per 24h per lead
- Sends the same quote reminder email as the cron job (MAI-795 template)
- Accessible from lead detail modal: button next to "Send Quote" for `responded` status leads with `quoteAmount`
- Shows "Reminder sent ✓" feedback with timestamp when already sent

**Out:**
- Email open/click tracking
- Multiple reminder templates (gentle nudge vs. urgent)
- Scheduled reminder customization per lead

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Chef can trigger quote reminder on-demand from lead detail modal |
| AC2 | Email uses same template as automated 6h cron job |
| AC3 | Idempotent: clicking again shows "Already sent" with timestamp |
| AC4 | Rate limited to max 1 manual reminder per 24h per lead |
| AC5 | Button disabled if email was sent within last 24h |

### Success Metrics

| Metric | Target |
|--------|--------|
| Manual reminder trigger rate | Track to establish baseline |
| Quote acceptance rate uplift from manual vs. automatic | +10% (hypothesis) |
| Chef satisfaction with pipeline control | Qualitative |

### Effort

~1h (single API endpoint + frontend button update)

### Dependencies

- `src/services/quote-reminder.ts` — email template already exists
- Lead `quoteReminderSentAt` field already in schema

### Open Questions

| # | Question | Priority |
|---|----------|---------|
| 1 | Should we also add `engagementCount` to track multiple re-engagements? | 🟡 Medium |

---

## 3. Opportunity: Lead Engagement Unification (P2)

### Priority: P2 — Data Clarity

### Problem Statement

The lead schema has two separate re-engagement timestamps that create confusing dual-track logic:
- `staleLeadReengagementSentAt` — for leads in `new`/`pending` status with no quote yet
- `quoteReminderSentAt` — for leads in `responded` status (quote sent, diner hasn't converted)

When investigating "has this diner been re-engaged?", you need to check two fields and understand which applies based on status. There's no single `lastReengagementAt` field to simplify queries.

### Evidence

In `src/db/schema.ts`:
```typescript
quoteReminderSentAt: integer('quote_reminder_sent_at', { mode: 'timestamp' }), // line 165
staleLeadReengagementSentAt: integer('stale_lead_reengagement_sent_at', { mode: 'timestamp' }), // line 178
```

In `src/routes/booking-status-page.ts`:
- Stale lead re-engagement uses `staleLeadReengagementSentAt` (>12h with no response)
- Quote reminder uses `quoteReminderSentAt` (>48h for quoted leads)

These should be unified into a single field that's status-agnostic.

### User Story

> **As a** platform operator,
> **I want** to have a single engagement tracking field per lead,
> **so that** I can easily query re-engagement history and avoid confusing two-track logic.

### Scope

**In:**
- Add `lastEngagementSentAt` timestamp to leads (nullable)
- Update booking-status re-engagement logic to use new field
- Update chef dashboard quote reminder logic to use new field
- Update lead detail view to show "Last Re-engagement" timestamp
- Backwards compatible: old fields remain but are deprecated (no migration needed)

**Out:**
- Deleting old fields (breaking change risk)
- Notification system for email bounces
- Engagement count tracking

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | `lastEngagementSentAt` field added to leads schema |
| AC2 | Booking-status page uses `lastEngagementSentAt` for stale lead re-engagement |
| AC3 | Chef leads dashboard "Resend Quote Reminder" (from Opportunity 2) uses `lastEngagementSentAt` |
| AC4 | Old fields still readable (deprecated, no migration) |

### Success Metrics

| Metric | Target |
|--------|--------|
| Query simplicity | Single field vs. dual field for engagement checks |
| Time to build future re-engagement automations | -20% fewer conditions |

### Effort

~1.5h (schema field + 3 code updates + deprecation comments)

### Dependencies

- None — can be built independently

---

## 4. Opportunity: Service Detail Page Dietary Badges (P3)

### Priority: P3 — Trust & Discovery

### Problem Statement

The dietary filter system (MAI-722) is live and working. Chefs tag their services with dietary accommodations (vegetarian, vegan, gluten-free, halal, kosher, dairy-free, nut-free). However, the **service detail page** doesn't prominently display these tags. Diners who filter by dietary preference may discover a service but not realize it accommodates their dietary needs until deeper in the booking flow.

### Evidence

Looking at `src/routes/pages.ts`:
- `buildDietaryBadges()` function exists (line 21) with proper iconography
- `DIETARY_TAG_LABELS` map provides icons/labels for each tag (line 9)
- Dietary badges are rendered on the service detail page at line 994-997:
  ```typescript
  const dietaryBadgesHtml = service.dietaryTags && service.dietaryTags.length > 0
    ? service.dietaryTags.map((tag: string) => {
        const info = DIETARY_TAG_LABELS[tag];
        return info ? `<span class="dietary-badge-detail">${info.icon} ${info.label}</span>` : '';
      }).join('')
    : '';
  ```
- BUT: this renders only small inline badges — not visually prominent enough

The function exists but the display is muted. A diner scanning the service detail page may miss the dietary info entirely.

### User Story

> **As a** diner with dietary restrictions,
> **I want to** instantly see which dietary accommodations a service offers,
> **so that** I can quickly identify compatible services without reading the full description.

### Scope

**In:**
- Enhance dietary badge display on service detail page:
  - Move badges to a more prominent position (below hero/price area)
  - Use larger badge styling (matching `dietary-badge-detail` at line 1059)
  - Add a "Dietary Options" section header when tags are present
  - Order by importance: vegetarian/vegan first, then others alphabetically
  - Compact badge layout: max 5 visible, "+N more" for overflow

**Out:**
- Filtering by dietary tags on service discovery (already exists via MAI-722)
- "Dietary compatibility score" or recommendation engine
- Chef profile page dietary section (separate concern)

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Service detail page displays dietary tags in a visually prominent section |
| AC2 | Tags use consistent iconography (DIETARY_TAG_LABELS) |
| AC3 | Services with no dietary tags show nothing (no empty section) |
| AC4 | Mobile-friendly layout |

### Success Metrics

| Metric | Target |
|--------|--------|
| Service detail → booking form conversion | +3% (hypothesis) |
| Support tickets about dietary compatibility | -20% |

### Effort

~45min (frontend styling adjustment — function and data already exist)

### Dependencies

- MAI-722 dietary filter system (already live)
- `services.dietaryTags` field already populated

---

## 5. Opportunity: Lightbox Photo Navigation on Service Pages (P3)

### Priority: P3 — UX Polish

### Problem Statement

The service detail page has a photo gallery with a lightbox modal (lines 1005-1008 in pages.ts), but **keyboard and swipe navigation are not implemented**. Users can click thumbnails to open the lightbox, but once open, they cannot navigate between photos without clicking again. This is a broken UX pattern — any photo viewer should support:
- Left/right arrow keys to navigate
- Click outside image to close
- Swipe gestures on mobile

### Evidence

In `pages.ts`:
```typescript
const lightboxHtml = hasPhotos
  ? `<div id="lightbox" class="lightbox" style="display:none;">
      <button class="lightbox-close" onclick="closeLightbox()">&times;</button>
      <button class="lightbox-prev" onclick="prevPhoto(event)">&#10094;</button>
      <button class="lightbox-next" onclick="nextPhoto(event)">&#10095;</button>
      <img id="lightbox-img" src="" alt="Dish photo" />
      <div class="lightbox-counter"><span id="lightbox-counter">1 / ${photos.length}</span></div>
    </div>`
  : '';
```

The buttons exist (`prevPhoto`, `nextPhoto`, `closeLightbox`) but the JavaScript functions that implement keyboard navigation are missing or incomplete.

### User Story

> **As a** diner viewing dish photos,
> **I want to** navigate between photos using arrow keys or swipes,
> **so that** I can browse the gallery smoothly without friction.

### Scope

**In:**
- Implement keyboard navigation: left/right arrows to navigate, Escape to close
- Click outside image area to close lightbox
- Proper event handling to prevent page scroll when lightbox is open
- Update lightbox counter when navigating

**Out:**
- Video in lightbox (not a current requirement)
- Zoom functionality
- Photo download

### Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Left/right arrow keys navigate between photos |
| AC2 | Escape key closes lightbox |
| AC3 | Click outside image closes lightbox |
| AC4 | Lightbox counter updates on navigation |
| AC5 | Page scroll disabled when lightbox is open |

### Success Metrics

| Metric | Target |
|--------|--------|
| Photo navigation completion rate | +20% (more photos viewed per session) |
| Lightbox bounce rate (open and close immediately) | -10% |

### Effort

~30min (JavaScript event handlers + CSS)

### Dependencies

- Lightbox HTML structure already exists (pages.ts line 1005-1008)
- Photo gallery already renders thumbnails

---

## Open Questions

| # | Question | Priority | Owner | Status |
|---|----------|----------|-------|--------|
| 1 | ETA for Stripe live keys + Vercel OIDC refresh? | 🔴 Critical | Fred | 20+ days pending |
| 2 | Should we add `engagementCount` to lead schema? | 🟡 Medium | Product | Future decision |
| 3 | Corporate inquiry threshold — 30 or 50 guests? | 🟡 Medium | CEO | Pending from MAI-1011 |
| 4 | Vercel OIDC token — does Fred need help? | 🔴 Critical | Fred | Unknown |

---

## Recommended Tasks

| Priority | Task | Owner | Effort | Dependencies |
|----------|------|-------|--------|--------------|
| P1 | Multi-Chef Funnel Attribution | BE | ~1h | Analytics persistence live |
| P2 | Chef Quote Reminder Manual Trigger | BE + FE | ~1h | Quote reminder email exists |
| P2 | Lead Engagement Unification | BE | ~1.5h | None |
| P3 | Service Detail Page Dietary Badges | FE | ~45min | MAI-722 already live |
| P3 | Lightbox Photo Navigation | FE | ~30min | Lightbox HTML exists |

---

## Prior POD Reference

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-1029 (May 3 16:00) | Quote reminder control, lead engagement unification, dietary awareness | ✅ Superseded |
| MAI-1011 (May 3 04:00) | Booking timeline (done ✅), reviews on profile (done ✅), corporate inquiry | ✅ Partially superseded |
| MAI-998 (May 2 20:00) | Analytics gap (fixed ✅), booking timeline (done ✅), multi-chef attribution | ✅ Superseded |

---

## Definition of Done

- [x] Platform state analyzed (recently completed, blockers, in-flight work)
- [x] Prior POD opportunities reviewed (MAI-1014/MAI-1013 both committed — good)
- [x] 5 opportunities identified with user stories, scope, and acceptance criteria
- [x] Priority recommendation provided
- [x] Dependencies and effort estimated
- [x] Open questions documented

---

_Generated by Product Manager Agent (Max) on 2026-05-03 17:00 UTC as part of MAI-1033 Product Opportunity Discovery_
