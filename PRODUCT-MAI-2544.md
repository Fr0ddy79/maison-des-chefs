# Product Opportunity Discovery — MAI-2544

**Autopilot Run:** 2026-06-04 16:00 America/New_York
**Analyst:** Product Manager

---

## Executive Summary

Core marketplace flows (inquiry → quote → accept/decline) are mostly operational. This run identified **3 gaps**: one critical data-integrity bug where confirmed bookings don't mark availability as booked, a broken navigation target for the chef profile edit, and missing SEO metadata on sub-pages.

---

## What's Working (Confirmed This Run)

| Feature | Status | Notes |
|---------|--------|-------|
| Inquiry submission + 3-way conflict detection | ✅ Working | Checks availability slot, blocked dates, existing bookings |
| Chef inquiry accept/reject | ✅ Working | Creates booking, frees slot on reject |
| Quote send/accept/decline flow | ✅ Working | Quote modal, accept/decline endpoints |
| Quote Performance Analytics | ✅ Working | Metrics dashboard |
| Service Management UI | ✅ Working | `/dashboard/chef/services` |
| Review System UI | ✅ Working | MAI-2529 complete |
| Availability Management UI | ✅ Working | Add/remove slots with is_booked badge |
| Landing page CTA A/B test | ✅ Working | 3 variants + click tracking |
| Email template infrastructure | ✅ Working | Confirmation emails built, sending blocked by Resend key |
| Header navigation | ✅ Working | All links point to real routes |

---

## Critical Gap #1: Accept-Quote Never Marks Availability as Booked (P0)

### Problem Statement

When a diner accepts a quote via `POST /api/bookings/[id]/accept-quote`, the booking transitions to `status: 'confirmed'` and `quote_status: 'accepted'`. **However, the corresponding `availability` slot is never marked `is_booked = true`.**

Conversely, when a diner **declines** a quote via `POST /api/bookings/[id]/decline-quote`, the endpoint _does_ attempt to free the slot by finding and updating `availability.is_booked = false`. But since `accept-quote` never marks the slot as booked in the first place, the slot is always `is_booked = false` at the time of decline — meaning the "free slot" logic is a no-op.

The net effect: slots stay permanently available even after bookings are confirmed. A subsequent inquiry on the same date will pass conflict detection and create a second inquiry for an already-confirmed slot.

### User Story

**As a** diner
**I want** my confirmed booking to not be double-booked
**So that** I can trust the chef I booked is actually available

**Currently:** Booking confirms, slot remains `is_booked = false`, subsequent inquiries on the same date pass conflict checks.

### Root Cause

`accept-quote/route.ts` (lines 86–95) updates `{ status: 'confirmed', quote_status: 'accepted' }` but has **no code** to:
1. Look up the matching `availability` slot by `chef_id` + `booking_date`
2. Set `is_booked = true` on that slot

The counterpart `decline-quote/route.ts` attempts to un-book by querying `.eq('is_booked', true)` — but since `accept` never set that flag, nothing walks back.

### Scope

**In:**
- In `accept-quote/route.ts`: after updating booking to confirmed, find slot where `chef_id = booking.chef_id` and `date = booking.booking_date`, update `is_booked = true`
- In `decline-quote/route.ts`: no action needed (existing logic is correct, just never triggered because `is_booked` was never set)

**Out:**
- Changes to `inquiry/route.ts` conflict detection (already correct — it checks availability slot existence with `is_booked = false`)
- UI changes (slot already shows correct badge based on `is_booked`)
- Booking creation when chef accepts inquiry (separate flow, not covered here)

### Acceptance Criteria

- [ ] Accept quote → corresponding availability slot has `is_booked = true`
- [ ] Decline quote → no change to `is_booked = false` (slot was never booked in the first place)
- [ ] Subsequent inquiry on the same date after quote acceptance → 409 `DATE_ALREADY_BOOKED`
- [ ] Manual verification: send quote → accept → query `availability` table → slot shows `is_booked = true`
- [ ] Decline flow: accept quote → decline same quote → slot returns to `is_booked = false`

