# Growth Optimization — MAI-2033: Booking Page Response Time Trust Signal

**Issue:** 6ea2a999-db33-47b6-a65b-dec2282df242
**Created:** 2026-05-24 22:00 UTC
**Status:** ✅ Complete
**Owner:** Growth Marketer
**Run:** 22:00 UTC autopilot

---

## Executive Summary

**Revenue: €0** — blocked by missing STRIPE_SECRET_KEY for ~60 days. 4 bookings in pending state, zero payments processed.

**This run's focus:** The chef discovery page shows a **per-chef "typically responds within X hours"** response time badge, but the booking page — the critical conversion page — shows only a generic **"The chef will confirm within 24-48 hours"** static message with zero differentiation between fast-responding and slow-responding chefs.

**Opportunity:** The booking page already has access to chef response time data. Instead of a generic "24-48 hours" message, we can show the same dynamic response time badge that's already working on the discovery page. Diners who see "typically responds within 2 hours" feel more confident than those who see only a generic promise.

---

## 1. Current Funnel State (2026-05-24 22:00 UTC)

### Where Trust Signals Exist

| Page | Trust Signal | Dynamic? |
|------|-------------|----------|
| Chef discovery (grid) | "Responds in ~2h" badge on each chef card | ✅ Yes — per-chef |
| Chef discovery (modal/inquiry form) | "Typically responds within 24 hours" static | ❌ Generic |
| **Booking page (inquiry form)** | **"The chef will confirm within 24-48 hours"** | **❌ Generic** |
| Checkout page | Dynamic stats (from real DB, MAI-2007) | ✅ Real data |
| Booking page reviews | Aggregate rating + review cards (MAI-2019) | ✅ Real data |

**Gap:** The booking page is the #1 conversion page — where the diner actually submits an inquiry. Yet it has the weakest, most generic trust messaging.

### A/B Test Variant Status (from ab_test_events.jsonl)

| Variant | Page Views | Bookings | Rate |
|---------|-----------|----------|------|
| premium | 5 | 11 | 220% (session repeat bookings) |
| experiential | 24 | 0 | 0% |
| directBooking | 8 | 0 | 0% |
| trust | 1 | 0 | 0% |
| valueMemories | 2 | 0 | 0% |

**Key insight:** Premium variant's success suggests outcome-focused messaging works. The generic "24-48 hours" on the booking page is the opposite — task-focused, no differentiation.

### Data Availability

The chef discovery page already computes and displays per-chef response time:
```typescript
// From chef-discovery-page.ts — computes response time badge per chef
const responseTimeBadge = getResponseTimeBadge(chefStats.avgResponseTimeHours, leadCount);
```

The booking page receives the service object with chef data but doesn't display a response time badge — just a generic static message.

---

## 2. Growth Idea: Dynamic Response Time on Booking Page

### What's Wrong

The booking page inquiry form shows:
> "The chef will confirm within 24-48 hours"

This is:
1. **Static** — same message regardless of how fast the chef actually responds
2. **Longer wait time** — "24-48 hours" sounds slower than "typically responds within 24 hours" in the discovery modal
3. **Not reassuring** — a diner who sees "Responds in ~2h" on the discovery page loses that confidence signal at the exact moment they're committing to an inquiry

### What Already Exists

In `chef-discovery-page.ts`:
```typescript
function getResponseTimeBadge(avgHours: number, leadCount: number): string {
  if (leadCount === 0 || !avgHours) return '';
  if (avgHours <= 2) return '⚡ Typically responds within 2 hours';
  if (avgHours <= 6) return '⚡ Typically responds within 6 hours';
  if (avgHours <= 24) return '⚡ Typically responds within 24 hours';
  return 'Typically responds within a few days';
}
```

This logic uses `avgResponseTimeHours` (from completed leads) and `leadCount` (last 7 days) to show a dynamic, credible trust signal.

### What To Do

The booking page should display the same response time badge that appears on the chef discovery page. This creates **continuity of trust signal** from discovery → booking conversion.

**New booking page trust messaging block:**
```
┌─────────────────────────────────────────────────────────┐
│ [EXISTING]  🔒 No payment required today                │
│             ✓ Free cancellation                        │
│             ⭐ Verified chefs                          │
│                                                         │
│ [NEW]       ⚡ Chef Marcel typically responds within 2h │
│             (or "Typically responds within 24h"        │
│              or "Typically responds within a few days") │
└─────────────────────────────────────────────────────────┘
```

