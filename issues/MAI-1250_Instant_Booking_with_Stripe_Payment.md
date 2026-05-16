# PM Spec: Instant Booking + Stripe Payment (MAI-1250)

**Issue:** MAI-1250  
**Owner:** Backend + Frontend  
**Priority:** P1 — Critical monetization blocker  
**Status:** Ready for implementation  

---

## 1. Problem Statement

Currently all bookings are "requests" — diners submit interest, chefs respond manually. Without payment, the platform is just an expensive lead-generation tool. Diners who have to wait or follow up separately rarely convert.

**We need:** A diner can secure a booking with a 25% deposit and get instant confirmation — no waiting for chef approval.

---

## 2. User Story

**Primary (Diner):**  
"As a diner, I want to **secure a booking with a refundable deposit** so that I can **get instant confirmation without waiting for chef approval**."

**Secondary (Chef):**  
"As a chef, I want to **receive instant confirmed bookings with payment committed** so that I can **stop wasting time on uncommitted inquiries**."

---

## 3. User Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  Diner selects chef → views service → submits inquiry               │
│  (existing flow — POST /api/inquiry or /api/chef-leads)            │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Chef reviews inquiry → sends quote (25% deposit amount)             │
│  (existing flow — lead status: 'quoted')                            │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Diner views booking summary at /checkout/:leadId?token=XXX          │
│  → Sees "Pay $X (25% deposit)" + addons breakdown                    │
│  → Clicks "Pay Now"                                                   │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  POST /api/checkout/:leadId/create-session?token=XXX                 │
│  Backend creates Stripe Checkout Session                              │
│  Returns { sessionId, url }                                          │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────────────┐
              │  Frontend redirects to Stripe URL     │
              │  Diner enters card on Stripe         │
              └──────────────┬───────────────────────┘
                             │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
   ┌───────────┐     ┌───────────┐       ┌───────────┐
   │ Completed │     │ Cancelled │       │  Failed   │
   └─────┬─────┘     └─────┬─────┘       └─────┬─────┘
         │               │                   │
         ▼               ▼                   ▼
   ┌─────────────────────────────┐    ┌────────────────────┐
   │ Stripe redirects to:       │    │ Stripe redirects to:│
   │ /checkout/success          │    │ /checkout/failure   │
   │ ?session_id={id}           │    │ ?lead=XXX           │
   │ &lead=XXX&token=XXX        │    │                     │
   └─────────────┬──────────────┘    └────────────────────┘
                 │
                 │ (simultaneously)
                 ▼
   ┌─────────────────────────────────────────────────────┐
   │ Stripe webhook fires: checkout.session.completed     │
   │ → Backend verifies signature                         │
   │ → Updates lead status: 'converted'                  │
   │ → Creates booking record                            │
   │ → Fires chef notification (email + WhatsApp)          │
   │ → Optionally applies referral code (MAI-823)        │
   └─────────────────────────────────────────────────────┘
                 │
                 ▼
        ┌──────────────────┐
        │ Success page shows│
        │ confirmed booking │
        │ details           │
        └──────────────────┘
