# Product Opportunity Discovery — MAI-2620

**Autopilot Run:** 2026-06-06 08:00 UTC (America/New_York)
**Analyst:** Product Manager

---

## Executive Summary

Product is in strong structural shape — nearly all P1/P2 gaps from prior cycles are resolved. Growth Marketer completed two key improvements since last run: trust section on landing page and chef recruitment nav CTA.

**One high-impact P1 opportunity remains unbuilt: structured dietary preference capture in the booking form.** The current implementation relies on free-text input and post-hoc parsing, which creates a poor experience for both diners (no quick-select) and chefs (no structured flags on inquiry cards or notification emails).

---

## Product Health Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Landing page | ✅ Working | Hero A/B test, trust section added (MAI-2613) |
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
| Dietary parser | ⚠️ Partial | `parseDietaryFromText()` runs on acceptance (too late) |
| Dietary capture in booking form | ❌ Missing | Free-text only, no structured preferences |
| Dietary flags in inquiry | ❌ Missing | Chef sees no dietary flags on inquiry card/email |
| STRIPE payment integration | ❌ Not built | Blocked by STRIPE_SECRET_KEY (Fred's action) |
| RESEND_API_KEY | ⚠️ Placeholder | 100+ hours — all transactional email dead in production |

---

## Changes Since Previous Run (MAI-2614)

| Item | MAI-2614 | MAI-2620 |
|------|----------|----------|
| Trust section on landing page | Not mentioned | ✅ Added by Growth Marketer (MAI-2613) |
| "List Your Services" nav CTA | Identified | ✅ Added by Growth Marketer (MAI-2613) |
| Structured dietary capture | Identified as P1 | ❌ Still not built |
| Dietary parser | ✅ Working | ✅ Still working (runs on acceptance, too late) |
| RESEND_API_KEY | ⚠️ Placeholder | ⚠️ Still placeholder (100+ → 120+ hours) |
| Stripe payment | ❌ Not built | ❌ Still not built (blocked) |

---

## Opportunity #1: Structured Dietary Preference Capture (P1)

### Problem Statement

The booking form at `/book` has a free-text `specialRequests` field: *"Dietary restrictions, allergies, celebration notes..."* This is the only dietary data captured. However:

1. **No structured capture** — Diners must type out every dietary need manually (vegetarian, vegan, gluten-free, nut allergy, halal, kosher). This creates friction and inconsistent data.
2. **Dietary parser runs too late** — `parseDietaryFromText()` in `/lib/dietary-parser.ts` runs when a chef *accepts* an inquiry. Chefs see raw text in their dashboard and email notifications — they must parse every message manually.
3. **No safety-critical UX for nut allergies** — Nut allergies are safety-critical but receive no special UI treatment (confirmation prompt, prominent flag).
4. **No structured data for analytics** — The platform has no visibility into dietary preference distribution across bookings.

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
- "No restrictions" checkbox default unchecked
- Selected preferences shown on confirmation step
- `dietary_preferences` column added to `inquiries` table (TEXT or JSONB array, e.g. `["vegetarian", "gluten-free"]`)
- `nut_allergy` boolean column added (for safety-critical flagging)
- Inquiry API updated to accept `dietary_preferences` array and `nut_allergy` boolean
- Inquiry modal in chef dashboard shows dietary flags (inquiry detail view)
- Chef email notification includes dietary preference summary (when key is configured)

**Out:**
- Automatic menu suggestions based on dietary preferences (future)
- Dietary preference analytics dashboard (future)
- Chef kitchen capabilities mapping to dietary types (future)
- Required dietary selection ("at least one or no restrictions")

### Acceptance Criteria

- [ ] Guest Details step shows dietary preference checkboxes (6 options + "No restrictions")
- [ ] "Nut allergy" triggers a confirmation prompt ("This is a serious allergy — the chef will be notified")
- [ ] Selected preferences shown on booking confirmation step
- [ ] Inquiry stores `dietary_preferences` as array and `nut_allergy` boolean in DB
- [ ] Chef sees dietary flags in inquiry detail view (dashboard)
- [ ] Chef email notification includes dietary preference summary (when key is configured)
- [ ] Build passes

### Metrics

- **Primary:** % of bookings with at least 1 dietary preference selected (target: >40%)
- **Secondary:** Average chef response time (structured data = faster parsing)
- **Guardrail:** Booking form completion rate should not drop

### Open Questions

1. Should "Nut allergy" trigger a confirmation dialog ("This is a serious allergy — the chef will be notified")?
2. Should `nut_allergy` be stored as a separate boolean in addition to being in the `dietary_preferences` array? (Yes — for safety-critical alerting)
3. Do we need a separate `allergies` field for non-dietary allergies (e.g., "latex allergy")?
4. Should dietary preferences be stored as separate columns (vegetarian, vegan, gluten_free, nut_allergy, dairy_free, halal, kosher) for easier querying, or as a JSONB array for flexibility?

---

## Opportunity #2: Guest Booking Confirmation Page (P2)

### Problem Statement

When a guest (not logged in) submits a booking inquiry, they receive only a JSON response. If Resend key were configured, they'd get a confirmation email with a reference ID — but no way to track their booking status via the web.

Guest diners have no dashboard. They must wait passively for the chef to contact them via email.

### User Story

**As a** guest diner
**I want** to see my booking status after submitting an inquiry
**So that** I know if the chef has confirmed or rejected

**Currently:** Guest submits inquiry → gets reference ID in confirmation email (if Resend key configured) → waits for email from chef.

### Scope

**In:**
- Add `/inquiry/[id]` page (public, no auth required)
- Shows: chef name, requested date, status (pending/confirmed/rejected)
- Updates in real-time when chef accepts/rejects inquiry (polling or re-fetch)
- "Contact chef" mailto link

**Out:**
- Full guest account creation flow
- Password reset for guest accounts
- Email inbox for guest-ning platform

### Acceptance Criteria

- [ ] `/inquiry/[id]` page shows inquiry status without login
- [ ] Page updates when chef accepts/rejects inquiry
- [ ] Build passes

### Dependencies

- RESEND_API_KEY (Fred's action) — email must be working for this to have value

---

## Priority Ranking

| # | Opportunity | Priority | Effort | Impact | Owner | Blocked By |
|---|------------|----------|--------|--------|-------|------------|
| 1 | Structured Dietary Preferences | **P1** | Medium | High — better UX for chefs and diners | Frontend + Backend | None |
| 2 | Guest Booking Confirmation Page | P2 | Low | Medium — reduces guest drop-off | Frontend | RESEND_API_KEY |

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

| ID | Task | Priority | Owner | Age |
|----|------|----------|-------|-----|
| MAI-2593 | Chef Recruitment CTA | Medium | Frontend | 18+ hours |
| MAI-2464 | Growth Optimization | Medium | Growth Marketer | Days |
| MAI-2447 | Booking Form Micro-Interactions | Medium | Growth Marketer | Days |
| MAI-2410 | Availability Status Badges | Medium | Frontend | Days |

---

*Generated by Product Manager — MAI-2620*