**Fallback:** If chef has 0 leads (no response time data), show generic message or omit — don't fabricate.

---

## 3. Experiment Plan: Response Time Trust Signal A/B Test

### Metric
- **Primary:** Inquiry form submission rate (inquiry_created events)
- **Secondary:** Time from page view to form submission (confidence = faster submission)

### Variant Design

**Control:** Generic "The chef will confirm within 24-48 hours" (current state)

**Treatment:** Dynamic response time badge pulled from chef's historical response data:
- "⚡ Typically responds within 2 hours" (for fast-responding chefs)
- "⚡ Typically responds within 6 hours" 
- "⚡ Typically responds within 24 hours"
- "⚡ Typically responds within a few days" (for slow responders)

### Implementation

**File:** `maison-des-chefs/src/routes/booking-page.ts`

**Changes needed:**
1. Pass `chefId` from service to the page rendering context
2. Query lead stats to compute avgResponseTimeHours for this chef
3. Use existing `getResponseTimeBadge()` logic (or copy it)
4. Add the badge to the trust-messaging div

**Minimal change — add to trust-messaging div (around line 297):**
```typescript
${responseTimeBadge ? `<div class="trust-item"><span class="icon">⚡</span><span>${responseTimeBadge}</span></div>` : ''}
```

### Expected Impact

| Scenario | Current Rate | Expected Rate |
|----------|-------------|---------------|
| Fast-responding chef (≤2h) | Baseline | +10-20% uplift |
| Average chef (6-24h) | Baseline | +5-10% uplift |
| Slow chef (>24h) | Baseline | Neutral |

**Hypothesis:** Diners are more confident submitting an inquiry when they know the chef responds quickly. "Typically responds within 2 hours" creates urgency and trust — they expect a fast answer and are therefore more likely to take the first step.

---

## 4. Secondary Finding: Discovery Modal Has Same Generic Message

### What Was Found

The multi-chef inquiry modal on chef-discovery-page.ts shows:
```html
<div class="trust-signal" style="background:#e8f5e9;border-radius:8px;padding:0.75rem 1rem;margin-bottom:1.5rem;display:flex;align-items:center;gap:0.5rem;">
  <span style="font-size:1.2rem;">⏱️</span>
  <span style="font-size:0.9rem;color:#2e7d32;"><strong>Typically responds within 24 hours</strong></span>
</div>
```

**Problem:** This is better than the booking page (shows specific hours instead of "24-48 hours") but is still generic — shows "24 hours" even for the fastest-responding chef. The per-chef badge variation ("2 hours" vs "6 hours" vs "24 hours") doesn't appear in the modal.

### Recommendation
Update the inquiry modal to also use per-chef response time data. However, since the modal supports multi-chef selection, the logic needs to handle displaying response time for a specific selected chef vs. multiple chefs.

---

## 5. What This Completes

| Component | Status |
|-----------|--------|
| Chef discovery page response time badge | ✅ Working |
| Booking page response time badge | ❌ Missing — **this run** |
| Checkout page dynamic social proof | ✅ Fixed (MAI-2007) |
| Booking page reviews | ✅ Added (MAI-2019) |
| Discovery modal response time | ⚠️ Generic — needs per-chef |

---

## 6. Metrics to Track

| Metric | Source | Current | Target |
|--------|--------|---------|--------|
| Inquiry form submission rate | `inquiry_created` events | Baseline | +10-20% for fast chefs |
| Page view → inquiry (booking page) | Analytics | Unknown | Measure before/after |
| Time-to-submission | Analytics | Unknown | Decrease (confidence) |

---

## 7. Previous Runs Reference

- **MAI-2019 (completed):** Added reviews section to booking page
- **MAI-2007 (completed):** Fixed fake social proof on checkout with real data
- **MAI-1996 (completed):** Identified premium variant's 65%+ conversion, proposed messaging transfer
- **MAI-2017 (completed):** Found lead count badge was showing total leads instead of weekly

---

## 8. Blocker Reminder

**STRIPE_SECRET_KEY** remains missing. Revenue is completely blocked. All growth experiments produce bookings that can't pay. Resolving Stripe should be the #1 priority before scaling any acquisition.

---

*Report generated by Growth Marketer agent | MAI-2033 | 2026-05-24 22:00 UTC*