# Product Opportunity Discovery — MAI-2117

**Issue:** 613bb1ac-1de7-4d0d-beee-ecce53022945
**Date:** 2026-05-26 16:00 UTC
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager
**Model:** MiniMax-M2.2

---

## 1. Executive Summary

**Platform is at $0 revenue with $1,725 at stake.** The prior POD (MAI-2112, 08:00 UTC) flagged STRIPE_SECRET_KEY and RESEND_API_KEY as placeholder values blocking $380+ in collected revenue. At 16:00 UTC, **both keys remain as placeholders** — the blockers are unchanged and still require Fred's action. The deeper structural constraint remains: **1 published chef, 1 published service, thin diner acquisition channel.**

**Pipeline Status:** 🟡 STALLED — quote flow works, payment blocked, diner acquisition absent
**Theme this cycle:** No meaningful product changes since 08:00 UTC. The blockers are operator-side (API keys) not engineering-side. Engineering should focus on the diner referral program (high leverage, builds acquisition channel) while Fred resolves the API key situation.

---

## 2. Current Platform State (16:00 UTC)

### Metrics Snapshot

| Metric | Value | Change Since MAI-2112 (08:00 UTC) |
|--------|-------|-----------------------------------|
| Published services | 1 | No change |
| Diners (total users) | 4 | No change |
| Leads created | 10 | No change |
| Lead #551498 accepted | **$380** | Unchanged — payment still blocked |
| Lead #9 quoted | **$300** | Unchanged — email not confirmed delivered |
| Pending bookings | 4 | No change — all stale |
| Confirmed bookings | **0** | No change — no payments completed |
| Revenue realized | **$0** | No change |
| Revenue at stake | **~$1,725** | $380 accepted + $300 quoted + $1,045 pending |
| STRIPE_SECRET_KEY | **Placeholder** | 🔴 Unchanged — $380 blocked |
| RESEND_API_KEY | **Placeholder** | 🔴 Unchanged — emails dead |

### Live Data (from maison.db)

**Lead Funnel (all time):**
| Status | Count | Value | Notes |
|--------|-------|-------|-------|
| accepted | 1 | $380 | Lead #551498 — payment blocked by Stripe placeholder |
| quoted | 1 | $300 | Lead #9 — created ~16h ago, quote email likely undelivered |
| converted | 1 | — | Booking #1 — chef responded, no payment captured |
| expired | 7 | — | Leads #1-8 — quote never accepted or chef no-response |

**Bookings (all pending — stale):**
| ID | Total | Event Date | Guests | Status |
|----|-------|------------|--------|--------|
| 1 | $190 | 2026-05-15 | 2 | `pending` |
| 2 | $190 | 2026-06-15 | 2 | `pending` |
| 3 | $285 | 2026-06-20 | 3 | `pending` |
| 4 | $380 | 2026-07-01 | 4 | `pending` |

**Services (published):**
| Chef | Service | Price | Status |
|------|---------|-------|--------|
| Marcel (chef@demo.com) | Dinner for 2 | $95/person | published |

**Users:**
| ID | Role | Email |
|----|------|-------|
| 1 | chef | chef@demo.com (Marcel) |
| 2 | diner | diner@demo.com |
| 3 | diner | test+mai1109@example.com |
| 4 | diner | mai1109-final@test.com |

### What Has NOT Changed (P0 Blockers — Fred's Action Required)

| Item | Status | Impact | Owner |
|------|--------|--------|-------|
| STRIPE_SECRET_KEY | Placeholder (`sk_live_...`) | $380+ revenue blocked | Fred |
| RESEND_API_KEY | Placeholder (`re_...`) | Quote emails not delivered | Fred |
| Chef Marcel WhatsApp | NULL | $1,045 stale bookings can't be rescued | Fred |

**Note:** Both API keys are still showing as placeholder values in `.env`. This is the same state as MAI-2112 at 08:00 UTC — 8 hours have passed without resolution.

---

## 3. Active Work Tracking

