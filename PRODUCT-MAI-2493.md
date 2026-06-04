# Product Opportunity Discovery — MAI-2493

**Autopilot Run:** 2026-06-03 16:00 America/New_York
**Analyst:** Product Manager

---

## Executive Summary

After analyzing the codebase, I found:

1. **MAI-2487 was partially incorrect** — The admin chef application workflow is **fully implemented** (API + UI + emails). The issue was an outdated observation.
2. **One confirmed bug remains:** Booking `total_price` calculation uses wrong column (`service.price` instead of `service.price_per_person`)
3. **Resend API key still a placeholder** — All transactional emails silently fail, but this is blocked on Fred providing the key

---

## Confirmed Bug: Booking `total_price` Uses Wrong Column (P0)

### Problem Statement

When a chef accepts an inquiry, the booking is created with `total_price: service?.price || 0`. However, **the `services` table has `price_per_person`, not `price`**. This means `total_price` is always 0.

**Root cause** in `src/app/api/inquiries/route.ts` line 140:
```typescript
total_price: service?.price || 0,  // ❌ Column doesn't exist
```

### User Story

**As a** chef
**I want** my bookings to show correct total price (price_per_person × guest_count)
**So that** I can track revenue accurately

**Currently:** Chef accepts inquiry → booking created with `total_price: 0` → analytics show $0 revenue → diners see $0

### Scope

**In:**
- Fix column reference: `services.price` → `services.price_per_person`
- Calculate `total_price = price_per_person * guest_count`
- Graceful fallback when service has no `price_per_person`

**Out:**
- Dynamic pricing based on menu selections (future)
- Discount codes (future)

### Acceptance Criteria

- [ ] When chef accepts inquiry with linked service, `total_price = price_per_person × guest_count`
- [ ] Chef dashboard analytics show correct revenue
- [ ] Booking confirmation shows correct price

### Metrics

- **Primary:** % of bookings with `total_price > 0` (target: >80% for bookings with services)
- **Secondary:** Revenue accuracy in admin dashboard

---

## Resend API Key Still Placeholder (P0 — Blocked on Fred)

### Problem Statement

`RESEND_API_KEY` in `.env.local` is `your_resend_api_key_here`. All transactional emails silently fail.

### Impact

- Diners never receive booking confirmation
- Chefs never receive inquiry notifications
- Applicants never receive application confirmation
- Admins never get new application alerts

### Action Required

Fred needs to provide a valid Resend API key. Once provided, the email infrastructure is fully in place (just needs the key).

### Scope

**In:**
- Replace placeholder in `.env.local` with real Resend API key

**Out:**
- Email template redesign (future)
- Email analytics (future)

---

## What's Implemented (Confirmed Working)

Based on code review:

| Feature | Status | Location |
|---------|--------|----------|
| Admin dashboard stats | ✅ Fetched from DB | `src/app/admin/page.tsx` |
| Pending applications count | ✅ Query from DB | line 133-144 |
| Chef applications list UI | ✅ Working | `/admin/chef-applications` |
| Application review detail | ✅ Working | `/admin/chef-applications/[id]` |
| Approve/Reject API endpoint | ✅ Working | `/api/admin/chef-applications/[id]` |
| Approval email function | ✅ Implemented | `src/lib/email/sendChefApprovalEmail.ts` |
| Rejection email function | ✅ Implemented | `src/lib/email/sendChefRejectionEmail.ts` |
| Quote workflow (MAI-14fdb85) | ✅ Implemented | chef dashboard with quote modal |
| Inquiry → booking flow | ✅ Working | `/api/inquiries` PATCH |

---

## What's NOT Working

| Item | Status | Fix Required |
|------|--------|--------------|
| `total_price` calculation | ❌ Bug | Change `service.price` → `service.price_per_person * guest_count` |
| Resend API key | ❌ Placeholder | Fred provides key |
| All email sending | ❌ Silent fail | Depends on Resend key |

---

## Priority Ranking

| # | Opportunity | Priority | Effort | Owner |
|---|------------|----------|--------|-------|
| 1 | Fix `total_price` calculation bug | P0 | Low | Backend (one-line fix) |
| 2 | Resend API key configuration | P0 | Low | Fred (needs key) |
| 3 | Admin application workflow | ✅ Already implemented | — | — |

---

## Technical Notes

**Bug location:** `src/app/api/inquiries/route.ts` line 140

**Current code:**
```typescript
const { data: service } = await supabase
  .from('services')
  .select('price')  // ❌ Column doesn't exist
  .eq('id', inquiry.service_id)
  .single()

// ...

total_price: service?.price || 0,  // ❌ Always 0
```

**Fix:**
```typescript
total_price: (service?.price_per_person || 0) * (inquiry.guest_count || 2),
```

---

## Changes Since MAI-2487

| Item | MAI-2487 Said | Current Reality |
|------|---------------|-----------------|
| Admin application workflow | Missing | ✅ Fully implemented |
| Booking `total_price` bug | P0 | ❌ Still present (confirmed) |
| Resend API key | Placeholder | ❌ Still placeholder |
| Quote workflow | Implemented | ✅ Confirmed working |

---

*Generated by Product Manager — MAI-2493*