# Product Opportunity Discovery — MAI-2614

**Autopilot Run:** 2026-06-06 04:00 UTC (America/New_York)
**Analyst:** Product Manager

---

## Executive Summary

Product is in strong shape — nearly all P1/P2 gaps from prior cycles are resolved. The only remaining high-impact gap is **structured dietary preference capture in the booking form**. All major systems (booking flow, inquiry workflow, quote system, chef/diner dashboards, review system, email notifications) are wired and functional — but blocked on RESEND_API_KEY. One new chef recruitment CTA task (MAI-2593) remains unstarted in the backlog.

---

## Product Health Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Landing page | ✅ Working | Hero A/B test, SEO schema, stats bar |
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
| Dietary parser | ✅ Working | `parseDietaryFromText()` parses message on inquiry acceptance |
| Compare page | ✅ Working | Side-by-side chef comparison |
| MAI-2593 (Chef Recruitment CTA) | ⚠️ TODO | Unstarted — todo since June 5 |
| STRIPE payment integration | ❌ Not built | Blocked by STRIPE_SECRET_KEY (Fred's action) |
| RESEND_API_KEY | ⚠️ Placeholder | 80+ hours — all transactional email dead in production |

---

## Changes Since Previous Run (MAI-2606)

| Item | MAI-2606 | MAI-2614 |
|------|----------|----------|
| MAI-2593 Chef Recruitment CTA | Not mentioned | ⚠️ Todo, unstarted (from CEO MAI-2592) |
| Email notifications to chefs | ✅ Wired | ✅ Still wired (email code exists, key blocks sending) |
| Dietary parser | ✅ Working | ✅ Still working (server-side on inquiry acceptance) |
| Stripe payment | ❌ Not built | ❌ Still not built (blocked) |
| RESEND_API_KEY | ⚠️ Placeholder | ⚠️ Still placeholder (80+ → 100+ hours) |

---

## Opportunity #1: Structured Dietary Preference Capture (P1)

### Problem Statement

The booking form at `/book` has a free-text "special_requests" field: *"Dietary restrictions, allergies, celebration notes..."* This is the only dietary data captured. However:

1. **Chefs receive unstructured text** — They must parse every inquiry message to understand dietary needs (vegetarian, vegan, gluten-free, nut allergies, halal, kosher).
2. **Dietary parser works server-side only** — `parseDietaryFromText()` in `/lib/dietary-parser.ts` runs when a chef *accepts* an inquiry, not when the diner submits. This means chefs see raw text in their dashboard and email notifications.
3. **No structured data for analytics** — The platform has no visibility into dietary preference distribution across bookings.

### User Story

**As a** diner
**I want to** indicate my group's dietary needs with one click (vegetarian, vegan, gluten-free, nut allergy)
**So that** the chef knows how to prepare and I don't have to write it out every time

**As a** chef
**I want** to see structured dietary flags on incoming inquiries (in dashboard and email)
**So that** I can quickly assess whether I can accommodate the group and prepare accordingly

**Currently:** Free-text field only. Chefs must read every inquiry message to understand dietary needs. Dietary info is parsed after acceptance, not at submission.

### Scope

**In:**
- Add structured dietary preference checkboxes to the Guest Details step of the booking flow:
  - Vegetarian
  - Vegan
  - Gluten-free
  - Nut allergy (safety-critical — show confirmation prompt)
  - Dairy-free
  - Halal / Kosher
- Selected preferences shown on confirmation step
- `dietary_preferences` column added to `inquiries` table (TEXT or JSONB array, e.g. `["vegetarian", "gluten-free"]`)
- `inquiry_time_end` already exists in schema (added MAI-2573)
- Inquiry API updated to accept `dietary_preferences` array
- Preferences visible in chef dashboard inquiry detail
- Chef email notification includes dietary flags

**Out:**
- Automatic menu suggestions based on dietary preferences (future)
- Dietary preference analytics dashboard (future)
- Chef kitchen capabilities mapping to dietary types (future)
- Required dietary selection ("at least one or no restrictions")

### Acceptance Criteria

- [ ] Guest Details step shows dietary preference checkboxes (6 options)
- [ ] "Nut allergy" triggers a confirmation prompt ("This is a serious allergy — the chef will be notified")
- [ ] Selected preferences shown on booking confirmation step
- [ ] Inquiry stores `dietary_preferences` as array in DB
- [ ] Chef sees dietary flags in inquiry detail view (dashboard)
- [ ] Chef email notification includes dietary preference summary
- [ ] Build passes

### Metrics

- **Primary:** % of bookings with at least 1 dietary preference selected (target: >40%)
- **Secondary:** Average chef response time (structured data = faster parsing)
- **Guardrail:** Booking form completion rate should not drop

### Open Questions

1. Should "Nut allergy" trigger an extra warning dialog?
2. Should dietary preferences be required (at least "No restrictions" option)?
3. Do we need to store `allergies` separately from `dietary_restrictions` in the inquiries table for safety-critical alerting?

---

## Opportunity #2: Chef Recruitment CTA — MAI-2593 (P2)

**Status:** Already specced in MAI-2593, unstarted.

### Problem Statement

The navigation and landing page target diners only. Culinary professionals visiting the site have no clear call-to-action to onboard as chefs. The platform supply (verified chefs) is constrained by this missing path.

### Scope (from MAI-2593)

**In:**
- Add "List Your Services" link to Navigation.tsx → `/signup?role=chef`
- Add "Are you a chef? Join →" link to Footer
- Handle `role=chef` pre-selection in signup page

**Out:**
- Full chef onboarding flow redesign (future)
- Chef profile completion wizard (already partially done via MAI-2380)

### Acceptance Criteria

- [ ] "List Your Services" link appears in navigation
- [ ] Footer includes "Are you a chef? Join →" link
- [ ] `/signup?role=chef` pre-selects chef role
- [ ] Build passes

### Metrics

- **Primary:** Chef sign-up rate from nav/footer CTAs
- **Secondary:** % of chefs completing profile after signup

---

## Opportunity #3: Guest Checkout Flow — Email Capture Gap (P2)

### Problem Statement

When a guest (not logged in) submits a booking inquiry, the form captures `email`, `name`, `phone`, and `specialRequests`. However, there's no logged-in diner session for follow-up. The diner receives a confirmation email (if RESEND key were configured), but the system doesn't store a `diner_id` for guests — the `diner_id` is `null` for unauthenticated users.

This creates two problems:
1. **No booking history for guest diners** — They can't track their bookings via a diner dashboard.
2. **Chef can't reply directly** — The chef has the guest's email but the platform has no message thread.

### User Story

**As a** guest diner
**I want** to receive a link to track my booking status after submitting an inquiry
**So that** I don't have to wait passively for the chef to contact me

**Currently:** Guest submits inquiry, gets 201 response. If Resend key were configured, they'd get a confirmation email with no tracking link.

### Scope

**In:**
- Confirmation email includes a booking tracking link (e.g., `/track/[inquiry_id]`)
- Simple tracking page showing: date requested, status (pending/confirmed/rejected), chef contact
- No auth required to view tracking page (uses inquiry_id as a weak key)
- Booking confirmation (when chef accepts) updates the tracking page

**Out:**
- Full guest account creation flow
- Password reset for guest accounts
- Email inbox for guest-ning platform

### Acceptance Criteria

- [ ] Confirmation email (when key is configured) includes tracking link
- [ ] Tracking page shows: date requested, status, chef contact
- [ ] Tracking page updates when chef accepts/rejects inquiry
- [ ] Tracking page is accessible without login

### Dependencies

- RESEND_API_KEY (Fred's action)

---

## Priority Ranking

| # | Opportunity | Priority | Effort | Impact | Owner | Blocked By |
|---|------------|----------|--------|--------|-------|------------|
| 1 | Structured Dietary Preferences | **P1** | Medium | High — better UX for chefs and diners | Frontend + Backend | None |
| 2 | MAI-2593 Chef Recruitment CTA | **P2** | Low | Medium — supply-side growth | Frontend | None |
| 3 | Guest Checkout Tracking Page | P2 | Low | Medium — reduces guest drop-off | Frontend | RESEND_API_KEY |

---

## Fred Actions Still Needed

| Item | Priority | Impact | Age |
|------|----------|--------|-----|
| RESEND_API_KEY | P0 | All transactional email dead in production | 100+ hours |
| STRIPE_SECRET_KEY | P0 | No payment processing — cannot launch | Unknown |

**RESEND:** Get free key at https://resend.com, replace `your_resend_api_key_here` in `.env.local`.
**STRIPE:** Create account at https://dashboard.stripe.com, add keys to `.env.local`.

---

## Open Questions

1. **Nut allergy safety:** Should nut allergy trigger a confirmation dialog ("This is a serious allergy — the chef will be notified")? The parser already flags nut allergies separately from general dietary preferences — should we show a different UI for safety-critical items?
2. **Email cadence:** Should chefs receive one email per inquiry, or a daily digest of all pending inquiries?
3. **Commission rate for Stripe:** What % does Maison des Chefs take on bookings? Needed for PaymentIntent calculation.
4. **Guest tracking security:** The tracking page uses inquiry_id as a weak key (no auth). Is this acceptable for a dining marketplace, or should we add a simple PIN/confirmation code?

---

## Backlog (Unstarted Tasks)

| ID | Task | Priority | Owner | Age |
|----|------|----------|-------|-----|
| MAI-2593 | Chef Recruitment CTA | Medium | Frontend | 12+ hours |
| MAI-2464 | Growth Optimization | Medium | Growth Marketer | Days |
| MAI-2447 | Booking Form Micro-Interactions | Medium | Growth Marketer | Days |
| MAI-2410 | Availability Status Badges | Medium | Frontend | Days |

---

*Generated by Product Manager — MAI-2614*