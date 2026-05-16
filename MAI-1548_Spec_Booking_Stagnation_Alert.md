# Booking Stagnation Alert — Implementation Specification

**Issue:** MAI-1548  
**Parent:** 932d3da7-4354-4404-95bc-4c061cbb5dad  
**Status:** Ready for Engineering  
**Owner:** Product Manager  
**Created:** 2026-05-14  

---

## 1. Problem Statement

Diners who submit booking requests have no visibility into whether the chef received or acted on their inquiry. When a booking sits in "pending" for more than 24 hours, the diner receives no communication — they either assume it failed, cancel mentally, or reach out manually. MAI-1535 built a manual "Chase the Chef" button that emails the chef when the diner clicks it. But diners who submitted a booking 30+ days ago and never heard back are unlikely to return to check status.

**Solution:** An automated cron job that proactively finds pending bookings older than 24 hours and sends ONE alert to the diner with CTAs to follow up or browse alternatives.

---

## 2. User Story

**As a** diner with a pending booking older than 24 hours  
**I want to** receive an automatic alert informing me my booking is awaiting chef response  
**So that** I can either follow up with the chef, explore alternative chefs, or cancel gracefully before my event date

---

## 3. Scope

### In Scope
- Cron job running every 6 hours (`0 */6 * * *`)
- Query: pending bookings created more than 24 hours ago where `stagnation_alert_sent_at IS NULL`
- One alert per booking (idempotent via `stagnation_alert_sent_at` deduplication)
- Email to diner with: chef name, service name, event date, guest count, days pending
- CTA 1: "Confirm with Chef" → booking status page (`/booking-status?token=<accessToken>`)
- CTA 2: "Browse Other Chefs" → `/chefs`
- Graceful degradation if RESEND_API_KEY not configured (skip and log)
- When "Chase the Chef" button is clicked (MAI-1535), also set `stagnation_alert_sent_at` to prevent duplicate alert

### Out of Scope
- WhatsApp alerts
- Auto-cancel or auto-expire booking
- Multiple alerts per booking (one-time only)
- In-app notification panel (email-only MVP)
- Push notifications
- Auto-accept or auto-decline logic

---

## 4. Data Model

### Migration: Add `stagnation_alert_sent_at` to `bookings`

```sql
ALTER TABLE bookings ADD COLUMN stagnation_alert_sent_at INTEGER; -- unix timestamp, NULL until alert sent
```

### Existing fields used
| Field | Source | Usage |
|-------|--------|-------|
| `bookings.dinerId` | bookings | Join to `users.id` → `users.email` for diner email |
| `bookings.chefId` | bookings | Join to `users.id` → `users.name` for chef name |
| `bookings.serviceId` | bookings | Join to `services.id` → `services.name` for service name |
| `bookings.accessToken` | bookings | Deep link to booking status page |
| `bookings.createdAt` | bookings | Calculate "days pending" display |
| `users.email` | users | Email delivery address |
| `users.name` | users | Chef name in email |

---

## 5. API / File Structure

```
src/services/diner-stagnation-alert.ts  (NEW)
  - interface StaleBooking
  - buildDinerStagnationAlertEmail(params): { subject, html, text }
  - sendDinerStagnationAlertEmail(booking): Promise<boolean>
  - processStaleBookings(): Promise<void>
  - startDinerStagnationAlertScheduler(): void
  - stopDinerStagnationAlertScheduler(): void

drizzle/XXXX_add_stagnation_alert_field.sql  (generated)
  - ALTER TABLE bookings ADD COLUMN stagnation_alert_sent_at INTEGER

src/server.ts  (update)
  - Import and call startDinerStagnationAlertScheduler()

src/api/booking-status.ts  (update)
  - When "Chase the Chef" button action fires → also set stagnation_alert_sent_at
```

---

## 6. Function Signature

### buildDinerStagnationAlertEmail

```typescript
function buildDinerStagnationAlertEmail(params: {
  dinerFirstName: string;
  chefName: string;
  serviceName: string;
  eventDate: string | null;
  guestCount: number;
  daysPending: number;
  bookingStatusUrl: string;
  chefsDiscoveryUrl: string;
}): { subject: string; html: string; text: string }
```

### sendDinerStagnationAlertEmail

