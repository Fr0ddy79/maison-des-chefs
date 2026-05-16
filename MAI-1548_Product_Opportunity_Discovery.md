# Product Opportunity Discovery — MAI-1548

**Issue:** 932d3da7-4354-4404-95bc-4c061cbb5dad
**Date:** 2026-05-14 12:00 UTC
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager

---

## 1. Executive Summary

**Platform state:** 4 pending bookings (all stuck 42-55 days), 0 confirmed, 0 reviews. Chef whatsapp = NULL. MAI-1535 (chef-stale-lead-email) just merged — but it emails the CHEF when the diner manually clicks "Chase the Chef" on the booking status page.

**This cycle's finding:** The automatic proactive alert to DINERS when their booking is stagnant has NOT been built. MAI-1535 handles manual re-engagement (diner clicks button). The cron job that automatically finds stale pending bookings and sends alerts without diner action is missing.

**New opportunity:** Automated Booking Stagnation Alert — a cron job that finds pending bookings > 24h old and sends ONE proactive email to the diner with CTAs to follow up or browse alternatives.

**Prior cycle status (MAI-1540):**
| Action Item | Status |
|-------------|--------|
| Chef Stale Lead Email (MAI-1535) | ✅ **COMPLETED** — chef-stale-lead-email.ts shipped |
| Diner Stagnation Alert (automatic) | ❌ **NOT YET BUILT** — gap confirmed |
| RESEND_API_KEY | ✅ Available (stub mode) |
| Chef whatsappNumber | ❌ Still NULL |

---

## 2. Platform State (12:00 UTC May 14)

| Metric | Value | Change Since MAI-1540 |
|--------|-------|----------------------|
| Leads total | 8 | No change |
| Leads converted | 1 | No change |
| Pending bookings | **4** | No change (all 42-55 days old) |
| Confirmed bookings | **0** | No change |
| Completed bookings | **0** | No change |
| Published services | 1 | No change |
| Reviews submitted | 0 | No change |
| Chef whatsappNumber | **NULL** | No change |
| RESEND_API_KEY | Stub mode | No change |

**What's new since last cycle:**
- MAI-1535 merged: `chef-stale-lead-email.ts` emails the chef when a diner clicks "Chase the Chef" on the booking status page
- This is MANUAL — the diner must visit the page and click the button

**What's still missing (the gap):**
- **Automatic** stale booking detection cron job (not manual button click)
- Proactive alert to diners when their booking has been pending > 24h
- No `stagnation_alert_sent_at` field on bookings table
- No `diner-stagnation-alert.ts` service

---

## 3. The Gap: Manual vs. Automatic Alerting

### What MAI-1535 Built (Manual Trigger)
The "Chase the Chef" button on the booking status page emails the chef. But it requires:
1. Diner visits the booking status page
2. Diner notices status is "pending"
3. Diner clicks " Chase the Chef" button
4. Email fires to chef

**Problem:** Diners who submitted a booking 30+ days ago and never heard back are unlikely to check the status page. They assumed it failed or the chef is ignoring them. They never return.

### What Should Exist (Automatic Proactive)
A cron job that **proactively** finds pending bookings > 24h old and sends ONE alert to the diner automatically — no action required from the diner.

```
Every 6 hours:
  Find bookings WHERE status = 'pending' 
    AND createdAt < NOW() - 24 hours
    AND stagnation_alert_sent_at IS NULL
  For each booking:
    Send alert email to diner (using diners.email)
    Set stagnation_alert_sent_at = NOW()
```

This closes the loop MAI-1535 opened. MAI-1535 handles manual re-engagement; this handles automatic proactive alerting.

---

## 4. Opportunity: Automated Booking Stagnation Alert (Diner-Facing)

### Feature Name
**Booking Stagnation Alert** — MVP

### Problem Statement
Diners who submit booking requests have no visibility into whether the chef received or acted on their inquiry. When a booking sits in "pending" for more than 24 hours, the diner receives no communication — they either assume it failed, cancel mentally, or reach out manually. No automated system creates urgency or offers alternatives when the chef doesn't respond within the expected SLA.

### User Story

**As a** diner with a pending booking older than 24 hours  
**I want to** receive an automatic alert informing me my booking is awaiting chef response  
**So that** I can either follow up with the chef, explore alternative chefs, or cancel gracefully before my event date

---

### Scope

