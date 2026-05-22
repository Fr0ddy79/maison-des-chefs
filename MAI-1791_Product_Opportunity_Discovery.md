# Product Opportunity Discovery — MAI-1791

**Issue:** 581d0e18-a141-4757-8e5b-f4211e897308
**Date:** 2026-05-19 16:04 UTC
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager

---

## Executive Summary

Single high-impact opportunity identified: **Referral Share Prompt on Inquiry Success Page**

The referral system (MAI-1778, implemented) is live but unactivated. Diners who submit an inquiry never see the referral offer because the share prompt only appears on the booking success page — which requires a booking to exist. Since Chef Marcel isn't responding to any leads (0/8 responses, 57+ days), the booking success page is never reached.

**The fix:** Show the referral share prompt on the inquiry success page (the page diners DO see after submitting an inquiry), using the already-built share modal component. Zero marginal cost, maximal word-of-mouth capture at peak engagement moment.

| # | Opportunity | Effort | Impact | Status |
|---|-------------|--------|--------|--------|
| 1 | Referral share prompt on inquiry success page | ~1h FE | HIGH | **New Discovery** |

---

## 1. Platform State (2026-05-19 16:00 UTC)

| Metric | Value | Notes |
|--------|-------|-------|
| RESEND_API_KEY | Missing | 🔴 57+ days — all email flows dead |
| STRIPE_SECRET_KEY | Missing | 🔴 Payments blocked |
| Published services | 1 | Chef Marcel, French cuisine, $95/person |
| Leads submitted | 8 | 1 converted, 7 expired |
| Chef responses | 0/8 (0%) | Marcel not responding |
| Bookings confirmed | 0 | Revenue = $0 |
| Referral system (MAI-1778) | ✅ Built | BE + FE implemented |
| Referral share prompt on booking success page | ✅ Shown | Only when booking exists |
| **Referral share prompt on inquiry success page** | ❌ Missing | Gap — only on booking page, not inquiry page |

**Key bottleneck:** Chef Marcel isn't responding. Booking confirmation page never reached. Referral system is live but invisible.

---

## 2. Discovery: Opportunity #1 — Referral Share Prompt on Inquiry Success Page 🔴 HIGH IMPACT

### The Problem (Unactivated Referral System)

MAI-1778 built the referral system end-to-end:
- `POST /api/diner/referral-code` — generate/retrieve diner's unique 8-char code
- `GET /api/diner/credits` — diner's credit balance
- Share modal component on `/diner/bookings` and `/booking-status?token=XXX` (for converted bookings)

**The gap:** The share prompt only renders on:
1. `diner-bookings-page.ts` — requires authenticated diner with existing bookings
2. `booking-status-page.ts` — only when `lead.status === 'converted'` (booking confirmed)

Neither path is hit for a diner who just submitted an inquiry and is waiting for chef response. They see the booking status page with status `new` or `pending`, which doesn't include the referral share prompt.

**Growth analysis from MAI-1782:**
- If 10% of diners who submit an inquiry share with one friend each, and that friend converts at 5%, that's +0.5 leads per inquiry
- At scale, this compounds
- Referral system cost is only $25 credit when a referred friend books — CAC from referrals is ~$25 vs. estimated $80-150 from other channels

### The Fix: Inquiry Success Page Referral Share Prompt

**When to show it:**
- After `POST /api/inquiry` returns 201 success
- On the booking status page (`/booking-status?token=XXX`) for ALL non-terminal statuses (new, pending, quoted, accepted) — not just `converted`

**What to show (reusing MAI-1778 share modal):**
- Headline: "Know someone who loves private dining? Share and you'll both get $25 off"
- Subtext: "Invite friends to try Maison des Chefs — you both get $25 credit when they book their first chef."
- Share buttons: Copy link, Email, WhatsApp, Twitter
- Referral code display (generated for diner on first inquiry submission via `POST /api/diner/referral-code`)

**Implementation path:**
1. Frontend: On inquiry success, call `POST /api/diner/referral-code` to get/generate diner's referral code
2. Frontend: Render the share modal on the booking status page for ALL non-terminal lead statuses
3. Or: Pre-generate referral code on diner account creation (if diner is authenticated at inquiry time)

### Files to Modify

| File | Change |
|------|--------|
| `src/routes/booking-status-page.ts` | Add referral share prompt HTML + JS for `new`, `pending`, `quoted`, `accepted` statuses (currently only `converted`) |
| `src/routes/inquiry-success-page.ts` | (New file, or add to existing booking-page.ts success state) — call `/api/diner/referral-code` and render share prompt |

### Scope (MVP)

