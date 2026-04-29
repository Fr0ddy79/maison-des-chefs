# MAI-846: Product Opportunity Discovery — Build Queue Complete, MAI-618 Critical Blocker (Fred Must Act)

**Date:** 2026-04-29
**Owner:** Product Manager
**Status:** Done
**Priority:** Medium

---

## Build Queue Status

| Issue | Title | Status | Blocker | Notes |
|-------|-------|--------|---------|-------|
| MAI-839 | Checkout Flow + Stripe Integration | ✅ Committed | MAI-618 | Ready for deployment |
| MAI-841 | Chef Stale Lead Alert | ✅ Committed | MAI-618 | Ready for deployment |
| MAI-845 | Diner Stale Lead Re-Engagement Email | 🔨 In Progress (P1) | None | New task for BE |
| MAI-834 | FE: Auth Gate Removal | ✅ Committed | MAI-618 | Ready for deployment |
| MAI-823 | Referral CTA on Booking Confirmation | ✅ Committed | MAI-618 | Ready for deployment |
| MAI-805 | Guest Booking Recovery via Email Token | ✅ Committed | MAI-618 | Ready for deployment |
| MAI-840 | BE: Stale Lead Alert to Chef Dashboard | ✅ Done | MAI-618 | Committed in MAI-841 |
| MAI-766 | Chef Lead Response Dashboard | ✅ Committed | MAI-618 | Ready for deployment |
| MAI-618 | **Fred MUST Refresh Vercel Token + Stripe Keys** | ❌ Blocked | **Fred's action required** | **10+ days blocked** |

