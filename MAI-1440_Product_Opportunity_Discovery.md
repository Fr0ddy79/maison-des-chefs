# Product Opportunity Discovery — MAI-1440

**Issue:** 5ed97884-149f-4001-8dec-e2e5676df101
**Date:** 2026-05-12 08:00 UTC
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager
**Model:** MiniMax-M2.7
**Cycle:** 4-hour recurring — prior cycle MAI-1435 at 04:00 UTC (May 12)

---

## 1. Executive Summary

**Pipeline Status:** 🔴 CRITICAL — Zero confirmed bookings after 50+ days.

4-hour cycle check finds **no progress on critical items**. MAI-1387 (One-Click Chef Lead Response) is marked P0/CEO priority but still sits in todo with no activity 4 hours after the prior cycle recommended it. MAI-1324 (FE Urgency QA Fix) is also stalled — the REBUILD NEEDED label from the CEO hasn't moved it forward.

**New opportunity this cycle: Chef Onboarding Activation.** With 0 confirmed bookings despite 8 leads and 1 published service, the problem is partially upstream — chef Marcel has a service but no activation guidance on how to get booking requests to convert. A targeted onboarding touchpoint could unlock the pipeline.

---

## 2. Current Platform State (08:00 UTC May 12)

| Metric | Value | Change Since Prior Cycle |
|--------|-------|--------------------------|
| Published services | 1 | No change |
| Pending bookings/leads | 4+ | No change |
| Confirmed bookings | **0** | 🔴 No change |
| Revenue at stake | ~$1,045 | No change |
| Leads (new/converted) | 8 (7/1) | No change |
| Chef response rate | **0/8 = 0%** | 🔴 Unchanged (50+ days) |
| RESEND_API_KEY | Missing | Fred's action (50+ days) |
| STRIPE_SECRET_KEY | Empty | Fred's action (50+ days) |

---

## 3. What's In Flight — No Movement Since Prior Cycle

