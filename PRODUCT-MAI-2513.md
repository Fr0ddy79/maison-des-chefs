# Product Opportunity Discovery — MAI-2513

**Autopilot Run:** 2026-06-04 04:00 UTC
**Analyst:** Product Manager

---

## Executive Summary

Core booking flow is **functionally complete and working end-to-end** (MAI-2513). The platform supports quote-based pricing with accept/decline workflows. However, three gaps remain that affect data accuracy, chef operational visibility, and diner trust.

---

## What's Working (Confirmed)

| Feature | Status | Location |
|---------|--------|----------|
| Inquiry submission with conflict detection | ✅ Working | `/api/inquiry` |
| Chef inquiry dashboard with accept/reject | ✅ Working | Chef dashboard → "Booking Inquiries" |
| Quote modal + send quote endpoint | ✅ Working | `/api/bookings/[id]/quote` |
| Quote accept/decline by diner | ✅ Working | `/api/bookings/[id]/accept-quote` |
| Diner booking dashboard with quote UI | ✅ Working | `/dashboard/bookings` |
| Availability management | ✅ Working | Chef dashboard → Availability |
| Admin dashboard | ✅ Working | `/admin` |
| Analytics tracking | ✅ Working | `/api/analytics/*` |
| Email infrastructure (non-blocking calls) | ✅ Working | All email functions use `.catch()` |

---

## Opportunity #1: Admin Revenue Calculation is Fundamentally Broken (P1)

### Problem Statement

The admin dashboard (`/admin`) shows "Revenue" calculated from `bookings` where `status = 'completed'` only. This means:

- A booking with `status = 'pending'` and `quote_status = 'accepted'` (confirmed booking, event hasn't happened) = **NOT counted as revenue**
- A booking with `status = 'confirmed'` and `quote_status = 'accepted'` = **NOT counted as revenue**

In the quote-based workflow, a booking becomes "real revenue" when the diner accepts the quote (`quote_status = 'accepted'`), not when the event completes.

### User Story

**As an** admin
**I want** the revenue metric to reflect all confirmed bookings (accepted quotes)
**So that** I can accurately track platform business health

### Scope

**In:**
- Revenue = SUM of bookings where `quote_status = 'accepted'`
- This captures all bookings where quote was accepted regardless of event completion status
- Display "Confirmed Revenue" label in admin UI
- Document the calculation logic in code comments

**Out:**
- Pending revenue / potential revenue tracking (future)
- Payment collection integration (future)
- Event completion tracking (future)

### Acceptance Criteria

- [ ] Admin dashboard revenue reflects SUM of bookings where `quote_status = 'accepted'`
- [ ] Revenue calculation logic is documented in code comments
- [ ] Confirmed revenue shows correct figure matching accepted quotes

### Metrics

- **Primary:** Revenue accuracy vs. actual accepted quotes (target: 100% match)
- **Secondary:** Admin confidence in dashboard numbers

### Open Questions

- Should we also show "Potential Revenue" from bookings where `quote_status = 'pending'` (quote sent but not yet responded)?
- Do we need a breakdown: Confirmed vs. Completed revenue?

---

## Opportunity #2: Chef Quote Conversion Analytics (P2)

### Problem Statement

Chefs can send quotes via the dashboard, but they have **no visibility into quote performance**. They don't know:
- How many quotes they've sent
- How many are pending response
- What % are accepted vs. declined vs. expired

This is a critical missing piece for chefs to understand their business health.

### User Story

**As a** chef
**I want** to see my quote conversion metrics
**So that** I can understand how many inquiries become actual bookings

### Scope

**In:**
- Add "Quote Performance" section to chef dashboard
- Metrics: Quotes Sent, Pending Response, Accepted, Declined, Expired
- Conversion rate: Accepted / (Accepted + Declined)
- Visual breakdown (simple bar or list)

**Out:**
- Email/Slack notifications when quote expires (future)
- Automated follow-up reminders (future)
- Quote performance over time (charts/graphs - future)

### Acceptance Criteria

- [ ] Chef dashboard shows quote statistics
- [ ] Each quote shows its current status (pending/accepted/declined/expired)
- [ ] Conversion rate is displayed as a percentage
- [ ] Stats update in real-time when quotes change status

### Metrics

- **Primary:** Quote acceptance rate (target: >50% for active chefs)
- **Secondary:** Chef dashboard return rate (do chefs check their stats?)

### Open Questions

- Should expired quotes be counted in conversion calculations or separate?
- Do we need a time-period filter (last 30 days, last 90 days, all time)?

---

## Opportunity #3: Diner Booking Confirmation Enhancement (P1)

### Problem Statement

When a diner accepts a quote and their booking becomes confirmed, they receive **no email confirmation** (Resend API key is still placeholder). The diner must:
1. Keep the browser open
2. Wait for the UI to update
3. Trust that the booking went through

If they close the browser or navigate away before the UI updates, they have **no confirmation** that their booking is confirmed.

### User Story

**As a** diner
**I want** to receive an email confirmation after my quote is accepted
**So that** I know my booking is confirmed and have a record of it

**Currently:** UI shows confirmation but no email is sent (API key missing). If they close browser, they have no proof.

### Scope

**In:**
- Email confirmation sent when quote is accepted (depends on Resend key)
- Email includes: chef name, date/time, guest count, total price, next steps
- Non-blocking (booking succeeds even if email fails)

**Out:**
- Branded email templates (future)
- Email open tracking (future)
- SMS notifications (future)

### Acceptance Criteria

- [ ] Diner receives confirmation email within 60 seconds of accepting quote
- [ ] Email includes: chef name, booking date/time, guest count, total price
- [ ] Email failure does not cause booking confirmation to fail
- [ ] Email clearly explains next steps (chef will contact to confirm details)

### Metrics

- **Primary:** % of confirmed bookings that trigger a delivered email
- **Secondary:** "Where is my confirmation?" support questions

### Open Questions

- What sender name should appear? ("Maison des Chefs" <noreply@...>?)
- Should the email include a link to the booking dashboard?

---

## Priority Ranking

| # | Opportunity | Priority | Effort | Owner |
|---|------------|----------|--------|-------|
| 1 | Admin Revenue Calculation | P1 | Low | Backend |
| 2 | Diner Booking Confirmation Email | P1 | Low | Backend (blocked on Resend key) |
| 3 | Chef Quote Conversion Analytics | P2 | Medium | Frontend + Backend |

---

## Technical Notes

**Resend API Key Status:**
- `.env.local` shows `RESEND_API_KEY=your_resend_api_key_here`
- Email functions are all in place and non-blocking (`.catch()` wrapper)
- **Fred needs to provide the actual key** for Opportunity #3 to work

**Revenue Query Change:**
Current:
```ts
// Calculate revenue from completed bookings
const { data: revenueData } = await supabase
  .from('bookings')
  .select('total_price')
  .eq('status', 'completed')
```

Should be:
```ts
// Calculate revenue from bookings with accepted quotes
const { data: revenueData } = await supabase
  .from('bookings')
  .select('total_price')
  .eq('quote_status', 'accepted')
```

---

## Changes Since Previous Run (MAI-2501)

| Item | MAI-2501 | MAI-2513 |
|------|----------|----------|
| Quote workflow | Working | ✅ Still working |
| Resend API key | Placeholder | ❌ Still placeholder |
| Booking total_price | ✅ Fixed | ✅ Still correct |
| Admin revenue calculation | ⚠️ Undercounted | ⚠️ Still broken |
| Quote conversion analytics | Not present | ❌ Still missing |
| Diner email confirmation | Blocked | ❌ Still blocked |

---

## Open Questions for Fred

1. **Resend API Key** - When will you have a real Resend API key to configure?
2. **Admin Revenue Definition** - Should "revenue" include only completed events, or all accepted quotes (confirmed bookings)?
3. **Email Sender** - What sender name/email should transactional emails come from?

---

*Generated by Product Manager — MAI-2513*