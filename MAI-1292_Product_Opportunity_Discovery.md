# Product Opportunity Discovery — MAI-1292

**Issue:** 490dfdf4-abed-4e6d-8ef3-183390d3bfc8
**Date:** 2026-05-09 00:00 UTC
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager
**Model:** MiniMax-M2.2

---

## 1. Current Platform State

| Metric | Value | Trend |
|--------|-------|-------|
| Published services | 1 | No change |
| Pending bookings | 4 | 🔴 All unanswered (21+ days) |
| Confirmed bookings | 0 | 🔴 Revenue = $0 |
| Total revenue at stake | $1,045 | Across 4 pending |
| Leads | 8 total | 1 converted / 7 open |
| Reviews | 0 | No completed bookings |

### Infrastructure Blockers (51+ days)
| Blocker | Impact | Owner |
|---------|--------|-------|
| RESEND_API_KEY | Email dead — chef gets no booking notifications | Fred |
| STRIPE_SECRET_KEY | Payment dead — can't collect revenue | Fred |
| Vercel OIDC | No production deploys | Fred |

---

## 2. Live Data Snapshot (from maison.db)

### Bookings
| ID | Diner | Event Date | Guests | Total | Status | Age |
|----|-------|------------|--------|-------|--------|-----|
| 1 | Jane | 2026-05-15 | 2 | $190 | pending | ~21 days |
| 2 | MAI-1109 Test Diner | 2026-06-15 | 2 | $190 | pending | ~12 days |
| 3 | MAI-1109 Final Test | 2026-06-20 | 3 | $285 | pending | ~12 days |
| 4 | MAI-1109 Final Test | 2026-07-01 | 4 | $380 | pending | ~12 days |

### Users
| Role | Name | Email |
|------|------|-------|
| chef | Chef Marcel | chef@demo.com |
| diner | Jane | diner@demo.com |
| diner | MAI-1109 Test Diner | test+mai1109@example.com |
| diner | MAI-1109 Final Test | mai1109-final@test.com |

### Service
| Chef | Service Name | Price/person | Category |
|------|-------------|--------------|----------|
| Chef Marcel | Dinner for 2 | $95 | null |

---

## 3. Key Observations

### Revenue Path is Completely Blocked
```
Diner books → Booking stored ✓
            → Chef notified via email ✗ (RESEND_API_KEY missing 51+ days)
            → Chef accepts/declines ✗ (chef doesn't know about bookings)
            → Payment captured ✗ (STRIPE_SECRET_KEY empty)
```

**Result:** 0 confirmed bookings, $0 revenue despite $1,045 in pipeline.

### Chef Has Zero Response Rate (21+ days)
- All 4 pending bookings have `firstChefActionAt = null`
- Chef has never responded to ANY booking request
- 8 total leads, 0 have first response from chef

### Infrastructure Blockers are Root Cause
Software improvements won't fix this. Even perfect UX won't help if:
- Chef can't receive booking notifications (email dead)
- Chef can't accept bookings (no status update mechanism visible)
- Payment can't be collected (STRIPE empty)

### Software Gaps Still Worth Addressing
Even with infrastructure blockers, these opportunities remain valid for when infrastructure is fixed:
1. Chef dashboard has no urgency indicators for pending bookings
2. No operator visibility into dying bookings
3. Discovery page lacks search and category filtering

---

## 4. Prior Cycle Comparison (MAI-1285 @ 20:00 UTC, 4 hours ago)

| Opportunity | MAI-1285 Status | MAI-1292 Assessment |
|-------------|-----------------|----------------------|
| Chef Dashboard Urgency System | P1 — Task MAI-1283 created | ✅ In progress (Frontend Engineer) |
| Operator Rescue Dashboard | P1 — Task MAI-1284 created | ✅ In progress (Frontend Engineer) |
| Discovery Search & Categories | P2 — Not yet built | 🆕 Still relevant |
| WhatsApp Integration | P3 — Not yet built | 🆕 Still relevant |

### What's Changed Since MAI-1285 (May 8 20:00 UTC → May 9 00:00 UTC, 4 hours)
- No new bookings or leads created
- Infrastructure blockers remain unresolved
- MAI-1283 and MAI-1284 are queued with Frontend Engineer
- No new product work completed since last cycle

---

## 5. New Opportunities for This Cycle

### Opportunity #1: WhatsApp-Based Chef Notification Bypass 🔴 CRITICAL

**Problem:** Email (RESEND_API_KEY) has been dead for 51+ days. Chef doesn't know about 4 bookings worth $1,045. WhatsApp can bypass email entirely.

