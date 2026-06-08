# Product Opportunity Discovery — MAI-2691

**Autopilot Run:** 2026-06-07 12:00 America/New_York (16:00 UTC)
**Analyst:** Product Manager

---

## Executive Summary

This run identified **2 critical gaps** that block production readiness:

1. **No password reset flow** — users who forget their password are permanently locked out
2. **Missing legal pages** — Terms of Service and Privacy Policy links go to `#` (nowhere)

A third minor gap (404 page) was identified but is lower priority.

---

## Opportunity #1: Password Reset Flow (P1)

### Problem Statement

The auth system at `/login` has no "forgot password" mechanism. Users who sign up and later forget their password cannot reset it. This means:
- Locked-out users must contact support manually
- No self-service recovery option
- Poor UX for a production platform

**Root cause:** The login page has no forgot password link, no `/forgot-password` page, and no `/reset-password` page. Supabase Auth supports password reset via magic links, but the UI was never built.

### User Story

**As a** registered user who forgot their password
**I want to** reset my password via email
**So that** I can access my account without contacting support

**Currently:** User visits `/login`, can't remember password, has no recourse except contacting support.

### Scope

**In:**
- Add "Forgot password?" link on `/login` page (below password field)
- Create `/forgot-password` page with email input
- Call Supabase `resetPasswordForEmail(email)` API
- Show success message: "Check your email for a password reset link"
- Create `/reset-password` page (accessed via magic link in email)
- Handle password reset confirmation via Supabase `updateUser`
- Redirect to `/dashboard` on successful reset
- Error handling for invalid/expired tokens

**Out:**
- Custom email templates (Supabase default is fine for MVP)
- SMS-based reset (not needed)
- Password strength meter (can add later)

### Acceptance Criteria

- [ ] `/login` shows "Forgot password?" link
- [ ] `/forgot-password` accepts email and sends reset link
- [ ] Success message shown after email submitted
- [ ] `/reset-password` accessible via magic link
- [ ] Password updated in Supabase on successful reset
- [ ] User redirected to dashboard after reset
- [ ] Error shown for expired/invalid reset tokens
- [ ] Build passes

### Dependencies
None — uses existing Supabase Auth

### Owner
Frontend (pages + UI) + Backend (none needed — Supabase handles)

---

## Opportunity #2: Legal Pages (Terms & Privacy) (P1)

### Problem Statement

The signup page at `/signup` has legal links:
```jsx
<a href="#" className="underline">Terms of Service</a>
<a href="#" className="underline">Privacy Policy</a>
```

These `#` links go nowhere. For a commercial platform collecting user data, legal pages are required for:
- GDPR/CCPA compliance
- Trust and credibility
- Legal protection

**Root cause:** Legal pages were never created.

### User Story

**As a** visitor signing up for Maison des Chefs
**I want to** read the Terms of Service and Privacy Policy
**So that** I understand my rights and obligations before creating an account

**Currently:** Links go to `#` — broken UX and legal risk.

### Scope

**In:**
- `/terms` page — Terms of Service content (standard SaaS terms)
  - Account responsibilities
  - Service description (booking private chefs)
  - Payment terms (chef handles pricing, platform takes no payment currently)
  - Cancellation policy (chef-dependent)
  - Liability disclaimers
  - Intellectual property
- `/privacy` page — Privacy Policy content
  - Data collected (email, name, booking details)
  - How data is used
  - Data sharing (none with third parties except Supabase)
  - User rights (access, delete, correction)
  - Contact info
- Update signup page links to point to `/terms` and `/privacy`
- Add links in footer for both pages

**Out:**
- Cookie consent banner (not needed yet — no cookies beyond session)
- Full GDPR audit (future)
- Multi-language support (English only for MVP)

### Acceptance Criteria

- [ ] `/terms` page exists with readable content
- [ ] `/privacy` page exists with readable content
- [ ] Signup page links point to real pages (not `#`)
- [ ] Footer includes links to both pages
- [ ] Content is clear and professional
- [ ] Build passes

### Dependencies
None

### Owner
Frontend (pages + copy)

---

## Opportunity #3: 404 Not Found Page (P3)

### Problem Statement

When users visit a non-existent page (e.g., `/chefs/nonexistent-id`), they see Next.js default error page. A branded 404 page improves UX and keeps users on the site.

### User Story

**As a** user who mistyped a URL
**I want to** see a helpful 404 page
**So that** I can navigate back to safety instead of seeing a technical error

### Scope

**In:**
- Create `src/app/not-found.tsx` (Next.js App Router 404 page)
- Branded design matching Maison des Chefs aesthetic
- Message: "Page not found"
- Navigation links: Home, Chefs, Login
- Friendly illustration or icon

**Out:**
- Search functionality
- "Report broken link" form

### Acceptance Criteria

- [ ] Visiting `/nonexistent` shows branded 404 page
- [ ] Page includes navigation links
- [ ] Build passes

### Owner
Frontend

---

## Priority Ranking

| # | Opportunity | Priority | Effort | Impact | Owner | Blocked By |
|---|------------|----------|--------|--------|-------|------------|
| 1 | Password Reset Flow | **P1** | Low | High — blocked users | Frontend | None |
| 2 | Legal Pages (Terms & Privacy) | **P1** | Low | High — legal risk | Frontend | None |
| 3 | 404 Not Found Page | **P3** | Low | Low — UX only | Frontend | None |

---

## Backlog

| ID | Task | Priority | Owner | Status |
|----|------|----------|-------|--------|
| MAI-2691a | Password reset flow (forgot + reset pages) | P1 | Frontend | **NEW** |
| MAI-2691b | Legal pages (Terms + Privacy) | P1 | Frontend | **NEW** |
| MAI-2691c | Branded 404 page | P3 | Frontend | **NEW** |

---

## Notes

- **API key blockers remain**: RESEND_API_KEY (200+ hours) and STRIPE_SECRET_KEY still block all production email and payment flows
- Password reset will send emails via Supabase Auth (not Resend) — no additional API key needed
- Legal pages should be reviewed by a lawyer before launch (current scope is placeholder content)

---

*Generated by Product Manager — MAI-2691*