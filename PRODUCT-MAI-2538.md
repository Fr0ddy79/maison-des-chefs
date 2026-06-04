# Product Opportunity Discovery — MAI-2538

**Autopilot Run:** 2026-06-04 12:00 America/New_York
**Analyst:** Product Manager

---

## Executive Summary

Core marketplace flows (inquiry → quote → accept) are operational. This run identifies **3 distinct gaps** across the booking lifecycle: a critical data integrity issue in the booking confirmation step, a broken chef profile editing experience, and a missing SEO optimization on key pages.

---

## What's Working (Confirmed This Run)

| Feature | Status | Notes |
|---------|--------|-------|
| Inquiry submission + conflict detection | ✅ Working | `/api/inquiry` with availability slot check |
| Chef inquiry accept/reject | ✅ Working | Creates booking, accepts/rejects properly |
| Quote send/accept/decline flow | ✅ Working | Quote modal in chef dashboard, accept/decline in diner dashboard |
| Quote Performance Analytics | ✅ Working | Metrics dashboard in chef dashboard |
| Service Management UI | ✅ Working | `/dashboard/chef/services` fully functional |
| Review System UI | ✅ Working | `ReviewForm.tsx` + review display on chef profiles (MAI-2529 complete) |
| Admin Revenue Calculation | ✅ Working | Uses `quote_status = 'accepted'` |
| Landing page CTA A/B test | ✅ Working | 3 variants + click tracking |
| Service type filtering | ✅ Working | Experience cards → `/chefs?service_type=` |

---

## Critical Gap #1: Confirmed Bookings Don't Mark Availability as Booked (P0)

### Problem Statement

When a diner accepts a quote (via `POST /api/bookings/[id]/accept-quote`), the booking's `quote_status` becomes `'accepted'` and the booking is confirmed. **However, the corresponding `availability` slot is never marked as `is_booked = true`.**

This means:
1. The availability slot remains "available" in the database
2. A subsequent inquiry for the same date/time slot would pass the conflict check (since `is_booked = false`)
3. The system could theoretically double-book a chef's slot

### User Story

**As a** diner
**I want** my confirmed booking to be protected from double-booking
**So that** I can trust the chef I booked is actually available

**Currently:** Booking confirms, slot remains `is_booked = false`, no conflict detection fires for subsequent inquiries on the same slot.

### Root Cause

The `accept-quote` route (`/api/bookings/[id]/accept-quote`) updates `quote_status` to `'accepted'` but does **not**:
1. Find the matching `availability` slot for this booking (by `chef_id` + `booking_date`)
2. Mark that slot as `is_booked = true`
3. Prevent future inquiries from claiming the same slot

### Scope

**In:**
- In `POST /api/bookings/[id]/accept-quote`, after accepting the quote:
  - Query `availability` table for slot matching `chef_id` + `booking_date`
  - Update `is_booked = true` for that slot
- In `POST /api/bookings/[id]/decline-quote`:
  - Keep availability as `is_booked = false` (slot released)
- Optional: add a consistency check on booking create (when chef accepts inquiry) to mark the slot as booked

**Out:**
- Refactoring the conflict detection logic (already correct)
- Changes to booking creation flow (already creates the booking correctly)
- UI changes (slot shows as "booked" already in chef dashboard)

### Acceptance Criteria

- [ ] When a quote is accepted, the corresponding availability slot has `is_booked = true`
- [ ] When a quote is declined, the availability slot remains `is_booked = false`
- [ ] A subsequent inquiry on the same date/time after quote acceptance receives a `DATE_ALREADY_BOOKED` conflict error
- [ ] Manual verification: book a slot, accept the quote, check `availability` table shows `is_booked = true`

### Metrics

- **Primary:** Double-booking incidents (target: 0)
- **Secondary:** Availability slot utilization accuracy

### Open Questions

- Should we also mark slots as booked when the chef accepts the inquiry (before quoting), or only when the quote is accepted?
- Do we need a migration to mark currently-accepted bookings' slots as booked?

---

## Gap #2: Chef Profile Edit is Broken (P1)

### Problem Statement

The chef dashboard sidebar has an "Edit Profile" link:

```tsx
<a href="#" className="block w-full text-center px-4 py-2 rounded font-medium text-sm transition-colors border" style={{ borderColor: 'var(--color-mdc-accent)', color: 'var(--color-mdc-accent)' }}>
  Edit Profile
</a>
```

**This goes to `#` (nowhere).** Chefs cannot edit their profile fields:
- Display name
- Bio
- Location
- Cuisines
- Years of experience
- Profile photo/hero image

The Profile Completeness indicator correctly identifies missing elements, but provides no path to fix them.

### User Story

**As a** chef
**I want** to edit my profile information
**So that** I can keep my listing accurate and attractive to diners

**Currently:** Chef logs in, sees incomplete profile indicator, tries "Edit Profile" button, nothing happens.

### Scope

**In:**
- Create `/dashboard/chef/profile` page
- Pre-populated form with current profile data
- Fields: display_name, bio, location, cuisines (multi-select), years_experience, avatar_url, hero_image_url
- Save updates via `PATCH /api/chefs/[id]`
- Validation: display_name required, bio max 500 chars, cuisines at least one

**Out:**
- Password change functionality (separate flow)
- Email/contact preference changes
- Verification badge changes

### Acceptance Criteria

- [ ] Chef dashboard "Edit Profile" link navigates to `/dashboard/chef/profile`
- [ ] Form pre-populated with chef's current profile data
- [ ] All fields editable and saveable
- [ ] Avatar and hero image upload (can be URL input for MVP)
- [ ] Profile completeness indicator updates after save

### Metrics

