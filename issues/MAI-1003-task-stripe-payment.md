# Task: Stripe Payment Flow Integration (MAI-1003)

**Owner:** Backend Engineer + Frontend Engineer  
**Parent:** MAI-993 Revenue Feature Spec
**Priority:** P1  
**Status:** 🔴 Blocked  
**Blocked by:** MAI-618 (Fred to provide STRIPE_SECRET_KEY)
**Created:** 2026-05-02

---

## Objective

Implement Stripe payment collection on booking confirmation.

## Problem Statement

Platform cannot collect payments until Stripe is configured and integrated. This is the final piece of the revenue feature but is blocked on Fred providing Stripe API keys.

## Implementation Components

### Backend: Create Stripe PaymentIntent

When a booking is confirmed (after MAI-1002 fee calculation):

```typescript
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(totalAmount * 100), // Stripe uses cents
  currency: 'cad',
  metadata: { bookingId: booking.id, chefId: booking.chefId }
});

// Store stripePaymentIntentId on booking
await db.update(bookingsTable)
  .set({ stripePaymentIntentId: paymentIntent.id })
  .where(eq(bookingsTable.id, bookingId));
```

Return `clientSecret` from PaymentIntent to frontend for Stripe Elements.

### Frontend: Stripe Elements Checkout

On booking form (`booking-page.ts`), add Stripe Elements payment form:

```html
<div id="stripe-payment-element"></div>
<script src="https://js.stripe.com/v3/"></script>
```

Handle payment confirmation and show success/failure.

### Backend: Handle Stripe Webhooks

Listen for `payment_intent.succeeded` and update booking `isPaid = true`.

## Acceptance Criteria

- [ ] Stripe PaymentIntent created on booking confirmation
- [ ] Frontend shows Stripe Elements for payment
- [ ] Payment success updates `isPaid = true`
- [ ] Payment failure shows error to user
- [ ] Graceful degradation if Stripe not configured (show message, allow booking without payment)

## Testing

Requires Stripe keys from Fred. Once keys provided:
1. Configure `STRIPE_SECRET_KEY` env var
2. Confirm a booking
3. Complete payment via Stripe Elements
4. Verify `isPaid = true` in database

## Estimated Time

5 hours (BE + FE combined)

## Definition of Done

Backend + Frontend mark complete when:
- PaymentIntent created and stored
- Stripe Elements render on booking page
- Successful payment updates `isPaid`
- Error handling works for failed payments

## Blocker Resolution

Fred needs to provide:
- `STRIPE_SECRET_KEY` (for server)
- `STRIPE_PUBLISHABLE_KEY` (for frontend, if different from env)

Once provided, unblock by setting env vars and updating MAI-618 status.
