# Product Opportunity Discovery — MAI-1414

**Issue:** d2e8654e-54d0-49df-98e4-9a2504166179
**Date:** 2026-05-11 16:00 UTC
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager
**Model:** MiniMax-M2.7

---

## 1. Executive Summary

**Pipeline Status:** 🔴 BLOCKED — Revenue is zero despite active platform
**Core Problem:** Infrastructure failures (Resend, Stripe, Vercel OIDC) continue to plague the platform, blocking payment and notification flows. However, low-hanger fruit exists in operational improvements that don't require fixing infrastructure.

**Key Finding:** The most actionable path forward is **operator-assisted booking rescue** — manual intervention by a human operator who can contact chefs directly and guide pending bookings to completion. This bypasses broken notification infrastructure entirely.

---

## 2. Current Platform State (16:00 UTC)

Based on MAI-1331 (May 9) data and recent git history:

| Metric | Value | Notes |
|--------|-------|-------|
| Published services | 1+ | Platform is live but sparse |
| Pending bookings | 4 | All at risk of dying |
| Confirmed bookings | 0 | No completed booking flow |
| Revenue (pending) | $1,045 | Blocked by broken infrastructure |
| Leads | 8 | 1 converted to booking, 7 new |
| Reviews | 0 | No completed experiences |
| **RESEND_API_KEY** | **Missing** | 🔴 52+ days stale |
| **STRIPE_SECRET_KEY** | **Empty** | 🔴 52+ days stale |
| **Vercel OIDC** | **Expired** | 🔴 52+ days stale |

**Critical path:** Email and payment are completely broken. Any feature that depends on these will fail.

---

## 3. Product Opportunities

### Opportunity #1: Operator Booking Rescue System 🔴 P0

**Problem:** $1,045 in bookings is dying silently. Chef Marcel has 4 pending bookings but isn't responding. Email is broken (RESEND dead), so automated reminders don't work. Diners are abandoning the platform.

**User Story:**
> As an operator, I need a dashboard to see all pending bookings and a way to personally reach Chef Marcel, so I can manually rescue $1,045 in revenue before the May 15 event date.

**Why this works:** It bypasses broken infrastructure entirely — WhatsApp uses personal contact, not email. A human operator (Fred) can send a direct message to Chef Marcel with all booking details and walk him through confirming/declining.

**Scope (MVP):**
1. Operator rescue dashboard at `/admin/rescue`
   - Shows all pending bookings with diner info, event date, guest count, total price
   - Color-coded by age (green < 7d, yellow 7-14d, red > 14d)
   - One-click WhatsApp link to chef
2. WhatsApp pre-fill message with booking details
3. Chef contact field (stored in DB) for WhatsApp number

**Pre-filled WhatsApp message:**
```
🍽️ Booking Request from [Diner Name]
📅 [Event Date] | 👥 [Guest Count] guests
💰 Total: $[Amount]

Please confirm or decline this booking:
https://maisondeschefs.com/chef/bookings

Reply YES to confirm or let us know if you need to decline.
```

**Acceptance Criteria:**
- [ ] Operator dashboard shows all 4 pending bookings with full details
- [ ] Each booking has a WhatsApp button linking to `wa.me/?text=[pre-filled]`
- [ ] Booking age is color-coded (days since created)
- [ ] Chef Marcel's WhatsApp number is in the system (manual entry by Fred)
- [ ] Dashboard is accessible at `/admin/rescue`

**Effort:** ~1 hour (dashboard already exists in `admin-rescue-page.ts`)
**Revenue impact:** Can unlock all $1,045 if Chef Marcel responds

---

### Opportunity #2: Simple Booking Status Page for Diners 📊 P1

**Problem:** Diners who submitted bookings have no way to know what's happening. Booking #1 has been pending for 26+ days with no communication. Diners may think the platform is broken and never return.

**User Story:**
> As a diner, I want to see my booking status and know what to expect next, so I'm not left wondering if my request was received or ignored.

**Scope (MVP):**
1. Booking status page shows:
   - Current status (Pending / Confirmed / Declined)
   - Event details (date, guests, location, total)
   - Chef name and photo
   - "Chef typically responds within 48 hours" notice
   - Time elapsed since submission ("Submitted 3 days ago")
   - After 48h with no response: "Still waiting? We'll follow up" message
2. Email fallback link: `mailto:support@maisondeschefs.com?subject=Booking%20Status%20Inquiry`

**Acceptance Criteria:**
- [ ] Diner can view booking status via unique booking link
- [ ] Page shows event details and chef info
- [ ] Time elapsed is displayed
- [ ] After 48h without chef action, show follow-up message
- [ ] Contact email fallback is provided

**Effort:** ~2 hours
**Dependencies:** None (pure frontend, data already exists)

---

### Opportunity #3: Chef "Response Required" Alert System 📊 P2

**Problem:** 8 leads received, 0 responses from Chef Marcel. No one knows if Chef Marcel is ignoring leads or just overwhelmed. The operator has no visibility into engagement.

**User Story:**
> As an operator, I want to see which leads haven't received a chef response, so I can proactively intervene before diners give up and leave the platform.

**Scope (MVP):**
1. Chef dashboard shows leads table with status:
   - `new` — no action taken
   - `responded` — chef sent a reply
   - `converted` — lead became a booking
2. Visual indicator for leads with no response after 48h
3. "Response rate" metric on chef dashboard: X/Y leads responded

**Acceptance Criteria:**
- [ ] Chef leads page shows all leads with status
- [ ] Leads without response after 48h show warning indicator
- [ ] Response rate displayed (e.g., "3/8 leads responded")
- [ ] Sort by oldest first

**Effort:** ~1 hour
**Dependencies:** None (leads table already exists)

---

## 4. Priority Ranking

| Priority | Opportunity | Revenue Impact | Effort | Dependencies |
|----------|-------------|----------------|--------|--------------|
| 🔴 P0 | Operator Booking Rescue | $1,045 unlockable | ~1 hour | WhatsApp number from Fred |
| 📊 P1 | Booking Status Page | Reduces churn | ~2 hours | None |
| 📊 P2 | Chef Response Alert System | Prevents lead death | ~1 hour | None |

**Recommendation:** Focus on P0 first — the $1,045 is sitting there waiting to be rescued. The admin rescue dashboard already exists in the codebase; it just needs the WhatsApp button wired up and the data populated.

---

## 5. Open Questions

1. **Chef contact method** — Is WhatsApp the best way to reach Chef Marcel? Does Fred have a direct line?
2. **Booking confirmation authority** — Can the operator confirm bookings on behalf of the chef, or does the chef need to personally confirm?
3. **Booking expiration** — If May 15 passes without confirmation, should bookings auto-expire or remain pending?
4. **Infrastructure fix path** — RESEND, STRIPE, Vercel OIDC have been broken 52+ days. Is there a plan to fix these, or is manual intervention the new operational model?

---

## 6. Recommended Actions

| Action | Owner | Priority |
|--------|-------|----------|
| Get Chef Marcel's WhatsApp number and add to DB | Fred | 🔴 Immediate |
| Wire up WhatsApp button on operator rescue dashboard | Frontend/Product | 🔴 Immediate |
| Test booking status page for diner | Frontend | 📊 P1 |
| Add lead response time alerts to chef dashboard | Frontend | 📊 P2 |

---

## Definition of Done

- [x] Platform gaps identified with supporting evidence
- [x] 1-3 high-impact MVP features proposed
- [x] User value clearly stated
- [x] Acceptance criteria defined for each feature
- [x] Open questions documented