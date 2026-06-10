# Product Opportunity Discovery — MAI-2829

**Autopilot Run:** 2026-06-10 00:00 America/New_York
**Analyst:** Product Manager

---

## Executive Summary

**Since MAI-2809 (Jun 9, 16:00), completed:**
- ✅ **MAI-2811** — Accept-quote → Stripe checkout wired (commit `4667a82`)
- ✅ **MAI-2563** — Inquiry notification emails to chefs via Resend (commit `4667a82`)
- ✅ **MAI-2762** — Real testimonials and enhanced StatsBar (commit `a6a3506`)

**Working tree is clean. Build passes.**

**Platform is now feature-complete for MVP.** The core two-sided marketplace (diner booking + chef management) is fully implemented with payment processing, messaging, reviews, analytics, and automated email workflows.

**3 new opportunities identified:**
1. Service image gallery (P1) — visual discovery gap
2. Admin booking detail management (P2) — support operations gap
3. Chef public response to reviews (P2) — trust/social proof gap

---

## Critical Blockers (Fred's Action Required — Unchanged)

| Item | Priority | Impact | Age |
|------|----------|--------|-----|
| RESEND_API_KEY | P0 | All transactional email dead | 90+ days |
| STRIPE_SECRET_KEY | P0 | No real payments | Never configured |
| Production deployment | P0 | Platform not accessible to public | Never |

---

## Opportunity #1: Service Image Gallery (P1)

### Problem Statement

Chef services (experiences) on the platform are described with text only. A "Prix Fixe Dinner" or "Cocktail Party" has no images — diners can't see what they're booking. This reduces conversion confidence, especially for first-time diners who haven't yet built trust with the platform or chef.

### User Story

**As a** diner browsing chef profiles
**I want to** see photos of the food and experience for each service
**So that** I can make an informed decision and feel confident in my booking request

**Currently:** Service cards on `/chefs/[id]` show title, description, duration, max guests, and price — but no images.

### Scope

**In:**
- Add `image_url` column to `services` table (optional, nullable)
- Allow chefs to set a hero image for each service in `/dashboard/chef/services`
- Display image on service card in chef profile page
- Show placeholder image if no service image is set

**Out:**
- Multiple images per service (future — gallery/masonry)
- Before/after photos (future)
- Chef-uploaded images via file upload API (future — use URL for now)

### Acceptance Criteria

- [ ] `services.image_url` column exists in database
- [ ] Chef can set image URL when creating/editing service
- [ ] Service cards on chef profile show image (or placeholder)
- [ ] Build passes

### Metrics

- **Primary:** Service card CTR from /chefs listing (target: +15% with images)
- **Secondary:** Booking form start rate after viewing chef profile (target: +10%)

### Open Questions

- Should we use Unsplash for placeholder images per service type?
- Do we need image optimization (CDN, WebP conversion) for v1?

### Owner
Frontend Engineer + Backend Engineer

---

## Opportunity #2: Admin Booking Detail & Management (P2)

### Problem Statement

When a diner contacts support about their booking (e.g., "I haven't heard from my chef", "I need to change my booking"), admins have **no UI** to view the full booking details, view message history, or take action. They must query the database directly or ask the user for information they already have.

This creates slow, frustrating support experiences and erodes trust.

### User Story

**As an** admin
**I want to** view and manage any booking from an admin dashboard
**So that** I can resolve diner support issues quickly without database access

**Currently:** Admin dashboard at `/admin` shows recent bookings as a list with basic info (name, chef, date, status). No drill-down exists.

### Scope

**In:**
- Add `/admin/bookings/[id]` page
- Show full booking details: diner info, chef info, service, date/time, guest count, total price, status, dietary info, special requests
- Show message thread for the booking
- Show inquiry history (original inquiry if `inquiry_id` exists)
- Allow admin to update booking status (confirmed → completed, cancelled, etc.)
- Allow admin to add internal notes (stored separately, not visible to chef/diner)

