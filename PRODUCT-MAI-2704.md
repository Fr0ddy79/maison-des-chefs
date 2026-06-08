# Product Opportunity Discovery — MAI-2704

**Autopilot Run:** 2026-06-08 04:00 UTC
**Analyst:** Product Manager

---

## Executive Summary

This run examined the uncommitted work and in-progress items to identify gaps not yet captured in the backlog. Key findings:

- **MAI-2691 opportunities (Password Reset, Legal Pages, 404)** — All built but uncommitted. Not new opportunities.
- **Messaging system (MAI-2685/2699)** — In progress by Backend Engineer
- **Inquiry Booking Card (MAI-2660)** — In progress by Frontend Engineer
- **Link Bookings to Diners (MAI-2658)** — In progress by Backend Engineer

**3 new opportunities identified:**
1. **Diner Booking History Page** (P1) — Diners have no central place to see all their bookings; confirmed bookings are invisible until diners manually return via email links
2. **Booking Form Error State UI** (P1) — MAI-2680 has been sitting in todo for over a week with no owner; error states in the booking form are unhandled
3. **Post-Signup Profile Completion Nudge** (P2) — No mechanism nudges new diners/chefs to complete their profiles after signup; low profile completion undermines matching quality

---

## Opportunity #1: Diner Booking History Page (P1)

### Problem Statement

When a chef accepts an inquiry and a booking is created, the diner receives an email with a link to `/inquiry/[id]`. But:
- There is **no page where a diner can see all their bookings** in one place
- If a diner has multiple confirmed bookings, they must track each via separate email links
- The `/dashboard` page for diners shows nothing useful — it's either empty or redirects to `/chefs`
- Diners have no way to check their booking status without hunting through email

**Root cause:** No diner-facing booking history page exists. The dashboard is chef-focused.

### User Story

**As a** diner with one or more confirmed bookings
**I want to** see all my bookings in one place
**So that** I can track status, view quotes, and message chefs without digging through email

**Currently:** A diner with confirmed bookings has no dashboard to manage them. They must use email links to access each inquiry individually.

### Scope

**In:**
- Create `/dashboard` page for diners (or `src/app/dashboard/diner/page.tsx`)
- Show list of all bookings linked to the diner (from `bookings` table, matched by email or diner_id)
- Each booking card shows: chef name, date, status (pending/confirmed/rejected), quote amount if available
- Link to full inquiry/booking detail page
- Link to messaging with chef (if booking is confirmed)
- Empty state with CTA to browse chefs

**Out:**
- Booking modification/cancellation (future)
- Payment processing UI (future, depends on STRIPE_SECRET_KEY)
- Email notifications for booking updates (future)

### Acceptance Criteria

- [ ] Authenticated diner visiting `/dashboard` sees list of their bookings
- [ ] Each booking shows: chef name, date, status, quote (if available)
- [ ] Clicking a booking navigates to the inquiry detail page
- [ ] Confirmed bookings show a "Message Chef" link
- [ ] Unauthenticated users are redirected to `/login`
- [ ] Empty state encourages diners to browse chefs
- [ ] Build passes

### Dependencies
- MAI-2658 (Link Bookings to Diners by Email Match) should be complete for best results, but page can work with email-matched bookings even without diner_id linkage

### Owner
Frontend Engineer

---

## Opportunity #2: Booking Form Error State UI (P1)

### Problem Statement

**MAI-2680** ("Booking Form Error State UI") has been in the todo state for over a week with no owner and no implementation. The booking form at `/book` handles the happy path but has no explicit error handling for:

- Network failures during submission
- 409 conflict errors (e.g., slot already booked while user was filling the form)
- 400 validation errors from the API
- Session expiry mid-form-fill

**Result:** Users see generic browser errors or empty states when things go wrong, leading to confusion and abandoned bookings.

### User Story

**As a** diner filling out the booking form
**I want to** see clear, actionable error messages if something goes wrong
**So that** I know what happened and how to recover

**Currently:** Network errors or API errors show browser defaults or silent failures. Users may abandon without knowing they can retry.

### Scope