```

---

## 4. MVP Scope

### In (MVP — Must ship)

| Area | What |
|------|------|
| **Stripe Checkout Session** | Full redirect flow using Stripe-hosted checkout page |
| **25% deposit capture** | PaymentIntent captures 25% of `quoteAmount` at booking time |
| **Lead → booking conversion** | On `checkout.session.completed`: update lead to `converted`, create booking record |
| **Booking status: `converted`** | New status for leads with successful payment |
| **Chef notification** | Email + WhatsApp on confirmed booking (existing infrastructure) |
| **Success/cancel/failure pages** | `/checkout/success`, `/checkout/cancel`, `/checkout/failure` with proper params |
| **Webhook endpoint** | `POST /api/webhooks/stripe` with signature verification |
| **Retry on failure** | Failed payment → pending_payment status → retry CTA on booking page |

### Out (Post-MVP)

| Area | Why Deferred |
|------|-------------|
| **Full payment post-event** | Deferred invoicing — collect deposit only for now |
| **Refund logic (72h policy)** | Manual chef-initiated refunds; no automated partial refund |
| **Multi-chef/split payment** | Single chef per booking MVP |
| **Embedded Stripe Elements** | Checkout Session redirect is simpler and sufficient |
| **Pre-authorization hold** | Not needed for deposit model |
| **Partial capture flows** | Single capture of full deposit amount |

---

## 5. Backend Requirements

### 5.1 New API Endpoints

#### `POST /api/webhooks/stripe` (NEW — Webhook Handler)
- **Auth:** Stripe signature verification (via `STRIPE_WEBHOOK_SECRET`)
- **Public endpoint** — no JWT auth required (Stripe calls this)
- **Handles:**
  - `checkout.session.completed` → convert lead to booking
  - `checkout.session.expired` → optional: reset lead to `quoted` for retry
  - `payment_intent.payment_failed` → log only (lead status already `pending_payment` from session creation)
- **Idempotency:** Check `lead.status !== 'converted'` before updating to avoid double-processing
- **Lead referral code:** If lead has no `referralCode`, generate one (MAI-823)

#### `POST /api/checkout/:leadId/create-session?token=XXX` (EXISTING — Minor update)
- Already creates Stripe Checkout Session ✅
- **Already returns:** `{ sessionId, url }` ✅
- **Already stores:** `metadata.leadId`, `metadata.chefId`, `metadata.serviceId` ✅
- **Minor addition needed:** Also store `selectedAddonIds` in metadata (for success page display)

### 5.2 Data Model Changes

#### `leads` table additions
| Column | Type | Notes |
|--------|------|-------|
| `payment_status` | `TEXT DEFAULT 'unpaid'` | `unpaid` \| `paid` \| `failed` |

#### `bookings` table — no changes needed
Booking is created on conversion with existing schema fields.

### 5.3 Environment Variables Required

| Variable | Owner | Status |
|----------|-------|--------|
| `STRIPE_SECRET_KEY` | Fred | **BLOCKING** — cannot create sessions without this |
| `STRIPE_WEBHOOK_SECRET` | Fred | **BLOCKING** — webhook signature verification fails without this |
| `CHECKOUT_URL` | Dev | Set to frontend URL (e.g., `https://maisondeschefs.com`) — already done |
| `DASHBOARD_URL` | Dev | Set to frontend URL — already done |

### 5.4 Email/Notification Flows (Existing — No changes needed)
- `sendChefNewBookingEmail()` — already fires on booking creation
- `sendChefWhatsAppNotification()` — already fires on booking creation
- Both are called from the webhook handler after lead → booking conversion

---

## 6. Frontend Requirements

### 6.1 Checkout Summary Page (`/checkout/:leadId?token=XXX`)
Already exists. Displays:
- Service name, chef name, date, guest count
- Quote amount (25% deposit)
- Selected addons with prices
- "Pay Now" button → redirects to Stripe Checkout URL from `/api/checkout/:leadId/create-session`

**Minor update:** Parse and display `selectedAddonIds` from session success redirect.

### 6.2 Success Page (`/checkout/success?session_id=XXX&lead=XXX&token=XXX`)
Shows:
- Booking confirmation message
- Booking details (chef, date, service)
- "My Bookings" link

**Important:** This page loads via redirect from Stripe, so Stripe params are in URL.

### 6.3 Cancel Page (`/checkout/cancel?lead=XXX&token=XXX`)
Shows:
- "Booking not completed" message
- "Return to booking" link
- Lead stays in `pending_payment` status — diner can retry

### 6.4 Failure Page (`/checkout/failure?lead=XXX`)
Shows:
- "Payment failed" message
- "Try Again" button → back to checkout summary

### 6.5 Booking Status Page
Should show:
- Current payment status
- "Pay Now" CTA if `pending_payment`
- "Payment Failed" with retry if needed

