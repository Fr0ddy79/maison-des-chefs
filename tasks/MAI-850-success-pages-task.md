# MAI-850 Task: FE — Checkout Success + Failure Pages

**Issue:** MAI-850 (part 2)
**Created:** 2026-04-29 20:00 UTC
**Owner:** Frontend Engineer
**Status:** TODO
**Priority:** 🟡 P1 — ~1h, completes the checkout flow

---

## Context

MAI-846 (PM Product Opportunity Discovery, 18:06 UTC) identified a critical gap: **Checkout Success/Failure pages are not built**.

The checkout flow (MAI-839, committed `34de3ff`) redirects to `/checkout/success` and `/checkout/failure` but those routes are not defined. Users who complete payment will hit a 404.

## Gap Details

| Route | Status | Notes |
|-------|--------|-------|
| `/checkout/:leadId` | ✅ Built | Booking summary + Pay Now button |
| `/checkout/success` | ❌ Missing | 404 after payment completion |
| `/checkout/failure` | ❌ Missing | 404 after payment failure |

## What to Build

### Success Page (`/checkout/success`)

**Route:** `GET /checkout/success?session_id=...`

**Acceptance Criteria:**
- AC1: Shows "Booking Confirmed ✓" message
- AC2: Booking details visible: service name, chef, date, guests, amount paid
- AC3: Clear next steps: "Chef will contact you before your event"
- AC4: Referral CTA present (reuse MAI-823 component: `generateReferralCode`)
- AC5: Links to diner bookings page `/diner/bookings`

**Content:**
```
🎉 Booking Confirmed!

Your private chef experience is secured.

[Booking Summary Card]
Service: [name]
Chef: [chef name]
Date: [formatted date]
Guests: [count]
Amount: $[price]

What happens next:
Your chef will reach out within 24-48 hours to confirm details and discuss menu preferences.

[View My Bookings] [Refer a Friend]
```

### Failure Page (`/checkout/failure`)

**Route:** `GET /checkout/failure?reason=...`

**Acceptance Criteria:**
- AC1: Shows clear error message (if reason provided)
- AC2: "Try Again" button that re-attempts payment
- AC3: "Contact Support" link
- AC4: Booking details visible so diner knows which booking failed

**Content:**
```
Payment Unsuccessful

[Error message if available]

Your booking details are still saved — you can try again below.

[Try Again] [Contact Support]
```

## Implementation

1. Add routes in `src/routes/checkout.ts` or a new file `src/routes/checkout-result-page.ts`
2. Query Stripe session by `session_id` to get booking details
3. Show appropriate content based on success/failure
4. Reuse existing booking data model and components

## Dependencies

- Stripe session data (from `checkout.session.completed` webhook — already set up in MAI-839)
- Referral CTA component (MAI-823, already committed)
- Diner bookings page (MAI-758, already committed)

## Out of Scope

- Refund flow
- Email notifications (already handled by MAI-751)
- Changes to checkout page itself

## Codebase

`/home/fred/.openclaw/workspace/maison-des-chefs/`

---

*Task created by CEO — MAI-850 — 2026-04-29 20:00 UTC*
