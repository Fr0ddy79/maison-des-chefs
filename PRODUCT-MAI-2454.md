# Product Opportunity Discovery — MAI-2454

**Autopilot Run:** 2026-06-03 00:00 UTC
**Analyst:** Product Manager

---

## Executive Summary

After analyzing the current product state across booking flow, chef dashboard, email infrastructure, and chef onboarding, I identified **4 high-impact opportunities**:

1. **Resend API Key Not Configured** (P0) — All transactional emails silently fail; no key in `.env.local`
2. **Chef Application → Chef Profile Dead End** (P1) — Applications go to `chef_applications` table but never convert to usable chef profiles
3. **Booking `total_price` Always Zero** (P1) — Accepting an inquiry creates bookings with `total_price: 0`, breaking revenue tracking
4. **No Quote Workflow for Chefs** (P1) — After accepting an inquiry, chefs have no UI to send a price quote to the diner

---

## Opportunity #1: Resend API Key Not Configured (P0)

### Problem Statement

All transactional emails are implemented but silently fail because `RESEND_API_KEY` is a placeholder in `.env.local`. This means:

- Diners never receive booking confirmation emails
- Chefs never receive new inquiry notification emails
- Chef applicants never receive application confirmation emails
- Admins never receive chef application notification emails

Users see success messages ("booking request sent") but receive no follow-up, eroding trust in the platform.

### User Story

**As a** diner
**I want to** receive a confirmation email after submitting a booking request
**So that** I know my request was received and what to expect next

**Currently:** The inquiry POST returns 201, the UI shows success, but no email arrives. The diner is left wondering if it worked.

### Scope

**In:**
- Replace `your_resend_api_key_here` placeholder with real Resend API key in `.env.local`
- Verify emails flow correctly: inquiry confirmation, chef notification, chef application confirmation, admin notification

**Out:**
- Email templates redesign (future)
- Multiple email templates/branding (future)
- A/B testing of email copy (future)

### Acceptance Criteria

- [ ] `RESEND_API_KEY` in `.env.local` is a valid key, not a placeholder
- [ ] Diner receives inquiry confirmation email within 60 seconds of submission
- [ ] Chef receives new inquiry notification email when inquiry is created
- [ ] Chef applicant receives confirmation email after applying
- [ ] Admin receives notification when new chef applies
- [ ] Email failures remain non-blocking (inquiry/booking still succeeds if email fails)

### Metrics

- **Primary:** Email delivery rate (target: 99% for sent emails)
- **Secondary:** "Did my inquiry go through?" support tickets (should decrease)
- **Guardrail:** Submission rate should not drop when emails start flowing

### Open Questions

- Does Fred have a Resend API key, or does he need to create one at resend.com?
- What sender name/email should appear on emails? (`noreply@maison-des-chefs.com` is hardcoded)
- Should we configure DMARC/DKIM for email deliverability?

---

## Opportunity #2: Chef Application → Chef Profile Dead End (P1)

### Problem Statement

When a chef applies via `/chef/apply`, their data goes into the `chef_applications` table but **never creates an actual chef profile** in `chef_profiles` or a corresponding user account in `profiles`. The application email fires (if key was set), but the chef cannot actually log in or manage their listings.

### User Story

**As a** chef applicant
**I want to** receive login credentials after my application is approved
**So that** I can set up my profile, add services, and start receiving bookings

**Currently:** Chef submits application → data sits in `chef_applications` → admin reviews manually → ??? (no conversion workflow exists)

### Scope

**In:**
- Admin page to review pending applications (`/admin` already exists but needs application review section)
- "Approve Application" action: creates `profiles` entry + `chef_profiles` entry + sends welcome email with login link
- "Reject Application" action: sends rejection email to applicant
- Application status tracking (`pending` → `approved` / `rejected`)

**Out:**
- Automatic approval workflow (future)
- Self-serve profile completion wizard (future — partially exists in chef dashboard)
- Background job processing (future)

### Acceptance Criteria

- [ ] Admin can view pending chef applications at `/admin`
- [ ] Admin can click to review a single application with full details
- [ ] Admin can "Approve" → creates profile + chef_profile + sends welcome email
- [ ] Admin can "Reject" → sends rejection email, marks application as rejected
- [ ] Approved chef can log in with email/password and see their dashboard
- [ ] Approved chef's profile appears on `/chefs` listing

### Metrics

- **Primary:** Time from application to approved/rejected (target: <48h)
- **Secondary:** % of applications that become active chefs (target: >50%)
- **Guardrail:** Applications should not be auto-approved without admin review

### Open Questions

- How should the chef's password/login credentials be created? (Admin creates them? Email invite flow?)
- Do we need a `chef_applications.status` column added to track `pending | approved | rejected`?
- Should rejected applicants be able to re-apply?

---

## Opportunity #3: Booking `total_price` Always Zero (P1)

### Problem Statement

When a chef accepts an inquiry via `PATCH /api/inquiries`, the booking is created with `total_price: 0` hardcoded. This means **revenue is never tracked correctly**. The chef dashboard analytics show `$0` month revenue regardless of actual bookings.

### User Story

**As a** chef
**I want to** see accurate revenue from my bookings
**So that** I can track my business performance and growth

