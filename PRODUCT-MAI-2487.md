# Product Opportunity Discovery — MAI-2487

**Autopilot Run:** 2026-06-03 12:00 America/New_York
**Analyst:** Product Manager

---

## Executive Summary

After analyzing the current product state across quote workflows, booking flow, and chef onboarding, I identified **2 critical issues and 1 new opportunity**:

1. **Booking `total_price` Always Zero** (P0) — `service.price` doesn't exist; should be `price_per_person * guest_count`
2. **Admin Application Workflow Missing** (P1) — Applications go nowhere after submission; no approve/reject flow
3. **Resend API Key Still Placeholder** (P0) — All emails silently fail

---

## Opportunity #1: Booking `total_price` Calculation Wrong (P0)

### Problem Statement

When a chef accepts an inquiry, the booking is created with `total_price: service?.price || 0`. However, **the `services` table has `price_per_person`, not `price`**. This means `total_price` is always 0 regardless of guest count.

**Root cause** in `/api/inquiries/route.ts` PATCH handler:
```typescript
const { data: service } = await supabase
  .from('services')
  .select('price')  // ❌ Column doesn't exist
  .eq('id', inquiry.service_id)
  .single()

total_price: service?.price || 0,  // ❌ Always 0
```

### User Story

**As a** chef
**I want** my bookings to show the correct total price (price per person × guest count)
**So that** I can track revenue accurately and diners see correct pricing

**Currently:** Chef accepts inquiry → booking created with `total_price: 0` → analytics show $0 revenue → diner sees $0 on confirmation

### Scope

**In:**
- Fix column reference: `services.price` → `services.price_per_person`
- Calculate `total_price = price_per_person * guest_count` when creating booking
- If no service linked, default to 0 (graceful fallback)

**Out:**
- Dynamic pricing based on menu selections (future)
- Discount codes (future)

### Acceptance Criteria

- [ ] When chef accepts inquiry with linked service, `total_price` = `service.price_per_person * guest_count`
- [ ] Chef dashboard analytics show correct revenue
- [ ] Booking confirmation email shows correct price
- [ ] Admin dashboard revenue stats are accurate

### Metrics

- **Primary:** % of bookings with `total_price > 0` (target: >80% for bookings with services)
- **Secondary:** Chef dashboard revenue display accuracy

### Open Questions

- Should we require `price_per_person` to be set before a service can be booked?
- What happens if guest_count exceeds service's max_guests?

---

## Opportunity #2: Admin Chef Application Workflow Missing (P1)

### Problem Statement

When a chef applies via `/chef/apply`, their data goes into `chef_applications` table and an email notification fires (if Resend key was configured), but **there is no admin workflow to approve or reject applications**.

The admin dashboard (`/admin/page.tsx`) hard-codes `pendingApplications: 0` instead of querying the database:
```typescript
setStats({
  // ...
  pendingApplications: 0,  // ❌ Hardcoded, not fetched
})
```

This means:
- Admin can't see how many applications exist
- Admin can't approve/reject applications
- Approved chefs can't log in or manage their profiles
- The entire chef onboarding funnel is broken

### User Story

**As an** admin
**I want to** review and approve/reject chef applications
**So that** qualified chefs can join the platform and start receiving bookings

**Currently:** Chef submits application → data sits in `chef_applications` → admin has no visibility or actions

### Scope

**In:**
- Add `status` column to `chef_applications` table (`pending | approved | rejected`)
- Update admin dashboard to fetch and display pending applications count
- Add "View Applications" section with list of pending applications
- "Approve" action: creates `profiles` entry + `chef_profiles` entry + sends welcome email with login credentials
- "Reject" action: sends rejection email (non-blocking) + marks application as `rejected`
- Applications history shows processed applications

**Out:**
- Automatic approval based on rules (future)
- Self-serve profile completion after approval (future)
- Background job for application processing (future)

### Acceptance Criteria

- [ ] Admin dashboard shows count of pending applications (fetched from DB)
- [ ] Admin can view list of pending applications with full details
- [ ] Admin can "Approve" → creates profile + chef_profile + sets application status to 'approved'
- [ ] Admin can "Reject" → sets application status to 'rejected'
- [ ] Approved chef can log in with the email they applied with
- [ ] Approved chef's profile appears on `/chefs` listing
- [ ] Application confirmation email sends on approval (if Resend key configured)

### Metrics

- **Primary:** Time from application submission to approved/rejected (target: <48h)
- **Secondary:** % of applications that become active chefs (target: >50%)
- **Guardrail:** Application submission rate should not decrease

### Open Questions

- How should login credentials be created? (Admin sets temp password? Email invite flow?)
- Should approved chefs auto-get `is_verified: true` or should that be a separate step?
- Do we need a migration to add `status` column to existing applications?

---

## Opportunity #3: Resend API Key Still Placeholder (P0)

### Problem Statement

`RESEND_API_KEY` in `.env.local` remains `your_resend_api_key_here`. All transactional emails silently fail, including:
- Booking confirmation emails to diners
- New inquiry notification emails to chefs
- Chef application confirmation emails to applicants
- Admin notification emails for new applications
- Quote notification emails

**This was flagged in MAI-2463 and MAI-2463's predecessor but remains unfixed.**

### Impact

- Diners never receive booking confirmation — may think booking failed
- Chefs never receive inquiry notifications — may miss bookings
- Applicants never receive confirmation — lower trust in platform
- Admins never get notified of new applications — applications pile up unseen

### Scope

**In:**
- Fred provides a valid Resend API key
- Replace placeholder in `.env.local` with real key

**Out:**
- Email template redesign (future)
- Email analytics/delivery tracking (future)

### Acceptance Criteria

- [ ] `RESEND_API_KEY` in `.env.local` is not a placeholder
- [ ] Test email can be sent via Resend API
- [ ] At least one email flow (e.g., booking confirmation) works end-to-end

---

## Priority Ranking

| # | Opportunity | Priority | Effort | Impact | Owner |
|---|------------|----------|--------|--------|-------|
| 1 | Booking `total_price` Fix | P0 | Low | Medium — revenue tracking broken, diner sees $0 | Backend |
| 2 | Resend API Key Configuration | P0 | Low | High — all email silently fails | Fred (needs key) |
| 3 | Admin Application Workflow | P1 | Medium | High — enables complete chef onboarding | Frontend + Backend |

---

## What's Changed Since Last Cycle (MAI-2463)

| Item | Status |
|------|--------|
| Chef Quote Sending UI | ✅ Implemented — chef dashboard has "awaiting quotes" section + quote modal + `/api/bookings/[id]/quote` endpoint |
| Inquiry acceptance → booking with quote_status null | ✅ Correct — booking created with `status: 'pending'`, `quote_status: null` |
| Quote notification email to diner | ✅ Implemented — `sendQuoteNotificationEmail` exists in resend.ts |
| Resend API key | ❌ Still placeholder |
| Admin application workflow | ❌ Still missing — pendingApplications hardcoded to 0 |

---

## Notes

- **Codebase:** `/home/fred/.local/share/Trash/files/maison-des-chefs/`
- **Key Files:**
  - Inquiry acceptance (price bug): `src/app/api/inquiries/route.ts` (lines ~155-165)
  - Admin dashboard (missing application workflow): `src/app/admin/page.tsx`
  - Email lib: `src/lib/email/resend.ts`
  - Quote endpoint: `src/app/api/bookings/[id]/quote/route.ts`
- **Related Issues:**
  - MAI-2463 (previous cycle — quoted opportunities still relevant)
  - MAI-2454 (earlier cycle — Resend key flagged then)

---

*Generated by Product Manager — MAI-2487*