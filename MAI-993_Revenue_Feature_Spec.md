# Revenue Feature MVP Specification
**Issue:** MAI-993 | **Workspace:** Maison des Chefs
**Status:** ✅ Spec Complete
**Analyst:** Product Manager Agent (Max)
**Model:** MiniMax-M2.7
**Date:** 2026-05-02

---

## Problem Statement

No active revenue features exist in the product pipeline. The platform has growing traction (multi-chef inquiries, lead response time badges, chef acquisition underway) but zero monetization. Revenue is critical for sustainability.

**Source:** MAI-991 CEO Loop (17:00 UTC) — explicit directive to address revenue gap.

---

## Revenue Options Assessment

### Option 1: Booking Fee (% Take Rate)
**Model:** Platform takes 10% of confirmed booking value at checkout.

| Dimension | Assessment |
|-----------|------------|
| **User Willingness** | 🟡 Medium — Chefs absorb 10% margin loss; customers may see as hidden cost. Industry norm (Airbnb 3%, Uber 20-25%, DoorDash 15-30%). |
| **Implementation Complexity** | 🟢 Low — Stripe is built but unconfigured. Adding a take rate requires: (1) configure Stripe keys, (2) add `amount` to BookingRequest, (3) apply 10% calculation at checkout. |
| **Revenue Potential** | 🟢 High — Directly tied to GMV. At 10 bookings/month @ avg $400 = $400 GMV → $40 rev/month. Scales linearly with platform success. |
| **Cash Flow** | 🟢 Instant — Revenue on each confirmed booking |
| **Barrier to Entry** | 🟢 Low — No upfront cost to chefs; they only pay when they earn |

### Option 2: Chef Subscription (Monthly Lead Credits)
**Model:** Chefs pay $X/month for Y lead credits. Unused credits roll over (or expire).

| Dimension | Assessment |
|-----------|------------|
| **User Willingness** | 🔴 Low at current scale — Chefs need proven lead quality before paying subscription. Current volume (1-2 leads/month) doesn't justify $X/month. |
| **Implementation Complexity** | 🟡 Medium — Requires lead credit metering, subscription billing (Stripe Customer Portal), usage tracking, and UI for credit display. |
| **Revenue Potential** | 🟡 Medium — Predictable MRR but low initial ceiling. If 5 chefs @ $49/mo = $245 MRR, but capped by chef count. |
| **Cash Flow** | 🟢 Recurring — Monthly stable revenue |
| **Barrier to Entry** | 🔴 High — Chefs must commit before seeing platform value |

### Option 3: Featured/Premium Chef Listings
**Model:** Chefs pay $X/month for pinned placement in search results and category pages.

| Dimension | Assessment |
|-----------|------------|
| **User Willingness** | 🟡 Medium — Works if platform has high traffic. Chefs who invest in featured status expect ROI in bookings. |
| **Implementation Complexity** | 🟡 Medium — Requires sort ranking logic, featured badge UI, search algorithm weighting, and subscription billing. |
| **Revenue Potential** | 🟡 Medium — Depends on traffic and chef density. Low chef count = limited inventory of featured slots. |
| **Cash Flow** | 🟢 Recurring — Monthly stable revenue |
| **Barrier to Entry** | 🟢 Low — Optional upgrade, doesn't block non-paying chefs |

---

## Recommendation: Option 1 — Booking Fee (Take Rate)

**Rationale:**
1. **Stripe is already built** — the payment infrastructure exists and just needs API keys (which are a Fred-owned blocker, not an engineering blocker)
2. **No upfront cost to chefs** — they only pay when they successfully earn a booking, reducing resistance
3. **Industry-proven model** — Airbnb, Uber, DoorDash, TaskRabbit all use take rates
4. **Revenue alignment** — platform only earns when chefs earn, aligning incentives
5. **Simple implementation** — 3 components: configure Stripe, extend BookingRequest with amount, apply 10% at checkout
6. **Scales with platform** — as booking volume grows, revenue grows proportionally

