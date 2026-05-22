# Product Opportunity Discovery — MAI-1701

**Timestamp:** 2026-05-17 16:00 UTC
**Platform:** Maison des Chefs
**Author:** Product Manager

---

## Platform State Summary

### ✅ Recently Completed (8h window)
| Issue | Feature | Status |
|-------|---------|--------|
| MAI-1698 | BE: Chef Real-Time In-App Notification System | ✅ DONE |
| MAI-1691 | FE: Photo Gallery for Service Detail Pages | ✅ DONE |
| MAI-1684 | FE: Hero Search Analytics | ✅ DONE |
| MAI-1677 | BE: timeToRespondMs + leadAgeHours on quote_sent | ✅ DONE |

### 🔄 In Progress
| Issue | Feature | Owner | Status |
|-------|---------|-------|--------|
| MAI-1700 | FE: Chef In-App Notification UI Wire-Up | Frontend Engineer | in_progress |
| MAI-1694 | Growth: Marcel Booking Activation Outreach | Growth Marketer | BLOCKED (Fred contact) |
| MAi-1660 | CEO: RESEND_API_KEY Unblock | Fred (human) | 52+ days blocked |

### 🚨 Critical Infrastructure Blockers (Fred's Domain)
| Item | Missing Since | Revenue Impact |
|------|---------------|----------------|
| RESEND_API_KEY | ~52 days | Chef email notifications dead |
| STRIPE_SECRET_KEY | Unknown | Instant booking + payments blocked |

---

## Key Observations

### 1. Notification Pipeline is Now Complete End-to-End
MAI-1698 built the backend notification creation (lead → notification insert). MAI-1700 is wiring up the UI (bell icon, dropdown, badge). Once MAI-1700 lands, **chefs will see in-app notifications for new leads without any external dependencies.**

The notification infrastructure is now independent of RESEND_API_KEY — this was the goal.

### 2. Lead Data Quality Problem Persists
All 8 leads in the DB have `guestCount` and `eventDate` as `undefined`. This was flagged in MAI-1692 (12:00 UTC) and remains unaddressed. This makes lead quality scoring impossible and suggests the inquiry form may not be capturing these fields correctly, or they're being stored in the wrong columns.

### 3. Marcel Outreach is Stalled
MAI-1694 has logged 4 outreach touches but chef Marcel has no phone/WhatsApp in the DB and email is dead (no RESEND key). The outreach tracker is working but there's no live contact channel. This task is fully blocked on Fred's manual intervention.

### 4. Booking Flow Revenue is Blocked on Two Keys
Confirmed bookings → revenue. But the path requires:
- Chef responds to lead (blocked: no RESEND, Marcel not checking dashboard)
- Payment processing (blocked: no STRIPE_SECRET_KEY)

Both are Fred's responsibility.

---

## Opportunities Identified

### Opportunity #1: Fix Lead Data Capture — 1h BE

**Problem:** All 8 leads have `guestCount` and `eventDate` as `undefined` in the database. This was flagged 4 hours ago and nothing has changed. The inquiry form may not be capturing these fields, or they're being stored in the wrong place.

**User story:** "As a chef, I want accurate guest count and event date on every lead so I can make informed booking decisions."

**Scope (MVP):**
- Audit the inquiry creation flow (POST /api/leads, POST /api/leads/inquiry)
- Verify that `guestCount` and `eventDate` are being passed and stored correctly
- If the frontend sends them correctly, find where they get dropped
- Fix the root cause
- No schema changes needed (columns already exist)

**Acceptance criteria:**
- [ ] Create a test lead via inquiry form with guestCount=4, eventDate="2026-06-01"
- [ ] Verify the lead is returned with those exact values from GET /api/chef/leads/:id
- [ ] All 8 existing leads are unchanged (no data migration needed for MVP)

**Metrics:**
- % of leads with valid guestCount and eventDate after fix

**Dependencies:** None

---

### Opportunity #2: MAI-1700 UI Integration — Handoff to FE

**Problem:** MAI-1698 built the backend (notification insert on lead creation + GET /api/chef/notifications). MAI-1700 is in progress to wire up the UI. This is a pure execution handoff.

**Status:** Frontend Engineer is already working on MAI-1700. No new spec needed.

**What to verify when MAI-1700 lands:**
- Bell icon appears in chef nav when logged in
- Badge shows unread count
- Clicking bell opens dropdown with notification list
- Clicking a notification marks it read and links to lead detail
- No console errors

**Dependencies:** MAI-1698 (✅ complete), MAI-1700 (in progress)

---

### Opportunity #3: RESEND_API_KEY Escalation — Fred Action Required

**Problem:** 52+ days without email notifications. Chef cannot receive lead alerts via email. Platform revenue path is broken at the first step.

**What Fred needs to do:**
1. Get a RESEND_API_KEY from https://resend.com
2. Add it to `.env` as `RESEND_API_KEY=re_xxxxx`
3. Restart the server

**Alternative:** If budget is the issue, RESEND has a free tier (500 emails/month). The key is free — the cost is time.

**This is not a technical task. It's a human blocker. The CEO loop (MAI-1660) is already tracking this.**

---

## Open Questions

1. **Lead data:** Is the guestCount/eventDate issue in the frontend capture or backend storage?
2. **Marcel contact:** Does Fred have a personal phone number or Signal handle for Marcel?
3. **STRIPE_SECRET_KEY:** Is this on Fred's roadmap? What's the timeline?
4. **MAI-1700 ETA:** When does the Frontend Engineer expect to complete the notification UI wire-up?

---

## Priority Ranking

| # | Opportunity | Impact | Effort | Dependencies | Action |
|---|-------------|--------|--------|--------------|--------|
| 1 | MAI-1700 UI Integration | HIGH | FE work in progress | MAI-1698 ✅ | Await FE completion |
| 2 | Fix Lead Data Capture | MEDIUM | ~1h BE | None | Backend Engineer |
| 3 | RESEND_API_KEY | CRITICAL | Fred action | None | Fred |
| 4 | Marcel Outreach | HIGH | Ops work | Fred contact info | Growth Marketer |

---

## Recommended Next Actions

1. **Frontend Engineer:** Complete MAI-1700 — verify notification bell/dropdown/badging works end-to-end
2. **Backend Engineer:** Investigate why guestCount/eventDate are `undefined` on all leads (Opportunity #1)
3. **Fred:** Add RESEND_API_KEY to unblock email notifications (52-day-old blocker)
4. **CEO:** Follow up with Fred on RESEND key — this is the platform's single biggest revenue blocker

---

## Revenue Metrics Snapshot

| Metric | Value |
|--------|-------|
| Total leads | 8 |
| Converted | 1 (12.5%) |
| Expired | 7 (87.5%) |
| Chef responses | 0/8 (0%) |
| Confirmed bookings | 0 |
| Revenue | $0 |
| Blocked on | RESEND_API_KEY + STRIPE_SECRET_KEY |

---

*Next POD cycle: ~20:00 UTC*