**Current state:**
- 4 pending bookings, chef never responds
- Email dead with no fix in sight
- Chef dashboard shows no urgency for pending bookings
- No fallback notification path

**Proposed solution:**
1. **Chef WhatsApp Number Field** — Add optional WhatsApp number to chef profile
2. **Booking Created → WhatsApp Link Generated** — On new booking, generate wa.me link with pre-filled message
3. **Chef Dashboard CTA** — "Notify via WhatsApp" button next to each pending booking

**Pre-filled WhatsApp message format:**
```
🍽️ New Booking Request!
From: [Diner Name]
Date: [Event Date]
Guests: [Count]
Total: $[Amount]
👉 Respond: [booking link]
```

**Scope (MVP):**
1. Add `whatsapp_number` field to chef_profiles table
2. Chef dashboard shows "📱 Notify via WhatsApp" button for each pending booking
3. Button opens `https://wa.me/[number]?text=[pre-filled message]` in new tab
4. No backend WhatsApp API — uses WhatsApp Web links (no API key needed)

**Out of Scope:**
- Automated WhatsApp messages (requires WhatsApp Business API approval)
- Notification to diner
- Integration with booking status updates

**Acceptance Criteria:**
- [ ] Chef can add WhatsApp number to their profile
- [ ] Pending bookings show "Notify via WhatsApp" button
- [ ] Button opens WhatsApp Web with pre-filled message
- [ ] Works without any API keys (client-side only)

**Effort:** ~1-2 hours
**Dependencies:** None
**Revenue Impact:** Could unlock $1,045 by alerting chef to pending bookings

---

### Opportunity #2: Service Category System 📊 MEDIUM

**Problem:** Discovery page has no categories despite the platform supporting multiple service types. Diners can't filter by what they want (private dinner vs cooking class vs catering).

**User Story:**
> **As a** diner,
> **I want to** browse services by category and filter the results,
> **So that** I can quickly find the type of experience I'm looking for.

**Scope (MVP):**
1. Add `category` field to services table (enum: 'private_dinner', 'cooking_class', 'tasting_menu', 'catering', 'special_occasion')
2. Service creation/edit form includes category dropdown
3. Discovery page sidebar shows category filters (checkboxes)
4. Service cards display category badge
5. Category filter is active (hides non-matching services)

**Acceptance Criteria:**
- [ ] Services have a category field in the database
- [ ] Chefs can select category when creating/editing a service
- [ ] Discovery page shows category filter checkboxes
- [ ] Selecting a category filters the service list
- [ ] Service cards show category badge

**Effort:** ~2-3 hours
**Dependencies:** None

---

## 6. Priority Recommendation

| Priority | Opportunity | Effort | Revenue Impact | Dependencies | Status |
|----------|-------------|--------|----------------|--------------|--------|
| **P0** | **Fred: Fix RESEND_API_KEY, STRIPE_SECRET_KEY, Vercel OIDC** | — | Unblocks all revenue | Fred | 🔴 Critical |
| **P1** | WhatsApp Chef Notification Bypass | ~1-2h | Could unlock $1,045 | None | 🆕 New |
| **P1** | MAI-1283 Chef Dashboard Urgency System | ~2-3h | Unblocks existing bookings | None | ✅ Task created |
| **P1** | MAI-1284 Operator Rescue Dashboard | ~1-2h | Manual rescue path | None | ✅ Task created |
| **P2** | Discovery Search & Category System | ~2-3h | Long-term funnel | None | 🆕 Combined new |
| **P3** | Booking Auto-Expiration | ~2-3h | Long-term hygiene | RESEND or in-app | Deferred |

**Critical Path Forward:**
1. **Fred fixes infrastructure** — without this, $1,045 stays locked
2. **WhatsApp bypass** — immediate workaround to alert chef about pending bookings
3. **Urgency dashboard** — chef needs to see what's pending and act

---

## 7. Open Questions

| Question | Decision Needed | Priority |
|----------|-----------------|----------|
| Will Fred fix RESEND_API_KEY? | Required for email notifications | P0 |
| Will Fred fix STRIPE_SECRET_KEY? | Required for payment collection | P0 |
| Should WhatsApp be opt-in or prompted? | Chef adds number vs. system prompts | P2 |
| What categories should we support? | Need to define enum values | P2 |

---

## 8. Definition of Done

- [x] Live data queried and analyzed
- [x] Infrastructure blockers identified and escalated
- [x] Prior cycle opportunities tracked
- [x] New opportunities identified with scope
- [x] Priority recommendations provided
- [x] Report saved to workspace
