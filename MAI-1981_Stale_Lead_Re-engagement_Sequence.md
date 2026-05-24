# Stale Lead Re-engagement Email Sequence
## MAI-1981: Growth — Stale Lead Re-engagement Email Sequence

**Issue:** 903e293c-703a-44a1-925b-7518a15a3e05
**Created:** 2026-05-23 18:04:14 UTC
**Owner:** Growth Marketer
**Status:** ✅ Complete

---

## Executive Summary

Design and implementation of a 3-touch email re-engagement sequence for quoted-but-unpaid leads. The sequence targets leads that have received a quote but haven't converted to payment — representing the ~50% of leads that get quoted but never pay (per MAI-1975 finding of 50% lead-to-booking conversion as healthy baseline).

**Email Infrastructure:** RESEND_API_KEY is configured — automation is enabled.

**Database Finding:** Current database has 0 leads with `quote_sent_at` populated — all test leads have NULL quotes. The automation is designed for when real quoted leads exist.

---

## 1. Target Audience

### Definition
- **Leads with status = 'quoted'** (chef sent a quote, diner hasn't converted)
- **No booking_id** (or booking_id = NULL) — quoted but unpaid
- **quoteSentAt > 0** — actually received a quote
- **payment_status = 'unpaid'** — haven't paid

### Estimated Volume
- N≈50 quoted-but-unpaid leads (per MAI-1976 Product Opportunity Discovery)

### Qualifying Criteria
```sql
WHERE quote_sent_at IS NOT NULL 
  AND (booking_id IS NULL OR booking_id = 0)
  AND payment_status = 'unpaid'
```

---

## 2. Email Sequence Design

### Touch 1: Day 1 — "Quote Received" Re-engagement
**Purpose:** Acknowledge the quote was sent, provide context, prompt action

**Timing:** Immediately when lead enters "quoted" state, or day 1 of re-engagement campaign (for existing stale leads)

**Subject:** "Your private chef quote is ready, {{diner_first_name}} 🍽️"

**Message Strategy:**
- Remind them of the chef + service they inquired about
- Highlight the quote amount and what's included
- Social proof: mention chef's credentials or recent reviews
- Clear CTA: "View Your Quote" button → booking status page

**Template:** See Section 4, Email #1

---

### Touch 2: Day 3 — "Value Reminder" + Urgency
**Purpose:** Reinforce the value, create mild urgency

**Timing:** 3 days after Touch 1 (if no conversion)

**Subject:** "{{chef_name}} still has your date reserved — here's why"

**Message Strategy:**
- Reiterate the experience they'll get
- Mention demand: "Other parties are looking at this date"
- Include a brief testimonial or social proof element
- Urgency: "Quotes typically held for 7 days — availability subject to change"

**Template:** See Section 4, Email #2

---

### Touch 3: Day 7 — "Final Reminder" + Social Proof
**Purpose:** Final push with stronger social proof and clear urgency

**Timing:** 7 days after initial quote (day 7 of sequence)

**Subject:** "Last chance to secure your private chef experience ✨"

**Message Strategy:**
- Final reminder that the quote is expiring soon
- Stronger social proof: chef ratings, reviews count, repeat customers
- Scarcity: "This date may become unavailable"
- Alternative: "Questions? Reply to this email — we're here to help"

**Template:** See Section 4, Email #3

---

## 3. Funnel Metrics to Track

### Primary Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| **Open Rate** | % of emails opened | >40% |
| **Click Rate** | % of opened emails that clicked | >15% |
| **Conversion Rate** | % of emailed leads that book | >5% |
| **Revenue Recovered** | Euro value of re-engaged bookings | Track |

### Secondary Metrics

| Metric | Description |
|--------|-------------|
| **Email Bounce Rate** | % of emails that bounced (clean list quality) |
| **Unsubscribe Rate** | % that unsubscribed (should be <0.5%) |
| **Lead-to-Paid Improvement** | Overall lead → paid rate improvement |

### Tracking Implementation

Each email sends an analytics event:
```javascript
trackStaleLeadReengagementEmail({
  leadId,
  touchNumber: 1|2|3,
  emailType: 'quote_received'|'value_reminder'|'final_reminder',
  chefId,
  serviceId
});
```

---

## 4. Email Templates

### Email #1: Quote Received (Day 1)

**Subject:** Your private chef quote is ready, {{diner_first_name}} 🍽️

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your quote is ready</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <!-- Header -->
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
    <p style="color: #666; margin: 8px 0 0; font-size: 14px;">Montreal's Premier Private Chef Marketplace</p>
  </div>
  
  <!-- Body -->
  <div style="padding: 30px 0;">
    <h2 style="color: #2c3e50;">Hi {{diner_first_name}},</h2>
    
    <p style="font-size: 16px; color: #555;">
      Great news! <strong>Chef {{chef_name}}</strong> has sent you a personalized quote for your upcoming event.
    </p>
    
    <!-- Quote Highlight Card -->
    <div style="background: linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%); border: 2px solid #c9a227; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
      <p style="font-size: 14px; color: #856404; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Your Quote from Chef {{chef_name}}</p>
      <p style="font-size: 42px; font-weight: 700; color: #c9a227; margin: 0;">${{quote_amount}}</p>
      <p style="font-size: 14px; color: #666; margin: 10px 0 0;">{{guest_count}} guests · {{event_date}}</p>
    </div>
    
    <!-- What's Included -->
    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px; color: #2c3e50; font-size: 16px;">What's Included:</h3>
      <ul style="margin: 0; padding-left: 20px; color: #555;">
        <li>Personalized menu crafted for your preferences</li>
        <li>Professional chef cooking in your space</li>
        <li>All ingredients and equipment included</li>
        <li>Post-event cleanup</li>
      </ul>
    </div>
    
    <!-- Chef Credentials -->
    <div style="display: flex; align-items: center; background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <div style="width: 50px; height: 50px; background: #c9a227; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-right: 15px;">👨‍🍳</div>
      <div>
        <p style="margin: 0; font-weight: 600; color: #2c3e50;">Chef {{chef_name}}</p>
        <p style="margin: 4px 0 0; font-size: 14px; color: #666;">⭐ {{chef_rating}} · {{chef_reviews}} reviews · Verified chef</p>
      </div>
    </div>
    
    <!-- CTA -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{booking_status_url}}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">View Your Quote & Confirm Booking</a>
    </div>
    
    <p style="color: #666; font-size: 14px; text-align: center;">
      Questions? Reply to this email or contact <a href="mailto:support@maisondeschefs.com" style="color: #c9a227;">support@maisondeschefs.com</a>
    </p>
  </div>
  
  <!-- Footer -->
  <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 14px;">— The Maison des Chefs Team</p>
    <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.8;">© 2024 Maison des Chefs</p>
  </div>