```typescript
interface StaleBooking {
  id: number;
  dinerId: number | null;
  guestEmail: string | null;
  chefId: number;
  serviceId: number;
  eventDate: string;
  guestCount: number;
  accessToken: string | null;
  createdAt: Date;
  stagnationAlertSentAt: Date | null;
}

async function sendDinerStagnationAlertEmail(booking: StaleBooking): Promise<boolean>
```

### processStaleBookings

```typescript
export async function processStaleBookings(): Promise<{
  found: number;
  sent: number;
  skipped: number;
}>
```

---

## 7. Email Content

**Subject:** `⏰ Your booking with Chef [Name] is waiting for a response`

**HTML Email Sections:**
1. Header: "Your booking needs attention"
2. Booking details card: Chef [Name], [Service], [Event Date], [Guest Count] guests
3. Status badge: "⏳ Waiting for chef response — [X] days since your request"
4. Primary CTA button: "Confirm with Chef" (booking status URL)
5. Secondary CTA button: "Browse Other Chefs" (/chefs URL)
6. Footer: Support email, copyright

**Text Email:** Plain text version of HTML with URLs

---

## 8. Acceptance Criteria

- [ ] Cron job registered in `server.ts`, runs every 6 hours
- [ ] Migration adds `stagnation_alert_sent_at INTEGER` column to `bookings` table
- [ ] Finds pending bookings older than 24h with `stagnation_alert_sent_at IS NULL`
- [ ] Sends ONE alert per booking (idempotent via `stagnation_alert_sent_at`)
- [ ] Skips if RESEND_API_KEY not configured (logs warning, no crash)
- [ ] Skips if diner email not available (guestEmail and dinerId both null) (logs warning, no crash)
- [ ] Email includes: chef name, service name, event date, guest count, days pending
- [ ] Email includes CTA buttons: "Confirm with Chef" + "Browse Other Chefs"
- [ ] Updates `stagnation_alert_sent_at = NOW()` after successful send
- [ ] Uses booking's `accessToken` for deep link to booking status page
- [ ] Graceful handling when `accessToken` is null (falls back to generic `/booking-status` URL)
- [ ] "Chase the Chef" button handler also sets `stagnation_alert_sent_at` to prevent duplicate alert

---

## 9. Edge Cases

| Scenario | Behavior |
|----------|----------|
| Booking accepted before alert fires | Skipped — `status != 'pending'` |
| Booking declined before alert fires | Skipped |
| Booking cancelled before alert fires | Skipped |
| Guest booking with no email and no dinerId | Skipped, logged as warning |
| Registered diner with no email | Skipped, logged as warning |
| Booking already has `stagnation_alert_sent_at` set | Skipped (idempotent) |
| RESEND_API_KEY is 're_placeholder' | Stub send, log message |
| Multiple pending bookings for same diner | Each gets its own alert email |
| Booking event date is in the past | Alert still fires — diner needs to know status |
| `accessToken` is NULL | Falls back to `/booking-status` URL |

---

## 10. Configuration

```typescript
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Maison des Chefs <onboarding@resend.dev>';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://maisondeschefs.com';
const BOOKING_STATUS_URL = process.env.BOOKING_STATUS_URL || `${DASHBOARD_URL}/booking-status`;
const CHEFS_DISCOVERY_URL = process.env.CHEFS_DISCOVERY_URL || `${DASHBOARD_URL}/chefs`;
```

---

## 11. Dependencies

- `node-cron` (already in use by quote-reminder.ts, diner-stale-lead-email.ts)
- `resend` (already in use by other email services)
- No new external dependencies required

---

## 12. Testing Checklist

- [ ] Unit test: `buildDinerStagnationAlertEmail` — verify subject, HTML content, CTA links, days pending display
- [ ] Unit test: `processStaleBookings` with mock database — verify correct bookings selected
- [ ] Integration: Create pending booking > 24h old, run `processStaleBookings()`, verify email sent and `stagnation_alert_sent_at` updated
- [ ] Integration: Create pending booking > 24h old, run `processStaleBookings()` twice, verify only ONE email sent (idempotency)
- [ ] Edge: Booking with guestEmail = null and dinerId = null → verify skipped
- [ ] Edge: Booking with status = 'accepted' → verify skipped
- [ ] Edge: RESEND_API_KEY = 're_placeholder' → verify stub log

---

*Spec ready for engineering implementation | MAI-1548 | 2026-05-14*