---

## 7. Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | Diner can view checkout summary with 25% deposit amount after quote is sent | GET /api/checkout/:leadId returns correct amounts |
| 2 | Clicking "Pay Now" redirects to Stripe Checkout | Frontend redirect to `session.url` |
| 3 | Successful payment updates lead status to `converted` | DB: `SELECT status FROM leads WHERE id = ?` |
| 4 | Booking record is created on successful payment | DB: `SELECT * FROM bookings WHERE leadId = ?` |
| 5 | Stripe webhook verifies signature correctly | Replay attack with invalid sig → 400 |
| 6 | Chef receives WhatsApp notification on conversion | Notification appears in WhatsApp flow |
| 7 | Cancel redirect returns to booking summary with retry option | Cancel page UI shows retry CTA |
| 8 | Failed payment shows failure page with retry | Failure page UI |
| 9 | Test mode works with Stripe test keys | Checkout session created, payment simulated |
| 10 | No double-booking on replayed webhook | Idempotent: check `status !== 'converted'` before update |

---

## 8. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Booking confirmation rate | 60% of booking requests → confirmed | `converted` leads / total leads |
| Deposit capture success rate | 95% | Successful `checkout.session.completed` / total sessions |
| Time from booking start to confirmation | < 2 min | Session created → webhook received |
| Chef notification delivery time | < 30 sec | Webhook received → WhatsApp sent |

---

## 9. Payment State Machine

```
lead created → status: 'new' or 'pending_payment'
                        │
                        ▼
              ┌──────────────────────┐
              │  create-session API  │
              │  status: pending_payment │
              └──────────┬───────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
   ┌───────────┐   ┌───────────┐   ┌───────────┐
   │ Completed │   │ Cancelled │   │  Failed   │
   └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
         │               │               │
         ▼               ▼               ▼
   ┌───────────┐   ┌───────────┐   ┌───────────┐
   │ Webhook:  │   │ Lead stays│   │ Lead stays│
   │ convert   │   │ pending_  │   │ pending_  │
   │ → booking │   │ payment   │   │ payment   │
   │ created   │   │ retry OK  │   │ retry OK  │
   └───────────┘   └───────────┘   └───────────┘
```

---

## 10. Open Questions

| # | Question | Owner | Blocking? |
|---|----------|-------|-----------|
| 1 | Do we have Stripe API keys from Fred? | Fred | **YES** — cannot test or ship |
| 2 | What Stripe mode: test or production? | Fred | **YES** |
| 3 | Is there a Resend API key for confirmation emails? | Fred | No — WhatsApp is backup |
| 4 | Should we auto-generate referral code on first conversion? | Tech decision | No — implement per MAI-823 |
| 5 | Should cancelled/expired sessions reset lead to `quoted` for retry? | PM decision | No — lead stays `pending_payment` |
| 6 | Do we need a manual refund flow for chef-initiated cancellations? | Future | No — MVP |

---

## 11. Dependencies

### Blocking (Fred)
| Item | Why |
|------|-----|
| `STRIPE_SECRET_KEY` | Backend cannot create Checkout Sessions |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification fails without this |

### Non-Blocking (Already in codebase)
| Item | Status |
|------|--------|
| Stripe SDK | ✅ `import Stripe from 'stripe'` |
| Checkout Session creation | ✅ `stripe.checkout.sessions.create()` in `checkout.ts` |
| Webhook handler | ✅ `POST /api/webhooks/stripe` in `webhooks.ts` |
| WhatsApp notifications | ✅ `sendChefWhatsAppNotification()` |
| Email notifications (placeholder) | ✅ `sendChefNewBookingEmail()` (logs until Resend is live) |

---

**Spec written by:** Product Manager  
**Date:** 2026-05-14  
**Based on:** MAI-1250 (BE/FE Build Spec) + MAI-1250 Implementation Plan  
**Ready for:** Backend + Frontend implementation  
**Blocked by:** Stripe keys from Fred