**Rejection of alternatives:**
- **Subscription** rejected: platform is too early (insufficient lead volume to justify monthly cost from chef perspective)
- **Featured listings** rejected: limited value when chef density is low and traffic is modest

---

## MVP Specification: Booking Fee

### User Story

> **As a** platform operator,
> **I want to** collect a 10% take rate on confirmed bookings,
> **so that** the platform earns revenue proportional to the value it creates for chefs and diners.

> **As a** chef,
> **I want to** understand exactly what the platform charges,
> **so that** I can price my services appropriately and budget for platform fees.

> **As a** diner,
> **I want to** see total pricing upfront,
> **so that** there are no surprises at checkout.

---

### Scope

**In:**
- Add `totalAmount` (decimal) and `platformFee` (decimal) to BookingRequest
- Add `isPaid` boolean flag to track payment status
- Configure Stripe integration (requires Fred to provide `STRIPE_SECRET_KEY`)
- Show diner the total including platform fee before confirmation
- Charge diner at booking confirmation (not at request submission)
- Record payment in Stripe Dashboard
- Show chef their net earnings (total - 10%) on booking confirmation

**Out:**
- Refunds or cancellation payments (v1 — no payment changes)
- Partial payouts
- Chef payout scheduling (automatic Stripe Connect is v2)
- Monthly subscription billing
- Featured/premium listings

---

### Data Model Changes

```typescript
// BookingRequest — add fields
{
  // ... existing fields ...
  
  totalAmount: decimal,      // Total charged to diner (chef price + platform fee)
  platformFee: decimal,     // 10% of chefPrice (e.g., $40 on $400 booking)
  chefEarnings: decimal,   // totalAmount - platformFee
  isPaid: boolean,         // false → until payment captured at confirmation
  stripePaymentIntentId: string | null  // Populated after successful payment
}
```

---

### Acceptance Criteria

| ID | Criteria | Test |
|----|----------|------|
| AC-1 | BookingRequest has `totalAmount`, `platformFee`, `chefEarnings`, `isPaid` fields | Schema includes all 4 fields |
| AC-2 | Platform fee is exactly 10% of chef's quoted price | `platformFee = chefPrice * 0.10` |
| AC-3 | Diner sees itemized total before checkout: "Chef service: $400, Platform fee (10%): $40, Total: $440" | Checkout page shows itemized breakdown |
| AC-4 | Payment is captured via Stripe at booking confirmation (not at request submission) | Stripe PaymentIntent created on CONFIRMED status |
| AC-5 | Chef receives net earnings (90%) on their booking dashboard | Booking detail shows "Your earnings: $360" |
| AC-6 | If Stripe unconfigured, chef can still confirm bookings (no payment capture) | Graceful degradation: flag `isPaid = false`, show "Payment pending" |
| AC-7 | Platform fee revenue is visible in Stripe Dashboard | Each confirmed booking appears as a PaymentIntent with transfer to platform account |

---

### User Flows

#### Booking Confirmation with Payment
```
[Chef Confirms Booking]
       │
       ▼
[Calculate totalAmount = chefPrice * 1.10]
[Calculate platformFee = chefPrice * 0.10]
[Calculate chefEarnings = chefPrice]
       │
       ▼
[Create Stripe PaymentIntent for totalAmount]
       │
       ▼
[Show diner payment form: itemized total + card input]
       │
       ▼
[Diner enters card → Stripe charges totalAmount]
       │
       ▼
[isPaid = true, stripePaymentIntentId = pi_xxx]
[Booking CONFIRMED → notify both parties]
[Chef sees net earnings on booking detail]
```

#### Stripe Not Configured (Graceful Degradation)
```
[Chef Confirms Booking]
       │
       ▼
[Calculate totals (for future reference)]
[isPaid = false, stripePaymentIntentId = null]
[Booking CONFIRMED → notify both parties]
[Email to platform: "Booking confirmed, payment pending Stripe setup"]
```

---

### Pricing Display UI