### Metrics

- **Primary:** Double-booking incidents (target: 0)
- **Secondary:** Availability slot utilization accuracy

### Open Questions

- Do we need a migration to retroactively mark currently-`confirmed` bookings' slots as booked?
- Should `is_booked` also be set when chef accepts an inquiry (before quoting), or only when the quote is accepted?

---

## Gap #2: Chef "Edit Profile" Button Goes Nowhere (P1)

### Problem Statement

The chef dashboard sidebar has an "Edit Profile" link:

```tsx
<a href="#" className="block w-full text-center px-4 py-2 rounded font-medium text-sm transition-colors border"
   style={{ borderColor: 'var(--color-mdc-accent)', color: 'var(--color-mdc-accent)' }}>
  Edit Profile
</a>
```

**This `href="#"` navigates to nowhere.** Chefs cannot edit their profile fields even though the Profile Completeness indicator correctly identifies missing elements. The backend `PATCH /api/chefs/[id]` already supports updating `display_name`, `bio`, `location`, `cuisines`, `years_experience`, `max_guests`, `hero_image_url`.

### User Story

**As a** chef
**I want** to edit my profile information
**So that** I can keep my listing accurate and attractive to diners

**Currently:** Chef sees incomplete profile → clicks "Edit Profile" → nothing happens.

### Scope

**In:**
- Create `/dashboard/chef/profile/page.tsx`
- Pre-populated form with current profile data
- Fields: display_name, bio, location, cuisines (multi-select), years_experience, max_guests, avatar_url, hero_image_url
- Save via `PATCH /api/chefs/[id]`
- Validation: display_name required, bio max 500 chars, cuisines at least one

**Out:**
- Image file upload (URL input sufficient for MVP)
- Password change functionality
- Email preference changes
- Separate pages (one unified profile page is enough for MVP)

### Acceptance Criteria

- [ ] Chef dashboard sidebar "Edit Profile" link navigates to `/dashboard/chef/profile`
- [ ] Form pre-populated with chef's current profile data
- [ ] All listed fields editable and saveable
- [ ] Profile completeness indicator updates after save

### Metrics

- **Primary:** % of chefs who update their profile within 7 days of first login (target: >60%)
- **Secondary:** Profile completeness score at 30 days (target: >80%)

### Open Questions

- Single page vs. separate sections for Profile Info vs. Photos?
- Is URL input sufficient, or is actual file upload needed?

---

## Gap #3: Missing SEO Per-Page Metadata (P1)

### Problem Statement

The `layout.tsx` exports global `metadata` (title, description, OpenGraph, Schema.org JSON-LD), but **no child page exports its own metadata**. This means:

- All pages show the same generic title in search results
- Social sharing (copy link → paste) shows no page-specific previews
- Missing page-specific structured data (e.g., Chef Person schema on `/chefs/[id]`)

### Affected Pages

| Page | Current State | Missing |
|------|-------------|---------|
| `/chefs` | No metadata export | `title`, `description`, og:title, og:description |
| `/chefs/[id]` | No metadata export | Dynamic title "Chef [Name] in [Location]", og:image |
| `/book` | No metadata export | `title`, `description` |
| `/chef/apply` | No metadata export | `title`, `description` |
| `/login` | No metadata export | `title`, `description` |
| `/signup` | No metadata export | `title`, `description` |

### User Story

**As a** diner
**I want** search results to show accurate, descriptive titles
**So that** I can find and share the right content

### Scope

**In:**
- `/chefs`: "Browse Private Chefs in Montreal | Maison des Chefs"
- `/chefs/[id]`: `async generateMetadata` fetching chef data → "Chef [Name] | Maison des Chefs"
- `/book`: "Book a Private Chef | Maison des Chefs"
- `/chef/apply`: "Apply as a Chef | Maison des Chefs"
- Auth pages: "Login | Maison des Chefs", "Sign Up | Maison des Chefs"

