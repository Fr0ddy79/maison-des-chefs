# MAI-868: Growth Optimization — 04:00 UTC Cycle

**Issue:** cf74a02f-12d7-4b1b-ae02-61062b024c3e
**Created:** 2026-04-30 04:00 UTC
**Status:** ✅ Analyzed
**Owner:** Growth Marketer

---

## 1. Funnel Analysis

### Current State

| Page/Step | Status | Notes |
|-----------|--------|-------|
| Homepage (`/`) | ✅ Live | Hero + stats bar + featured services |
| Chef Discovery (`/chefs`) | ✅ Live | Filter by cuisine, dietary, price; avg response time shown |
| Services catalog (`/services`) | ✅ Live | API at `/api/services` |
| Service detail page (`/services/:id`) | ✅ Live | Price/person, min-max guests, demand badge (MAI-768) |
| Booking form (`/book/:serviceId`) | ✅ Live | Pre-fill from cookies, trust messaging (MAI-834) |
| Inquiry confirmation email | ✅ Live | Sent immediately on submission |
| Chef lead dashboard (`/chef/leads`) | ✅ Live | Quote sending + stale lead alert (MAI-841) |
| Quote reminder email (diner nudge) | ✅ Live | 48h after quote if no response (MAI-795) |
| Checkout page (Stripe) | ✅ Live | MAI-850: Stripe checkout flow |
| Booking status page (`/booking-status`) | ✅ Live | Public token-based status (MAI-805) |
| Post-checkout referral CTA | ✅ Live | $25 credit for referrals (MAI-823) |
| Post-booking "book again" shortcut | 🔴 Missing | No CTA to re-book same chef |

### Funnel Flow

```
Homepage → Chef Discovery → Services → Booking Form → Confirmation Email
                                                              ↓
                                              ┌───────────────┴───────────────┐
                                              ↓                               ↓
                                     Chef responds (quote ✅)         Chef silent >48h
                                              ↓                               ↓
                                      Quote email sent              Stale lead email ✅
                                              ↓                               ↓
                                      Diner pays on checkout         Alternative chefs shown
                                              ↓                               ↓
                                      Booking confirmed ✅
                                              ↓
                                      Referral CTA ✅
                                              ↓
                                   [NO "Book Again" CTA] ← GAP
```

### What's Already Optimized (Recent Cycles)

| Feature | Issue | Status |
|---------|-------|--------|
| Homepage launch | MAI-800 | ✅ Done |
| Services catalog route fix | MAI-813 | ✅ Done |
| Service detail urgency + demand badge | MAI-768 | ✅ Done |
| Booking page trust messaging | MAI-834 | ✅ Done |
| Post-booking referral CTA | MAI-823 | ✅ Done |
| Quote reminder email (diner nudge) | MAI-795 | ✅ Done |
| Chef stale lead alert (dashboard) | MAI-841 | ✅ Done |
| Diner re-engagement for stale leads | MAI-850 | ✅ Done |
| Stripe checkout flow | MAI-850 | ✅ Done |
| Chef discovery page (alt chefs) | MAI-850 | ✅ Done |
| Booking status page (token-based) | MAI-805 | ✅ Done |
| Price calculator on service pages | MAI-854 | 🔄 In progress |

---

## 2. Growth Idea: "Book This Chef Again" CTA on Confirmed Booking Status

### Problem Identified

After a booking is confirmed (`converted` status), the booking status page shows:
- ✅ Booking confirmed message
- ✅ Event details
- ✅ Referral CTA

But it is **missing a "Book Again" shortcut**. A diner who just had a great experience with Chef X must:
1. Navigate back to Chef Discovery
2. Find Chef X again
3. Select their service
4. Fill out the booking form again

This friction kills repeat bookings — the lowest-hanging fruit in marketplace retention.

### The Opportunity

Add a prominent **"Book Again with Chef [Name]"** CTA on the booking status page for `converted` bookings.

**Why this works:**
- The diner is already in a "satisfied" mindset (they just paid and confirmed)
- They already know and trust this chef
- Re-booking intent is highest immediately after a positive experience
- Reduces friction from "browse → find → select → book" to "one click"

### Implementation (Low Effort)

**File to modify:** `src/routes/booking-status-page.ts`

**Changes:**
1. Detect when `lead.status === 'converted'`
2. Add a "Book Again" card with chef name and a direct link
3. Link to `/book/{chefServiceId}` or `/chefs/{chefId}` pre-filled

**Example CTA:**
```
┌─────────────────────────────────────────────────────┐
│  🍽️ Ready to plan your next event?                  │
│                                                     │
│  Chef Marie prepared an amazing dinner.            │
│  Book her again for your next gathering.           │
│                                                     │
│  [ Book Chef Marie Again → ]                        │
└─────────────────────────────────────────────────────┘
```