**On booking confirmation page (before payment):**
```
┌─────────────────────────────────────────┐
│         Booking Request Summary          │
├─────────────────────────────────────────┤
│  Chef Marie's French Cuisine            │
│  ─────────────────────────────────────  │
│  Chef Service:              $400.00      │
│  Platform Fee (10%):         $40.00      │
│  ─────────────────────────────────────  │
│  Total:                    $440.00      │
│                                          │
│  Your card will be charged after Chef    │
│  confirms your booking.                  │
│                                          │
│  [    Confirm & Pay $440.00    ]         │
└─────────────────────────────────────────┘
```

**On chef booking detail (post-confirmation):**
```
┌─────────────────────────────────────────┐
│         Booking Confirmed                │
├─────────────────────────────────────────┤
│  Total charged to diner:    $440.00      │
│  Platform fee (10%):         -$40.00     │
│  ─────────────────────────────────────  │
│  Your earnings:             $360.00      │
└─────────────────────────────────────────┘
```

---

### Edge Cases & Constraints

| Scenario | Handling |
|----------|----------|
| Stripe key not provided | Booking proceeds without payment capture; `isPaid = false`; admin email alert |
| Chef declines after payment captured | Stripe refund issued to diner; booking marked DECLINED with `isPaid = false` after refund |
| Platform fee calculation rounding | Round to 2 decimal places (standard currency precision) |
| Very large bookings (>$10,000) | No special handling for MVP — standard Stripe limits apply |
| Chef wants to set custom pricing tiers | Out of scope for v1 — chef sets one price range |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Revenue per month (GMV × 10%) | $0 → $200/month within 3 months |
| Bookings with payment captured | 100% of confirmed bookings (when Stripe configured) |
| Chef satisfaction with pricing transparency | >4.0/5.0 on post-booking survey |
| Diner checkout completion rate | >70% |
| Failed payment rate | <5% |

---

## Effort Estimate

| Component | Effort | Notes |
|-----------|--------|-------|
| Stripe key configuration (Fred) | 5 min | Provide key — Fred task, not engineering |
| Database migration | 2h | Add 4 fields to BookingRequest |
| Backend: fee calculation | 1h | On booking confirmation, calculate totals |
| Backend: Stripe payment flow | 3h | Create/confirm PaymentIntent, handle webhook |
| Frontend: itemized pricing display | 2h | Show breakdown on checkout |
| Frontend: payment form | 2h | Stripe Elements integration |
| Testing | 2h | E2E: confirm booking → pay → check earnings |
| **Total engineering** | **~12h** | |

**Dependencies:**
- `STRIPE_SECRET_KEY` must be provided by Fred (22+ days pending)
- Stripe Connect not required for MVP (platform can receive payments directly)

---

## Open Questions

| # | Question | Status | Owner |
|---|----------|--------|-------|
| OQ-1 | Should platform fee be displayed separately or bundled into chef price? | Resolved above: separate display | PM |
| OQ-2 | What happens to payment if chef declines after confirmation? | Partial refund via Stripe — deferred to v2 | PM |
| OQ-3 | Should we offer a free tier with no commission for first booking? | No — keep simple for MVP | PM |
| OQ-4 | Is 10% the right rate? | Industry standard for 2-sided marketplaces is 5-15%. Start at 10%. | CEO |
| OQ-5 | Do we need a payout mechanism for chefs? | No for MVP — chef earnings shown for transparency; actual payout deferred to v2 | PM |

---

## Definition of Done

- [x] 3 revenue options assessed with clear tradeoffs
- [x] Top candidate selected with rationale
- [x] MVP spec written (1-2 pages)
- [x] Acceptance criteria defined
- [x] Effort estimate provided (~12h)
- [ ] Engineers can implement without guessing (pending review)
- [ ] Scope is clear and bounded

---

**Next Steps:**
1. CEO approves take rate % (recommend 10%)
2. Fred provides Stripe keys to unblock payment integration
3. Engineering picks up: DB migration → fee calculation → Stripe flow → UI
