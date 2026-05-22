# Product Opportunity Discovery — MAI-1799

**Issue:** 07b85e90-6544-439a-874c-b3a90d4c6642  
**Date:** 2026-05-19 20:00 UTC  
**Status:** ✅ Analysis Complete  
**Analyst:** Product Manager  

---

## Executive Summary

**High-priority gap identified:** The referral share prompt only appears on the booking status page for `converted` (completed booking) leads. Diners with active inquiries (`new`, `pending`, `quoted`, `accepted`) never see the referral offer — even though MAI-1778 already built the complete referral system.

This is a pure frontend change to extend the existing referral CTA visibility to all non-terminal lead statuses.

| # | Opportunity | Effort | Impact | Status |
|---|-------------|--------|--------|--------|
| 1 | Referral share prompt for non-converted leads | ~1h FE | High | **New Discovery** |

---

## 1. Platform State (2026-05-19 20:00 UTC)

| Metric | Value | Notes |
|--------|-------|-------|
| RESEND_API_KEY | Missing | 🔴 57+ days — all email flows dead |
| STRIPE_SECRET_KEY | Missing | 🔴 Payments blocked |
| Published services | 1 | Chef Marcel, French cuisine, $95/person |
| Leads submitted | 8 | 1 converted, 7 expired |
| Bookings confirmed | 0 | Revenue = $0 |
| Referral system (MAI-1778) | ✅ Built | BE + FE for converted bookings only |
| **Referral CTA for active leads** | ❌ Missing | Only shows for `converted`, not `new`/`pending`/`quoted`/`accepted` |

---

## 2. Discovery: Opportunity #1 — Referral CTA for Active Lead Statuses

### The Problem

MAI-1778 implemented the referral system end-to-end. The `booking-status-page.ts` renders a `referralCtaHtml` variable, but it's gated:

```typescript
// Line 602: Only shows for converted bookings
const referralCtaHtml = isConverted ? `...referral card...` : '';
```

The `isConverted` check means `lead.status === 'converted'`. For leads in `new`, `pending`, `quoted`, or `accepted` status, the referral CTA is empty string — diners never see it.

**Why this matters:**
- The inquiry success page is the peak engagement moment when diners are most likely to share
- Chef Marcel has 0/8 response rate, so most leads expire before conversion
- Diners who never convert (booking) never see the referral offer
- Even if they eventually convert, the referral prompt should appear earlier to seed word-of-mouth

### The Fix

Extend the referral CTA visibility to all **non-terminal** lead statuses: `new`, `pending`, `quoted`, `accepted`.

