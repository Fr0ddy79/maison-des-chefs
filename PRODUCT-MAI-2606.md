# Product Opportunity Discovery — MAI-2606

**Autopilot Run:** 2026-06-06 00:00 UTC (America/New_York)
**Analyst:** Product Manager

---

## Executive Summary

Product is in strong shape — most P1/P2 gaps from prior cycles are resolved. The booking flow services wiring (MAI-2596) remains the highest-impact buildable task. Two new gaps identified: (1) structured dietary preference capture in booking, and (2) confirmation emails to chefs when new inquiries arrive (already coded but not wired).

---

## Product Health Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Landing page | ✅ Working | Hero A/B test, SEO schema, stats bar |
| Chef listing + compare | ✅ Working | Compare bar, service badges, filters |
| Chef profile page | ✅ Working | Services, reviews, sidebar booking |
| Booking flow (A/B) | ✅ Working | Multi-step, simplified variant testing |
| Inquiry system | ✅ Working | Conflict detection, time overlap check |
| Quote system | ✅ Working | Chef sends quote, diner accepts/declines |
| Chef dashboard | ✅ Working | Availability, bookings, services, profile |
| Diner dashboard | ✅ Working | Booking tracking, quote accept/decline, reviews |
| Admin dashboard | ✅ Working | Stats, chef applications, recent bookings |
| Contact page | ✅ Working | Form submits to support_inquiries table |
| Chef application workflow | ✅ Working | Approval/rejection emails coded, key blocks them |
| Compare page | ✅ Working | Side-by-side chef comparison |
| Stripe payment integration | ❌ Not built | MAI-2458, blocked by STRIPE_SECRET_KEY (Fred) |
| RESEND_API_KEY | ⚠️ Placeholder | 80+ hours — all transactional email dead |
| Booking flow → Services wiring | ⚠️ TODO | MAI-2596, P2 — only buildable gap remaining |

---

## Changes Since Previous Run (MAI-2589)

| Item | MAI-2589 | MAI-2606 |
|------|----------|----------|
| Support/contact page | ⚠️ Gap | ✅ Built |
| Chef application admin UI | ❌ Gap | ✅ Built |
| Stripe payment integration | ❌ Gap | ❌ Still not built (blocked) |
| Booking flow → Services wiring | ❌ Gap | ⚠️ Identified, MAI-2596 pending |
| Inquiry notification to chef | Not flagged | ❌ Gap found (email code exists but not called) |
| Structured dietary capture | Not flagged | ❌ Gap found |

---

## Opportunity #1: Booking Flow — Wire Services Table (P1)

**Status:** Already specced in MAI-2596. Highest-impact buildable task.

### Problem Statement

The `services` table exists with title, description, cuisine_type, duration_hours, price_per_person, max_guests. The booking flow at `/book` never displays or uses these services. Diners select a chef, date, and guests — but never see which *service type* (prix fixe, cocktail party, cooking class) they're booking. The service_id is passed in the inquiry payload but is never used to look up service details.

### Scope (from MAI-2596)
- GET `/api/chefs/[id]/services` endpoint (already exists at `/api/chefs/[id]/services/route.ts`)
- Booking page shows chef's active services as selectable cards
- Selecting a service pre-fills guest count (respects max_guests from service)
- Service name appears on confirmation step
- Build passes

### Why Now
This is the only remaining high-impact task that can be built without Fred's API keys. All other P0 items (Stripe, Resend) are blocked on Fred's action.

---

## Opportunity #2: Structured Dietary Preferences in Booking (P2)

### Problem Statement

The booking form at `/book` has a free-text "special_requests" field: *"Dietary restrictions, allergies, celebration notes..."* This is the only dietary data captured. For a dining platform, this creates two problems:

1. **Chefs can't quickly assess dietary mix** — They see a wall of text and must parse every message to understand guest dietary needs (vegetarian, vegan, gluten-free, nut allergies, halal, kosher).
2. **No structured data for analytics** — The platform has no visibility into dietary preference distribution across bookings.

### User Story

**As a** diner
**I want to** indicate my group's dietary needs with one click (vegetarian, vegan, gluten-free, nut allergy)
**So that** the chef knows how to prepare and I don't have to write it out every time

**As a** chef
**I want** to see structured dietary flags on incoming inquiries
**So that** I can quickly assess whether I can accommodate the group and prepare accordingly

**Currently:** Free-text field only. Chefs must read every inquiry message to understand dietary needs.

### Scope