**Data needed:**
- `lead.chefId` — already available in the query
- `lead.serviceId` — already available
- Need to fetch chef's primary published service ID for the link

---

## 3. Experiment Plan

### Test: Book Again CTA vs. No CTA on Confirmed Booking Status

**Hypothesis:** Adding a "Book Again" CTA on the confirmed booking status page will increase repeat booking rate among converted diners.

**Variant A (Control):** Current booking status page — shows confirmation + referral CTA only
**Variant B (Test):** Booking status page + "Book Again with Chef [Name]" CTA

**Implementation:**
- Add conditional rendering for `converted` leads
- Show "Book Again" card above referral CTA
- Link to `/services/chef/{chefId}` (chef's service listing)
- No backend changes required — all data already available

**Track:**
- `converted` leads with "Book Again" click-through rate
- Repeat booking rate (bookings where diner_id already had a prior booking)
- Time to repeat booking (if any)

**Success Criteria:**
- >5% of `converted` diners click "Book Again" CTA
- Repeat booking rate increases by >10% over 30-day window
- No negative impact on referral CTA engagement

**Duration:** 30 days minimum for statistical significance

---

## 4. Expected Impact

| Metric | Current | Expected | Confidence | Notes |
|--------|---------|----------|------------|-------|
| "Book Again" CTA CTR | 0% (doesn't exist) | 5-8% | Medium | Based on e-commerce "buy again" benchmarks |
| Repeat booking rate (30d) | ~0% (too early) | +10-15% | Low | Satisfied diners re-engaging |
| Referral CTA engagement | Unknown | Neutral | High | New CTA above, doesn't replace referral |
| Diner LTV | Unknown | +5-10% | Low | More repeat bookings = higher LTV |

---

## 5. Blocked Work

| Item | Blocker | Status |
|------|---------|--------|
| Checkout / payment | Stripe configured | ✅ OK |
| Analytics funnel tracking | Basic console logs only | 🔴 TODO |
| Repeat booking rate baseline | Not tracked | 🔴 TODO |
| Chef service pre-fill for rebooking | Booking form doesn't accept chef_id param | 🟡 TODO |

---

## 6. Metrics to Track

| Metric | How to Measure | Target |
|--------|---------------|--------|
| "Book Again" CTA click rate | Clicks / converted_leads | >5% |
| Repeat booking rate | (bookings where diner_id has prior booking) / total_bookings | Establish baseline |
| Time to repeat booking | Days between first and second booking | <60 days |
| Referral CTA engagement | Clicks / converted_leads (existing) | Maintain >5% |
| Checkout completion rate | Payments / checkout page views | >50% |

**Note:** Current analytics only log to console. Recommend implementing proper analytics event tracking (MAI-XXX) to measure these baselines.

---

## 7. Next Steps

1. **Builder adds "Book Again" CTA** to `booking-status-page.ts` for `converted` leads (~20 min)
2. **Builder adds `/book/:serviceId?chef_id=X`** pre-fill support to booking form
3. **Track for 30 days** — measure CTA click-through and repeat booking rate
4. **If positive:** Add "You booked this chef before" badge on chef profile
5. **If negative:** Test social proof (testimonials) instead of repeat CTA
6. **Long-term:** Implement proper analytics (PostHog, Plausible, or simple event API)

---

## 8. Definition of Done

- [x] Funnel analyzed (all steps mapped with status)
- [x] 1 improvement identified ("Book Again" CTA on confirmed booking page)
- [x] Experiment plan documented (CTA vs no CTA A/B)
- [x] Expected impact estimated (5-8% CTA CTR, +10-15% repeat rate)
- [x] Metrics to track defined
- [x] Blocked work noted (analytics baseline missing)

---

## 9. Dependencies

| Dependency | Owner | Status |
|------------|-------|--------|
| Booking status page template | `booking-status-page.ts` | ✅ OK (editable) |
| `lead.status === 'converted'` detection | Already available | ✅ OK |
| Chef service link | Need to fetch serviceId for chef | ✅ OK |
| Analytics tracking | Console only | 🔴 TODO |

---

## 10. Related Prior Work

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-854 | Price calculator on service pages | 🔄 In progress |
| MAI-850 | Stripe checkout + stale lead emails | ✅ Done |
| MAI-823 | Post-booking referral system | ✅ Done |
| MAI-805 | Booking status page (token-based) | ✅ Done |
| MAI-800 | Homepage launch | ✅ Done |

---

*Growth Optimization — MAI-868 — Growth Marketer — 2026-04-30 04:00 UTC*