- **Primary:** % of chefs who update their profile within 7 days of first login (target: >60%)
- **Secondary:** Profile completeness score at 30 days (target: >80%)

### Open Questions

- Should there be a separate "Profile Photo" page vs "Profile Info" page, or one unified page?
- Do we need image upload functionality, or URL input is sufficient for MVP?

---

## Gap #3: Landing Page SEO Metadata Missing on Sub-pages (P1)

### Problem Statement

The `layout.tsx` correctly exports global `metadata` with title, description, OpenGraph, and Schema.org JSON-LD. However, **per-page metadata exports are missing** on all key pages.

Without per-page metadata:
- Search engines see generic/uniform page titles for all pages
- Social sharing uses default or missing descriptions
- Pages lack page-specific structured data

### Affected Pages

| Page | Current State | Missing |
|------|-------------|---------|
| `/` (landing) | Uses parent metadata via generateMetadata in layout.tsx | ✅ Has global metadata |
| `/chefs` | No metadata export | title, description, og:title, og:description |
| `/chefs/[id]` | No metadata export | Dynamic title "Chef [Name] - Private Chef in [Location]", og:image |
| `/book` | No metadata export | title, description |
| `/chef/apply` | No metadata export | title, description |
| `/login` | No metadata export | title, description |
| `/signup` | No metadata export | title, description |

### User Story

**As a** diner
**I want** search results to show accurate, descriptive titles for each page
**So that** I can find and share the right content

### Scope

**In:**
- Add `export const metadata` to all key public pages
- Landing page (`/`): Already has via layout, no change needed
- `/chefs`: "Browse Private Chefs in Montreal | Maison des Chefs"
- `/chefs/[id]`: Dynamic metadata using chef's `display_name` and `location`
- `/book`: "Book a Private Chef | Maison des Chefs"
- `/chef/apply`: "Apply as a Chef | Maison des Chefs"
- Auth pages: Simple title tags ("Login | Maison des Chefs")

**Out:**
- Schema.org markup per page (keep global only)
- Sitemap generation (future)
- robots.txt optimization (future)

### Acceptance Criteria

- [ ] `/chefs` page has unique title + description in HTML head
- [ ] `/chefs/[id]` page has dynamic title with chef name
- [ ] `/book` page has unique title + description
- [ ] `/chef/apply` page has unique title + description
- [ ] Social sharing (copy link) shows page-specific preview

### Metrics

- **Primary:** Google Search Console indexing coverage (target: >80% of pages indexed)
- **Secondary:** Organic search traffic growth (target: month-over-month increase)

### Open Questions

- Do we need canonical URLs for each page?
- Should `/chefs/[id]` include chef-specific Schema.org markup (e.g., Person schema with rating)?

---

## Priority Ranking

| # | Opportunity | Priority | Effort | Owner |
|---|------------|----------|--------|-------|
| 1 | Confirmed Bookings Don't Mark Availability | **P0** | Low | Backend (2 files) |
| 2 | Chef Profile Edit is Broken | **P1** | Medium | Frontend + Backend |
| 3 | Landing Page SEO Metadata on Sub-pages | **P1** | Low | Frontend (several pages) |

---

## Technical Notes

### Gap #1 Fix Location

The `accept-quote` route at `/api/bookings/[id]/accept-quote/route.ts`:

```ts
// Current: updates quote_status but never touches availability.is_booked
const { error } = await supabase
  .from('bookings')
  .update({ quote_status: 'accepted' })
  .eq('id', bookingId)

// Missing:
// 1. Get booking's chef_id and booking_date
// 2. Update availability set is_booked = true where chef_id = X and date = Y
```

### Gap #2 Existing Backend Support

`PATCH /api/chefs/[id]` already exists and accepts: `display_name`, `bio`, `location`, `cuisines`, `years_experience`, `max_guests`, `hero_image_url`. The endpoint is complete — just needs a UI.

### Gap #3 Per-Page Metadata Pattern

For dynamic routes like `/chefs/[id]`, the metadata must be async and await params:

```tsx
// In /chefs/[id]/page.tsx
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const chef = await getChef(id)
  return {
    title: `Chef ${chef.display_name} | Maison des Chefs`,
    description: `Book Chef ${chef.display_name} for private dining in ${chef.location}. ${chef.avg_rating} stars from ${chef.review_count} reviews.`,
  }
}
```

---

## Changes Since Previous Run (MAI-2519)

| Item | MAI-2519 | MAI-2538 |
|------|----------|----------|
| Booking flow | Working | ✅ Still working |
| Chef approval auth | Fixed (ghost accounts resolved) | ✅ Fixed |
| Service management UI | Not present | ✅ Functional |
| Review system | Not present | ✅ Functional (MAI-2529 complete) |
| Admin revenue | Fixed | ✅ Still fixed |
| Resend API key | Placeholder | ❌ Still placeholder |

---

## Fred Actions Needed

1. **Provide Resend API key** — Replace `your_resend_api_key_here` in `.env.local` (blocks all transactional emails including inquiry confirmations)
2. **Confirm Slot Booking Logic** — When should availability slots be marked as booked: on inquiry acceptance (chef accepts → booking created) or only on quote acceptance (diner accepts quote)?

---

## Open Questions for Fred

1. **Availability Slot Booking Timing** — Should we mark `is_booked = true` when the chef accepts the inquiry (creating the booking), or only when the quote is accepted (booking fully confirmed)? The difference: if marked on inquiry acceptance, we prevent other inquiries but the booking could still be declined. If marked on quote acceptance, we allow more flexibility but risk double-booking during the quoting period.
2. **Profile Photo Upload** — Is URL input sufficient for chef avatar/hero, or do you need actual file upload handling?

---

*Generated by Product Manager — MAI-2538*