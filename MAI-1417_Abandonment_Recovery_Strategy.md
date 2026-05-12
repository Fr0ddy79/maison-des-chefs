# MAI-1417: Diner Booking Abandonment Recovery — Strategy & Spec

**Issue:** Growth Optimization — Diner Booking Abandonment Recovery  
**Owner:** Growth Marketer  
**Status:** Strategy Complete — Ready for BE Implementation  
**Created:** 2026-05-11

---

## 1. Executive Summary

Diners are abandoning bookings between inquiry submission and payment completion. With the booking status page live (MAI-1400) and diner confirmation emails working (MAI-1410), we now have the infrastructure to implement a recovery sequence. This document provides: (1) funnel analysis, (2) recovery email sequence spec, (3) code change requirements, and (4) metrics to track.

**Key Finding:** Email is captured at Step 1 (inquiry form), enabling immediate abandonment recovery outreach without requiring BE changes to email capture.

---

## 2. Booking Funnel Analysis

### 2.1 Funnel Steps

| Step | Page | What Happens | Email Captured? |
|------|------|--------------|-----------------|
| **Step 1** | Service Page → Booking Inquiry Form | Diner submits contact info + event details | ✅ Yes (inquiry form) |
| **Step 2** | Chef Response / Quote Accepted | Chef sends quote, diner accepts | ❌ No new capture |
| **Step 3** | Checkout (Payment) | Stripe payment processing | N/A (email already captured) |

### 2.2 Abandonment Points

Based on MAI-246 analysis and current flow inspection:

| Abandonment Point | Likelihood | Root Cause |
|-------------------|-----------|------------|
| **Drop at Step 1 → Step 2** | Medium | Friction in inquiry form; not receiving immediate confirmation |
| **Drop at Step 2 → Step 3** | High (MAI-246 confirmed) | Stripe payment UI gap — no frontend Stripe Elements after quote acceptance |
| **Drop at Step 3 (Payment)** | High | Payment page exists but may have friction or Stripe issues |

### 2.3 Estimated Abandonment Rate

| Data Point | Source | Value |
|------------|--------|-------|
| Monthly inquiries submitted | Assumed (needs BE data) | TBD |
| Monthly bookings confirmed | Assumed (needs BE data) | TBD |
| **Estimated abandonment rate** | Industry benchmark for hospitality | **40-60%** |
| **Recoverable portion** | With recovery sequence (MAI-695) | **10-15%** |

**Critical unknown:** Actual volume requires BE query on:
```sql
SELECT COUNT(*) FROM bookings WHERE status IN ('pending_payment', 'pending_payment_failed') AND created_at > NOW() - INTERVAL '30 days'
```

### 2.4 Email Capture Confirmation

✅ **Email captured at Step 1** via the inquiry form (`/api/inquiry` endpoint). No code changes needed for email capture — this already works.

The inquiry form captures:
- `clientName`
- `email` ← this is our recovery key
- `phone`
- `eventDate`
- `guestCount`
- `message`

---

## 3. Recovery Email Sequence Spec

### 3.1 Sequence Overview

| Touch | Timing | Trigger | Channel |
|-------|--------|---------|---------|
| **Email #1** | 1 hour after abandonment | No payment received 15 min after booking creation | Email |
| **Email #2** | 24 hours after abandonment | Still no payment | Email |
| **Email #3** | 72 hours after abandonment | Final recovery attempt + incentive offer | Email |

**Cancellation rule:** If booking transitions to `confirmed`, all scheduled emails are cancelled.

### 3.2 Email #1 — "Did You Forget?" (1 Hour)

**Subject:** Complete your booking — your slot is waiting, [Diner Name]

```
Hi [Diner Name],

You started a booking for [Event Date] with [Chef Name] but didn't quite finish.

Your spot isn't confirmed yet — complete your payment to lock in your date.

[ Complete My Booking → ] [ View Booking Status → ]

Questions? Reply to this email and we'll help.

— The Multica Team
```

**Variant A (Urgency):** "Your slot is held for 30 more minutes" — high urgency copy  
**Variant B (Value):** "Your culinary experience awaits" — value-focused copy

**A/B Test:** Split 50/50. Track open rate, CTR, recovery rate.

### 3.3 Email #2 — "Still Interested?" (24 Hours)

**Subject:** Still thinking about [Chef Name]'s dining experience?