**Terminal statuses** (don't show referral):
- `expired` — lead died, no point asking to share
- `declined` — chef said no, negative context
- `cancelled` — booking cancelled

### Files to Modify

| File | Change |
|------|--------|
| `src/routes/booking-status-page.ts` | Change `isConverted` condition on line 602 to check for non-terminal statuses |

### Scope (MVP)

**In:**
- Show referral share prompt for lead statuses: `new`, `pending`, `quoted`, `accepted`
- Reuse existing `referralCtaHtml` rendering and CSS
- Share buttons (Copy, Email, WhatsApp) are functional
- `referral_share` event tracked via `/referral/track`

**Out:**
- Changes to backend referral code generation (already works via MAI-1778)
- Credit balance display on this page (future enhancement)
- Push notifications
- Changes to email flows

### Current Code (Problematic)

```typescript
// Line 602 — only shows for converted
const referralCtaHtml = isConverted ? `
  <div class="referral-card">
    ...
  </div>
` : '';
```

### Suggested Fix

```typescript
// Line 602 — show for all non-terminal statuses
const nonTerminalStatuses = ['new', 'pending', 'quoted', 'accepted'];
const showReferralCta = nonTerminalStatuses.includes(lead.status) || isConverted;

const referralCtaHtml = showReferralCta ? `
  <div class="referral-card">
    ...
  </div>
` : '';
```

### Acceptance Criteria

- [ ] Referral CTA appears for lead statuses: `new`, `pending`, `quoted`, `accepted`
- [ ] Referral CTA does NOT appear for: `expired`, `declined`, `cancelled`
- [ ] Share buttons (Copy, Email, WhatsApp) are functional for all visible statuses
- [ ] Referral code from lead is used if present
- [ ] No console errors on page load
- [ ] TypeScript compiles with no errors

### User Value

Diners who submit an inquiry (peak engagement moment) are prompted to share the platform immediately, not just after a successful booking. Even if their lead never converts, they can still seed word-of-mouth. The referral system becomes visible earlier in the funnel, maximizing potential organic growth.

### Effort

~1h frontend. Single condition change to expand existing CTA visibility.

---

## 3. Critical Infrastructure Blockers

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
| 1 | Should the referral share prompt also appear on the diner bookings list page (`/diner/bookings`) for diners with pending bookings? | Product |
| 2 | Should we show the diner's current credit balance next to the share prompt? | Product |
| 3 | Is the referral code already attached to the lead, or does it need to be fetched from the diner's account? | Engineering |

---

## 5. Priority Ranking

| # | Opportunity | Impact | Effort | Dependencies | Status |
|---|-------------|--------|--------|--------------|--------|
| 1 | Referral CTA for active lead statuses | High | ~1h FE | MAI-1778 (✅ complete) | **Needs frontend implementation** |
| 2 | RESEND_API_KEY | Critical | Manual | Fred | Fred must act |
| 3 | STRIPE_SECRET_KEY | Critical | Manual | Fred | Fred must act |

---

## 6. Definition of Done

- [x] Platform state documented (RESEND dead, 1 published service, 0 chef responses, $0 revenue)
- [x] Gap identified: referral CTA only for `converted` status, not `new`/`pending`/`quoted`/`accepted`
- [x] Implementation path identified (single condition change in `booking-status-page.ts`)
- [x] Critical blockers noted (RESEND_API_KEY, STRIPE_SECRET_KEY, Chef Marcel non-response)
- [x] Open questions surfaced
- [x] Issue renamed to reflect actual work

---

## Appendix: Code Reference

**Current problematic code (booking-status-page.ts:602):**
```typescript
const referralCtaHtml = isConverted ? `
  <div class="referral-card">
    <h3 class="referral-title">🍽️ Share the experience & earn $25 toward your next booking</h3>
    <p class="referral-description">Know someone who'd love this experience? Share your unique referral link and earn $25 credits each time someone books using it!</p>
    ${lead.referralCode ? `
    <div class="referral-code-section">
      <p class="referral-code-label">Your Referral Code:</p>
      <div class="referral-code-box">${lead.referralCode}</div>
    </div>
    ` : ''}
    <div class="share-buttons">
      <a href="/referral/track?code=${lead.referralCode || ''}&source=copy" class="share-btn copy-btn" onclick="copyReferralLink(this, '${lead.referralCode || ''}'); return false;">
        <span class="share-icon">📋</span> Copy Link
      </a>
      <a href="/referral/track?code=${lead.referralCode || ''}&source=email" class="share-btn email-btn" onclick="return confirm('Send referral link via email?')">
        <span class="share-icon">✉️</span> Email
      </a>
      <a href="/referral/track?code=${lead.referralCode || ''}&source=whatsapp" class="share-btn whatsapp-btn" target="_blank" rel="noopener">
        <span class="share-icon">💬</span> WhatsApp
      </a>
    </div>
  </div>
` : '';
```

**Lead status values from schema:**
```typescript
type LeadStatus = 'new' | 'pending' | 'quoted' | 'accepted' | 'converted' | 'expired' | 'declined' | 'cancelled';
```

**Terminal statuses (no referral shown):**
- `expired` — lead expired without response
- `declined` — chef declined
- `cancelled` — lead was cancelled

---

*Product Opportunity Discovery — MAI-1799 — 2026-05-19 20:00 UTC*