| Issue | Title | Status | Gap |
|-------|-------|--------|-----|
| MAI-1387 | One-Click Chef Lead Response | todo, high, FE | 0% chef response root cause — **no progress 4h** |
| MAI-1359 | BE: Chef Instant Notification via Resend | todo, high, BE | Blocked by RESEND_API_KEY (Fred's action) |
| MAI-1381 | BE: Prepare Chef Notification Code | todo, high, BE | Prep work, waiting on MAI-1359 |
| MAI-1324 | FE Fix: Chef Dashboard Urgency QA Failures | todo, high, FE | REBUILD NEEDED — **no progress 4h** |
| MAI-1366 | FE: Inline Auth Panel on Booking Form | todo, high, FE | Revenue conversion — stalled |

**Stall pattern:** Multiple P1 items have been "in progress" for 12-48h without advancing. FE queue appears congested with MAI-1324 (REBUILD NEEDED) blocking MAI-1320 (QA), which in turn means MAI-1387 can't be validated.

---

## 4. Root Cause Analysis: Why 0/8 Chef Response Rate Persists

The prior cycle correctly identified that MAI-1387 is the P0 fix. But it's been 4 hours and nothing has happened. Let me surface why this matters more urgently:

**Current state of chef lead flow:**
1. Diner submits booking request → lead created with status `pending_chef_confirmation`
2. Chef gets **no notification** (RESEND missing)
3. Chef must manually check dashboard to see leads
4. Even when chef sees leads, response requires multi-step friction (open lead → compose message → send)
5. Result: leads go stale, diners abandon

**MAI-1387 fixes #4** (one-click accept/decline).
**MAI-1359/MAI-1381 fixes #2** (email notifications).
**RESEND_API_KEY from Fred fixes #2** (infrastructure).

But the bottleneck right now is that FE is overloaded with MAI-1324 rebuild AND MAI-1387 is in the same queue. The CEO needs to know: FE queue is the critical path.

---

## 5. New Opportunity: Chef Onboarding Activation Touchpoint

### Problem Statement

**Who:** Chef Marcel (the only active chef on the platform)
**Problem:** Chef has 1 published service and at least 4 pending booking requests, but 0 confirmed bookings. No onboarding sequence exists to guide the chef through:
1. What to do when a booking request arrives
2. How to respond (one-click accept/decline is coming but not live)
3. What their response time should be
4. How to convert pending requests to confirmed bookings

**Evidence:**
- MAI-1411 (Chef Acquisition Activation Campaign) exists but is marked done with "Fred to execute outreach"
- No chef-side activation touchpoint has been created
- chef-dashboard-page.ts shows pending bookings but chef may not understand urgency

**Impact:**
- 4 pending leads worth ~$1,045 are stuck with no response
- Even if MAI-1387 is shipped, chef needs to know how to use it
- Without activation, shipping the feature doesn't solve the problem

### User Story

> As a chef, I want to know exactly what to do when a booking request arrives so that I can respond quickly and convert leads to confirmed bookings.

---

## 6. Scope (MVP — 1 component, ~1.5h)

### Chef Onboarding Activation Email

**Trigger:** When a chef's first booking request arrives (first lead ever, or first lead after 30+ days of inactivity)

**Email content:**
- Subject: "You have a booking request! Here's how to respond in 30 seconds 👨‍🍳"
- Body:
  - "A diner just requested to book your [service name] for [date]"
  - Screenshot/description of where to find it in dashboard
  - "Click Accept to confirm or Decline if unavailable"
  - "Tip: Responding within 2 hours dramatically increases booking conversion"
  - Link to chef dashboard

**Timing:** Send immediately when first lead is created (fire-and-forget, don't block lead creation)

**Eligibility:** 
- Chef's first lead ever (no prior leads in system)
- OR chef's first lead in 30+ days (reactivation)
- One-shot per chef (store `onboardingEmailSentAt` in chef profile)

**Tracking:**
- `chef_onboarding_email_sent` event in analytics
- UTM: `?utm_source=onboarding_email&utm_content=first_lead`

---

### Out of Scope (Post-MVP)

- Push notifications to chef mobile app
- SMS notification (requires Twilio or similar)
- Automated follow-up if chef doesn't respond within 48h (use chef notification via Resend once available)
- Multiple onboarding emails

---

## 7. Acceptance Criteria

- [ ] Onboarding email fires when chef's first lead is created (fire-and-forget)
- [ ] Email content: explanation of what a booking request is, where to find it, how to respond
- [ ] Email includes a direct link to the chef's dashboard
- [ ] Email is idempotent (fires once per chef, not on every lead)
- [ ] If RESEND_API_KEY is missing: email is skipped gracefully (log warning, don't crash lead creation)
- [ ] Mobile-responsive at 375px for email renders

---

## 8. Effort Estimate

| Component | Effort | Priority |
|-----------|--------|----------|
| Chef Onboarding Activation Email | 1.5h | P1 |
| **Total MVP** | **~1.5h** | |

**Dependencies:**
- RESEND_API_KEY (Fred's action — blocks all email sending)
- Database trigger for lead creation (MAI-1392 — "in progress" per CEO loop)
- `chef_profiles` table exists (has `is_verified`, `bio`, etc.)

---

## 9. Edge Cases

| Scenario | Behavior |
|----------|----------|
| RESEND_API_KEY missing | Email skipped, log warning, lead creation continues normally |
| Chef already received onboarding email | Idempotent — skip if `onboardingEmailSentAt` is set |
| First lead is for a chef with no published service | Still fire email (chef should publish service first) |
| Resend API call fails | Log error, do not retry, lead creation continues |

---

## 10. Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Chef onboarding email delivery rate | 100% (if RESEND available) | N/A |
| Lead-to-confirmed conversion rate | Target: 30% within 7 days | 0% |
| Time to first chef response | Target: <2h | Unknown (50+ days with 0 responses) |

**Measurement plan:**
1. Track `chef_onboarding_email_sent` event with chef_id and lead_id
2. Track time from email sent to first chef action on the lead
3. Compare conversion rate for leads with/without onboarding email (baseline vs. treatment)

---

## 11. Critical Path Analysis: What Unblocks Everything

The CEO's loop notes consistently point to the same blocker: **FE queue is congested**. MAI-1324 needs to be rebuilt (not just fixed), and MAI-1387 requires FE bandwidth.

**Recommended path forward:**

| Step | Action | Owner | Unblocks |
|------|--------|-------|----------|
| 1 | MAI-1324: Clean rebuild of urgency system (explicit scope) | FE | MAI-1320 QA |
| 2 | MAI-1320: QA validates rebuilt urgency system | QA | MAI-1387 unblocked |
| 3 | MAI-1387: One-Click Chef Lead Response ships | FE | Chef response rate |
| 4 | Chef onboarding email can leverage the same lead creation trigger | BE/PM | Activation |

**Fred's action items (still overdue after 50+ days):**
| Blocker | Required Action | Days Overdue |
|---------|----------------|--------------|
| RESEND_API_KEY | Fred add API key | 50+ |
| STRIPE_SECRET_KEY | Fred add Stripe keys | 50+ |

---

## 12. Priority Recommendation

| Priority | Opportunity | Reason | Effort |
|----------|-------------|--------|--------|
| P0 | **MAI-1387: One-Click Chef Lead Response** | Addresses 0% chef response rate root cause | 2-3h |
| P0 | **FE queue cleanup: MAI-1324 rebuild** | Critical path blocker to MAI-1387 | 2h |
| P1 | **Chef Onboarding Activation Email** | This cycle's new opportunity — low effort, activates existing pipeline | 1.5h |
| P1 | **MAI-1359: Chef Notification via Resend** | Enables all email infrastructure | 2-3h (code prep done) |

**Why Chef Onboarding this cycle:**
- Low effort (1.5h) vs. P0 items (2-3h)
- Can be spec'd now and implemented when FE is available
- Addresses the human/activation gap that code fixes can't solve alone

---

## Definition of Done

This spec is complete when:
- [ ] Onboarding email spec is complete and ready for BE implementation
- [ ] Email trigger logic is defined (first lead ever OR first lead in 30+ days)
- [ ] Email content is finalized (subject, body, CTA, link)
- [ ] Idempotency mechanism defined (`onboardingEmailSentAt` on chef profile)
- [ ] Graceful degradation if RESEND_API_KEY is missing
- [ ] Mobile-responsive at 375px
- [ ] Engineers can implement without guessing

---

*Report completed: 2026-05-12 08:15 UTC*
*Next cycle: 2026-05-12 12:00 UTC*