**In:**
- Wrap booking form submission in try/catch with user-facing error state
- Handle 409 conflict: "This time slot was just booked by someone else. Please select a different time."
- Handle 400 validation: Show specific field errors returned by API
- Handle network failure: "Unable to submit. Check your connection and try again."
- Handle session expiry: "Your session has expired. Please sign in again."
- Show inline loading state during submission to prevent double-submit
- Preserve form data on error so user doesn't lose their input

**Out:**
- Full form redesign (already exists and works for happy path)
- Retry logic with exponential backoff (future)

### Acceptance Criteria

- [ ] Network failure shows "Unable to submit" message, not browser error
- [ ] 409 conflict shows specific message about slot being unavailable
- [ ] 400 errors show specific field validation messages
- [ ] Loading state prevents double-submit
- [ ] Form data is preserved on error (user doesn't lose input)
- [ ] Build passes

### Dependencies
None — can be implemented independently

### Owner
Frontend Engineer (MAI-2680 is already specced but unowned)

---

## Opportunity #3: Post-Signup Profile Completion Nudge (P2)

### Problem Statement

New diners and chefs who sign up see no prompt to complete their profiles. Diners arrive with empty profiles (no full_name, no preferences), chefs arrive with no availability slots, no bio, no photos. This undermines:
- Chef discoverability (empty chef profiles don't convert)
- Personalized service (no dietary preferences stored for diners)

**Root cause:** No post-signup flow nudges users to complete their profiles. Signup drops users directly at `/chefs` (diners) or `/dashboard` (chefs) with no onboarding prompt.

### User Story

**As a** new diner who just signed up
**I want to** be prompted to add my dietary preferences and name
**So that** my profile is useful and chefs can serve me better

**As a** new chef who just signed up
**I want to** be prompted to add my bio, photos, and availability
**So that** diners can discover and book me

**Currently:** New users land on the dashboard/chefs page with empty profiles. There's no indication they should complete anything.

### Scope

**In:**
- Detect profile incompleteness on first visit after signup (check if full_name, bio, or availability is missing)
- Show a non-blocking banner or toast: "Complete your profile to get the most out of Maison des Chefs"
- Banner links to profile edit page
- For chefs: banner leads to `/dashboard/chef` with availability section highlighted
- For diners: banner leads to profile settings
- Banner dismissible and doesn't re-appear immediately

**Out:**
- Full onboarding flow (multi-step wizard, future)
-强制 profile completion before first booking (too aggressive for MVP)
- Profile completeness scoring (future)

### Acceptance Criteria

- [ ] New diners with empty full_name see profile completion nudge on first dashboard visit
- [ ] New chefs with no availability slots see availability setup nudge on dashboard
- [ ] Nudge is dismissible
- [ ] Nudge links to relevant completion page
- [ ] Build passes

### Dependencies
None

### Owner
Frontend Engineer

---

## Priority Ranking

| # | Opportunity | Priority | Effort | Impact | Owner |
|---|------------|----------|--------|--------|-------|
| 1 | Diner Booking History Page | **P1** | Medium | High — booking management UX | Frontend |
| 2 | Booking Form Error State UI | **P1** | Low | Medium — reduces abandoned bookings | Frontend (MAI-2680) |
| 3 | Post-Signup Profile Completion Nudge | **P2** | Low | Medium — data quality + conversion | Frontend |

---

## Backlog

| ID | Task | Priority | Owner | Notes |
|----|------|----------|-------|-------|
| MAI-2704a | Diner Booking History Page | P1 | Frontend | New — create `/dashboard` for diners |
| MAI-2704b | Booking Form Error State UI | P1 | Frontend | Already specced as MAI-2680, needs owner |
| MAI-2704c | Post-Signup Profile Completion Nudge | P2 | Frontend | New — banner/toast on incomplete profiles |

---

## Notes

- **API key blockers remain**: RESEND_API_KEY and STRIPE_SECRET_KEY still block all production email and payment flows (200+ hours)
- MAI-2680 has been in todo for 7+ days — either assign it or close it
- The diner booking history page is a prerequisite for a future "My Bookings" section in navigation
- Profile completion nudges should be A/B tested once Resend is configured (email-based nudge variant)

---

*Generated by Product Manager — MAI-2704*
