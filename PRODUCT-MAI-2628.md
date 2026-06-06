# Product Opportunity Discovery — MAI-2628

**Autopilot Run:** 2026-06-06 12:00 UTC (America/New_York)
**Analyst:** Product Manager

---

## Executive Summary

The product is in strong structural shape. The main P1 gap from MAI-2620 (**structured dietary preference capture in the booking form**) remains unbuilt. Three additional gaps surfaced during this analysis:

1. **Inquiry modal missing guest_count and inquiry_time** (P2) — The `inquiries` table has these columns (since migration 013), but the query doesn't fetch them and the modal doesn't display them. An easy data gap.
2. **Guest booking tracking page** (P2) — Guest diners (unauthenticated) have no way to track their booking status after submission. Creates support burden.
3. **Chef revenue dashboard** (P3) — Analytics show revenue metrics but there's no dedicated revenue trend visualization in the chef dashboard.

---

## Product Health Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Landing page | ✅ Working | Hero A/B test, trust section, SEO schema |
| Chef listing + compare | ✅ Working | Compare bar, service badges, filters |
| Chef profile page | ✅ Working | Services, reviews, sidebar booking |
| Booking flow (A/B) | ✅ Working | Multi-step, simplified variant, services wired |
| Inquiry system | ✅ Working | Conflict detection, time overlap, chef notification email |
| Quote system | ✅ Working | Chef sends quote, diner accepts/declines via dashboard |
| Chef dashboard | ✅ Working | Availability management, bookings, inquiries, quote performance |
| Diner dashboard | ✅ Working | Booking tracking, quote accept/decline, review prompts |
| Admin dashboard | ✅ Working | Stats, chef applications, recent bookings |
| Contact page | ✅ Working | Form → support_inquiries table |
| Chef application workflow | ✅ Working | Approval/rejection emails coded (key blocks sending) |
| **Inquiry modal — guest info** | ❌ Missing | `guest_count` and `inquiry_time` not shown in modal |
| **Structured dietary capture** | ❌ Missing | Free-text only in booking form |
| **Guest booking tracking page** | ❌ Missing | No `/track/[id]` page for guest diners |
| **Chef revenue dashboard** | ❌ Missing | Analytics KPIs exist but no dedicated revenue section |
| STRIPE payment integration | ❌ Not built | Blocked by STRIPE_SECRET_KEY (Fred's action) |
| RESEND_API_KEY | ⚠️ Placeholder | 120+ hours — all transactional email dead in production |

---

## Changes Since Previous Run (MAI-2620)

| Item | MAI-2620 | MAI-2628 |
|------|----------|----------|
| Structured dietary capture | ⚠️ Identified as P1 | ❌ Still not built |
| Inquiry modal guest info | ✅ Schema has columns | ❌ Not displayed in UI or fetched |
| Guest tracking page | Not mentioned | ❌ New gap identified |
| Chef revenue dashboard | Not mentioned | ❌ New gap identified |
| RESEND_API_KEY | ⚠️ Placeholder | ⚠️ Still placeholder (120+ hours) |
| Stripe payment | ❌ Not built | ❌ Still not built (blocked) |

---

## Opportunity #1: Structured Dietary Preference Capture (P1)

**Status:** Already specced in MAI-2620. This is the highest-priority buildable gap.

### Problem Statement

The booking form at `/book` has a free-text `specialRequests` field. Chefs must parse every inquiry message manually to understand dietary needs. The `parseDietaryFromText()` parser runs only after a chef *accepts* an inquiry — too late to help chefs make informed acceptance decisions.

### Scope (from MAI-2620)

**In:**
- Add structured dietary preference checkboxes to the Guest Details step: Vegetarian, Vegan, Gluten-free, Nut allergy (with confirmation prompt), Dairy-free, Halal/Kosher
- "No restrictions" checkbox (default unchecked)
- Selected preferences shown on confirmation step
- `dietary_preferences` (TEXT[]) and `nut_allergy` (BOOLEAN) columns added to `inquiries` table
- Inquiry API updated to accept and store these fields
- Chef inquiry detail modal shows dietary flags
- Chef email notification includes dietary preference summary

**Out:**
- Auto menu suggestions based on preferences (future)
- Dietary analytics dashboard (future)
- Required dietary selection

### Acceptance Criteria

- [ ] Guest Details step shows dietary preference checkboxes (6 options + "No restrictions")
- [ ] "Nut allergy" triggers a confirmation prompt ("This is a serious allergy — the chef will be notified")
- [ ] Selected preferences shown on booking confirmation step
- [ ] Inquiry stores `dietary_preferences` as array and `nut_allergy` boolean in DB
- [ ] Chef sees dietary flags in inquiry detail view (dashboard)
- [ ] Chef email notification includes dietary preference summary (when key is configured)
- [ ] Build passes

### Owner
Frontend + Backend

---

## Opportunity #2: Inquiry Modal Missing Guest Info (P2)

### Problem Statement

The `inquiries` table has `guest_count` and `inquiry_time` columns (added in migration 013), but:

1. **The query in `fetchInquiries()` doesn't select these columns** — they're not fetched from Supabase
2. **The inquiry detail modal doesn't display them** — chefs can't see guest count or requested time without leaving the modal

Chefs need this information to assess whether they can accommodate an inquiry before accepting.

### User Story

**As a** chef
**I want** to see the guest count and requested time directly in the inquiry modal
**So that** I can quickly decide whether to accept or decline without hunting for this information

**Currently:** Chef clicks an inquiry → sees email, date, message, service — but not guest count or time. Must cross-reference with bookings data or ask the diner.

### Scope

**In:**
- Add `guest_count` and `inquiry_time` to the inquiry query in `fetchInquiries()` (chef dashboard)
- Display `guest_count` and `inquiry_time` in the inquiry detail modal

**Out:**
- Any backend changes beyond the query
- Changes to other parts of the dashboard

### Acceptance Criteria

- [ ] Inquiry detail modal shows guest count (e.g., "4 guests")
- [ ] Inquiry detail modal shows requested time (e.g., "7:00 PM")
- [ ] Data is fetched from the `inquiries` table columns (not derived/calculated)
- [ ] Build passes

### Metrics

- **Primary:** Time to respond to inquiry (structured info = faster decision)
- **Secondary:** Inquiry acceptance rate

### Owner
Frontend

---

## Opportunity #3: Guest Booking Tracking Page (P2)

### Problem Statement

Guest diners (unauthenticated) submit booking inquiries via `/book`. They receive a confirmation email if Resend key were configured, but there's **no web-based tracking page**. Guest diners must wait passively for email contact from the chef.

This creates two problems:
1. **No self-service status check** — Guest has no way to verify their inquiry was received other than email
2. **Support burden** — "Did my booking request go through?" questions

### User Story

**As a** guest diner
**I want** to visit a URL (e.g., `/inquiry/[id]`) to see my booking status
**So that** I know if the chef has confirmed or declined without relying on email

**Currently:** Guest submits inquiry → receives email confirmation (if key configured) → waits for chef email → no way to check status on the platform.

### Scope

**In:**
- `/inquiry/[id]` page — public, no auth required
- Shows: chef name, requested date/time, status (pending/confirmed/rejected)
- Status updates when chef accepts/rejects (polling on page load)
- "Contact chef" mailto link
- Minimal, clean UI — no auth required

**Out:**
- Full guest account creation
- Email inbox in-platform
- Password reset for guest accounts

### Acceptance Criteria

- [ ] `/inquiry/[id]` page is publicly accessible without login
- [ ] Page shows: chef name, requested date, status badge, guest count
- [ ] Status updates when chef accepts/rejects inquiry
- [ ] "Contact Chef" link opens email compose
- [ ] 404/not-found state for invalid inquiry IDs
- [ ] Build passes

### Dependencies

- RESEND_API_KEY (Fred's action) — email must work for this to have full value

### Metrics

- **Primary:** Support tickets about "did my booking go through?" (should decrease)
- **Secondary:** Guest return rate to track booking status

### Owner
Frontend + Backend (simple read API for inquiry status)

---

## Opportunity #4: Chef Revenue Dashboard (P3)

### Problem Statement

The chef dashboard shows analytics KPIs including "This Month's Revenue" but there's **no dedicated revenue section** with historical trends, monthly breakdowns, or earnings visualizations. Chefs have no way to see:

- Revenue over time (monthly trend)
- Bookings vs. quotes breakdown
- Average booking value

### User Story

**As a** chef
**I want** to see my revenue trends and earnings breakdown
**So that** I understand my business health and can plan accordingly

**Currently:** Revenue is shown as a single number ("This Month's Revenue") with no historical context.

### Scope

**In:**
- Add "Revenue" section to chef dashboard with:
  - Monthly revenue bar chart or trend line (last 6 months)
  - Total bookings count
  - Average booking value
  - Revenue by service type (if data available)
- Use existing booking data from Supabase (no new tables needed)

**Out:**
- P&L calculations or profit margins (future)
- Export to CSV/PDF (future)
- Integration with accounting software (future)

### Acceptance Criteria

- [ ] Revenue section shows last 6 months of revenue data
- [ ] Shows total bookings count and average booking value
- [ ] Uses existing booking data (no new tables or API changes needed)
- [ ] Build passes

### Owner
Frontend (data is already in bookings table)

---

## Priority Ranking

| # | Opportunity | Priority | Effort | Impact | Owner | Blocked By |
|---|------------|----------|--------|--------|-------|------------|
| 1 | Structured Dietary Preferences | **P1** | Medium | High — better UX for chefs and diners | Frontend + Backend | None |
| 2 | Inquiry Modal Guest Info | **P2** | Low | Medium — faster chef decisions | Frontend | None |
| 3 | Guest Booking Tracking Page | P2 | Low | Medium — reduces support burden | Frontend + Backend | None |
| 4 | Chef Revenue Dashboard | P3 | Low | Medium — better chef experience | Frontend | None |

---

## Fred Actions Still Needed

| Item | Priority | Impact | Age |
|------|----------|--------|-----|
| RESEND_API_KEY | P0 | All transactional email dead in production | 120+ hours |
| STRIPE_SECRET_KEY | P0 | No payment processing — cannot launch | Unknown |

**RESEND:** Get free key at https://resend.com, replace `your_resend_api_key_here` in `.env.local`.
**STRIPE:** Create account at https://dashboard.stripe.com, add keys to `.env.local`.

---

## Backlog (Unstarted Tasks)

| ID | Task | Priority | Owner | Notes |
|----|------|----------|-------|-------|
| MAI-2593 | Chef Recruitment CTA | Medium | Frontend | Nav + footer links, unstarted |
| MAI-2464 | Growth Optimization | Medium | Growth Marketer | Days |
| MAI-2447 | Booking Form Micro-Interactions | Medium | Growth Marketer | Days |
| MAI-2410 | Availability Status Badges | Medium | Frontend | Days |

---

*Generated by Product Manager — MAI-2628*