| Issue | Title | Status |
|-------|-------|--------|
| MAI-2090 | Landing Page Conversion Audit | ✅ Done |
| MAI-2096 | Fix booking page auth gate + broken email reference | ✅ Done |
| MAI-2100 | BE: Production Deployment Setup | ✅ Done |
| MAI-2044 | FE: Build Quote Display Page | ✅ Built |
| MAI-1932 | BE: Auto-Quote on Accept | ✅ Working |
| — | Stripe Payments Integration | 🔴 BLOCKED — Fred must add real key |
| — | Chef Acquisition Pipeline | 🔴 NOT STARTED — only 1 chef |
| — | Diner Referral Program | 🟡 NOT STARTED — high potential |

---

## 4. Product Opportunities

### Opportunity #1: Diner Referral Program MVP — P1 🟡 HIGH LEVERAGE

**Problem:** The platform has 4 diners but no acquisition channel beyond Fred's personal outreach. With only 1 chef and 1 service, the GMV ceiling is capped. A diner referral program turns existing diners into acquisition agents — each confirmed booking generates a referral code that rewards the referrer and the referred diner, creating a viral loop.

**Why now:** The infrastructure is already in place:
- `referral_code` and `referral_source` columns exist in the leads table
- Quote flow is built and works
- Lead creation handles referral attribution
- Only missing: displaying the referral code to diners after confirmed booking

**User Story:**
> As a diner who had a great experience, I want to invite friends to try Maison des Chefs, so I can share something I love and earn a reward that lowers my next booking cost.

**Scope (MVP):**

**In:**
- After a **confirmed** booking (payment completed), diner receives a unique referral code
- Referral code displayed on diner's booking confirmation page
- Referral code also included in booking confirmation email (once RESEND works)
- When a new lead is created with a `referral_code`, it is stored in `leads.referral_code`
- Referral attribution visible in lead/admin view
- Rewards: referrer gets $20 off next booking, referred diner gets $20 off first booking (Fred to confirm amounts)

**Out:**
- No referral dashboard for diners (code shown only on confirmation page)
- No automated email of referral code (displayed only)
- No tiered rewards
- No expiry on referral codes
- No referral leaderboard

**Acceptance Criteria:**
- [ ] Each confirmed booking generates a unique referral code for the diner
- [ ] Referral code is displayed on diner's booking confirmation page
- [ ] When a new lead is created with a referral_code, it is stored in `leads.referral_code`
- [ ] Referral attribution is visible in lead/admin view
- [ ] Referral code is a meaningful random string (not lead ID)

**Effort:** ~3-4 hours (frontend display + backend code generation)
**Dependencies:** Confirmed booking (needs Stripe key first to test)
**Owner:** Backend + Frontend

---

### Opportunity #2: Chef Outreach Relaunch — P1 🔴 STRUCTURAL CONSTRAINT

**Problem:** The platform has 1 chef (Chef Marcel) and 1 published service. This caps GMV at whatever Chef Marcel can generate. The prior CEO loops identified outreach targets, but chef acquisition has stalled. Fred needs to relaunch personal outreach to recruit additional chefs.

**What the prior PODs established:**
- Chef onboarding wizard exists (MAI-712)
- Outreach list was compiled (MAI-935_Outreach_List.csv)
- Marcel has not been responsive (whatsapp_number is NULL)
- The platform needs chef diversity to offer diner choice

**User Story:**
> As the platform operator, I want to recruit 2-3 additional private chefs in Montreal so diners have more choices, the platform earns commission on more bookings, and the business can scale beyond a single-chef operation.

**Scope (MVP):**

**In:**
- Fred identifies 3-5 target chefs from prior outreach list or new sources
- Fred sends personalized outreach via email/WhatsApp/Instagram DM
- Fred provides WarmIntro to at least 1 chef
- Target: 1 additional chef signs up and publishes a service within 2 weeks

**Out:**
- No automated chef recruitment funnel
- No paid chef acquisition channels
- No chef referral program yet

**Acceptance Criteria:**
- [ ] At least 1 new chef signs up via onboarding wizard
- [ ] New chef publishes at least 1 service
- [ ] New chef's service is visible on discovery page