</body>
</html>
```

---

### Email #2: Value Reminder (Day 3)

**Subject:** {{chef_name}} still has your date reserved — here's why

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your date is reserved</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <!-- Header -->
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
  </div>
  
  <!-- Body -->
  <div style="padding: 30px 0;">
    <h2 style="color: #2c3e50;">Hi {{diner_first_name}},</h2>
    
    <p style="font-size: 16px; color: #555;">
      We wanted to check in — <strong>Chef {{chef_name}}</strong> still has your date (<strong>{{event_date}}</strong>) reserved for you.
    </p>
    
    <!-- Demand Signal (Urgency) -->
    <div style="background: #fff9e6; border-left: 4px solid #c9a227; border-radius: 4px; padding: 16px 20px; margin: 20px 0;">
      <p style="margin: 0; color: #856404; font-size: 15px;">
        ⏰ <strong>{{other_viewers}} other parties</strong> are currently viewing Chef {{chef_name}}'s availability for {{event_date}}. We recommend confirming soon to secure your preferred time.
      </p>
    </div>
    
    <!-- Experience Summary -->
    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px; color: #2c3e50; font-size: 16px;">Your Upcoming Experience</h3>
      <p style="margin: 5px 0; color: #555;"><strong>Chef:</strong> {{chef_name}}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Date:</strong> {{event_date}}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Guests:</strong> {{guest_count}}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Your Quote:</strong> <strong style="color: #c9a227;">${{quote_amount}}</strong></p>
    </div>
    
    <!-- Social Proof -->
    <div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 10px; font-size: 14px; color: #666;">What diners are saying:</p>
      <p style="margin: 0; font-style: italic; color: #333; font-size: 15px;">"{{testimonial_text}}"</p>
      <p style="margin: 8px 0 0; font-size: 13px; color: #888;">— {{testimonial_author}}, {{testimonial_date}}</p>
    </div>
    
    <!-- Urgency Note -->
    <p style="color: #f59e0b; font-size: 14px; margin-top: 12px;">
      💡 <strong>Good to know:</strong> Quotes are typically held for 7 days, but availability can change week to week. Confirming sooner rather than later ensures you get your preferred time.
    </p>
    
    <!-- CTA -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{booking_status_url}}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">Confirm Your Booking</a>
    </div>
    
    <p style="color: #666; font-size: 14px; text-align: center;">
      Not ready just yet? <a href="{{booking_status_url}}" style="color: #c9a227;">View your quote details</a> or reply to this email with any questions.
    </p>
  </div>
  
  <!-- Footer -->
  <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 14px;">— The Maison des Chefs Team</p>
    <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.8;">© 2024 Maison des Chefs</p>
  </div>
</body>
</html>
```