**Out:**
- Per-page Schema.org markup (keep global only)
- Sitemap generation
- robots.txt optimization

### Acceptance Criteria

- [ ] `/chefs` page has unique `<title>` in HTML head
- [ ] `/chefs/[id]` has dynamic `<title>` with chef name
- [ ] `/book`, `/chef/apply`, `/login`, `/signup` each have unique titles
- [ ] Copy-link social sharing shows page-specific preview

### Metrics

- **Primary:** Google Search Console indexing coverage improvement
- **Secondary:** Organic search traffic month-over-month growth

---

## Priority Ranking

| # | Gap | Priority | Effort | Owner |
|---|-----|----------|--------|-------|
| 1 | Accept-quote doesn't mark `availability.is_booked = true` | **P0** | Low (1 endpoint) | Backend |
| 2 | Chef "Edit Profile" href="#" | **P1** | Medium (new page) | Frontend + Backend |
| 3 | Missing per-page SEO metadata | **P1** | Low (add ~8 exports) | Frontend |

---

## Technical Notes

### Gap #1 Fix Location

File: `src/app/api/bookings/[id]/accept-quote/route.ts`
Section around line 86–95 (after `update({ status: 'confirmed', quote_status: 'accepted' })`):

```ts
// After booking update succeeds:
const { data: slot } = await supabase
  .from('availability')
  .select('id')
  .eq('chef_id', booking.chef_id)
  .eq('date', booking.booking_date)
  .single()

if (slot) {
  await supabase
    .from('availability')
    .update({ is_booked: true })
    .eq('id', slot.id)
}
```

### Gap #2 Backend Already Exists

`PATCH /api/chefs/[id]` (dynamic route) already accepts and updates:
`display_name`, `bio`, `location`, `cuisines`, `years_experience`, `max_guests`, `hero_image_url`

**Gap is frontend UI only.**

### Gap #3 Metadata Pattern for Dynamic Routes

For `/chefs/[id]/page.tsx`, metadata must be `async` and `await` params:

```tsx
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const chef = await getChef(id)
  return {
    title: `Chef ${chef.display_name} | Maison des Chefs`,
    description: `Private chef in ${chef.location} specializing in ${chef.cuisines?.join(', ')}.`,
  }
}
```

---

## Changes Since Previous Run (MAI-2538)

| Item | MAI-2538 | MAI-2544 |
|------|----------|----------|
| Accept-quote slot booking | ❌ Broken | ❌ Still broken |
| Chef profile edit | ❌ Broken | ❌ Still broken |
| Per-page SEO metadata | ❌ Missing | ❌ Still missing |
| Quote performance analytics | ✅ Working | ✅ Working |
| Service management | ✅ Working | ✅ Working |
| Inquiry conflict detection | ✅ Working | ✅ Working |
| Email infrastructure | ✅ Templates built | ✅ Templates built |
| Resend API key | ⚠️ Placeholder | ⚠️ Still placeholder |

---

## Fred Actions Needed

1. **Provide Resend API key** — Replace `your_resend_api_key_here` in `.env.local` (blocks transactional emails: inquiry confirmations, quote accepted/declined, chef application emails)

---

## Open Questions for Fred

1. **Availability Slot Booking Timing** — Mark `is_booked = true` when chef accepts inquiry (booking created), or only when diner accepts quote (fully confirmed)? Related to Gap #1 above.
2. **Profile Photo Upload** — Is URL input sufficient for MVP, or do we need actual file upload handling?
3. **Retroactive Slot Fix** — Should we run a one-time DB migration to mark `is_booked = true` for all slots that already have confirmed bookings?

---

*Generated by Product Manager — MAI-2544*
