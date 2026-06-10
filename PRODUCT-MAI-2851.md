# Product Opportunity Discovery — MAI-2851

**Autopilot Run:** 2026-06-10 12:00 America/New_York
**Analyst:** Product Manager

---

## Executive Summary

**Since MAI-2829 (Jun 10, 00:00), status unchanged:**
- Platform remains feature-complete
- Build passes, working tree clean
- All buildable tasks complete or in-progress
- **90+ days blocked on infrastructure (API keys + deployment)**

**3 new opportunities identified:**
1. Cookie Consent Banner (P2) — GDPR legal compliance gap
2. Analytics Dashboard Frontend (P1) — Backend API exists, FE not built
3. Loading Skeleton System (P3) — UX improvement for perceived performance

**Post-Launch Readiness (MAI-2828)** is already in_progress — no duplicate work needed.

---

## Critical Blockers (Fred's Action Required — Unchanged 90+ Days)

| Item | Priority | Impact | Age |
|------|----------|--------|-----|
| RESEND_API_KEY | P0 | All transactional email dead | 90+ days |
| STRIPE_SECRET_KEY | P0 | No real payments | Never configured |
| Production deployment | P0 | Platform not accessible to public | Never |

**Key Insight:** Every revenue-generating feature is built and committed. The platform is ready to ship. The only step between this codebase and revenue is Fred running `vercel --prod` with real API keys configured.

---

## Opportunity #1: Cookie Consent Banner (P2)

### Problem Statement

The platform has no cookie consent banner. Under GDPR (EU) and similar regulations, websites collecting cookies must obtain informed consent from users before setting non-essential cookies. "Maison des Chefs" is a French-branded platform likely targeting European diners — this is a legal compliance gap that could result in regulatory fines.

### User Story

**As a** platform operator
**I want to** display a cookie consent banner
**So that** I comply with GDPR and avoid potential fines

**As a** EU diner
**I want to** understand what cookies are used and consent to tracking
**So that** I feel my privacy is respected

**Currently:** No cookie consent banner exists. Analytics cookies (if any) are set without consent.

### Scope

**In:**
- Cookie consent banner on first visit
- Categories: Essential (always on), Analytics, Marketing (optional)
- "Accept All" / "Reject All" / "Customize" options
- Store consent in cookie with timestamp
- Respect "Reject All" by disabling non-essential cookies
- Banner appears on all pages until consent is given

**Out:**
- Full CMP (Consent Management Platform) functionality
- Granular per-cookie control
- Cookie policy page (future — /privacy already exists)

### Acceptance Criteria

- [ ] Cookie banner appears on first visit for new users
- [ ] "Reject All" disables analytics/marketing cookies
- [ ] Consent is stored and persists across sessions
- [ ] Build passes
- [ ] No console errors from cookie logic

### Metrics

- **Primary:** Cookie consent rate (target: >70% accept or customize)
- **Secondary:** GDPR complaint count (target: 0)

### Open Questions

- Which analytics are currently in use? (Need to audit existing tracking)
- Should we use a library (e.g., cookieconsent) or custom implementation?

### Owner
Frontend Engineer

---

## Opportunity #2: Analytics Dashboard Frontend (P1)

### Problem Statement

The admin analytics backend API exists (MAI-2769: "Analytics API endpoints" committed in commit `ec6f648`) but no frontend dashboard exists at `/admin/analytics`. Admins have no visibility into platform metrics — acquisition, conversion, revenue — without querying the database directly.

### User Story

**As an** admin
**I want to** see platform analytics in a dashboard
**So that** I can make data-driven decisions without database access

**Currently:** Backend API endpoints exist at `/api/analytics/*` but no UI renders this data.

### Scope

**In:**
- `/admin/analytics` page with key metrics cards
- Acquisition metrics: visitor count, source breakdown
- Conversion metrics: booking request rate, acceptance rate
- Revenue metrics: total revenue, average booking value
- Date range picker (7d, 30d, 90d)
- Simple charts (line for trends, bar for breakdowns)