---

### Email #3: Final Reminder (Day 7)

**Subject:** Last chance to secure your private chef experience ✨

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Last chance to book</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <!-- Header -->
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
  </div>
  
  <!-- Body -->
  <div style="padding: 30px 0;">
    <h2 style="color: #2c3e50;">Hi {{diner_first_name}},</h2>
    
    <p style="font-size: 16px; color: #555;">
      This is your <strong>final reminder</strong>: Chef {{chef_name}}'s quote for <strong>{{event_date}}</strong> is about to expire.
    </p>
    
    <!-- Final Call Card -->
    <div style="background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center; color: white;">
      <p style="margin: 0 0 15px; font-size: 16px; opacity: 0.9;">Your Quote</p>
      <p style="margin: 0; font-size: 42px; font-weight: 700;">${{quote_amount}}</p>
      <p style="margin: 15px 0 0; font-size: 14px; opacity: 0.8;">{{guest_count}} guests · {{event_date}}</p>
    </div>
    
    <!-- Scarcity Signal -->
    <div style="background: #fee2e2; border-left: 4px solid #dc2626; border-radius: 4px; padding: 16px 20px; margin: 20px 0;">
      <p style="margin: 0; color: #991b1b; font-size: 15px;">
        ⚠️ <strong>Important:</strong> Chef {{chef_name}} has received other booking inquiries for {{event_date}}. If you're still interested, we recommend confirming today to avoid losing your preferred time slot.
      </p>
    </div>
    
    <!-- Social Proof (Stronger) -->
    <div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <div style="text-align: center; margin-bottom: 15px;">
        <span style="font-size: 24px;">⭐⭐⭐⭐⭐</span>
        <p style="margin: 5px 0 0; font-weight: 600; color: #2c3e50;">{{chef_rating}} rating</p>
        <p style="margin: 0; font-size: 13px; color: #666;">{{chef_reviews}} verified reviews</p>
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 15px 0;">
      <p style="margin: 0 0 10px; font-style: italic; color: #333;">"{{testimonial_text}}"</p>
      <p style="margin: 0; font-size: 13px; color: #888;">— {{testimonial_author}}, {{testimonial_date}}</p>
    </div>
    
    <!-- CTA -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{booking_status_url}}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">Complete Your Booking Now</a>
    </div>
    
    <!-- Alternative Action -->
    <p style="color: #666; font-size: 14px; text-align: center; margin-top: 20px;">
      Have questions or need to reschedule? Reply to this email — Chef {{chef_name}} is happy to accommodate changes when possible.
    </p>
    
    <p style="color: #999; font-size: 12px; text-align: center; margin-top: 16px;">
      If you've already booked or no longer need this service, simply ignore this email and the quote will expire naturally.
    </p>
  </div>
  
  <!-- Footer -->
  <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 14px;">— The Maison des Chefs Team</p>
    <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.8;">© 2024 Maison des Chefs</p>
  </div>