**Effort:** Fred's personal outreach time (~2-4 hours over 2 weeks)
**Dependencies:** Chef onboarding wizard (already built)
**Owner:** Fred (outreach) + Platform (onboarding)

---

### Opportunity #3: Email Rescue — RESEND_API_KEY + Lead #9 Recovery — P1 🔴 URGENT

**Problem:** Lead #9 was quoted at $300 (~16 hours ago). The RESEND_API_KEY is a placeholder, so the quote email was likely not delivered. Without email delivery, Lead #9's diner cannot accept the $300 quote, and the first quote-to-acceptance metric cannot be validated.

**User Story:**
> As the platform operator, I want Lead #9's $300 quote to be delivered to the diner's inbox, so they can accept it and we can validate the full quote-to-payment path.

**Scope (MVP):**

**In:**
- Fred replaces RESEND_API_KEY placeholder with real key
- Verify Resend can send emails (send a test)
- Check if Lead #9's quote email was queued/sent
- Resend quote email to Lead #9 if not delivered
- Verify email lands in inbox (not spam)

**Out:**
- No email template redesign
- No drip campaigns

**Acceptance Criteria:**
- [ ] RESEND_API_KEY is a real working key (not placeholder)
- [ ] Lead #9's quote email is delivered to valid inbox
- [ ] Diners can click quote link and see $300 quote page
- [ ] Lead #9 status changes to `accepted` (or confirmed no response after 48h)

**Effort:** ~15 minutes (if Fred provides key) + verification
**Dependencies:** Fred provides RESEND_API_KEY
**Owner:** Fred (key) + Backend (verification)

---

## 5. Recommendations

**Priority order:**

1. **🔴 DO NOW (Fred):** Replace RESEND_API_KEY placeholder → rescue Lead #9's $300 quote
2. **🔴 DO NOW (Fred):** Replace STRIPE_SECRET_KEY placeholder → collect $380 from Lead #551498
3. **🟡 DO NEXT (Fred):** Start personal outreach to recruit 1 new chef within 2 weeks
4. **🟡 DO NEXT (Engineering):** Build diner referral program MVP on existing infrastructure
5. **🟡 DO SOON (Fred):** Provide Chef Marcel's WhatsApp number → rescue ~$1,045 stale bookings

**The theme:** The product infrastructure is largely built. The bottleneck is Fred providing API keys and doing personal chef outreach. Engineering bandwidth should be focused on the referral program (high leverage, builds acquisition channel) while Fred handles the relationship/API key work.

---

## 6. Open Questions

| Question | Owner | Priority |
|----------|-------|----------|
| What is the diner referral incentive? ($20 off first booking?) | Fred | P1 |
| What is the chef referral incentive? ($50 credit? flat fee?) | Fred | P1 |
| Can Lead #9 be reached via phone instead of email? | Growth | P2 |
| Should we offer a "first booking free" diner acquisition tactic? | Fred | P2 |
| What is the timeline for Fred to provide API keys? | Fred | P0 |

---

## 7. Summary

| Opportunity | Effort | Impact | Owner | Priority |
|-------------|--------|--------|-------|----------|
| Replace RESEND_API_KEY | 5 min | $300+ collected | Fred | 🔴 P0 |
| Replace STRIPE_SECRET_KEY | 5 min | $380+ collected | Fred | 🔴 P0 |
| Diner referral program MVP | 3-4h | Viral acquisition loop | Engineering | 🟡 P1 |
| Chef acquisition outreach | 2-4h | GMV ceiling lifted | Fred | 🟡 P1 |
| Chef Marcel WhatsApp | Fred effort | ~$1,045 recovered | Fred | 🟡 P1 |

**The structural insight:** 8 hours have passed since MAI-2112 flagged the API key blockers. Neither has been resolved. The payment infrastructure is validated by the working quote flow — the gap is purely operator-side (Fred adding real keys). The more durable risk is that the platform has 1 chef and no acquisition channel. A diner referral program leverages the existing diner base as acquisition agents, and expanding chef supply解除 the single-chef bottleneck that caps GMV.

---

*End of report — MAI-2117*