**In:**
- Add structured dietary preference checkboxes to the Guest Details step of the booking flow:
  - Vegetarian
  - Vegan
  - Gluten-free
  - Nut allergy
  - Dairy-free
  - Halal / Kosher
- Selected preferences shown on confirmation step
- `dietary_preferences` column added to `inquiries` table (JSON array, e.g. `["vegetarian", "gluten-free"]`)
- Preferences visible in chef dashboard inquiry detail

**Out:**
- Automatic menu suggestions based on dietary preferences (future)
- Dietary preference analytics dashboard (future)
- Chef kitchen capabilities mapping to dietary types (future)

### Acceptance Criteria

- [ ] Guest Details step shows dietary preference checkboxes
- [ ] Selecting "Nut allergy" pre-fills special_requests with "Nut allergy" text
- [ ] Selected preferences shown on booking confirmation
- [ ] Inquiry stores dietary_preferences as JSON array
- [ ] Chef sees dietary flags in inquiry detail view
- [ ] Build passes

### Metrics

- Primary: % of bookings with at least 1 dietary preference selected (target: >40%)
- Secondary: Average chef response time (structured data = faster parsing)

### Open Questions

- Should "Nut allergy" trigger an extra warning/confirmation step (since it's safety-critical)?
- Should dietary preferences be required (at least one selected or "No restrictions")?

---

## Opportunity #3: Chef Inquiry Notification — Email Not Wired (P1)

### Problem Statement

The inquiry confirmation email to *diners* is implemented (`sendInquiryConfirmationEmail` in `/api/inquiry/route.ts`). However, when a **new inquiry arrives**, the **chef is never notified** — they only know about it if they actively check the dashboard. This creates a slow response loop and missed booking opportunities.

The email function `sendNewInquiryNotificationToChef` exists in `@/lib/email/resend` but is **never called** in the inquiry creation flow.

### User Story

**As a** chef
**I want to** receive an email when a new inquiry arrives
**So that** I can respond quickly and not lose booking opportunities

**Currently:** Chef must log in to dashboard to see pending inquiries. No proactive notification.

### Scope

**In:**
- Call `sendNewInquiryNotificationToChef` in the POST `/api/inquiry` route after inquiry is created
- Email includes: diner email, requested date/time, service name, message preview, link to `/dashboard`
- Non-blocking: inquiry succeeds even if email fails (fire-and-forget with try/catch)
- Dashboard already shows inquiry count badge — no frontend change needed

**Out:**
- Real-time in-app notifications (badge count is MVP)
- Mobile push notifications
- Slack/Teams integrations

### Acceptance Criteria

- [ ] New inquiry triggers email to chef's registered email
- [ ] Email contains: diner contact, requested date/time, service, message preview, dashboard CTA
- [ ] Email failure does not block inquiry submission
- [ ] Build passes

### Dependencies

- `RESEND_API_KEY` in `.env.local` — **Fred's action required** (same key as all other email)
- Email template already exists in codebase

### Metrics

- Primary: Average inquiry response time (target: <8h with email notifications vs current unknown)
- Secondary: Inquiry → booking conversion rate

---

## Priority Ranking

| # | Opportunity | Priority | Effort | Impact | Owner | Blocked By |
|---|------------|----------|--------|--------|-------|------------|
| 1 | Booking Flow → Services Wiring | **P1** | Medium | High — completes service offering UX | Frontend + Backend | None |
| 2 | Chef Inquiry Notification Email | **P1** | Low | Medium — reduces response time, improves conversion | Backend | RESEND_API_KEY |
| 3 | Structured Dietary Preferences | P2 | Low | Medium — better UX for chefs and diners | Frontend | None |

---

## Fred Actions Still Needed

| Item | Priority | Impact | Age |
|------|----------|--------|-----|
| RESEND_API_KEY | P0 | All transactional email dead; blocks Opportunity #2 | 80+ hours |
| STRIPE_SECRET_KEY | P0 | No payment processing; cannot launch | Unknown |

**RESEND:** Get free key at https://resend.com, replace `your_resend_api_key_here` in `.env.local`.
**STRIPE:** Create account at https://dashboard.stripe.com, add keys to `.env.local`.

---

## Open Questions

1. **Dietary preference safety:** Should nut allergy trigger a confirmation dialog ("This is a serious allergy — the chef will be notified")?
2. **Email cadence:** Should chefs receive one email per inquiry, or a daily digest of all pending inquiries?
3. **Commission rate for Stripe:** What % does Maison des Chefs take on bookings? Needed for PaymentIntent calculation.

---

*Generated by Product Manager — MAI-2606*