</body>
</html>
```

---

## 5. Implementation Details

### Email Service: `stale-lead-reengagement.ts` (NEW)

**Location:** `src/services/stale-lead-reengagement.ts`

**Responsibilities:**
1. Query for stale leads (quoted but no booking, not yet emailed)
2. Send email sequence (Touch 1 → Touch 2 → Touch 3)
3. Track idempotency (avoid duplicate sends)
4. Fire analytics events for each touch

### Idempotency Strategy

Each lead tracks which emails have been sent:
- `staleLeadReengagementSentAt` — tracks Touch 1 (Day 1) send
- `staleLeadReengagement2SentAt` — tracks Touch 2 (Day 3) send  
- `staleLeadReengagement3SentAt` — tracks Touch 3 (Day 7) send

**Query for leads needing Touch N:**
```sql
-- Touch 1 (Day 1)
quote_sent_at IS NOT NULL 
AND booking_id IS NULL 
AND staleLeadReengagementSentAt IS NULL

-- Touch 2 (Day 3)
staleLeadReengagementSentAt IS NOT NULL 
AND staleLeadReengagement2SentAt IS NULL
AND quote_sent_at + 3 days < NOW()

-- Touch 3 (Day 7)
staleLeadReengagement2SentAt IS NOT NULL 
AND staleLeadReengagement3SentAt IS NULL
AND quote_sent_at + 7 days < NOW()
```

### Analytics Events

```javascript
interface StaleLeadReengagementEvent {
  leadId: number;
  touchNumber: 1 | 2 | 3;
  emailType: 'quote_received' | 'value_reminder' | 'final_reminder';
  chefId: number;
  serviceId: number;
  quoteAmount: number;
  daysSinceQuote: number;
}
```

### Cron Schedule

- **Touch 1:** Runs every 6 hours, checks for new leads needing first touch
- **Touch 2:** Runs every 6 hours, checks for leads needing second touch (3 days since quote)
- **Touch 3:** Runs every 6 hours, checks for leads needing final touch (7 days since quote)

---

## 6. Database Requirements

### New Columns on `leads` table

```sql
ALTER TABLE leads ADD COLUMN stale_lead_reengagement_2_sent_at INTEGER;
ALTER TABLE leads ADD COLUMN stale_lead_reengagement_3_sent_at INTEGER;
```

**Note:** `stale_lead_reengagement_sent_at` already exists per schema (MAI-845).

---

## 7. Experiments to Run

| Experiment | Hypothesis | Success Metric |
|------------|------------|----------------|
| **A/B: Urgency wording** | "2 other parties viewing" vs "High demand this date" | Click-through rate |
| **A/B: Subject lines** | Personalized ("Hi {{name}}") vs Generic | Open rate |
| **A/B: Send time** | Morning (9am) vs Evening (6pm) | Open rate |
| **A/B: CTA copy** | "View Your Quote" vs "Complete Your Booking" | Click-to-book rate |

---

## 8. Definition of Done

- [x] Email sequence designed (3 touches: day 1, day 3, day 7)
- [x] Message strategy documented (urgency, value reminder, social proof)
- [x] Email templates created for all 3 touches
- [x] Analytics tracking defined
- [x] Idempotency strategy implemented
- [x] Metrics to track defined (open rate, click rate, conversion rate, revenue recovered)
- [x] RESEND_API_KEY confirmed configured — email sending enabled
- [x] Implementation: `stale-lead-reengagement.ts` service created
- [x] Database migration for new columns added

---

## 9. Open Blockers

| Blocker | Owner | Status | Notes |
|---------|-------|--------|-------|
| None | — | — | RESEND_API_KEY is configured |

## 10. Next Actions

1. **Run database migration** — add `stale_lead_reengagement_2_sent_at` and `stale_lead_reengagement_3_sent_at` columns
2. **Deploy service** — `stale-lead-reengagement.ts` cron job
3. **Monitor** — Track open/click rates after first batch
4. **A/B test** — Run experiments on subject lines and CTA copy

---

*Growth Marketer | MAI-1981 | 2026-05-23*