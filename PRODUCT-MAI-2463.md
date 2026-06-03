# Product Opportunity Discovery — MAI-2463

**Autopilot Run:** 2026-06-03 04:00 UTC
**Analyst:** Product Manager

---

## Executive Summary

After analyzing the current product state across quote workflows, booking flow, chef onboarding, and email infrastructure, I identified **4 high-impact opportunities**:

1. **Chef Quote Sending UI Missing** (P0) — Diners see "Quote Pending" but chefs have no UI to send quotes
2. **Chef Application → Chef Profile Dead End** (P1) — Applications go to `chef_applications` but never convert to usable chef profiles  
3. **Booking `total_price` Calculation Wrong** (P1) — `service.price` doesn't exist; `price_per_person` should be used
4. **Resend API Key Remains Unconfigured** (P0) — All emails silently fail

---

## Opportunity #1: Chef Quote Sending UI Missing (P0)

### Problem Statement

The database has quote columns (`quote_amount`, `quote_message`, `quote_valid_until`, `quote_status`) and diners have a fully functional UI to accept/decline quotes at `/dashboard/bookings`. However, **the chef has no UI or API to actually send a quote**. 

Current flow:
1. Diner submits inquiry → `inquiries` table
2. Chef accepts inquiry via dashboard → booking created with `quote_status: 'accepted'` (direct confirmation)
3. Diner never sees a "quote pending" state — booking is already confirmed

**The intended flow (quote negotiation) never happens.** Chefs create bookings directly without ever sending a quote.

### User Story

**As a** chef
**I want to** send a custom price quote to the diner after accepting their inquiry
**So that** I can propose a price that reflects the specific requirements of their event

**Currently:** Chef clicks "Accept Inquiry" → booking is immediately confirmed with `total_price: 0` → diner sees booking as confirmed but with $0 quote

**Root Cause:** The inquiry acceptance code in `/api/inquiries` PATCH sets `status: 'confirmed'` directly. There's no intermediate "quote pending" state where the chef enters a custom price.

### Scope

**In:**
- "Send Quote" flow in chef dashboard for accepted bookings that don't have a quote yet
- API endpoint: `POST /api/bookings/[id]/quote` — updates `quote_amount`, `quote_message`, `quote_valid_until`, sets `quote_status: 'pending'`
- Chef dashboard shows accepted bookings without a quote with a "Send Quote" button
- Quote form: amount (required), message (optional, max 500 chars), valid-until date (default: 7 days)
- Email to diner when quote is sent (using existing `sendQuoteConfirmationEmail` pattern but with a "quote ready" variant)
- Update inquiry acceptance to create booking with `quote_status: 'pending'` instead of immediately setting `status: 'confirmed'`

**Out:**
- Quote negotiation (diner counter-offer) (future)
- Auto-reminder emails for expired quotes (future)
- Quote templates or presets (future)

### Acceptance Criteria

- [ ] Chef dashboard shows accepted bookings that need a quote
- [ ] "Send Quote" button opens modal with: amount, message, valid-until date
- [ ] Submitting quote updates booking record and sets `quote_status: 'pending'`
- [ ] Diner receives email: "Your quote is ready — [amount]" with accept/decline buttons
- [ ] Diner's booking page shows the quote with accept/decline buttons (already implemented)
- [ ] Accept/decline updates `quote_status` and triggers appropriate emails
- [ ] When chef accepts inquiry, booking is created with `status: 'pending'` (not 'confirmed') and `quote_status: NULL`

### Metrics

- **Primary:** % of accepted bookings that receive a quote within 24h (target: >80%)
- **Secondary:** Quote acceptance rate
- **Guardrail:** Inquiry acceptance rate should not drop significantly

### Open Questions

- Should we require a quote before the booking is considered "confirmed"?
- What validation should apply to quote_amount? (min $0? max?)
- Should chefs be able to revise a quote after sending it?
- What happens if diner doesn't respond before `valid_until`?

---

## Opportunity #2: Chef Application → Chef Profile Dead End (P1)

### Problem Statement

When a chef applies via `/chef/apply`, their data goes into the `chef_applications` table but **never creates an actual chef profile**. The application email fires (if key was configured), but the chef cannot log in or manage their listings.

**Previous analysis (MAI-2454) flagged this but it hasn't been addressed.** Admin dashboard shows `pendingApplications: 0` because the count query doesn't exist.

### User Story

**As a** admin
**I want to** review and approve/reject chef applications
**So that** qualified chefs can join the platform and start receiving bookings

**Currently:** Chef submits application → data sits in `chef_applications` → no admin workflow exists

### Scope