```
Hi [Diner Name],

We noticed you didn't complete your booking for [Event Date]. 
Just checking in — is everything okay?

If you have questions, we're here to help:
- Reply to this email
- Or visit your booking status: [Link]

If you no longer need the booking, no worries — it will expire automatically.

— The Multica Team
```

### 3.4 Email #3 — Final Recovery + Incentive (72 Hours)

**Subject:** Your booking expires soon — but we saved you a spot

```
Hi [Diner Name],

This is your final reminder: your booking inquiry with [Chef Name] 
for [Event Date] will expire in 24 hours.

We've seen how much you wanted this experience, so we'd like to offer:

🎁 Complimentary wine pairing OR
💰 10% off your deposit

Use code: WELCOME_BACK

[ Complete My Booking → ]

This offer expires when your booking does.

— The Multica Team
```

**Note:** Incentive eligibility and value TBD with PM. Optional enhancement.

### 3.5 Abandonment Detection Logic

```sql
-- Identify abandoned bookings (pending_payment, no confirmation within 15 min)
SELECT b.id, b.guest_email, b.event_date, b.guest_count, b.total_price,
       u.email, u.name as diner_name,
       c.name as chef_name,
       s.name as service_name
FROM bookings b
LEFT JOIN users u ON b.diner_id = u.id
LEFT JOIN users c ON b.chef_id = c.id
LEFT JOIN services s ON b.service_id = s.id
WHERE b.status IN ('pending_payment', 'pending_payment_failed')
  AND b.created_at < NOW() - INTERVAL '15 minutes'
  AND b.id NOT IN (
    SELECT booking_id FROM abandoned_bookings WHERE created_at > NOW() - INTERVAL '24 hours'
  )
```

### 3.6 Email Template Requirements

| Field | Source |
|-------|--------|
| `{{diner_name}}` | `users.name` or `bookings.guest_email` |
| `{{chef_name}}` | `users.name` WHERE role = 'chef' |
| `{{event_date}}` | `bookings.event_date` |
| `{{guest_count}}` | `bookings.guest_count` |
| `{{service_name}}` | `services.name` |
| `{{total_price}}` | `bookings.total_price` |
| `{{booking_id}}` | `bookings.id` |
| `{{booking_status_url}}` | Derived from `bookings.access_token` |

---

## 4. Required Code Changes

### 4.1 Email Infrastructure (MAI-695 already planned)

| Component | Status | Notes |
|-----------|--------|-------|
| `abandoned_bookings` table | ✅ Exists in schema | Already defined in `dist/db/schema.js` |
| Resend email integration | ✅ Configured | Per MAI-368/584 |

### 4.2 New Code Requirements

| Item | Description | Priority |
|------|-------------|----------|
| **Abandonment detection cron** | Edge Function running every 5 min to detect abandoned bookings | Required |
| **Abandonment tracking insert** | When detected, insert into `abandoned_bookings` table | Required |
| **Email sending function** | Use existing Resend integration to send recovery emails | Required |
| **Cancellation check** | Before sending, verify booking isn't already confirmed | Required |
| **Booking link generation** | Generate/access booking status URL for email CTA | Required |

### 4.3 Tracking `accessToken` for Booking Status

From schema, `bookings.access_token` provides public booking status access (MAI-805). This can be used to generate the recovery email booking link:

```
https://multica.com/booking-status?token={accessToken}
```

**No code changes needed** — this already exists in the schema.

### 4.4 Suggested Implementation Structure

```
/supabase/functions/
  abandoned-booking-recovery/
    index.ts        -- Main cron handler (runs every 5 min)
    emails.ts      -- Email template + send logic
    queries.ts     -- Abandonment detection SQL
```

### 4.5 Database Query for Email Capture

Since email is captured at Step 1 in the inquiry form, the query needs to join `leads` or `bookings` to get the diner's email:

```sql
-- Get email for recovery (from bookings.guest_email OR users.email)
SELECT 
  b.id as booking_id,
  COALESCE(b.guest_email, u.email) as diner_email,
  COALESCE(u.name, b.guest_email) as diner_name,
  chef.name as chef_name,
  s.name as service_name,
  b.event_date,
  b.guest_count,
  b.total_price,
  b.access_token
FROM bookings b
LEFT JOIN users u ON b.diner_id = u.id
LEFT JOIN users chef ON b.chef_id = chef.id
LEFT JOIN services s ON b.service_id = s.id
WHERE b.status IN ('pending_payment', 'pending_payment_failed')
  AND b.created_at < NOW() - INTERVAL '15 minutes'
  AND NOT EXISTS (
    SELECT 1 FROM abandoned_bookings ab 
    WHERE ab.booking_id = b.id 
    AND ab.email_sent = true
    AND ab.created_at > NOW() - INTERVAL '24 hours'
  )
```

