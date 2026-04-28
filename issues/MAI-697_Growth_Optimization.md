# MAI-697: Growth Optimization — Abandoned Booking Recovery Email Implementation

**Issue:** 684b8695-37d8-467b-9088-14f8b32d97df
**Created:** 2026-04-27 08:03 UTC
**Status:** ✅ Analyzed
**Owner:** Growth Marketer
**Analyzer:** Agent (Max)

---

## 1. Funnel Analysis

### Current User Journey

```
Landing Page → Services Browse → Service Detail → Lead Submission → Checkout → Payment
     ↓              ↓                    ↓               ↓              ↓          ↓
  A/B tested    Lead/booking badges   Trust badges    Guest checkout  Trust      Stripe
  CTA copy      Price filter pills   Response time   Magic link      badges     Deposit
                Most Popular banner  inquiry counts  Simplified form            Pay
```

### Current Traffic & Conversion Reality

| Stage | Data | Notes |
|-------|------|-------|
| Landing page visits | Low single digits | A/B testing active |
| Service catalog visits | Minimal | No search visibility |
| Lead submissions | 1 total (seed DB) | Extreme early stage |
| Bookings | 6 (seed data) | All demo/test |
| Checkout abandonments | Unknown | No tracking yet |

**Key insight:** With only 1 real lead in the system, acquisition volume is the bottleneck. However, implementing abandoned booking recovery now builds infrastructure for when SEO brings traffic.

### Prior Growth Work (Recent Loops)

| Feature | Issue | Status |
|---------|-------|--------|
| Corporate Landing Page (`/corporate`) | MAI-685 | ✅ Built |
| Lead Success Page Cross-Sell | MAI-638 | ✅ Analyzed |
| Checkout Trust Signals | MAI-625 | ✅ Implemented |
| Abandoned Booking Recovery Email | MAI-670 | ✅ Analyzed |
| Price Range Quick Filter Pills | MAI-550 | ✅ Implemented |
| Booking Count Badges | MAI-539 | ✅ Implemented |
| "Most Popular" Banner | MAI-527 | ✅ Implemented |
| Guest Checkout + Magic Link | MAI-220 | ✅ Implemented |

### Gap Identified: Abandoned Booking Emails Never Sent

The `abandoned-booking-detector.ts` service runs every 15 minutes and detects bookings in `pending` or `pending_payment` status for >10 minutes. Records are inserted into `abandonedBookings` table with `emailSent: false` — but **no code ever sends a recovery email**.

Users who reach checkout and leave are completely lost. No follow-up. No recovery attempt.

---

## 2. Growth Idea: Implement Abandoned Booking Recovery Email

### Hypothesis

**If** we send a recovery email to users who abandoned checkout within 30 minutes of leaving, **then** some percentage will return and complete payment **because**:
1. They're already in purchase intent mode — they reached checkout
2. A friendly reminder ("your booking is still waiting") reduces friction vs. starting over
3. Including the chef's name and booking details personalizes the message
4. One follow-up email is enough — no aggressive multi-email sequences needed

### Why This Opportunity?

1. **High-intent users** — Abandoned checkout users are most likely to convert
2. **Infrastructure ready** — `abandonedBookings` table tracks who to email; Resend is configured
3. **Low volume = low risk** — Only a handful of abandoners; no spam concerns
4. **Quick implementation** — Email template + integration, ~2h effort
5. **Measurable** — Email open rate + return booking rate trackable

---

## 3. Implementation

### File to Modify

**`src/services/abandoned-booking-detector.ts`**

#### Changes

1. **Add Resend import and client** (already imported in other files, reuse pattern):

```typescript
import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Maison des Chefs <onboarding@resend.dev>';
```

2. **Add email template function**:

```typescript
function buildAbandonedBookingEmail(booking: {
  id: number;
  serviceName: string;
  chefName: string;
  eventDate: string;
  guestCount: number;
  depositAmount: number;
  dinerEmail: string;
  dinerName: string;
}): { subject: string; html: string; text: string } {
  const checkoutUrl = `https://maisondeschefs.com/checkout/${booking.id}`;
  
  return {
    subject: `Your booking at ${booking.chefName}'s is waiting 🍽️`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete your booking</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
  </div>
  
  <div style="padding: 30px 0;">
    <h2 style="color: #2c3e50;">Hi ${booking.dinerName}, your booking is waiting 👨‍🍳</h2>
    
    <p style="font-size: 16px; color: #555;">We noticed you started a booking for <strong>${booking.serviceName}</strong> with Chef ${booking.chefName} but didn't complete the payment.</p>
    
    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px; color: #2c3e50;">Booking Summary</h3>
      <p style="margin: 5px 0; color: #555;"><strong>Service:</strong> ${booking.serviceName}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Chef:</strong> ${booking.chefName}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Date:</strong> ${booking.eventDate}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Guests:</strong> ${booking.guestCount}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Deposit:</strong> $${booking.depositAmount}</p>
    </div>
    
    <p style="font-size: 16px; color: #555;">No need to start over — your booking details are saved and ready to complete.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${checkoutUrl}" style="display: inline-block; background: #27ae60; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">Complete Your Payment</a>
    </div>
    
    <p style="font-size: 14px; color: #888; text-align: center;">Questions? We're here to help at support@maisondeschefs.com</p>
  </div>
  
  <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 14px;">© 2024 Maison des Chefs. Montreal's premier private chef marketplace.</p>
  </div>
</body>
</html>`,
    text: `Hi ${booking.dinerName}, your booking is waiting 👨‍🍳

We noticed you started a booking for ${booking.serviceName} with Chef ${booking.chefName} but didn't complete the payment.

Booking Summary:
- Service: ${booking.serviceName}
- Chef: ${booking.chefName}
- Date: ${booking.eventDate}
- Guests: ${booking.guestCount}
- Deposit: $${booking.depositAmount}

No need to start over — your booking details are saved and ready to complete.

Complete Your Payment: ${checkoutUrl}

Questions? We're here to help at support@maisondeschefs.com

© 2024 Maison des Chefs`,
  };
}
```

3. **Add `sendAbandonedBookingEmail()` function**:

```typescript
async function sendAbandonedBookingEmail(booking: any): Promise<boolean> {
  if (!resend) {
    console.log('[AbandonedBooking] Resend not configured, skipping email');
    return false;
  }

  const email = buildAbandonedBookingEmail({
    id: booking.id,
    serviceName: booking.serviceName,
    chefName: booking.chefName,
    eventDate: formatDate(booking.eventDate),
    guestCount: booking.guestCount,
    depositAmount: booking.totalPrice * 0.2,
    dinerEmail: booking.guestEmail || booking.dinerEmail,
    dinerName: booking.dinerName || 'there',
  });

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: booking.guestEmail || booking.dinerEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.error) {
      console.error('[AbandonedBooking] Failed to send recovery email:', result.error);
      return false;
    }

    console.log(`[AbandonedBooking] Recovery email sent for booking ${booking.id}`);
    return true;
  } catch (error) {
    console.error('[AbandonedBooking] Error sending recovery email:', error);
    return false;
  }
}
```

4. **Update processing loop to send email**:

In `processAbandonedBookings()`, after detecting a new abandoned booking:

```typescript
// After inserting into abandonedBookings table:
const sent = await sendAbandonedBookingEmail(booking);
if (sent) {
  db.update(abandonedBookings)
    .set({ emailSent: true })
    .where(eq(abandonedBookings.bookingId, booking.id))
    .run();
}
```

5. **Add `formatDate()` helper** (if not already present):

```typescript
function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Not specified';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}
```

---

## 4. Experiment Plan

### Phase 1: Implementation (No A/B)
- Implement email sending in `abandoned-booking-detector.ts`
- 30-minute delay before sending (10min abandonment detection + processing time)
- Track `emailSent: true/false` per abandoned booking

### Phase 2: Monitor (2-week observation)
- Track how many abandoned bookings receive emails
- Track open rate via Resend analytics
- Track return booking rate: % of emailed abandoners who complete payment

### Phase 3: A/B Test (if volume allows)
If >10 abandoned bookings per week:
- **Variant A:** "Your booking is waiting" — friendly reminder
- **Variant B:** "Complete your booking — chef is ready" — urgency framing

### Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Email open rate | >40% | Resend analytics |
| Email-to-return booking rate | >5% | `emailSent=true` + `status=confirmed` |
| Incremental completed bookings | +2-4 per month | Booking count delta |

---

## 5. Expected Impact

| Metric | Current | Expected | Confidence |
|--------|---------|----------|------------|
| Abandoned booking recovery | 0% (no email) | 5-10% return rate | Medium |
| Monthly incremental bookings | 0 | +2-5 | Low (depends on volume) |

**Rationale:** Abandoned checkout emails typically achieve 5-15% return rates in e-commerce. For a high-consideration purchase like private chef booking, expect lower (~5%). But even 1-2 recovered bookings would be significant at current volume.

**Note:** Volume is currently very low. This campaign's impact is gated by acquisition. As SEO brings more traffic, abandoned booking recovery will compound.

---

## 6. Why This > Other Options

| Option | Why Not This Loop | Priority |
|--------|-------------------|----------|
| Corporate cold email outreach | Requires Fred's target list; higher effort | Continue planning |
| Lead success page personalization | Lower impact than checkout recovery | Medium priority |
| SEO for catalog pages | Long-term play, no immediate volume | High, continue in parallel |

**Abandoned booking email wins because:**
- ✅ Targets highest-intent users (checkout abandoners)
- ✅ Zero cost per email (Resend free tier)
- ✅ One-time implementation, ongoing value
- ✅ Uses existing infrastructure (abandonedBookings table, Resend configured)
- ✅ Complements checkout trust signals already in place

---

## 7. Files to Modify

- **`src/services/abandoned-booking-detector.ts`**

### Changes Summary

| Change | Location |
|--------|----------|
| Add Resend import | Top of file |
| Add `formatDate()` helper | After imports |
| Add `buildAbandonedBookingEmail()` template | After helper |
| Add `sendAbandonedBookingEmail()` function | Before `processAbandonedBookings()` |
| Update incomplete booking query to join service/chef data | In `processAbandonedBookings()` |
| Add email sending after insert | In processing loop |

---

## 8. Alternative Quick Wins Considered

### Alternative A: SMS Recovery
Send SMS instead of/alongside email for faster delivery.

**Deferred:** Twilio not configured; adds cost and complexity.

### Alternative B: On-site Exit Intent Popup
Show "don't leave!" modal when user moves to close checkout tab.

**Deferred:** Requires frontend work; can feel aggressive.

### Alternative C: Two-Step Follow-up Sequence
Add "are you still interested?" email before recovery email.

**Deferred:** For low volume, one email is sufficient.

---

## 9. Next Steps

1. **Builder implements** — Add email sending to `abandoned-booking-detector.ts`
2. **Test locally** — Create a test booking in `pending_payment` status, run scheduler, verify email
3. **Monitor** — Check Resend dashboard for open rates after 1 week
4. **Measure** — Compare return booking rate after 2 weeks
5. **Iterate** — If open rate low, improve subject line; if return rate low, add urgency

---

## 10. Related Work

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-685 | Corporate landing page | ✅ Built |
| MAI-638 | Lead success page personalization | ✅ Analyzed |
| MAI-625 | Checkout trust signals | ✅ Implemented |
| MAI-565 | Post-payment re-engagement | ✅ Implemented |

---

*Growth Optimization — MAI-697 — Analyzed 2026-04-27*
