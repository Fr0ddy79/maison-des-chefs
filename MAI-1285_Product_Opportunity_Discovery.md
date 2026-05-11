# Product Opportunity Discovery — MAI-1285

**Issue:** 2f307a9f-1342-4e28-b67c-776b1f9ed672
**Date:** 2026-05-08 20:00 UTC
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager

---

## 1. Current Platform State

| Metric | Value | Trend |
|--------|-------|-------|
| Published services | 1 | No change |
| Pending bookings | 4 | 🔴 All unanswered (21+ days) |
| Confirmed bookings | 0 | 🔴 Revenue = $0 |
| Total revenue at stake | $1,045 | Across 4 pending |
| Leads | 8 | No change |
| Reviews | 0 | No completed bookings |

### Infrastructure Blockers (50+ days)
| Blocker | Impact | Owner |
|---------|--------|-------|
| RESEND_API_KEY | Email dead — chef gets no booking notifications | Fred |
| STRIPE_SECRET_KEY | Payment dead — can't collect revenue | Fred |
| Vercel OIDC expired | No production deploys | Fred |

---

## 2. Key Observations

### Revenue is Completely Blocked
- 4 pending bookings worth $1,045 are dying silently
- Chef has **never responded** to any booking in 21+ days
- Email notification path is broken (RESEND_API_KEY missing 50+ days)
- No urgency mechanism in chef dashboard
- Payment path is broken (STRIPE_SECRET_KEY empty)

### Software Gaps vs. Structural Problems
The infrastructure blockers are the #1 problem. Even perfect software won't fix broken email and payment. However, there are software gaps that are worth addressing:

1. **Chef can't see pending bookings** — no urgency indicator on dashboard
2. **No operator visibility** into dying bookings — Fred can't see what's stuck
3. **No WhatsApp rescue path** — manual outreach is the only option when email fails
4. **No text search or category filter** on discovery page

---

## 3. Prior Cycle Comparison (MAI-1276 @ 16:00 UTC)

| Opportunity | MAI-1276 Status | MAI-1285 Assessment |
|-------------|-----------------|----------------------|
| Chef Dashboard Urgency System | P1 created (MAI-1283) | ✅ Progressing — task created |
| Operator Rescue Dashboard | P2 created (MAI-1284) | ✅ Progressing — task created |
| Discovery Search & Categories | P3 | Still relevant, not yet built |

### What's Changed Since MAI-1276 (16:00 UTC → 20:00 UTC, 4 hours)
- MAI-1283 and MAI-1284 were created by CEO
- Frontend Engineer has MAI-1283 and MAI-1284 in queue
- No new bookings or leads since last analysis
- Infrastructure blockers remain unresolved

---

## 4. New Opportunities for This Cycle

### Opportunity #1: Discovery Page Search & Category Filter 🔵 ONGOING

**Status:** Not yet built, still relevant

**Problem:** Diners cannot search for specific cuisines or browse by service type. The discovery page has a sidebar but no text search and no category filter.

**User Story:**
> **As a** diner,
> **I want to** search for chefs by name or cuisine and filter by category,
> **So that** I can find what I'm looking for quickly.

**Scope (MVP):**
1. **Text Search Bar** — client-side filtering, no backend change
2. **Category Filter** — Private Dinner, Cooking Class, Tasting Menu, Catering, Special Occasion
3. **Category Badge on Service Cards**

**Effort:** ~2-3 hours
**Dependencies:** None

**Acceptance Criteria:**
- [ ] Search bar at top of discovery page filters results in real-time
- [ ] Category filter in sidebar
- [ ] Service cards show category badge
- [ ] TypeScript builds without errors

---

### Opportunity #2: Booking Auto-Expiration (Reminder) 🟡 DEFERRED

**Status:** Deferred — not immediate revenue unblock

**Problem:** Bookings stay "pending" forever with no auto-expiration. If chef doesn't respond in 7 days, the booking should expire and diner should be notified.

**Scope (MVP):**
1. Background job checks bookings daily
2. If booking status is "pending" for >7 days, auto-expire to "expired"
3. Notify diner that their booking expired
4. Chef sees "expired" status on their dashboard

**Effort:** ~2-3 hours
**Dependencies:** RESEND_API_KEY (or use in-app notifications)

---

### Opportunity #3: WhatsApp Integration for Chef Notifications 🟢 EMERGING

**Problem:** Email is broken (RESEND_API_KEY missing 50+ days). WhatsApp is a viable alternative for chef notifications.

**User Story:**
> **As a** chef,
> **I want to** receive WhatsApp notifications for new bookings,
> **So that** I don't miss booking requests even when email is broken.

**Scope (MVP):**
1. Chef can add WhatsApp number to their profile
2. When new booking is created, send WhatsApp via wa.me link (no API needed)
3. Pre-filled message: "New booking request from [Diner Name], [Event Date], [Guests] guests, $[Total]. Accept: [link]"

**Effort:** ~1 hour (frontend only, no API keys needed)

**Why now:** Email has been broken for 50+ days. This gives chefs an alternative notification path without requiring Fred to fix RESEND_API_KEY.

**Dependencies:** None — uses WhatsApp web links

---

## 5. Priority Recommendation

| Priority | Opportunity | Effort | Revenue Impact | Dependencies | Status |
|----------|-------------|--------|----------------|--------------|--------|
| **P0** | **Fred: Fix RESEND_API_KEY, STRIPE_SECRET_KEY, Vercel OIDC** | — | Unblocks all revenue | Fred | 🔴 Critical |
| **P1** | MAI-1283 Chef Dashboard Urgency System | ~2-3h | Unblocks existing $1,045 | None | ✅ Task created |
| **P1** | MAI-1284 Operator Rescue Dashboard | ~1-2h | Manual rescue path | None | ✅ Task created |
| **P2** | Discovery Search & Categories | ~2-3h | Long-term funnel | None | 🆕 New this cycle |
| **P2** | WhatsApp Notification Link | ~1h | Better chef awareness | None | 🆕 New this cycle |
| **P3** | Booking Auto-Expiration | ~2-3h | Future automation | RESEND_API_KEY | Deferred |

---

## 6. Open Questions for Fred

| Question | Priority | Action Needed |
|----------|----------|---------------|
| Can you fix RESEND_API_KEY today? | P0 | Unblocks email for chef |
| Can you fix STRIPE_SECRET_KEY today? | P0 | Unblocks payment |
| Can you renew Vercel OIDC? | P0 | Unblocks production deploy |
| Do you want WhatsApp notification links for chefs? | P2 | Quick win, no API needed |
| Do you want the discovery search feature? | P2 | Long-term funnel improvement |

---

## 7. Definition of Done

- [x] Platform state analyzed (1 service, 4 pending, $0 revenue)
- [x] Blockers identified (RESEND_API_KEY, STRIPE_SECRET_KEY, Vercel OIDC)
- [x] Key observation: infrastructure blockers are #1 problem
- [x] Prior cycle comparison (MAI-1276 vs MAI-1285)
- [x] New opportunities identified (search, WhatsApp, auto-expiration)
- [x] Acceptance criteria defined for each
- [x] Priority recommendation updated
- [x] Open questions surfaced for Fred

**Spec Definition of Done:**
- [x] Engineers can implement without guessing
- [x] Scope is clear and bounded for each opportunity
- [x] Open questions surfaced for Fred

---

*Product Opportunity Discovery — MAI-1285 — Product Manager — 2026-05-08 20:00 UTC*