**Out:**
- Real-time dashboard (future)
- Custom report builder (future)
- Export to CSV/PDF (future)
- Multi-tenant analytics (future)

### Acceptance Criteria

- [ ] `/admin/analytics` page renders and is accessible to admins
- [ ] Key metrics are displayed (visitors, bookings, revenue)
- [ ] Date range selection works
- [ ] Build passes

### Metrics

- **Primary:** Admin dashboard visit rate (target: >50% of admin sessions)
- **Secondary:** Time to first admin analytics action (target: <2 min)

### Owner
Frontend Engineer

---

## Opportunity #3: Loading Skeleton System (P3)

### Problem Statement

Page transitions and data loading states show nothing or raw spinners. This creates a perception of slowness even when the app is responsive. Skeleton loaders (gray placeholder shapes that pulse) are a standard UX pattern that improves perceived performance.

### User Story

**As a** diner
**I want to** see loading indicators that show content is coming
**So that** I know the app is working and don't think it's broken

**Currently:** Pages show blank space or generic spinners during data fetches.

### Scope

**In:**
- Skeleton loader component (`src/components/Skeleton.tsx`)
- Skeleton variants: text line, card, avatar, table row
- Pulse animation (not spinner)
- Apply to high-traffic pages: chef listing, chef profile, dashboard
- Suspense boundaries with fallback skeletons

**Out:**
- Global loading spinner replacement (keep spinners for actions)
- Full page skeleton for every route (just key pages)

### Acceptance Criteria

- [ ] `Skeleton` component exists and is reusable
- [ ] Chef listing page shows skeleton cards during load
- [ ] Chef profile page shows skeleton during load
- [ ] Build passes

### Metrics

- **Primary:** Perceived load time improvement (target: -20% in user surveys)
- **Secondary:** Bounce rate on slow connections (target: -10%)

### Owner
Frontend Engineer

---

## Priority Ranking

| # | Opportunity | Priority | Effort | Impact | Owner |
|---|------------|----------|--------|--------|-------|
| 1 | Analytics Dashboard Frontend | P1 | Medium | Medium — business visibility | FE |
| 2 | Cookie Consent Banner | P2 | Low | Medium — legal compliance | FE |
| 3 | Loading Skeleton System | P3 | Low | Low-Medium — UX/perceived perf | FE |

---

## Tasks Created

1. **MAI-2853** (P1, Medium) — **FE: Analytics Dashboard Frontend**
   - `/admin/analytics` page with key metrics
   - Date range picker, simple charts
   - Owner: Frontend Engineer

2. **MAI-2854** (P2, Low) — **FE: Cookie Consent Banner**
   - GDPR-compliant consent banner
   - Accept/Reject/Customize options
   - Owner: Frontend Engineer

3. **MAI-2855** (P3, Low) — **FE: Loading Skeleton System**
   - Skeleton component with variants
   - Apply to key pages
   - Owner: Frontend Engineer

---

## What Should Fred Do Right Now

While agents build these P1-P3 features, Fred should:

1. **Get Resend API key** — Sign up at resend.com, create API key, add to Vercel env vars
2. **Get Stripe secret key** — Stripe dashboard → Developers → API keys → secret key, add to Vercel env vars
3. **Deploy to Vercel** — `vercel --prod` with real API keys = platform live and earning revenue

The agents will keep building polish features. But without Fred's action on deployment, none of it matters.

---

## Notes

- MAI-2828 (Post-Launch Readiness) is in_progress and covers deployment checklist — no duplicate
- MAI-2832 (Service Image Gallery) is in_progress — phase1 done, phase 2 wiring in progress
- MAI-2834 (Chef Public Response to Reviews) is done
- MAI-2833 (Admin Booking Management) is done
- All revenue-blocking work is complete; only Fred's infrastructure action remains

*Generated by Product Manager — MAI-2851*
