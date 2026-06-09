# Product Opportunity Discovery — MAI-2769

**Autopilot Run:** 2026-06-09 04:00 America/New_York
**Analyst:** Product Manager

---

## Executive Summary

Since MAI-2753 (06-09 00:00), several new pages have been built:
- `/compare` — Chef side-by-side comparison tool ✅
- `/contact` + `/api/support` — Support contact form ✅
- `/privacy` + `/terms` — Legal pages ✅
- Analytics API endpoints (events, summary, etc.) ✅
- Abandoned booking follow-up API ✅
- Diner booking history at `/dashboard/bookings` ✅

**3 opportunities re-identified (still not done):**
1. **Guest Checkout Flow (P0)** — Unchanged from MAI-2753
2. **Chef Application Status Tracker (P1)** — Unchanged from MAI-2753
3. **Email Unsubscribe Infrastructure (P2)** — Unchanged from MAI-2753

**1 new gap identified:**
4. **Analytics Dashboard Frontend (P1)** — Backend API exists and is uncommitted; frontend not built

---

## Opportunity #1: Guest Checkout Flow (P0) — STILL NOT DONE

### Problem Statement

Guests can submit booking inquiries without an account. The booking form captures their email and creates a guest session cookie. However, **there is no `/guest/[token]` page where guests can track their booking status.** After submission, guests can only wait for email updates — which won't arrive because RESEND_API_KEY is still a placeholder.

**Root cause:** No guest token → tracking page mapping exists. Guests have no way to check if their booking was confirmed, rejected, or if a quote was sent.

### User Story

**As a** guest diner who submitted a booking inquiry
**I want to** track my booking status via a direct link
**So that** I know if the chef confirmed, sent a quote, or needs more info

**Currently:** Guest fills out `/book`, submits successfully, sees a success confirmation. But they have no way to return later and check status without creating an account.

### Scope

**In:**
- Generate a unique `booking_token` (UUID) stored with the booking record when a guest submits
- Create `/guest/[token]` public page (no auth required)
- Page shows: chef name, date/time requested, current status (pending/confirmed/rejected), quote amount + message if available
- "Create account to manage this booking" CTA for conversion
- Token delivered in success confirmation (shown on screen + optionally emailed)

**Out:**
- Full guest account creation flow (future)
- Modifying/cancelling bookings for guests (future)
- Email delivery (depends on RESEND_API_KEY)

### Acceptance Criteria

- [ ] Guest submitting a booking receives a booking_token stored in `bookings` table
- [ ] `/guest/[token]` page accessible without authentication
- [ ] Page shows booking status, chef name, date, quote (if available)
- [ ] Page shows "pending" status until chef updates it
- [ ] Build passes

### Metrics
- **Primary:** Guest booking token retrieval rate (target: >70% of guests return via token)
- **Secondary:** Guest-to-account conversion rate

### Owner
Frontend Engineer + Backend Engineer

---

## Opportunity #2: Chef Application Status Tracker (P1) — STILL NOT DONE

### Problem Statement

After a prospective chef submits an application at `/chef/apply`, they have no way to check their application status online. They must email support to find out if they're approved, rejected, or still under review. This creates unnecessary support burden and a poor applicant experience.

**Root cause:** No `/chef/status` page exists. Applications are stored but not exposed to applicants.

### User Story

**As a** prospective chef who submitted an application
**I want to** check my application status online
**So that** I know if I'm approved, rejected, or still being reviewed

**Currently:** Applicant submits form, sees success confirmation. To check status, they must email support.

### Scope

**In:**
- Create `/chef/status` public page (no auth required)
- Applicant enters email address
- System looks up their application and shows status: `under_review`, `approved`, `rejected`
- Approved applicants see next steps (create account, set up profile)
- Rejected applicants see a respectful message (no specific reason needed)
- Under review applicants see expected timeline

**Out:**
- Admin-side application management UI (already exists in admin dashboard)
- Changing application status by applicant (admin action only)
- Detailed rejection reasons exposed to applicants

### Acceptance Criteria

- [ ] `/chef/status` page accessible without authentication
- [ ] Applicant enters email and sees their application status
- [ ] Status displays correctly for each state (under_review/approved/rejected)
- [ ] Empty state for email not found
- [ ] Build passes

### Metrics
- **Primary:** Status check rate (% of applicants who use the page)
- **Secondary:** Support tickets about application status (should decrease)

### Owner
Frontend Engineer + Backend Engineer

---

## Opportunity #3: Email Unsubscribe Infrastructure (P2) — STILL NOT DONE

### Problem Statement