**Currently:** Every booking created via inquiry acceptance has `total_price: 0`. The analytics query `confirmedBookings?.reduce((sum, b) => sum + (b.total_price || 0), 0)` always returns 0.

### Root Cause

In `/api/inquiries` PATCH handler:
```typescript
// Create booking
const { data: newBooking, error: bookingError } = await supabase
  .from('bookings')
  .insert({
    chef_id: authUser.id,
    // ...
    total_price: 0,  // placeholder - in real impl would come from service
  })
```

The comment even acknowledges this is a placeholder.

### Scope

**In:**
- Add `price_per_person` from the associated `services` table to the booking creation
- Calculate `total_price = price_per_person * guest_count` when creating booking from inquiry acceptance
- If no service is linked, prompt chef to set a price before accepting (or use a default)

**Out:**
- Dynamic pricing based on menu selections (future)
- Discount codes or adjustments (future)
- Partial refunds or price disputes (future)

### Acceptance Criteria

- [ ] When chef accepts inquiry, `total_price` = `service.price_per_person * inquiry.guest_count`
- [ ] Chef dashboard analytics show correct revenue (not $0)
- [ ] Booking confirmation email shows correct price to diner
- [ ] Bookings without a service get `total_price: 0` with a warning flag

### Metrics

- **Primary:** Revenue data accuracy (% of bookings with non-zero `total_price`)
- **Secondary:** Chef dashboard revenue display matches actual bookings
- **Guardrail:** Price calculation should not block booking creation if service is missing

### Open Questions

- Should we require a service to be attached to the inquiry before the chef can accept?
- What if the chef wants to charge a different price than the service's `price_per_person`?
- Do we need a "quote" flow where chef suggests a custom price before the booking is confirmed?

---

## Opportunity #4: No Quote Workflow for Chefs (P1)

### Problem Statement

After a chef accepts an inquiry and a booking is created with `total_price: 0`, the chef has **no way to send a price quote** to the diner. The `bookings` table has `quote_amount`, `quote_message`, and `quote_valid_until` fields, but there's no UI or API endpoint for the chef to populate them.

The diner's booking page (`/dashboard/bookings`) shows a quote section if `quote_status === 'pending'`, but the chef cannot actually send one.

### User Story

**As a** chef
**I want to** send a custom quote to the diner after accepting their inquiry
**So that** I can propose a price that reflects the specific requirements of their event

**Currently:** Chef accepts inquiry → booking created → diner sees "Quote Pending" but cannot receive a quote because no quote-sending mechanism exists.

### Scope

**In:**
- "Send Quote" button/modal in chef dashboard (on the accepted booking)
- Form: quote amount, message (optional), valid-until date
- API endpoint: `POST /api/bookings/[id]/quote` — updates `quote_amount`, `quote_message`, `quote_valid_until`, sets `quote_status: 'pending'`
- Email to diner: "Your quote is ready" with amount and accept/decline buttons
- Diner dashboard shows the quote with accept/decline actions (already implemented in `BookingStatusPage`)

**Out:**
- Quote negotiation (diner counter-offer) (future)
- Quote templates or presets (future)
- Partial quotes or packages (future)

### Acceptance Criteria

- [ ] Chef dashboard shows accepted bookings without a quote
- [ ] "Send Quote" button opens modal with: amount, message, valid-until date
- [ ] Submitting quote updates booking record and sends email to diner
- [ ] Diner receives email with quote amount and accept/decline buttons
- [ ] Diner's booking page shows the quote prominently with action buttons
- [ ] Accept/decline updates `quote_status` and triggers appropriate emails

### Metrics

- **Primary:** % of accepted bookings that receive a quote within 24h (target: >80%)
- **Secondary:** Quote acceptance rate
- **Guardrail:** Quoted revenue should match actual completed revenue

### Open Questions

- Should quotes be required before booking is "confirmed"? (Current flow: booking is confirmed on inquiry acceptance, then quote is separate)
- What happens if chef sends a quote but diner doesn't respond before `valid_until`?
- Should we auto-expire quotes after `valid_until` date?

---

## Priority Ranking

| # | Opportunity | Priority | Effort | Impact | Owner |
|---|------------|----------|--------|--------|-------|
| 1 | Resend API Key Configuration | P0 | Low | High — all email silently fails | Fred (needs key) |
| 2 | Chef Application → Chef Profile | P1 | Medium | High — enables complete onboarding | Backend + Frontend |
| 3 | Booking `total_price` Fix | P1 | Low | Medium — revenue tracking broken | Backend |
| 4 | Quote Workflow for Chefs | P1 | Medium | High — completes booking loop | Frontend + Backend |

---

## Notes

- **P0 Blocker Reminder:** `RESEND_API_KEY` in `.env.local` is `your_resend_api_key_here` — this is blocking all email delivery. Fred must add a real Resend API key.
- **Codebase:** `/home/fred/.local/share/Trash/files/maison-des-chefs/`
- **Related issues:** 
  - MAI-2423 (booking data integrity, fixed guest_count)
  - MAI-2424 (chef application emails, implemented but key not configured)
  - MAI-2376 (chef availability setup, done)
  - MAI-2377 (landing page SEO, still pending)

---

*Generated by Product Manager — MAI-2454*