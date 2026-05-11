# Product Opportunity Discovery — MAI-1276

**Issue:** 3347ecc3-5cfa-46ef-8b25-7ac0e2cd9c64
**Date:** 2026-05-08 16:00 UTC
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
| Leads | 8 (1 converted) | No change |
| Reviews | 0 | No completed bookings |

### Infrastructure Blockers (35+ days)
| Blocker | Impact | Owner |
|---------|--------|-------|
| RESEND_API_KEY | Email dead | Fred |
| STRIPE_SECRET_KEY | Payment dead | Fred |
| Vercel OIDC | Deploy blocked | Fred |

---

## 2. Key Observations

### Chef Non-Response is the Revenue Blocker
- 4 pending bookings worth $1,045 are dying silently
- Chef has **never responded** to any booking in 21+ days
- Email notifications broken → chef doesn't know about bookings
- No urgency mechanism in chef dashboard

### Software Gaps Identified (from recent reports)
1. **No text search** on chef discovery page
2. **No category filter** for service browsing
3. **No urgency indicators** for pending bookings
4. **No WhatsApp rescue path** when email fails

### Revenue Path is Broken
```
Diner books → Booking stored ✓
            → Chef notified via email ✗ (RESEND_API_KEY missing)
            → Chef accepts/declines ✗ (chef doesn't know)
            → Payment captured ✗ (STRIPE_SECRET_KEY empty)
```

Result: 0 confirmed bookings, $0 revenue despite $1,045 in pipeline.

---

## 3. Product Opportunities Identified

### Opportunity #1: Chef Dashboard Urgency System 🔴 CRITICAL

**Problem:** Chef has no visibility into pending bookings and no urgency signal. Bookings stay "pending" forever with no escalation path. The email notification path is broken, so chef literally doesn't know about bookings.

**User Story:**
> **As a** chef,
> **I want to** see urgent pending requests prominently,
> **So that** I don't let bookings die and disappoint diners.

**Scope (MVP):**
1. **Chef Dashboard Urgency Banner**
   - If chef has any pending bookings, show prominent red banner: "⚠️ You have X pending booking requests — respond now"
   - Banner persists until chef responds to ALL pending bookings
   - Show oldest pending duration (e.g., "Oldest request: 21 days")

2. **Booking Queue with Urgency Indicators**
   - List pending bookings sorted by age (oldest first)
   - Show "Created X days ago" for each
   - Visual urgency: red highlight for >7 days old

3. **One-Click Actions**
   - Accept button (changes status to 'accepted')
   - Decline button (changes status to 'declined')
   - Both update immediately, no confirmation modal

**Out of Scope:**
- Email notifications (blocked by RESEND_API_KEY)
- WhatsApp integration (P2)
- Payment collection (blocked by STRIPE_SECRET_KEY)

**Acceptance Criteria:**
- [ ] Chef dashboard shows red banner when pending bookings exist
- [ ] Banner displays count and oldest age
- [ ] Pending bookings sorted by age (oldest first)
- [ ] Accept/Decline buttons work and update status immediately
- [ ] After all pending resolved, banner disappears

**Effort:** ~2-3 hours

**Dependencies:** None — works with current schema

---

### Opportunity #2: Operator Rescue Dashboard 🟡 HIGH VALUE

**Problem:** Fred (operator) has no visibility into which bookings are dying and no direct line to the chef. The $1,045 revenue is completely stuck. Manual WhatsApp outreach is the only path, but there's no system to track/rescue.

**User Story:**
> **As an** operator (Fred),
> **I want to** see all pending bookings with diner info and a direct WhatsApp link to the chef,
> **So that** I can personally rescue bookings before diners give up.

**Scope (MVP):**
1. **Operator Dashboard: Pending Bookings View**
   - Show all pending bookings across ALL chefs
   - Columns: Booking ID, Chef Name, Diner Name, Diner Email, Event Date, Total Price, Days Pending
   - Sort by days pending (oldest first)
   - Filter by status (pending/accepted/declined/all)

2. **WhatsApp Rescue Action**
   - "Rescue via WhatsApp" button per booking
   - Generates pre-filled message: `wa.me/?text=Hi [Chef Name]! You have a new booking request: [Diner Name], [Event Date], [Guests] guests, $[Total]. Please confirm or decline: [booking link]`
   - Click opens WhatsApp in new tab

3. **Rescue Tracking**
   - "Rescue Sent" status on booking
   - Timestamp of last rescue attempt
   - Manual: Fred marks as "rescued" after WhatsApp sent

**Out of Scope:**
- Automated WhatsApp sending (requires WhatsApp Business API approval)
- Email notification fixes
- Payment integration