**In:**
- Update admin dashboard to fetch and display pending `chef_applications`
- Add `status` column to `chef_applications` table (`pending | approved | rejected`)
- "Approve" action: creates `profiles` entry + `chef_profiles` entry + sends welcome email with login credentials
- "Reject" action: sends rejection email + marks application as rejected
- Show applications that have been processed in admin history view

**Out:**
- Automatic approval based on rules (future)
- Self-serve profile completion after approval (future)
- Background job for application processing (future)

### Acceptance Criteria

- [ ] Admin dashboard shows count of pending applications (currently always 0)
- [ ] Admin can view single application with full details
- [ ] Admin can "Approve" → creates profile + chef_profile + sends credentials email
- [ ] Admin can "Reject" → sends rejection email, marks application as rejected
- [ ] Approved chef can log in and see their dashboard
- [ ] Approved chef's profile appears on `/chefs` listing

### Metrics

- **Primary:** Time from application to approved/rejected (target: <48h)
- **Secondary:** % of applications that become active chefs (target: >50%)

### Open Questions

- How should login credentials be created? (Admin sets password? Email invite flow?)
- Do we need a `chef_applications.status` column, or just soft-delete rejected rows?

---

## Opportunity #3: Booking `total_price` Calculation Wrong (P1)

### Problem Statement

When a chef accepts an inquiry, the booking is created with `total_price: service?.price || 0`. However, **the `services` table has `price_per_person`, not `price`**. This means `total_price` is always 0 because `service.price` is `undefined`.

### Root Cause

In `/api/inquiries` PATCH handler:
```typescript
const { data: service } = await supabase
  .from('services')
  .select('price')  // <-- Column doesn't exist, should be 'price_per_person'
  .eq('id', inquiry.service_id)
  .single()

total_price: service?.price || 0,  // <-- Always 0
```

### Scope

**In:**
- Fix column reference: `services.price` → `services.price_per_person`
- Calculate `total_price = price_per_person * guest_count` when creating booking from inquiry
- If no service is linked, default to 0 (don't block booking creation)

**Out:**
- Dynamic pricing based on menu selections (future)
- Discount codes (future)

### Acceptance Criteria

- [ ] When chef accepts inquiry with a linked service, `total_price` = `service.price_per_person * guest_count`
- [ ] Chef dashboard analytics show correct revenue
- [ ] Booking confirmation email shows correct price

---

## Opportunity #4: Resend API Key Still Unconfigured (P0)

### Problem Statement

`RESEND_API_KEY` in `.env.local` remains `your_resend_api_key_here`. All transactional emails silently fail.

**This was flagged in MAI-2454 (previous cycle) but remains unfixed.**

### Impact

- Diners never receive booking confirmation emails
- Chefs never receive new inquiry notification emails
- Chef applicants never receive application confirmation emails
- Admins never receive chef application notification emails
- Quote emails (when implemented) will also fail

### Scope

**In:**
- Fred provides a valid Resend API key
- Replace placeholder in `.env.local` with real key

### Acceptance Criteria

- [ ] `RESEND_API_KEY` in `.env.local` is not a placeholder
- [ ] Test email can be sent via Resend

---

## Priority Ranking

| # | Opportunity | Priority | Effort | Impact | Owner |
|---|------------|----------|--------|--------|-------|
| 1 | Chef Quote Sending UI | P0 | Medium | High — quote workflow completely missing | Frontend + Backend |
| 2 | Resend API Key Configuration | P0 | Low | High — all email silently fails | Fred (needs key) |
| 3 | Chef Application → Chef Profile | P1 | Medium | High — enables complete onboarding | Backend + Frontend |
| 4 | Booking `total_price` Fix | P1 | Low | Medium — revenue tracking broken | Backend |

---

## Notes

- **Codebase:** `/home/fred/.local/share/Trash/files/maison-des-chefs/`
- **Key Files:**
  - Inquiry acceptance: `src/app/api/inquiries/route.ts` (PATCH handler)
  - Quote endpoints: `src/app/api/bookings/[id]/accept-quote/route.ts`, `declined-quote/route.ts`
  - Diner booking page: `src/app/dashboard/bookings/page.tsx` (quote UI already done)
  - Chef dashboard: `src/app/dashboard/chef/page.tsx` (needs quote sending UI)
  - Admin dashboard: `src/app/admin/page.tsx` (needs application review)
  - Email lib: `src/lib/email/resend.ts`
- **Related Issues:**
  - MAI-2423 (guest_count wired correctly)
  - MAI-2424 (chef application emails implemented)
  - MAI-2447 (previous product doc — opportunities still relevant)
  - MAI-2454 (previous product doc — flagged Resend key, chef application workflow)

---

*Generated by Product Manager — MAI-2463*