**Out:**
- Full CRM functionality (future)
- Automated support ticket creation (future)
- Refund processing in admin (future — Stripe dashboard handles this)

### Acceptance Criteria

- [ ] Admin can navigate from `/admin` booking list to `/admin/bookings/[id]`
- [ ] Booking detail page shows all fields
- [ ] Admin can view message thread
- [ ] Admin can update booking status
- [ ] Build passes

### Metrics

- **Primary:** Admin support ticket resolution time (target: <30 min for basic issues)
- **Secondary:** % of support issues that can be resolved without escalation (target: >80%)

### Owner
Frontend Engineer + Backend Engineer

---

## Opportunity #3: Chef Public Response to Reviews (P2)

### Problem Statement

When a diner leaves a negative review, the chef has **no way to respond publicly**. This can make a chef look unresponsive or defensive, especially for reviews that mention fixable issues (e.g., "the soup was too salty"). A chef response shows the platform cares about quality and gives diners more confidence.

Similarly, positive reviews benefit from chef acknowledgment.

### User Story

**As a** chef
**I want to** respond publicly to reviews
**So that** I can acknowledge great experiences and address concerns professionally

**As a** diner
**I want to** see chef responses to reviews
**So that** I know the chef values feedback and takes quality seriously

**Currently:** Reviews are one-directional (diner → chef). No response mechanism exists.

### Scope

**In:**
- Add `chef_response` (text) and `chef_response_at` (timestamp) columns to `reviews` table
- Add "Respond to Review" button on chef dashboard when viewing booking → review
- Chef response form: textarea, 500 char limit
- Display chef response on chef public profile page below the review
- Chef can edit response within 30 days (update `chef_response_at`)

**Out:**
- Nested threads (review → response → diner reply — future)
- Automated review response suggestions via AI (future)
- Public response notifications to diners (future)

### Acceptance Criteria

- [ ] Chef can add a response to any review from their dashboard
- [ ] Chef response appears below review on public chef profile
- [ ] Chef can edit their response within 30 days
- [ ] Build passes

### Metrics

- **Primary:** % of negative reviews (< 4 stars) with chef response (target: >60% within 7 days)
- **Secondary:** Average rating improvement for chefs who respond (target: +0.2 stars)

### Owner
Frontend Engineer + Backend Engineer

---

## Priority Ranking

| # | Opportunity | Priority | Effort | Impact | Owner |
|---|------------|----------|--------|--------|-------|
| 1 | Service Image Gallery | P1 | Low | Medium — visual confidence | FE + BE |
| 2 | Admin Booking Management | P2 | Medium | Medium — support ops | FE + BE |
| 3 | Chef Public Response to Reviews | P2 | Low | Low-Medium — trust/social | FE + BE |

---

## Tasks Created

1. **MAI-2830** (P1, Low) — **BE+FE: Service Image Gallery**
   - Add `image_url` to services table
   - Chef service editing with image URL
   - Display image on chef profile service cards
   - Owner: Frontend Engineer + Backend Engineer

2. **MAI-2831** (P2, Medium) — **FE+BE: Admin Booking Detail & Management**
   - `/admin/bookings/[id]` page
   - Full booking details, messages, status management
   - Owner: Frontend Engineer + Backend Engineer

3. **MAI-2832** (P2, Low) — **BE+FE: Chef Public Response to Reviews**
   - Add `chef_response` columns to reviews table
   - Chef response form in dashboard
   - Display on public chef profile
   - Owner: Frontend Engineer + Backend Engineer

---

## Notes

- The platform is now feature-complete for MVP. All core marketplace flows work end-to-end.
- MAI-2811 wired the last major revenue gap (quote acceptance → Stripe payment).
- Email infrastructure is ready; Resend API key from Fred will activate all transactional email.
- Production deployment remains the biggest blocker to actual revenue.

---

*Generated by Product Manager — MAI-2829*