**Acceptance Criteria:**
- [ ] Operator view shows all pending bookings with diner contact info
- [ ] WhatsApp button generates correct pre-filled message
- [ ] "Rescue Sent" status can be set manually
- [ ] Booking details visible (event date, guest count, total price)

**Effort:** ~1-2 hours

**Dependencies:** None — WhatsApp requires no API keys

**Why High Value:** This unblocks $1,045 in revenue with minimal dev work. Fred can manually WhatsApp chef today.

---

### Opportunity #3: Discovery Search & Category Browsing 📊 MEDIUM

**Problem:** Diners cannot search for specific cuisines or browse by service type. The discovery page has filters but no text search and no category filter.

**User Story:**
> **As a** diner,
> **I want to** search for chefs by name or cuisine,
> **So that** I can find what I'm looking for quickly.

**Scope (MVP):**
1. **Text Search Bar**
   - Search input at top of chef discovery page
   - Client-side filtering (no backend change)
   - Matches: chef name, cuisine types, service name, description
   - Clear button to reset

2. **Category Filter**
   - "Category" filter section in sidebar
   - Options: Private Dinner, Cooking Class, Tasting Menu, Catering, Special Occasion
   - Client-side filter by service category

3. **Category Badge on Service Cards**
   - Show category badge (e.g., "Private Dinner") on service cards

**Out of Scope:**
- Server-side search (optimization for later)
- Category management UI for chefs

**Acceptance Criteria:**
- [ ] Search bar visible at top of discovery page
- [ ] Typing filters results in real-time
- [ ] Category filter shows in sidebar
- [ ] Service cards display category badge

**Effort:** ~2-3 hours

---

## 4. Comparison to Previous Cycles (MAI-1269, 12:00 UTC)

| Opportunity | MAI-1269 | MAI-1276 | Change |
|-------------|----------|----------|--------|
| WhatsApp Chef Outreach | P1 | ✅ Evolved | Split into Urgency (P1) + Rescue Dashboard (P2) |
| Booking Auto-Expiration | P2 | Deferred | Not immediate revenue unblock |
| Funnel Analytics | P3 | Deferred | Depends on revenue first |
| Discovery Search | Not covered | P3 | New opportunity from MAI-1255 |

**Note:** The critical evolution here is separating the **chef-facing urgency system** (so chef responds) from the **operator-facing rescue dashboard** (so Fred can manually intervene). These address the same $1,045 revenue problem from different angles.

---

## 5. Priority Recommendation

| Priority | Opportunity | Effort | Revenue Impact | Dependencies |
|----------|-------------|--------|----------------|--------------|
| **P1** | Chef Dashboard Urgency System | ~2-3h | Unblocks existing $1,045 | None |
| **P2** | Operator Rescue Dashboard | ~1-2h | Manual rescue path for Fred | None |
| **P3** | Discovery Search & Categories | ~2-3h | Long-term funnel improvement | None |

**Immediate Action (no build needed):**
Fred can WhatsApp Chef Marcel right now:
```
wa.me/?text=Hi Chef Marcel! You have 4 pending booking requests:
1. Jane, May 15, 2 guests, $190
2. Test diner, June 15, 2 guests, $190
3. MAI-1109 Final, June 20, 3 guests, $285
4. MAI-1109 Final, July 1, 4 guests, $380
Total: $1,045. Please confirm or decline. Link: https://maisondeschefs.com/chef/bookings
```

---

## 6. Open Questions for Fred

| Question | Priority | Action Needed |
|----------|----------|---------------|
| Can you WhatsApp Chef Marcel immediately? | P1 | Manual outreach now |
| Do you want the operator rescue dashboard built? | P2 | Decision |
| What's timeline for RESEND_API_KEY fix? | P1 | Unblocks email automation |
| Should we auto-expire bookings at 7 days? | Backlog | Decision |
| Do you want discovery search/categories? | P3 | Decision |

---

## 7. Definition of Done

- [x] Current platform state analyzed (1 service, 4 pending, $0 revenue)
- [x] Blockers identified (RESEND_API_KEY, STRIPE_SECRET_KEY, Vercel OIDC)
- [x] Key observation: chef non-response is primary revenue blocker
- [x] 3 opportunities identified with clear user value
- [x] Acceptance criteria defined for each
- [x] Effort estimates provided
- [x] Priority recommendation made
- [x] Open questions surfaced for Fred

**Spec Definition of Done:**
- [x] Engineers can implement without guessing
- [x] Scope is clear and bounded for each opportunity
- [x] Open questions surfaced for Fred

---

*Product Opportunity Discovery — MAI-1276 — Product Manager — 2026-05-08 16:00 UTC*