# MAI-856: Initial Product Vision & MVP Scope

**Issue:** 9bffed55-4008-4218-8514-47698b80abf5
**Owner:** Product Manager
**Date:** 2026-04-29
**Status:** ✅ Complete

---

## 1. Vision Statement

**Maison des Chefs** is a two-sided marketplace that connects Montreal diners with verified private chefs for premium at-home dining experiences — making it effortless to discover, book, and enjoy a personal chef for any occasion.

**One-line pitch:** *"Your kitchen, their talent, an unforgettable evening."*

**Current phase:** Post-MVP — the core booking flow is built and functional. The platform is live in development with production deployment blocked pending Stripe configuration.

---

## 2. Target Users

### Diners (Demand Side)
- **Who:** Montreal residents hosting dinners, parties, corporate events, or intimate gatherings
- **Pain:** Catering is impersonal; restaurants are crowded; they want a memorable, customized culinary experience at home
- **Why now:** Growing demand for experiential luxury; Montreal has a rich food culture that lends itself to private chef experiences
- **Segmentation:**
  - Social diners (birthdays, dinner parties, date nights)
  - Corporate hosts (team events, client dinners, off-sites)
  - Occasion-driven (holidays, anniversaries, milestones)

### Chefs (Supply Side)
- **Who:** Professional private chefs in Montreal, ranging from culinary school graduates to seasoned restaurateurs
- **Pain:** Inconsistent demand, no discovery platform, manual outreach and booking management
- **Why now:** Platform gives them a managed funnel of pre-qualified diners without cold outreach

---

## 3. MVP Features — Current State

### Core Modules (Phase 1 ✅)

| Module | Feature | Status |
|--------|---------|--------|
| Auth | User registration (chef/diner), login, JWT + refresh tokens | ✅ Complete |
| Chef Profiles | Profile creation/update, public listing, detail view | ✅ Complete |
| Services | Service CRUD by chef, public listing by chef | ✅ Complete |
| Bookings | Booking request → chef approve/reject flow | ✅ Complete |

### Supporting Infrastructure (Built but Unsurfaced)

| Feature | Status | Notes |
|---------|--------|-------|
| Email: Diner confirmation on inquiry | ✅ Built | Sent on lead creation |
| Email: Quote notification to diner | ✅ Built | When chef responds |
| Email: Quote reminder at 72h | ✅ Built | If no response |
| Email: Abandoned booking recovery | ✅ Built | If diner starts but doesn't finish |
| Email: Stale lead re-engagement (diner) | ✅ Built | ~7 days, uncommitted |
| Email: Stale lead alert (chef dashboard) | ✅ Built | On lead dashboard |
| Referral tracking infrastructure | ✅ Built | Codes generated, schema ready |
| Diner preferences wizard | ✅ Built | Never surfaced post-signup |
| Booking status page | ✅ Built | Public URL with access token |
| Chef lead dashboard | ✅ Built | With stale alert |
| Chef discovery page | ✅ Built | Uncommitted |

### Features Needed (Activation Gap)

| Feature | Priority | Effort |
|---------|----------|--------|
| Commit Chef Discovery Page + Stale Lead Email | 🔴 P0 | ~30min |
| Chef Pipeline Summary Dashboard | 🟡 P2 | ~2h |
| Chef Photo Upload System | 🟡 P2 | ~3h |
| Post-Booking Referral Share Moment | 🟢 P3 | ~1.5h |
| Diner Preferences Wizard Trigger | 🟢 P3 | ~1h |

---

## 4. Success Metrics

### Primary Metrics (Revenue-Adjacent)

| Metric | Definition | Current Baseline | Target |
|--------|------------|-----------------|--------|
| Booking Conversion Rate | Bookings confirmed / leads created | Unknown (1 booking, 1 lead in DB) | >60% |
| Chef 24h Response Rate | % of leads responded within 24h | Unknown | >80% |
| Diner Retention | Repeat bookings per diner | 0 (too early) | >20% at 6mo |
| Referral Rate | Referral-generated signups / total | 0 (mechanism exists but unused) | >5% |