**In:**
- Cron job running every 6 hours (`0 */6 * * *`)
- Query: `bookings WHERE status = 'pending' AND createdAt < NOW() - 24h AND stagnation_alert_sent_at IS NULL`
- One alert per booking (idempotent — uses `stagnation_alert_sent_at` for deduplication)
- Email content: chef name, service name, event date, booking status ("waiting for chef response"), CTA buttons
- CTA 1: "Confirm with Chef" → links to booking status page with pre-filled token
- CTA 2: "Browse Other Chefs" → links to /chefs discovery page
- Graceful degradation if RESEND_API_KEY not configured (skip and log, don't crash)

**Out:**
- WhatsApp alerts (requires Twilio + phone number)
- Auto-cancel or auto-expire booking
- Multiple alerts per booking (one-time only)
- In-app notification panel (email-only for MVP)
- Auto-accept or auto-decline logic
- Push notifications

---

### Data Model Changes

```sql
ALTER TABLE bookings ADD COLUMN stagnation_alert_sent_at INTEGER; -- unix timestamp, NULL until alert sent
```

No new tables needed. Reuses existing:
- `bookings.dinerId` → join to `users.email` for diner email
- `bookings.chefId` → join to `users.name` for chef name  
- `bookings.serviceId` → join to `services.name` for service name
- `bookings.accessToken` → for booking status deep link

---

### Technical Approach

1. **Migration:** Add `stagnation_alert_sent_at INTEGER` column to `bookings` table (SQLite: integer stored as unix timestamp)
2. **Service:** `src/services/diner-stagnation-alert.ts` — exports `processStaleBookings()` function
3. **Cron registration:** In `server.ts`, register `startDinerStagnationAlertScheduler()` (runs every 6h: `0 */6 * * *`)
4. **Email builder:** `buildDinerStagnationAlertEmail(params)` — constructs subject + HTML + text
5. **Idempotency:** Check `stagnation_alert_sent_at IS NULL` before sending; set to `NOW()` after send
6. **Delivery:** Reuse existing RESEND email path (same `FROM_EMAIL`, same `resend` client). Graceful skip if not configured.
7. **Link generation:** Use existing `bookings.accessToken` for booking status URL

---

### Email Template Direction

**Subject:** "⏰ Your booking request is waiting for Chef [Name] to respond"

**Content highlights:**
- Header: "Your booking with Chef [Name] needs attention"
- Booking details card: service name, event date, guest count
- Status badge: "Waiting for chef response — [X] days since your request"
- Primary CTA: "Confirm with Chef" → booking status page
- Secondary CTA: "Browse Other Chefs" → /chefs
- Reassurance: "If you need a sooner booking or want to explore options, we're here to help"

---

### Acceptance Criteria

- [ ] Cron job registered in `server.ts`, runs every 6 hours (`0 */6 * * *`)
- [ ] Migration adds `stagnation_alert_sent_at INTEGER` column to `bookings` table
- [ ] Finds pending bookings older than 24h with `stagnation_alert_sent_at IS NULL`
- [ ] Sends ONE alert per booking (idempotent via `stagnation_alert_sent_at`)
- [ ] Skips if RESEND_API_KEY not configured (logs warning, no crash)
- [ ] Skips if diner email not available (logs warning, no crash)
- [ ] Email includes: chef name, service name, event date, guest count
- [ ] Email includes CTA buttons: "Confirm with Chef" + "Browse Other Chefs"
- [ ] Updates `stagnation_alert_sent_at = NOW()` after successful send
- [ ] Uses booking's `accessToken` for deep link to booking status page
- [ ] Graceful handling when `accessToken` is null (falls back to generic booking status URL)

---

### Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Booking accepted before alert fires | Alert skips — `status != 'pending'` |
| Booking cancelled before alert fires | Alert skips |
| Diner email not found | Alert skipped, logged as warning |
| Booking already has `stagnation_alert_sent_at` set | Alert skipped (idempotent) |
| RESEND_API_KEY is placeholder | Stub send, log message |
| Multiple pending bookings for same diner | Each gets its own alert email |
| Booking event date is in the past | Alert still fires — diner needs to know status |
| `accessToken` is NULL | Falls back to generic `/booking-status` URL |

---

### Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Alert delivery rate | 100% of eligible bookings | Count emails sent / eligible bookings found |
| Chef response rate after alert | > 15% of alerted diners result in chef response | Bookings where alert was sent AND status changed to accepted/declined within 7 days |
| Booking status page visits from alert | > 25% click-through | Analytics event on CTA click |
| Diner re-engagement rate | Diners who receive alert are 1.5x more likely to either re-book or contact chef | Compare rebooking rate: alerted diners vs. not alerted (baseline from historical data) |

---

## 5. Implementation Notes

### File Structure
```
src/services/diner-stagnation-alert.ts  (new)
  - buildDinerStagnationAlertEmail(params)
  - sendDinerStagnationAlertEmail(booking)
  - processStaleBookings()
  - startDinerStagnationAlertScheduler()
  - stopDinerStagnationAlertScheduler()

drizzle/XXXX_add_stagnation_alert_field.sql  (generated)
  - ALTER TABLE bookings ADD COLUMN stagnation_alert_sent_at INTEGER

server.ts (update)
  - Import and register startDinerStagnationAlertScheduler()
```

### Key Dependencies
- `node-cron` (already in use by quote-reminder.ts, diner-stale-lead-email.ts)
- `resend` (already in use by other email services)
- No new external dependencies needed

### Testing Approach
- Write unit test for `buildDinerStagnationAlertEmail()`: verify subject, HTML content, CTA links
- Write integration test for `processStaleBookings()`: create test bookings with varying states, verify correct emails sent/not sent
- Manual test: create pending booking > 24h old, run cron manually, verify email received

---

## 6. Open Questions

1. **Email frequency:** Is one alert enough, or should we follow up after 72h if still pending? (MVP = one alert)
2. **Alert timing:** Should the first alert fire at 24h or 48h? (MVP = 24h)
3. **Content personalization:** Should we mention how many days the booking has been pending? (Recommended: yes, adds urgency)
4. **Chase the Chef button relationship:** Should the manual "Chase the Chef" button also set `stagnation_alert_sent_at` to prevent duplicate alerts? (Recommended: yes, prevents email conflict)

---

## 7. Priority Recommendation

**P0 (Must Build):** Automated Booking Stagnation Alert (diner-stagnation-alert.ts + migration)

**Rationale:** 
- 4 pending bookings all stuck 42-55 days with 0 chef responses
- MAI-1535 only handles manual re-engagement; this closes the gap for automatic proactive alerting
- Low complexity (reuses existing email infrastructure, no new external dependencies)
- High impact: diners who feel ignored don't re-engage; this gives them a reason to

**Estimated effort:** 4-6 hours (migration + service + testing)

---

*Document generated by Product Manager agent | MAI-1548 | 2026-05-14 12:00 UTC*