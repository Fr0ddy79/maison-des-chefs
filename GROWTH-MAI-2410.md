# Growth Optimization: Availability Status on Chef Listings — MAI-2410

**Date:** 2026-06-02  
**Analyst:** Growth Marketer  
**Status:** Complete

---

## Executive Summary

The booking funnel is broken at the availability layer — no chef has availability slots, so every booking request fails with a 409 conflict. Rather than wait for MAI-2376 (chef availability setup), we can optimize the **discovery experience** by surfacing availability status to diners, creating transparency and enabling informed booking intent even before the blocker is resolved.

---

## Funnel Analysis

```
Landing Page
    ↓ (Hero CTA — MAI-2383 A/B running)
Chef Listing (/chefs)
    ↓
Chef Detail → Booking Form
    ↓
[409] NO_AVAILABILITY_SLOT ← Every booking fails
    ↓
Users are unaware WHY booking fails — no messaging
```

**Problem:** Users reach the booking form and submit, only to get a cryptic 409 error. There's no pre-booking visibility into whether a chef is actually available. This creates:

1. **Wasted acquisition spend** — users who would convert if slots existed can't self-identify
2. **Negative experience signal** — failed bookings may reduce repeat visit intent
3. **Lost feedback loop** — we don't know how many users attempted to book but couldn't

---

## Growth Idea: Availability Status Badges + Messaging

### Rationale

Adding availability status to chef cards and the chef detail page:

1. **Sets expectations upfront** — diners know before clicking through whether booking is possible
2. **Creates urgency for "available" chefs** — scarcity signal drives action
3. **Builds trust** — transparent "No availability yet" is better than silent 409 failures
4. **Enables A/B testing** — can compare conversion with/without status indicators
5. **Generates feedback** — when chefs see "No availability" on their profile, they're motivated to add slots

### Design

**On `/chefs` listing cards:**

| State | Badge | Copy |
|-------|-------|------|
| Has available slots | 🟢 Green pill | "Available" |
| No slots configured | 🟡 Yellow pill | "Inquire for dates" |
| All slots booked | 🔴 Gray pill | "Fully booked" |

**On `/chefs/[id]` booking sidebar:**

| State | Messaging |
|-------|-----------|
| Has availability | "This chef has openings. Request a booking below." |
| No availability | "No dates currently available. Submit an inquiry and we'll notify you when slots open." |
| All booked | "Fully booked. Join the waitlist to be notified." |

---

## Implementation

### Files to Modify

| File | Change |
|------|--------|
| `src/app/chefs/page.tsx` | Fetch availability counts, add status badges to chef cards |
| `src/app/chefs/[id]/ChefProfileClient.tsx` | Update booking sidebar with availability-based messaging |
| `src/app/api/availability/route.ts` (create) | API to get availability counts per chef for badge display |

### API: GET /api/availability?chef_ids=id1,id2

Returns availability summary per chef:

```json
{
  "chef_availability": {
    "uuid-1": { "has_slots": true, "available_count": 3, "next_available": "2026-06-05" },
    "uuid-2": { "has_slots": false, "available_count": 0, "next_available": null },
    "uuid-3": { "has_slots": true, "available_count": 0, "next_available": null }
  }
}
```

### Frontend: Chef Card Badge

In `src/app/chefs/page.tsx`, after fetching chefs:

```tsx
// After setChefs(data), also fetch availability
// Badge logic:
// - has_slots && available_count > 0: "Available" (green)
// - has_slots && available_count === 0: "Fully booked" (gray)
// - no slots: "Inquire for dates" (yellow)
```

### Frontend: Booking Sidebar Messaging

In `ChefProfileClient.tsx`, update the booking sidebar:

```tsx
// Instead of static form, show availability-aware messaging
{availabilityStatus === 'available' && (
  <Link href={`/book?chef_id=${chef.id}`} className="block...">
    Request Booking
  </Link>
)}
{availabilityStatus === 'no_slots' && (
  <button onClick={() => showInquiryModal()} className="block...">
    Inquire for Dates
  </button>
)}
{availabilityStatus === 'fully_booked' && (
  <div>
    <p className="text-sm">Fully booked</p>
    <button className="block...">Join Waitlist</button>
  </div>
)}
```

---

## Experiment Plan: A/B Test

### Hypothesis

"Showing availability status badges on chef listing cards will increase click-through to chef detail pages and booking form starts, because users can self-select based on booking readiness."

### Variant Details

| Element | Control | Variant |
|---------|---------|---------|
| Chef card | No availability badge | "Available" / "Inquire" / "Fully booked" badge |
| Booking sidebar | Static form | Availability-aware messaging + CTA |

### Traffic Split

- 50/50 cookie-based split (reuse HeroCTA cookie infrastructure)
- Track: card click → chef detail view → booking form start → booking submit (with 409s tracked separately)

### Metrics

| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| Chef detail page views | +15% vs control | Baseline | Availability signal attracts intent |
| Booking form starts | +10% vs control | Baseline | Indicates higher-intent traffic |
| 409 conflict rate | Track separately | ~100% | Will remain high until MAI-2376 |
| Inquiries submitted (fallback) | +20% | Unknown | Users who can't book may inquire instead |

### SQL to Query Results

```sql
-- Availability badge impact on click-through
SELECT 
  date_trunc('day', created_at) as day,
  COUNT(*) as chef_detail_views
FROM page_views
WHERE page LIKE '/chefs/%'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY day
ORDER BY day;
```

---

## Dependencies & Blockers

| Item | Status | Notes |
|------|--------|-------|
| GET /api/availability endpoint | To implement | Returns per-chef slot counts |
| Chef profiles data | ✅ Working | Already fetches from Supabase |
| MAI-2376 (chef availability) | P0 Blocker | Resolving this makes badges meaningful |
| MAI-2349 (booking form A/B) | Running | Coordinates with this test |

---

## Acceptance Criteria

| Criteria | Status | Notes |
|----------|--------|-------|
| Chef cards show availability badge | To implement | Based on `availability` table |
| Chef detail booking sidebar shows availability messaging | To implement | Depends on MAI-2376 |
| A/B test infrastructure in place | To implement | Cookie-based like MAI-2383 |
| Analytics track badge variant clicks | To implement | POST to `/api/analytics/availability-badge-click` |

---

## Next Steps

1. **Implement** GET /api/availability endpoint
2. **Update** chef listing page with availability badges
3. **Update** chef detail page with availability-aware sidebar
4. **Add** A/B test infrastructure for badge variant
5. **Track** 409 conflict rate separately to measure booking funnel health

---

## Related Issues

- MAI-2383: Hero CTA A/B test (completed)
- MAI-2379: Waitlist engagement sequence (completed)
- MAI-2395: Inline waitlist CTA (completed)
- MAI-2376: Chef availability setup UI (P0, unblocks booking flow)
- MAI-2349: Booking form A/B test (in progress)

---

*Generated by Growth Marketer — MAI-2410*