**In:**
- Show referral share prompt on inquiry success / booking status page for ALL active lead statuses
- Reuse existing MAI-1778 share modal component and styles
- Call `POST /api/diner/referral-code` (idempotent) to get or generate diner's code
- Display share buttons: Copy Link, Email, WhatsApp, Twitter
- Track `referral_share` event via `/api/analytics/event`

**Out:**
- Push notifications
- Referral credit expiration logic
- Changes to backend referral tracking
- Displaying referral stats (use count, conversion rate) — future feature

### Acceptance Criteria

- [ ] Diner who submits an inquiry sees referral share prompt on the success page
- [ ] Referral code is created (if diner doesn't have one) via `POST /api/diner/referral-code`
- [ ] Share buttons (Copy, Email, WhatsApp, Twitter) are functional
- [ ] Referral share event is tracked via analytics
- [ ] Share prompt is shown for statuses: `new`, `pending`, `quoted`, `accepted` — NOT for `expired`, `declined`, `cancelled`
- [ ] No console errors on page load
- [ ] TypeScript compiles with no errors

### User Value

Diners who just submitted an inquiry (peak engagement moment) are prompted to share the platform with friends. They earn $25 credit when a referred friend books. This seeds word-of-mouth acquisition at zero marginal cost, using infrastructure already built.

### Effort

~1h frontend. Reuse existing MAI-1778 share modal component and styles.

---

## 3. Critical Infrastructure Blockers — Not This Agent's Scope

| Blocker | Owner | Age | Impact |
|---------|-------|-----|--------|
| `RESEND_API_KEY` | Fred | 57+ days | All email flows dead |
| `STRIPE_SECRET_KEY` | Fred | Unknown | Instant booking + payments blocked |
| Chef Marcel response | Marcel | 57+ days | 0/8 leads responded to |

**No agent can unblock these. Fred must act.**

---

## 4. Open Questions

| # | Question | Owner |
|---|----------|-------|
| 1 | Should the referral share prompt also appear on `diner-bookings-page.ts` for diners with pending bookings? | Product |
| 2 | Should we show the diner's current credit balance on the inquiry success page? | Product |
| 3 | Is there a plan to contact Chef Marcel about his non-response? | CEO |
| 4 | What is the timeline for RESEND_API_KEY and STRIPE_SECRET_KEY? | Fred |

---

## 5. Priority Ranking

| # | Opportunity | Impact | Effort | Dependencies | Status |
|---|-------------|--------|--------|--------------|--------|
| 1 | Referral share prompt on inquiry success page | High | ~1h FE | MAI-1778 (✅ complete) | **Needs frontend implementation** |
| 2 | RESEND_API_KEY | Critical | Manual | Fred | Fred must act |
| 3 | STRIPE_SECRET_KEY | Critical | Manual | Fred | Fred must act |

---

## 6. Definition of Done

- [x] Platform state documented (RESEND dead, 1 published service, 0 chef responses, $0 revenue)
- [x] Referral system (MAI-1778) confirmed as built but unactivated on inquiry path
- [x] Gap identified: referral share prompt only on booking success page, not inquiry success page
- [x] Implementation path identified (reuse MAI-1778 share modal)
- [x] Critical blockers noted (RESEND_API_KEY, STRIPE_SECRET_KEY, Chef Marcel non-response)
- [x] Open questions surfaced
- [x] Issue renamed to reflect actual work

---

## Appendix: Code Reference

**MAI-1778 Share Modal (diner-bookings-page.ts:renderReferralSection):**
```typescript
function renderReferralSection() {
  var section = document.getElementById('referralSection');
  if (!section || !referralData) return;
  var code = referralData.code || '';
  var creditDisplay = referralData.creditBalance || '';
  // ... renders referral card with share buttons
}
```

**Referral Code Endpoint (diner-referral.ts):**
```typescript
server.post('/referral-code', { preHandler: [server.authenticate] }, async (request, reply) => {
  // Idempotent — returns existing code or creates new one
});
```

**Booking Status Page — Current Referral Condition (booking-status-page.ts):**
```typescript
// MAI-823: Referral CTA for converted bookings
const referralCtaHtml = isConverted ? `...` : '';
// Only shows for converted — MISSING for new/pending/quoted/accepted
```

**Inquiry Success Response (inquiry.ts):**
```typescript
return reply.status(201).send({
  success: true,
  leadId: createdLead.id,
  message: "Inquiry submitted successfully",
  bookingStatusUrl, // MAI-805: Return the URL for client reference
});
// NOTE: No referral code returned — frontend must call /api/diner/referral-code
```

---

*Product Opportunity Discovery — MAI-1791 — 2026-05-19 16:04 UTC*