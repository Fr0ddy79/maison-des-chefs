# Product Opportunity Discovery — MAI-2123

**Issue:** a0e347a3-9ff3-4d40-b99a-5a2281c78eee
**Date:** 2026-05-26 20:00 UTC
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager
**Model:** MiniMax-M2.7

---

## 1. Executive Summary

**Platform is at $0 revenue with ~$1,725 at stake.** Both STRIPE_SECRET_KEY and RESEND_API_KEY remain as placeholders — same state as 16:00 UTC (MAI-2117) and 19:00 UTC (MAI-2121). Nothing has changed in 11+ hours. The blockers are 100% Fred-dependent: API keys, Marcel's WhatsApp number, and personal chef outreach. Engineering work is complete; the platform infrastructure is built and functional.

**Pipeline Status:** 🔴 STALLED — payment blocked, email blocked, chef acquisition stalled
**Theme this cycle:** Focus engineering on diner referral program (zero dependencies). Push Fred on API keys (blocks $680+).

---

## 2. Current Platform State (20:00 UTC)

### Live Data (from maison.db)

| Metric | Value | Notes |
|--------|-------|-------|
| Total leads | 10 | |
| Accepted quotes | 1 (Lead #551498) | $380 — payment blocked |
| Quoted leads | 1 (Lead #9) | $300 — email likely undelivered |
| Converted leads | 1 (Lead #1) | Booking #1 — no payment captured |
| Expired leads | 7 | Quote never accepted |
| Published services | 1 | "Dinner for 2" @ $95/person |
| Diners | 4 | |
| Pending bookings | 4 | ~$1,045 total — all stale |
| Revenue realized | **$0** | |
| Revenue at stake | **~$1,725** | $380 + $300 + $1,045 |

### P0 Blockers (Fred's Action Required)

| Item | Status | Impact | Owner |
|------|--------|--------|-------|
| STRIPE_SECRET_KEY | Placeholder | $380 blocked | Fred |
| RESEND_API_KEY | Placeholder | $300 quote undelivered | Fred |
| Marcel WhatsApp | NULL | $1,045 stale bookings can't be rescued | Fred |

**Note:** These have been flagged since 08:00 UTC (12 hours). No progress.

---

## 3. Active Work Tracking

| Issue | Title | Status |
|-------|-------|--------|
| MAI-2090 | Landing Page Conversion Audit | ✅ Done |
| MAI-2096 | Fix booking page auth gate + broken email reference | ✅ Done |
| MAI-2100 | BE: Production Deployment Setup | ✅ Done |
| MAI-2044 | FE: Build Quote Display Page | ✅ Built |
| MAI-2035 | BE: Quote API Endpoints | ✅ Verified EXISTS |
| MAI-1932 | BE: Auto-Quote on Accept | ✅ Working |
| MAI-2015 | CEO: Get Stripe Keys from Fred | 🔴 Pending — Fred |
| MAI-2029 | CEO: Escalate Marcel Outreach | 🔴 Pending — Fred |
| — | Stripe Payments Integration | 🔴 BLOCKED — Fred's key |
| — | Chef Acquisition Pipeline | 🔴 NOT STARTED — Fred's effort |
| — | Diner Referral Program | 🟡 NOT STARTED — HIGH LEVERAGE |

---

## 4. Product Opportunities

### Opportunity #1: Diner Referral Program MVP — P1 🟡 HIGH LEVERAGE, ZERO DEPENDENCIES

**Problem:** The platform has 4 diners but zero acquisition channel beyond Fred's personal outreach. With 1 chef and 1 service, GMV is capped. A diner referral program turns existing diners into acquisition agents — each confirmed booking generates a referral code that rewards the referrer and the referred diner.

**Why now:** The referral infrastructure partially exists:
- `referral_code` and `referral_source` columns already exist in the leads table
- Lead creation already handles referral attribution
- Referral codes table does NOT exist yet — needs to be created

**What exists vs. what's missing:**

| Component | Status |
|-----------|--------|
| `leads.referral_code` column | ✅ Exists |
| `leads.referral_source` column | ✅ Exists |
| `referral_codes` table | ❌ Does NOT exist |
| Referral code generation | ❌ Not implemented |
| Referral code display on confirmation | ❌ Not implemented |
| Referral attribution in admin view | ❌ Not implemented |

**User Story:**
> As a diner who had a great experience, I want to invite friends to try Maison des Chefs, so I can share something I love and earn a reward that lowers my next booking cost.

**Scope (MVP):**

**In:**
- Create `referral_codes` table (id, code, diner_id, created_at, used_at)
- After a **confirmed** booking (payment completed), generate a unique referral code for the diner
- Referral code displayed on diner's booking confirmation page
- When a new lead is created with `?ref=CODE`, store in `leads.referral_code`
- Referral attribution visible in lead/admin view

**Out:**
- No referral dashboard for diners (code shown only on confirmation page)
- No automated email of referral code (displayed only)
- No tiered rewards
- No expiry on referral codes

**Acceptance Criteria:**
- [ ] `referral_codes` table created with proper schema
- [ ] Each confirmed booking generates a unique referral code for the diner
- [ ] Referral code is displayed on diner's booking confirmation page
- [ ] `?ref=CODE` query param correctly populates `leads.referral_code`
- [ ] Referral attribution visible in lead/admin view

**Effort:** ~3-4 hours (backend table + code generation + frontend display)
**Dependencies:** None — can build now
**Owner:** Backend + Frontend

---

### Opportunity #2: Chef Outreach Relaunch — P1 🔴 STRUCTURAL CONSTRAINT

**Problem:** The platform has 1 chef (Chef Marcel) and 1 published service. GMV ceiling is whatever Chef Marcel can generate. Chef acquisition has stalled.

**What the prior PODs established:**
- Chef onboarding wizard exists (MAI-712)
- Outreach list was compiled (MAI-935_Outreach_List.csv)
- Marcel has not been responsive (whatsapp_number is NULL)
- Platform needs chef diversity for diner choice

**User Story:**
> As the platform operator, I want to recruit 2-3 additional private chefs in Montreal so diners have more choices and the business can scale beyond a single-chef operation.

**Scope (MVP):**

**In:**
- Fred identifies 3-5 target chefs from prior outreach list or new sources
- Fred sends personalized outreach via email/WhatsApp/Instagram DM
- Fred provides WarmIntro to at least 1 chef
- Target: 1 additional chef signs up and publishes a service within 2 weeks

**Out:**
- No automated chef recruitment funnel
- No paid chef acquisition channels

**Acceptance Criteria:**
- [ ] At least 1 new chef signs up via onboarding wizard
- [ ] New chef publishes at least 1 service
- [ ] New chef's service is visible on discovery page

**Effort:** Fred's personal outreach time (~2-4 hours over 2 weeks)
**Dependencies:** Fred's effort
**Owner:** Fred (outreach) + Platform (onboarding)

---

### Opportunity #3: Email Rescue — RESEND_API_KEY + Lead #9 Recovery — P1 🔴 URGENT

**Problem:** Lead #9 was quoted at $300 (~20 hours ago). RESEND_API_KEY is a placeholder, so the quote email likely was not delivered. Without email delivery, Lead #9's diner cannot accept the $300 quote.

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
- [ ] Lead #9 can click quote link and see $300 quote page
- [ ] Lead #9 status changes to `accepted` (or confirmed no response after 48h)

**Effort:** ~15 minutes (if Fred provides key) + verification
**Dependencies:** Fred provides RESEND_API_KEY
**Owner:** Fred (key) + Backend (verification)

---

## 5. Recommendations

**Priority order:**

| Priority | Action | Owner | Impact |
|----------|--------|-------|--------|
| 🔴 P0 | Replace RESEND_API_KEY → rescue Lead #9 ($300) | Fred | $300+ |
| 🔴 P0 | Replace STRIPE_SECRET_KEY → collect $380 | Fred | $380+ |
| 🟡 P1 | Build diner referral program MVP | Engineering | Viral acquisition |
| 🟡 P1 | Personal outreach to recruit 1 new chef | Fred | GMV ceiling lifted |
| 🟡 P1 | Provide Marcel's WhatsApp → rescue $1,045 | Fred | $1,045 |

**Theme:** Engineering should build the diner referral program (zero dependencies). Fred must provide API keys to unblock $680+ in immediate revenue.

---

## 6. Open Questions

| Question | Owner | Priority |
|----------|-------|----------|
| What is the diner referral incentive amount? | Fred | P1 |
| What is the chef referral incentive amount? | Fred | P1 |
| What is the timeline for Fred to provide API keys? | Fred | P0 |
| Can Lead #9 be reached via phone instead of email? | Growth | P2 |

---

## 7. Summary

| Opportunity | Effort | Impact | Owner | Priority |
|-------------|--------|--------|-------|----------|
| Replace RESEND_API_KEY | 5 min | $300+ collected | Fred | 🔴 P0 |
| Replace STRIPE_SECRET_KEY | 5 min | $380+ collected | Fred | 🔴 P0 |
| Diner referral program MVP | 3-4h | Viral acquisition loop | Engineering | 🟡 P1 |
| Chef acquisition outreach | 2-4h | GMV ceiling lifted | Fred | 🟡 P1 |
| Marcel WhatsApp | Fred effort | $1,045 recovered | Fred | 🟡 P1 |

**The structural insight:** 12 hours have passed since API key blockers were first flagged. The product infrastructure is built and functional — the gap is purely Fred's external actions. While waiting for keys, engineering should build the diner referral program (high leverage, zero dependencies), which leverages the 4 existing diners as acquisition agents.

---

*End of report — MAI-2123*