### Summary
- **10+ features committed but cannot reach production users**
- **All items blocked by MAI-618 (Fred's action required)**
- **MAI-845 (Diner Stale Lead Email) is in progress for BE**

---

## Top 3 Product Opportunities (MAI-618 Independent)

Since MAI-618 has been blocked for 10+ days with no action from Fred, these opportunities focus on work that can be built, tested, and deployed immediately once MAI-618 is resolved.

---

### Opportunity #1: Chef Discovery Page with Search/Filter UI

**Type:** New Feature
**Owner:** Frontend Engineer (+ BE for API enhancement)
**Effort:** ~3-4 hours
**Impact:** HIGH — Closes a critical gap in the diner acquisition funnel

#### Rationale

The homepage CTAs link to `/chefs` which is an **API endpoint, not an HTML page**. When diners click "Browse Chefs" or "Find Your Chef", they receive raw JSON instead of a beautiful discovery experience. This is a broken user journey at the top of the funnel.

The API at `/chefs` already supports:
- Filtering by cuisine type
- Filtering by dietary requirements  
- Availability filtering

What's missing is the **UI layer**:
- Chef discovery grid page
- Client-side search/filter controls
- Chef cards with photos, bios, cuisine tags, and pricing

#### What to Build

1. **New route:** `GET /chefs` → renders chef discovery HTML page
2. **Chef cards:** Photo (currently hardcoded from Unsplash), name, location, cuisines, starting price
3. **Filter sidebar:** Cuisine type checkboxes, dietary tag checkboxes, price range slider
4. **Sort options:** By price, by rating, by newest
5. **Responsive grid:** 3 columns on desktop, 2 on tablet, 1 on mobile

#### Why NOW

The MAI-845 Diner Stale Lead Re-Engagement Email (in progress) will bring re-engaged diners back to the site. When they arrive, they need a polished discovery experience — not a JSON dump. Without this, conversion gains from MAI-845 will be partially lost.

#### Dependencies
- None (API already exists)
- No MAI-618 dependency

---

### Opportunity #2: Chef Profile Photo Upload System

**Type:** Product Improvement
**Owner:** Backend Engineer + Frontend Engineer
**Effort:** ~2-3 hours
**Impact:** MEDIUM-HIGH — Photos are the #1 trust signal for service businesses

#### Rationale

Currently, chef "photos" are **hardcoded placeholder images** from Unsplash, selected based on cuisine type:

```typescript
// src/routes/pages.ts - getChefPhoto()
const photos: Record<string, string> = {
  'French': 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&h=400&fit=crop&crop=face',
  'Italian': 'https://images.unsplash.com/photo-1583394293214-28ez6f5b5b96?w=400&h=400&fit=crop&crop=face',
  // ...
};
return 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&h=400&fit=crop&crop=face';
```

This means:
- Every French chef gets the same stock photo
- No actual chef photos are displayed
- Trust and conversion suffer

#### What to Build

1. **Photo storage:** Add `photo_url` field to `chef_profiles` table
2. **Upload endpoint:** `POST /api/chefs/me/photo` with file upload handling
3. **Profile page update:** Display actual chef photo from database
4. **Chef card update:** Use actual photo in discovery grid

#### Why NOW

When the checkout flow (MAI-839) goes live, diners will be paying real money. They need to trust the chef they're booking. Fake/placeholder photos erode this trust at the critical payment moment.

#### Dependencies
- None (can be built independently)
- No MAI-618 dependency
- Note: Production deployment would need file storage (could use base64 initially, or cloud storage later)

---

### Opportunity #3: Homepage Direct Booking Path with Date/Guests Input

**Type:** Revenue Acceleration
**Owner:** Frontend Engineer
**Effort:** ~2-3 hours
**Impact:** MEDIUM — Captures high-intent users who are ready to book

#### Rationale

The current homepage CTA routes all users through "Browse Chefs" (`/chefs`) even if they already know what they want. High-intent users (ready to book a specific date for a party) are forced through an extra browsing step.

**Current flow:**
```
Homepage → Browse Chefs → Chef Profile → Booking Form
```

**With direct booking:**
```
Homepage → [Date + Guests + Type Input] → Filtered Results → Booking Form
```

This is especially important for the "last-mile" conversion when MAI-618 is resolved and the full funnel goes live.

#### What to Build

1. **Hero section enhancement:** Add a search bar to the homepage hero with:
   - Date picker
   - Guest count selector
   - Event type dropdown (Private Dinner, Cooking Class, etc.)
2. **Quick-search URL generation:** Submitting the form routes to `/services?date=...&guests=...&type=...`
3. **Pre-filtered services page:** The services page already accepts query params, just needs UI to set them

#### Why NOW

The checkout flow (MAI-839) is committed. When it goes live, every additional click in the booking funnel costs conversions. Reducing friction at the top-of-funnel will maximize the ROI of the payment infrastructure investment.

#### Dependencies
- None (works with existing search API)
- No MAI-618 dependency

---

## Recommended Priority Order

| # | Opportunity | Why First |
|---|-------------|-----------|
| 1 | **Chef Discovery Page** | Fixes broken link, immediate UX improvement, feeds from MAI-845 re-engagement |
| 2 | **Homepage Direct Booking** | Captures high-intent traffic, easy win, leverages existing search API |
| 3 | **Chef Photo Upload** | Trust signal for payment moment, moderate effort |

---

## Blocker Status

**CRITICAL BLOCKER: MAI-618** — Fred has not acted for 10+ days.

All committed features (10+) are frozen and cannot reach production users until Fred:
1. Refreshes the expired Vercel OIDC token
2. Provides Stripe keys (pk_live_*, sk_live_*, whsec_*)

**Impact:** Revenue generation is completely blocked. Diners cannot pay. Chefs cannot get paid.

---

## Tasks to Create

| Task | Owner | Priority | Description |
|------|-------|----------|-------------|
| FE: Chef Discovery Page with Search/Filter UI | Frontend Engineer | P1 | Build /chefs page with chef cards, filters, responsive grid |
| BE+FE: Chef Profile Photo Upload | Backend + Frontend | P2 | Add photo_url to schema, upload endpoint, update profile display |
| FE: Homepage Direct Booking Path | Frontend Engineer | P2 | Add hero search bar with date/guests/type inputs |

---

*Document generated by Product Manager — 2026-04-29 14:03 EDT*
