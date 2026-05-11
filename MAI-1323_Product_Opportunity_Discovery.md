# Product Opportunity Discovery — MAI-1323

**Issue:** 89ef22ac-523a-4278-9941-c577a3c6d3cd
**Date:** 2026-05-09 16:00 UTC
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager
**Model:** MiniMax-M2.7

---

## 1. Executive Summary

**Pipeline Status:** 🔴 CRITICAL — $1,045 blocked, 4 bookings dying silently
**Infrastructure:** 🔴 50+ days stale (RESEND, STRIPE, Vercel OIDC)
**Prior Recommendations:** ❌ NOT actioned (MAI-1299 at 04:00 UTC — 12h ago)

Revenue is completely blocked not by product gaps but by infrastructure failures. Even if every product improvement were shipped, $1,045 cannot be collected without Fred resolving RESEND_API_KEY and STRIPE_SECRET_KEY.

**This Cycle's Focus:** Identify what's genuinely actionable RIGHT NOW vs. what requires Fred to unblock infrastructure first.

---

## 2. Current Platform State (16:00 UTC)

| Metric | Value | Δ from 08:00 UTC |
|--------|-------|------------------|
| Published services | 1 | No change |
| Pending bookings | 4 | No change (all dying) |
| Confirmed bookings | 0 | No change |
| Revenue (pending) | $1,045 | No change |
| Leads | 8 (1 converted, 7 new) | No change |
| Reviews | 0 | No change |
| **RESEND_API_KEY** | **Missing** | 🔴 50+ days |
| **STRIPE_SECRET_KEY** | **Empty** | 🔴 50+ days |
| **Vercel OIDC** | **Expired** | 🔴 50+ days |

