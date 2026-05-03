# Product Discovery: Define MVP Scope
**Issue:** MAI-975 | **Workspace:** Maison des chefs
**Status:** DONE — Spec v1.0 Complete

---

## Product Spec (v1.0)

### Problem Statement

Montreal residents seeking premium at-home dining experiences lack a trustworthy, streamlined way to discover, compare, and book private chefs. Meanwhile, private chefs in Montreal have limited channels to reach clients and no dedicated tools to manage bookings professionally, forcing them to rely on informal networks and word-of-mouth.

---

### Target Users

**Primary:** Montreal residents (30-65, upper-middle class) hosting dinner parties, family gatherings, birthdays, anniversaries, or corporate events who want a personalized culinary experience without the hassle of restaurants.

**Secondary:** Professional private chefs in Montreal seeking to monetize their skills, build a client base, and manage their booking workflow in one place.

---

### MVP Feature List (5 items)

1. **Chef Discovery** — Browse/search chef profiles with photo, bio, cuisine specialties, price range, and availability calendar. Filter by cuisine type, date, and party size.
2. **Booking Request** — Diners submit a booking request specifying date, time, location (address or venue), party size, dietary restrictions, and occasion type. Chef receives notification and can confirm or decline.
3. **Booking Status Tracking** — Both diner and chef see booking status: `requested` → `confirmed` / `declined` → `completed` / `cancelled`. Real-time status updates.
4. **Basic Messaging** — Threaded conversation between diner and chef tied to a specific booking request. Used to clarify menu, logistics, special requests before confirmation.
5. **Chef Availability Management** — Chefs can set available dates/times and block unavailable periods. Availability visible to diners during booking flow.

---

### User Stories

| # | As a... | I want to... | So that... |
|---|---------|-------------|------------|
| 1 | Diner | browse chef profiles with cuisine, pricing, and availability | I can find a chef that matches my preferences, budget, and schedule |
| 2 | Diner | submit a booking request for a specific date and party | I can secure a chef for my event and receive a confirmation or decline |
| 3 | Chef | view incoming booking requests and their details | I can decide whether to confirm or decline based on my availability and fit |

---

### Success Metrics

| Metric | Target (Launch) | Target (6 months) |
|--------|----------------|-------------------|
| Active chefs on platform | 10 | 50 |
| Booking requests submitted | 20 | 200/month |
| Booking confirmation rate | >60% | >75% |
| Diner satisfaction score | >4.0/5.0 | >4.5/5.0 |
| Repeat booking rate | — | >20% |

---

### Open Questions

1. **Payments** — Does diner pay upfront, at-event, or post-event? Who holds funds?
2. **Chef verification** — What verification process? (Food handler cert, business license, references?)
3. **Cancellation/refund policy** — Who decides? What % penalty?
4. **Service area** — All of Montreal metro? Specific boroughs only?
5. **Revenue model** — Commission per booking (%?), monthly subscription for chefs, featured listings, or hybrid?
6. **Minimum party size** — Any minimums for chef to accept?
7. **Pricing display** — Flat rate per event, per person, hourly rate, or prix fixe menu?

---

### Scope Boundaries

**In MVP:**
- Browser-based responsive UI (mobile + desktop)
- Email notifications (in-app + email)
- Single Montreal market
- Basic chef profiles (no menus yet)
- Booking requests tied to single date (no multi-day events)

**Out of MVP scope (post-launch):**
- Payments / deposits / billing
- Chef menus / dishes / pricing calculator
- Reviews / ratings
- Multi-day event bookings
- Chef subscriptions / featured listings
- Native mobile apps
- Chat before booking request (pre-booking inquiry)
- Analytics dashboard (beyond basic metrics)

---

## Definition of Done
- [x] Clear, actionable product spec that engineers can implement from
- [x] Scope is realistic for MVP (5 features, bounded)
- [x] No major ambiguity in requirements — open questions documented and not blocking