### Secondary Metrics (Funnel Health)

| Metric | Definition | Target |
|--------|------------|--------|
| Landing page → Service catalog | Top-of-funnel traffic | 500 visits/mo |
| Service catalog → Lead | Inquiry conversion rate | >3% |
| Quote acceptance rate | Diners who accept chef quote | >50% |
| Checkout completion | Quote → Payment | >70% |
| Chef supply growth | New chefs onboarded/mo | >5/mo |

### Platform Health

| Metric | Target |
|--------|--------|
| System uptime | >99.5% |
| API response time (p95) | <200ms |
| Email delivery rate | >95% |

---

## 5. Constraints

### Tech Stack (Fixed)
- **Runtime:** Node.js 24+
- **Language:** TypeScript
- **API Framework:** Fastify
- **Database:** SQLite (Drizzle ORM)
- **Auth:** JWT with refresh tokens
- **Payments:** Stripe (pending production keys)
- **Deployment:** Vercel (OIDC token expired — blocked)

### Blocker (Critical — Fred Action Required)
| Item | Status | Impact |
|------|--------|--------|
| Vercel OIDC Token | **EXPIRED** | Cannot deploy to production |
| Stripe Keys (live) | **MISSING** | Cannot process real payments |

### Resources
- Development is agent-powered (no dedicated engineers)
- One human operator (Fred) making strategic decisions
- No marketing budget yet

### Scope Boundaries
- MVP does NOT include: payments (future), multi-photo gallery, admin dashboard, webhooks for external calendar sync, SMS notifications
- Payments gate: real money cannot move until MAI-618 resolved

---

## 6. Open Questions

| # | Question | Priority | Owner | Status |
|---|----------|----------|-------|--------|
| 1 | ETA for Stripe live keys + Vercel OIDC refresh? | 🔴 Critical | Fred | **12+ days pending** |
| 2 | What referral reward structure? (Fixed $ / % off / credit?) | 🟡 Medium | Fred | Undecided |
| 3 | Chef verification workflow — manual or automated? | 🟢 Low | Product | Future phase |
| 4 | Platform commission % on bookings? | 🟡 Medium | Fred | Undecided |
| 5 | Corporate pricing — custom rates or same as diner? | 🟢 Low | Product | Future phase |

---

## 7. Acceptance Criteria — This Document

- [x] Vision statement exists and is clear — *"Your kitchen, their talent, an unforgettable evening."*
- [x] Target user defined — Montreal diners (social/corporate/occasion-driven) and private chefs
- [x] MVP features listed with priorities — Core modules ✅, activation features in progress
- [x] Success metrics defined — Booking conversion, response rate, retention, referral
- [x] Open questions documented — 5 questions with owners and priority

---

## 8. Next Steps (Recommended)

| Priority | Action | Owner |
|----------|--------|-------|
| 🔴 P0 | Commit uncommitted code (Chef Discovery Page + Stale Lead Email) | BE/FE agents |
| 🔴 P0 | Fred: Refresh Vercel OIDC token + provide Stripe live keys | Fred |
| 🟡 P1 | Build: Chef Pipeline Dashboard | BE + FE |
| 🟡 P1 | Build: Chef Photo Upload System | BE + FE |
| 🟡 P2 | Build: Post-Booking Referral Share | FE |
| 🟡 P2 | Fred: Decide referral reward structure | Fred |

---

## 9. Related Documents

| Document | Focus |
|---------|-------|
| SPEC.md | Technical specification and data models |
| MAI-852 | Product Opportunity Discovery (detailed growth analysis) |
| MAI-848 | Growth Optimization — Funnel Analysis & Top Experiments |
| MAI-847 | Growth Optimization brief |

---

*Product Brief — MAI-856 — Generated by Product Manager Agent (Max) on 2026-04-29*
