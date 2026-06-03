# Growth Optimization — MAI-2222: Quote Countdown Timer for Quoted Leads

**Issue:** 40b219a4-87be-4633-a6dc-f22e6e325dbb
**Created:** 2026-05-29T00:00 America/New_York
**Status:** ✅ Analysis Complete
**Owner:** Growth Marketer
**Focus:** Add urgency countdown timer to booking status page for `quoted` status leads

---

## Executive Summary

**Revenue: €0** — blocked by `STRIPE_SECRET_KEY = sk_live_...` (90+ days) and `RESEND_API_KEY = re_...` (90+ days).

**This run's focus:** Identified that the booking status page has an SLA countdown timer for `new`/`pending` leads but lacks a countdown for `quoted` leads — creating an urgent engagement gap at the most critical conversion moment: when a diner has a quote in hand but no time pressure to act.

**Key finding:** The acceptance API (`quotes.ts`) already enforces a 48-hour quote expiry (line 90: `QUOTE_EXPIRY_HOURS = 48`). This expiry is enforced server-side but **invisible to the diner** on the booking status page. Diners in `quoted` status see the quote details and next steps but no countdown timer showing how much time remains before their quote expires.

---

## 1. Revenue Status

| Blocker | Status | Owner |
|---------|--------|-------|
| `STRIPE_SECRET_KEY = sk_live_...` | 🔴 Revenue dead | Fred |
| `RESEND_API_KEY = re_...` | 🔴 Email dead | Fred |

**90+ days of escalation. Nothing has changed. API keys are the only blocker.**

---

## 2. Prior Run Context

**MAI-2198 (last Growth run):** Identified missing referral prompt on inquiry success modal — referral card now exists on `chef-discovery-page.ts` (lines 1131-1160), with analytics wired (`inquiry_referral_share`, channels: copy/email/whatsapp).

**MAI-2144:** Identified auth panel friction for returning diners and simplified booking card opportunity. Simplified card is now the default (`cardVariant = 'simplified'` since MAI-2151).

**MAI-2090 (Landing Page Conversion Audit):** Identified 3 friction points — homepage CTA ambiguity, booking card density, auth panel for returning diners. All fixed or in progress.

**MAI-2187:** Identified quote urgency + re-engagement for the quoted-but-unpaid funnel stage. MAI-1745 SLA timer exists for new/pending leads but **not for quoted leads**.

---

## 3. Current State Analysis

### What's Built

| Component | Status | Location |
|-----------|--------|----------|
| Quote acceptance API with 48h enforcement | ✅ Built | `src/api/quotes.ts:90` |
| SLA timer for new/pending leads | ✅ Built | `booking-status-page.ts:499-516` |
| 5-stage booking timeline | ✅ Built | `booking-status-page.ts:525-535` |
| Referral CTA for quoted leads | ✅ Built | `booking-status-page.ts:601-625` |
| Trust signals (reviews, bookings) | ✅ Built | `booking-status-page.ts:676-710` |
| **Countdown timer for QUOTED leads** | ❌ **Missing** | **This run's opportunity** |

### The Gap — Quoted Status Has No Urgency Signal

When a lead transitions to `quoted` status, the booking status page shows:

```
💰 Quote Received!
Chef has sent you a quote!
Review the quote details below
Complete payment to confirm your booking
[Accept & Pay →]
```

**What's missing:** No indication that this quote **expires in 48 hours** (enforced at `quotes.ts:90`). Diners don't know there's a deadline unless they try to pay after it passes and receive a `quote_expired` error.

### Evidence from Code

The SLA timer (MAI-1745, lines 499-516) already handles `new`/`pending` leads:

```typescript
// booking-status-page.ts:499-516
const slaTimer = (lead.status === 'new' || lead.status === 'pending')
  ? (() => {
      const deadline = lead.slaDeadlineAt ? new Date(lead.slaDeadlineAt) : null;
      if (!deadline) return null;
      const remaining = deadline.getTime() - Date.now();
      if (remaining <= 0) {
        return { expired: true, label: 'SLA window has passed' };
      }
      // ...
    })()
  : null;
```

But this timer only fires for `new`/`pending` — **not for `quoted` leads** who have a DIFFERENT deadline: the 48-hour quote expiry enforced at the API level (`QUOTE_EXPIRY_HOURS = 48`).

### Conflicting Expiry Mechanisms

| Mechanism | Enforcement | Duration | Visible to Diner? |
|-----------|-------------|----------|-------------------|
| API Accept (`quotes.ts:90`) | Hard block at 48h post-quoteSentAt | 48 hours | ❌ No countdown |
| Quote Expiry Cron (`quote-expiry.ts`) | DB status transition at 7 days | 7 days | ❌ No notification |
| SLA Deadline (inquiry creation) | Chef response window | 48 hours | ✅ Yes — SLA timer exists |
| **Quote expiry** | **Hard block at 48h post-quoteSentAt** | **48 hours** | **❌ Missing** |