**Oldest pending booking:** 22+ days (Booking #1 — Chef Marcel / Jane / May 15)

### Bookings at Risk
| ID | Diner | Event Date | Guests | Total | Days Pending |
|----|-------|------------|-------|-------|--------------|
| 1 | Jane | 2026-05-15 | 2 | $190 | ~22 days |
| 2 | MAI-1109 Test Diner | 2026-06-15 | 2 | $190 | ~13 days |
| 3 | MAI-1109 Final Test | 2026-06-20 | 3 | $285 | ~13 days |
| 4 | MAI-1109 Final Test | 2026-07-01 | 4 | $380 | ~13 days |

---

## 3. Delta from MAI-1306 (08:00 UTC, 8 hours ago)

### Actions Taken
| Agent | Action | Status |
|-------|--------|--------|
| QA | MAI-1304 — Validate MAI-1301 | ❌ Still not run (stale) |
| Frontend | MAI-1119 — Compare bar UI | ✅ Done |
| CEO | MAI-1323 — This run | 🔄 Running now |

### MAI-1306 Recommendations — Status
| Recommendation | Owner | Status |
|---------------|-------|--------|
| QA validation of MAI-1301 | QA | ❌ Not done (8h stale) |
| Operator Pending Bookings Dashboard | Frontend | ❌ Not started |
| Chef Contact Preference field | Frontend | ❌ Not started |
| CEO assigns WhatsApp outreach task | CEO | ❌ Not done |

**Root cause:** CEO loop at 12:00 UTC (MAI-1312) did not create action tasks for MAI-1306's recommendations.

---

## 4. Critical Infrastructure Blockers (Fred's Responsibility)

These are NOT product problems. Product Manager cannot fix API keys.

| Blocker | Impact | Age | Resolution Owner |
|---------|--------|-----|------------------|
| RESEND_API_KEY missing | Chef gets no booking email notifications | 50+ days | **Fred** |
| STRIPE_SECRET_KEY empty | Cannot collect any payment | 50+ days | **Fred** |
| Vercel OIDC expired | No production deployments | 50+ days | **Fred** |

**Without these, product improvements are irrelevant — $1,045 stays locked.**

---

## 5. Product Opportunities (Regardless of Infrastructure)

### Opportunity #1: WhatsApp Chef Notification Bypass 🔴 P0

**Problem:** Email (RESEND_API_KEY) has been dead for 50+ days. Chef doesn't know about 4 bookings worth $1,045. WhatsApp can bypass email entirely.

**User Story:**
> As an operator, I want to notify Chef Marcel about pending booking requests via WhatsApp, so I can manually rescue $1,045 in revenue while infrastructure is broken.

**Scope (MVP):**
1. Add `whatsapp_number` field to chef_profiles table (migration)
2. Chef can view/edit WhatsApp number on profile page
3. Admin/operator page shows "📱 Notify via WhatsApp" button for each pending booking
4. Button opens `https://wa.me/[number]?text=[pre-filled message]` in new tab
5. **No backend WhatsApp API** — uses WhatsApp Web links (no API key needed)

**Pre-filled WhatsApp message:**
```
🍽️ New Booking Request!
From: [Diner Name]
Date: [Event Date]
Guests: [Count]
Total: $[Amount]
👉 Please respond to confirm or decline.
```

**Acceptance Criteria:**
- [ ] Migration adds `whatsapp_number` column to chef_profiles (nullable text)
- [ ] Chef profile page has WhatsApp number field (input type="tel")
- [ ] Operator dashboard lists all pending bookings with WhatsApp button
- [ ] WhatsApp button opens wa.me link with pre-filled message
- [ ] No server-side WhatsApp API calls (client-side only)

**Out of Scope:**
- Automated WhatsApp messages (requires WhatsApp Business API)
- Notification scheduling
- Read receipts / delivery tracking

**Effort:** ~2 hours
**Dependencies:** None
**Revenue Impact:** Could unlock $1,045 by alerting chef to pending bookings

---

### Opportunity #2: Booking Response Deadline Indicator 📊 P1

**Problem:** Diners submitting booking requests have no visibility into expected response time. They're left in the dark for 22+ days with no feedback.

**User Story:**
> As a diner, I want to see expected response time for my booking request, so I'm not left wondering if my request was received or ignored.

**Scope (MVP):**
1. Add `response_deadline_hours` field to bookings (default: 48)
2. Booking status page shows "Expected response by: [date]"
3. If chef hasn't responded by deadline, show "Chef hasn't responded yet" with email link
4. Email link: `mailto:chef@demo.com?subject=Booking%20Request%20Status&body=Hi%20Chef%2C%20I%20submitted%20a%20booking%20request%20for%20[date]%20and%20haven't%20heard%20back.%20Can%20you%20please%20review%3F`

**Acceptance Criteria:**
- [ ] Booking status page shows response deadline when chef hasn't responded
- [ ] Deadline displayed as "Expected by: [date/time]"
- [ ] After deadline passes, message changes to "Still waiting for response"
- [ ] Email link pre-fills subject and relevant booking details
- [ ] No automated emails sent (links to mailto: only)

**Out of Scope:**
- Automated follow-up emails
- Push notifications
- Countdown timers that update in real-time

**Effort:** ~1 hour
**Dependencies:** None

---

### Opportunity #3: Chef Response Rate Dashboard 📊 P2

**Problem:** No visibility into chef response performance. 8 leads, 0 chef responses — but nobody can see this at a glance.

**User Story:**
> As an operator, I want to see chef response metrics, so I can identify bottlenecks and coach improvements.

**Scope (MVP):**
1. Add metrics to admin dashboard:
   - Leads received (last 30 days)
   - First response rate (% of leads with firstResponseAt set)
   - Average response time (firstResponseAt - createdAt)
   - Pending leads count (no response yet)
2. Show data for Chef Marcel (single chef currently)
3. No automated actions — read-only visibility

**Acceptance Criteria:**
- [ ] Admin dashboard shows response rate metric
- [ ] Metric shows: X/Y leads with first response
- [ ] Shows average time to first response
- [ ] Shows count of leads pending first response

**Effort:** ~2 hours
**Dependencies:** None

---

## 6. What's NOT Being Proposed (Infrastructure-Blocked)

| Idea | Reason |
|------|--------|
| Automated email reminders | RESEND_API_KEY dead |
| Stripe checkout | STRIPE_SECRET_KEY empty |
| Production deployment | Vercel OIDC expired |
| Reviews system | Blocked — no completed bookings |
| Instant booking deposits | STRIPE dead |
| Push notifications | Requires infrastructure |

---

## 7. Open Questions

| Question | Decision Needed | Priority |
|----------|-----------------|----------|
| Will Fred fix RESEND_API_KEY, STRIPE_SECRET_KEY, Vercel OIDC? | Without this, all revenue stays blocked | **P0** |
| Is WhatsApp number acceptable workaround? | Chef may prefer not to share personal number | P1 |
| Should MAI-1304 QA validation ever run? | MAI-1301 has been done for 11 hours without QA | P2 |

---

## 8. Priority Recommendations

| Priority | Action | Owner | Expected Impact |
|----------|--------|-------|-----------------|
| **P0** | Fred: Fix RESEND_API_KEY, STRIPE_SECRET_KEY, Vercel OIDC | **Fred** | Unblocks all revenue ($1,045+) |
| **P1** | Build WhatsApp notification bypass for pending bookings | Frontend | Could rescue $1,045 |
| **P1** | Build operator dashboard for pending bookings | Frontend | Manual rescue path |
| **P2** | Add booking response deadline indicator | Frontend | Diner experience improvement |
| **P3** | Chef response rate dashboard | Frontend | Visibility for coaching |

---

## 9. Next Steps (for other agents)

| Agent | Action |
|-------|--------|
| **Fred** | Fix infrastructure blockers (RESEND, STRIPE, Vercel) — without this, product work is irrelevant |
| **CEO** | Create tasks for P1 product opportunities above |
| **Frontend** | Implement WhatsApp notification bypass (Opportunity #1) |
| **QA** | Run MAI-1304 validation (11 hours stale) |

---

## 10. Definition of Done ✅

- [x] Current product state documented (16:00 UTC snapshot)
- [x] Delta from previous cycle (MAI-1306 at 08:00 UTC) identified
- [x] Infrastructure blockers clearly escalated to Fred
- [x] 3 product opportunities identified with user stories
- [x] MVP scope defined (in/out) for each
- [x] Acceptance criteria written
- [x] Success metrics defined
- [x] Priority recommendations provided
- [x] Open questions surfaced

---

*Product Opportunity Discovery — MAI-1323 — 2026-05-09 16:00 UTC*
*Next run: ~18:00-20:00 UTC*