When transactional emails are eventually sent (pending RESEND_API_KEY), there is no unsubscribe infrastructure. Legal compliance (CAN-SPAM, GDPR) requires a working unsubscribe mechanism. Currently any email sent would have broken or missing unsubscribe links.

**Root cause:** No unsubscribe token system exists in the database or email templates.

### User Story

**As a** diner who has opted into emails
**I want to** unsubscribe from marketing or notification emails
**So that** I only receive emails I explicitly want

**Currently:** No unsubscribe links exist in any email (because Resend isn't configured). When Resend is configured, emails will be sent without unsubscribe infrastructure — a legal liability.

### Scope

**In:**
- Add `unsubscribe_token` (UUID) to `profiles` table
- Create `/api/unsubscribe/[token]` endpoint that marks user as unsubscribed
- Add unsubscribe link to all transactional email templates: `{unsubscribe_url}` merge field
- Resend webhook handler for unsubscribe (handles bounce/complaint)
- Unsubscribe status field on profile: `email_unsubscribed BOOLEAN DEFAULT FALSE`

**Out:**
- Preference center UI (future)
- Granular unsubscribe (marketing vs. transactional) (future)
- SMS unsubscribe (future)

### Acceptance Criteria

- [ ] Each profile has a unique `unsubscribe_token`
- [ ] `/api/unsubscribe/[token]` marks profile as unsubscribed
- [ ] Email templates include unsubscribe link
- [ ] Build passes

### Metrics
- **Primary:** Unsubscribe rate (should be low — target<2%)
- **Secondary:** Spam complaints (should be0)

### Owner
Backend Engineer

---

## Opportunity #4: Analytics Dashboard Frontend (P1) — NEW GAP

### Problem Statement

MAI-2745 (Analytics / Funnel Tracking Dashboard) has:
- **Backend:** API routes and migration exist but are UNCOMMITTED
  - `src/app/api/analytics/events/route.ts`
  - `src/app/api/analytics/summary/route.ts`
  - `supabase/migrations/025_analytics_events.sql`
- **Frontend:** `/admin/analytics` dashboard NOT built yet

The analytics data model exists but is unusable without a frontend dashboard.

### User Story

**As an** admin
**I want to** see funnel metrics (waitlist conversion, booking funnel, event trends)
**So that** I can understand how users move through the platform

**Currently:** Analytics events are being tracked via API but no dashboard exists to view them.

### Scope

**In:**
- Build `/admin/analytics` page with funnel metrics display
- Metrics: waitlist conversion rate, booking funnel (visitors → subscribers → inquiries → bookings), weekly/monthly trends
- Use data from `GET /api/analytics/summary`
- Protect page (admin role required)
- Charts or visual summary (simple bar chart or table is sufficient for MVP)

**Out:**
- Real-time dashboard (polling is fine for MVP)
- Custom date range picker (future)
- Export functionality (future)

### Acceptance Criteria

- [ ] `/admin/analytics` shows at least 3 funnel metrics
- [ ] Page protected (admin role required)
- [ ] Backend commits made
- [ ] Build passes

### Owner
Frontend Engineer + Backend Engineer (for commit)

---

## Critical Blockers (Fred's Action Required — Unchanged)

| Item | Priority | Impact | Age |
|------|----------|--------|-----|
| RESEND_API_KEY | P0 | All transactional email dead |85+ days |
| STRIPE_SECRET_KEY | P0 | All payment processing dead | Unknown |
| Production deployment | P0 | Platform never live, zero revenue | Ongoing |

**Note:** MAI-2717 (Fred: Verify API Keys) and MAI-2749 (Fred: Production Deployment) are both marked high priority and sitting in todo. These require Fred's direct action — no agent can complete them.

---

## Tasks Created

1. **MAI-2771** (P0, Medium) — BE+FE: Guest Checkout Flow → Backend + Frontend
   - Booking token generation + `/guest/[token]` tracking page
   - No auth required to view

2. **MAI-2772** (P1, Medium) — BE+FE: Chef Application Status Tracker → Backend + Frontend
   - `/chef/status` page with email lookup
   - Status display for under_review/approved/rejected

3. **MAI-2773** (P2, Low) — BE: Email Unsubscribe Infrastructure → Backend Engineer
   - Unsubscribe token, API endpoint, email template integration
   - Legal compliance blocker

4. **MAI-2774** (P1, Medium) — BE+FE: Analytics Dashboard Frontend → Frontend + Backend
   - Build `/admin/analytics` page
   - Backend Engineer: commit untracked analytics files first

*Generated by Product Manager — MAI-2769*