**Key insight:** The QUOTE expiry (not the SLA deadline) is what actually gates payment. If a diner waits 49 hours to pay, the API rejects with `quote_expired` even if the SLA deadline showed plenty of time remaining. This creates a **trust-eroding cliff** — the timer they're watching doesn't actually govern the action they need to take.

---

## 4. Funnel Breakdown

```
Diner Journey — Quoted Stage:
────────────────────────────────────────────────────
1. Submit Inquiry → Lead Created (new)
   ✅ SLA timer: countdown to chef response deadline
   
2. Chef Responds → Lead = 'quoted' — ⚠️ GAP
   ❌ NO countdown timer showing quote expiry deadline
   ❌ Diner sees quote amount + next steps
   ❌ But doesn't know quote expires in 48h
   
3. Diner Awaits Payment → Acts whenever convenient
   ⏰ No urgency signal → delays → quotes expire
   
4. Quote Expires → Diner tries to pay → API rejects 'quote_expired'
   ❌ "Why did my quote expire? I never got a warning!"
   ❌ Potential churn to competitor
   
────────────────────────────────────────────────────
   [SLA Timer]           [Quote Countdown — MISSING]
   new/pending             quoted
   ✅ Exists               ❌ Missing ← THIS RUN
```

### Where the Countdown Should Appear

**Location:** `booking-status-page.ts` — when `lead.status === 'quoted'`

The quote section (lines ~1159-1210) shows:
- Quote amount
- Quote message
- Chef trust signals
- CTA: "View Quote & Pay →"
- Trust badges

**The countdown timer should appear immediately below the quote amount and above the CTA**, signaling urgency without disrupting the flow.

---

## 5. Growth Idea: Quote Countdown Timer for Quoted Leads

### The Problem

Diner receives a quote but lacks a clear, visible deadline to complete payment. Without urgency, diners may:
1. Wait indefinitely to "think about it"
2. Shop around for other chefs (while their quote sits unaccepted)
3. Return to pay after the 48h window has passed → `quote_expired` error → frustration

The 48-hour quote expiry is enforced at the API level but **completely invisible** to the diner until they've already lost.

### Why This Moment is High-Value

| Stage | User Intent | Timer Available |
|-------|-------------|----------------|
| Homepage | Browsing | No |
| Service Detail | Comparing | No |
| Booking Form Submit | Committing | No |
| **Quote Received** | **Deciding to pay** | **❌ Missing** |
| Checkout | Ready to pay | No (but quote may expire mid-checkout) |

The `quoted` status is the **decision moment** — the diner has information, is evaluating the offer, and needs to act. A countdown timer creates FOMO (fear of missing out) and motivates faster payment.

### What Exists vs. What's Missing

| Component | Where | Status |
|-----------|-------|--------|
| Quote details display | `booking-status-page.ts:676-710` | ✅ Works |
| Payment CTA | `booking-status-page.ts:1202-1206` | ✅ Works |
| SLA timer for new/pending | `booking-status-page.ts:499-516` | ✅ Works |
| Trust signals for quoted | `booking-status-page.ts:676-710` | ✅ Works |
| **Quote expiry countdown** | `booking-status-page.ts` | **❌ Missing** |

### What to Build

**Add a countdown timer for `quoted` leads** in `booking-status-page.ts`:

```
┌─────────────────────────────────────────────────────┐
│ ⏰ Your quote expires in 23h 14m                   │
│ Complete payment before availability changes        │
└─────────────────────────────────────────────────────┘
```

**Placement:** Above the quote section's trust badges, below the quote amount display.

**Logic:**
1. Calculate `quoteExpiryMs = lead.quoteSentAt + 48h - Date.now()`
2. If `quoteExpiryMs > 0`: show countdown timer
3. If `quoteExpiryMs <= 0`: show expired state (decline + re-browse CTAs)

---

## 6. Experiment Plan

### A/B Test: Quote Countdown Timer vs. No Timer (Quoted Leads)

**Hypothesis:** Showing a visible countdown timer for quoted leads (time remaining before quote expires) will increase payment completion rate by ≥20%, because diners will have clarity on the urgency and act before the window closes.

**Key pre-condition:** `QUOTE_EXPIRY_HOURS = 48` is already enforced in `quotes.ts:90`. The API rejects accepts after 48h. We're making this visible, not changing it.

**Control (A):**
- Booking status page for `quoted` leads shows quote + next steps
- No countdown timer visible

**Treatment (B):**
- Booking status page for `quoted` leads shows quote + next steps + countdown timer
- Timer shows hours:minutes remaining until quote expiry
- Urgency copy: "Your quote expires in Xh Ym — complete payment to lock in your date"

**Implementation (Frontend — `booking-status-page.ts`):**

After line ~1195 (quote section wrapper), add:

```typescript
// MAI-2222: Quote expiry countdown timer
const QUOTE_EXPIRY_HOURS = 48;
function getQuoteTimer(quoteSentAt: number | Date | null) {
  if (!quoteSentAt) return null;
  const sentAt = typeof quoteSentAt === 'number' ? new Date(quoteSentAt) : quoteSentAt;
  const expiryMs = sentAt.getTime() + QUOTE_EXPIRY_HOURS * 60 * 60 * 1000 - Date.now();
  if (expiryMs <= 0) return { expired: true, label: 'Quote has expired' };
  const totalMinutes = Math.floor(expiryMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { expired: false, hours, minutes, totalMinutes, label: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m` };
}

const quoteTimer = lead.status === 'quoted' ? getQuoteTimer(lead.quoteSentAt) : null;
```

In the template:

```html
${quoteTimer && !quoteTimer.expired ? `
<div class="quote-timer" style="background:#fef3c7;border:2px solid #f59e0b;border-radius:8px;padding:12px 16px;margin:12px 0;text-align:center;font-size:14px;color:#92400e;">
  ⏰ Your quote expires in <strong>${quoteTimer.label}</strong> — complete payment to lock in your date
</div>
` : ''}
${quoteTimer && quoteTimer.expired ? `
<div class="quote-timer-expired" style="background:#fee2e2;border:2px solid #ef4444;border-radius:8px;padding:12px 16px;margin:12px 0;text-align:center;font-size:14px;color:#991b1b;">
  ⏰ Your quote has expired. Browse other chefs to request a new quote.
</div>
` : ''}
```

**Metrics to Track:**
- Primary: `payment_completed` rate (quoted leads who complete payment)
- Primary: Time from `quoted` status to payment
- Secondary: `quote_expired` error rate (may decrease if diners pay before expiry)
- Guardrail: No increase in `declined` rate (timers shouldn't cause premature declines)

**Sample size:** 50+ `quoted` leads per variant (estimated 2-3 week test if current volume holds)

---

## 7. Implementation Steps

| Priority | Action | Effort | Owner |
|----------|--------|--------|-------|
| P1 | Calculate `quoteExpiryDate` in `buildBookingStatusPage` — pass `quoteSentAt` to template | 15 min | Frontend |
| P1 | Add countdown timer in `quoted` status section — format: "expires in Xh Ym" | 30 min | Frontend |
| P1 | Add expired state for quotes past 48h — "quote has expired" + browse CTA | 15 min | Frontend |
| P2 | Track `quote_timer_shown` event (analytics) | 15 min | Frontend |
| P2 | Track `quote_expired_view` event | 15 min | Frontend |
| P2 | A/B test: Treatment (timer) vs. Control (no timer) | 2 hr | Frontend |

---

## 8. Metrics to Track

| Metric | Event Name | Segment |
|--------|-----------|---------|
| Quote page views | `booking_status_view` | `status=quoted` |
| Quote timer shown | `quote_timer_shown` | `status=quoted`, variant |
| Quote timer expired | `quote_timer_expired` | `status=quoted`, minutes_remaining |
| Payment completed | `booking_payment_completed` | `status=quoted` (primary conversion) |
| Quote expired error | `quote_expired_error` | API — measures if timer reduces late attempts |
| Decline rate | `lead_declined` | Guardrail — timer shouldn't spike declines |

---

## 9. Theme for This Run

**Quote urgency loop closure** — New/pending leads have an SLA timer (chef response urgency). **Quoted leads have NO equivalent timer** despite having the most critical urgency: their quote expires in 48h. Closing this loop creates a complete urgency ecosystem across the entire booking funnel:

```
new/pending  →  SLA timer  (response urgency) ✅ Present
quoted       →  QUOTE timer (payment urgency) ❌ Missing ← THIS RUN
accepted     →  No timer needed (winning state)
```

---

## 10. Related Prior Work

| Issue | What Was Done | Status |
|-------|---------------|--------|
| MAI-1745 | SLA timer for new/pending leads | ✅ Complete |
| MAI-2144 | Booking card simplified (default), auth panel for returning diners | ✅ Complete |
| MAI-2187 | Quote urgency + re-engagement strategy for quoted stage | Opportunity — not implemented |
| MAI-2198 | Inquiry success modal referral prompt | ✅ Complete |
| MAI-2203 | Referral copy in inquiry modal (copy/email/whatsapp) | ✅ Complete |
| MAI-2209 | Referral tables + chef self-scheduling | ✅ Complete |

---

## 11. Fred Action Required

| What | Why | How |
|------|-----|-----|
| `STRIPE_SECRET_KEY = sk_live_...` | Revenue is €0 — no payments can process | Replace placeholder in `.env` with real key from Stripe dashboard |
| `RESEND_API_KEY = re_...` | All transactional emails dead | Replace placeholder with real key from Resend dashboard |

**Without these keys, even perfect conversion optimization produces €0 revenue.**

---

*Generated by Growth Marketer agent — MAI-2222 — 2026-05-29*
