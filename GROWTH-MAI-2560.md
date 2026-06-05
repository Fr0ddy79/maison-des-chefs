# Growth Optimization — MAI-2560

**Date:** 2026-06-05 (America/New_York)
**Author:** Growth Marketer
**Status:** Complete

---

## Executive Summary

Identified a **review solicitation gap**: the review system exists (MAI-2529) but diners aren't prompted to leave reviews at the moment of peak emotional satisfaction — when their booking is confirmed. Only diners who manually navigate to `/dashboard/bookings` see the "Leave a Review" button. This leaves reviews (our strongest social proof) uncollected.

**Growth idea:** Add an in-app review prompt that appears immediately after quote acceptance in the diner dashboard, turning the confirmation moment into a review collection opportunity.

---

## Funnel Analysis

| Stage | Status | Notes |
|-------|--------|-------|
| Landing page → CTA | ✅ Running | Hero CTA A/B (MAI-2383) — 3 variants |
| CTA → `/chefs` listing | ✅ Running | Service type filter wired (MAI-2526) |
| `/chefs` → chef profile | ✅ Running | Sidebar → booking form pre-fill (MAI-2547) |
| Booking form → inquiry submit | ✅ Working | No confirmation email yet |
| Quote accept → booking confirmed | ✅ Working | Creates booking, shows confirmation UI |
| Booking confirmed → review solicited | ❌ **GAP** | No prompt at peak satisfaction moment |
| Reviews on chef profile | ⚠️ Partial | System exists, but solicitation is passive |

---

## Growth Idea

### Review Solicitation at Confirmation Moment

**Current state:**
- Diner accepts quote → booking confirmed → action result banner says "✓ Quote accepted. Your booking is confirmed!"
- "Leave a Review" button only visible on `/dashboard/bookings` page — requires diner to navigate there
- Zero active solicitation: the review form exists but nobody prompts diners to use it

**Proposed change:**
Add an inline review prompt in the action result banner when a quote is accepted. The banner already shows after quote acceptance — augment it to include:
1. A "Leave a Review" button that expands the ReviewForm inline
2. Rating-only option for low-friction feedback ("Rate your experience without writing a review")

**Why this matters:**
- Peak satisfaction moment: accepting a quote = highest emotional state in the booking lifecycle
- Review count is a critical social proof metric — 0 reviews on a chef profile = no trust signal
- Low effort: leverages existing ReviewForm component, no new API needed
- High visibility: appears in the confirmation flow without requiring navigation

---

## Expected Impact

| Metric | Current | After |
|--------|---------|-------|
| Review submission rate (post-confirmation) | ~0% (no prompt) | +15–25% of confirmed bookings |
| Chef profiles with ≥1 review | Low (system underutilized) | +20–30% within 2 weeks |
| Reviews on landing page testimonials | 3 static quotes | Growing real reviews |

**Why this works:**
- Confirmation moments drive review behavior (similar to post-purchase reviews in e-commerce)
- The action result banner is already shown — extending it costs no extra clicks
- Diners who took time to accept a quote are highly engaged — they want to complete the experience

---

## Experiment Plan

### Variant A (Control): Current behavior
- Quote accepted → action result banner with message only
- No inline review prompt

### Variant B: Inline review prompt
- Quote accepted → action result banner with "How was your experience?" prompt
- Star rating selector (1-5) inline in banner
- "Leave a review" expands ReviewForm inline (no page navigation)
- Optional: skip link to dismiss

### Implementation Details

**File to modify:** `src/app/dashboard/bookings/page.tsx`

**Changes:**
1. Extend the `actionResult` state to include `showReviewPrompt: boolean`
2. Add inline review UI in the action result banner when `actionResult.type === 'accepted'`
3. Use existing `ReviewForm` component but render it inline within the banner (not as a separate section)
4. After review is submitted, show "✓ Review submitted! Thank you." in the banner

**No new dependencies:**
- Uses existing `ReviewForm` component
- Uses existing `POST /api/reviews` endpoint
- No API changes

---

## What's NOT a Priority This Cycle

| Item | Reason |
|------|--------|
| Confirmation email (Resend) | Blocked by Resend API key — Fred's action needed |
| Email-based review solicitation | Depends on Resend — too complex for this cycle |
| A/B test for review prompt | Simple UX enhancement, not a hypothesis |
| Review reminder for past bookings | Would require email infrastructure |

---

## Next Steps (Fred's Action)

1. **Provide Resend API key** — Replace `your_resend_api_key_here` in `.env.local` (unblocks confirmation emails and post-booking review reminders)
2. **Verify** — After this change, accept a quote and confirm the inline review prompt appears in the action result banner

---

## Metrics to Track

| Metric | Target | Current |
|--------|--------|---------|
| Reviews submitted (weekly) | +15–25% vs baseline | ~0-2/week (no active solicitation) |
| Chef profiles with ≥1 review | +20–30% within 2 weeks | Unknown |
| Review form abandonment rate | <10% | N/A (prompt is new) |
| Action result banner → review click rate | >40% | N/A |

**Note:** Baseline is effectively zero since there's no active solicitation. Target is relative to potential.

---

## Related Prior Work

- MAI-2529: Review system built (ReviewForm + POST /api/reviews)
- MAI-2547: Booking sidebar → confirmation flow improvements
- MAI-2550: Review solicitation (todo item, not yet started)
- MAI-2538: Confirmation email gap (blocked by Resend)

---

*Generated by Growth Marketer — MAI-2560*