---

## 5. Experiments

### 5.1 A/B Test: Email Copy (Variant A vs B)

| Test | Variant A | Variant B |
|------|-----------|-----------|
| **Focus** | Urgency | Value |
| **Subject** | "Complete your booking — your slot is waiting" | "Your culinary experience awaits" |
| **CTA** | "Complete Now" | "Secure My Spot" |

**Split:** 50/50 random assignment at detection time  
**Success metric:** Recovery rate improvement ≥10% at 95% confidence

### 5.2 Experiment: Send Timing

| Variant | Timing | Hypothesis |
|---------|--------|------------|
| **Current** | 15 min after abandonment | High urgency, fresh intent |
| **Alternative** | 30 min after abandonment | Less aggressive, higher open rate |

### 5.3 Experiment: Incentive Impact

| Variant | Email #3 Addition | Hypothesis |
|---------|------------------|------------|
| **No incentive** | Standard final email | Baseline |
| **10% off** | Discount code | Higher recovery rate |

---

## 6. Metrics to Track

### 6.1 Primary Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| **Recovery Rate** | Bookings confirmed / abandonments detected | ≥10% |
| **Email Open Rate** | Opens / emails delivered | ≥45% |
| **Email CTR** | CTA clicks / emails delivered | ≥8% |
| **Revenue Recovered** | Deposit amounts from recovered bookings | TBD (baseline needed) |

### 6.2 Secondary Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| **Time-to-Recovery** | Minutes from Email #1 → payment completed | <2 hours |
| **Email Bounce Rate** | Bounces / emails sent | <2% |
| **Unsubscribe Rate** | Unsubscribes / emails sent | <0.5% |

### 6.3 Funnel Metrics (Requires BE + Analytics)

| Metric | Source | Target |
|--------|--------|--------|
| **Step 1 → Step 2 conversion** | Analytics events | TBD |
| **Step 2 → Step 3 conversion** | Analytics events | TBD |
| **Step 3 → confirmed conversion** | Analytics events | TBD |
| **Total abandonment rate** | BE query on bookings | TBD |

---

## 7. Dependencies

| Dependency | Source | Status |
|------------|--------|--------|
| Booking flow + payment status tracking | MAI-246 | ✅ Confirmed |
| `abandoned_bookings` table | MAI-695 | ✅ Exists |
| Email provider (Resend) | MAI-368/584 | ✅ Configured |
| Booking status page (public access via token) | MAI-805 | ✅ Exists |
| Diner confirmation emails | MAI-1410 | ✅ Live |
| BE: Abandonment detection query | This spec | ⏳ Pending |
| BE: Cron job setup | This spec | ⏳ Pending |
| PM: Incentive approval (Email #3) | This spec | ⏳ Pending |

---

## 8. Acceptance Criteria — Status

| Criteria | Status | Notes |
|----------|--------|-------|
| [x] Estimate of abandonment rate / funnel leak point | ✅ Complete | See Section 2 — requires BE data for exact numbers |
| [x] 1 recovery email sequence spec | ✅ Complete | See Section 3 — 3-touch sequence with A/B variants |
| [x] Identify if any code changes needed to capture abandonment event | ✅ Complete | No changes needed for email capture; BE needs cron + email send logic |

---

## 9. Next Steps

1. **BE:** Query actual monthly abandoned booking volume (`pending_payment` / `pending_payment_failed` status)
2. **BE:** Implement abandonment detection cron (every 5 min)
3. **BE:** Implement email sending via Resend
4. **PM:** Approve incentive offer for Email #3
5. **Growth:** Set up A/B test tracking
6. **Growth:** Establish baseline metrics before launch

---

## 10. Files Referenced

- `MAI-246` — Stripe Payment Flow Friction Analysis
- `MAI-695` — Abandoned Booking Recovery — Revenue Automation
- `MAI-805` — Guest Booking Recovery Token
- `MAI-1400` — Booking Status Page
- `MAI-1410` — Diner Confirmation Emails
- `dist/db/schema.js` — Database schema (abandonedBookings table confirmed)
- `dist/routes/booking-page.js` — Booking inquiry form (email captured at Step 1)
- `dist/routes/checkout.js` — Checkout flow (payment step)