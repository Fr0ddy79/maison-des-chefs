# GROWTH-MAI-2913: Real Social Proof Toast — Live Booking Activity

**Created:** 2026-06-12 04:00 America/New_York
**Status:** Todo
**Type:** Growth Optimization

## Context

**Funnel Stage:** Acquisition / early consideration (homepage + `/chefs`)
**Problem identified:** The `SocialProofToast` component on homepage and `/chefs` page cycles through hardcoded static messages (e.g., "🥂 A dinner was just booked for this weekend") that are identical for all visitors and offer zero personalization. These fake notifications are easily spotted by repeat visitors and erode trust rather than build it. Meanwhile, the platform has real booking/inquiry data in the `inquiries` table that can power genuinely credible social proof.

**What exists:**
- `SocialProofToast` component with hardcoded `MESSAGES` arrays per page
- `inquiries` table in Supabase with `created_at`, `chef_id`, `inquiry_date`, `guest_count` columns
- No API endpoint to fetch recent booking activity for toast display
- Toast shows on homepage (4s delay) and `/chefs` (3s delay) — highest-traffic pages

**Gap:** Social proof toast exists but is static and fake-feeling. Real booking activity data exists but is unused. Replacing hardcoded messages with real recent activity creates credible, personalized urgency that increases trust and conversion.

---

## What to Implement

### 1. New API endpoint: `GET /api/social-proof/recent-activity`

Returns recent inquiry/booking activity for social proof toast.

**Response shape:**
```json
{
  "activities": [
    {
      "id": "inquiry_123",
      "chef_name": "Chef Antoine",
      "city": "Montreal",
      "inquiry_date": "2026-06-14",
      "guest_count": 6,
      "service_type": "prix-fixe",
      "created_at": "2026-06-12T08:30:00Z"
    }
  ]
}
```

**Logic:**
- Fetch last 7 days of inquiries from `inquiries` table
- Join with `chef_profiles` to get chef names
- Exclude entries with `null` chef_id or email (shouldn't happen but guard)
- Deduplicate by chef (only show one activity per chef)
- Sort by `created_at` descending, take latest 5
- Map `service_type` from the inquiry's service relationship or fallback to generic

**File:** `src/app/api/social-proof/recent-activity/route.ts`

---

### 2. Extend `SocialProofToast` to use real data with static fallback

**Changes to `src/components/SocialProofToast.tsx`:**

1. Fetch from `/api/social-proof/recent-activity` on mount (with 2s timeout — non-blocking)
2. If fetch succeeds → use real activity messages
3. If fetch fails or times out → fall back to existing static `MESSAGES`
4. Never show loading state — toast should appear on schedule regardless
5. Compose messages from real data using templates:

| Template | When |
|----------|------|
| `"🍽️ {guests} guests booked Chef {name} for {date}"` | Has exact data |
| `"🥂 Someone booked Chef {name} for this weekend"` | Date is within 7 days |
| `"👨‍🍳 Chef {name} just received a new inquiry"` | Fallback generic |

6. SessionStorage key `mdc_toast_dismissed` still respected (per session, not per message)

**Data freshness:** Re-fetch every 60 seconds while page is active (use `setInterval`). If new activity appears, show it on next toast cycle (toast cycles through messages, so new data will appear naturally on next cycle).

**No change to toast position, styling, timing, or dismissal behavior.**

---

### 3. Optional: Extend to `/chefs` page toast

The `/chefs` page already renders `<SocialProofToast page="browse" delayMs={3000} />`. No component change needed — the API fetch will work for both pages.

---

## Why This Works

1. **Genuine credibility** — Real bookings, real dates, real chef names. Users can verify nothing (the activity happened) but the pattern is real, not fabricated.
2. **Freshness creates urgency** — Static messages repeat forever. Real data changes continuously, creating genuine recency signal ("this is happening right now").
3. **Zero design change** — Same toast position, same timing, same style. Only the content changes.
4. **Non-blocking** — 2s fetch timeout means toast never waits for data. If fetch fails, static fallback kicks in seamlessly.
5. **Low effort** — One new API route + small update to existing component (~50 lines total).

---

## Experiment Plan

### Phase 1: Measure (7–14 days)

- **Primary metric:** Homepage `/book` conversion rate (home → `/book` pageviews)
- **Primary metric:** `/chefs` → `/book` conversion rate
- **Secondary metric:** SocialProofToast click-through (if CTA added to toast — not in this version)
- **Secondary metric:** Toast dismiss rate (sessionStorage `mdc_toast_dismissed` rate)
- **Guardrail metric:** Homepage bounce rate (ensure toast doesn't annoy users and increase bounces)

**Query to track real activity:**
```sql
SELECT COUNT(*) as total_inquiries,
       COUNT(DISTINCT chef_id) as unique_chefs,
       DATE(created_at) as day
FROM inquiries
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY day
ORDER BY day DESC;
```

**To verify real data is flowing:**
- Check browser network tab for `/api/social-proof/recent-activity` calls
- Check that toast messages contain chef names from real inquiries

### Phase 2: Iterate

- If real-activity toast shows >10% lift in home→book conversion → consider adding a CTA to the toast ("Book now →" link)
- If toast is dismissed more often → reduce message frequency or increase delay
- If no lift observed → test combining real messages with static messages (alternate)

---

## Funnel Stage Coverage

| Stage | Existing | New Addition |
|-------|----------|--------------|
| **Acquisition** | Hero CTA (4 variants), SEO schema | **Real Social Proof Toast** |
| **Consideration** | Browse by Cuisine, Sticky CTAs, Scarcity Badges | Real Social Proof Toast |
| **Conversion** | Booking form A/B test | — |
| **Post-Conversion** | Confirmation trust signals | — |

---

## Differentiation from Previous Growth Work

| Experiment | Funnel Stage | Status |
|------------|--------------|--------|
| Hero CTA A/B (4 variants) | Top (acquisition) | Running |
| Booking Form A/B (3 vs 4 steps) | Mid (conversion) | Running |
| Schema.org markup | SEO | Done |
| Browse by Cuisine | Mid (consideration) | Done |
| Sticky CTA Bar (`/chefs`) | Mid (consideration) | Done |
| Chef Profile Sticky CTA (mobile) | Mid (consideration) | Done |
| Compare Page Summary CTA | Mid (consideration) | Todo |
| Scarcity Badges on /chefs | Mid (consideration) | Todo |
| Confirmation Trust Reinforcement | Post-conversion | Todo |
| **Real Social Proof Toast** | Top (acquisition) | **Todo** |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Toast shows no data if API is slow | 2s timeout, static fallback if timeout hits — toast always shows something |
| Very few inquiries in DB → toast shows stale or empty data | Fallback to static messages if `activities.length === 0`; fallback also available while data loads |
| Privacy concern (showing real booking activity) | Only show chef name + city + guest count + date — no email, no personal details |
| Users see same toast repeatedly on return visits | sessionStorage dismissal is per-session; new session = fresh toast cycle |
| Homepage performance impact | API fetch is async, non-blocking; 2s timeout prevents slow DB from blocking toast |

---

## Implementation Checklist

- [ ] Create `src/app/api/social-proof/recent-activity/route.ts` (~50 lines)
  - Query `inquiries` table for last 7 days
  - Join with `chef_profiles` for chef name
  - Deduplicate by chef, sort by `created_at` desc, take 5
  - Return `{ activities: [...] }` or `{ activities: [] }` with appropriate HTTP status
- [ ] Update `src/components/SocialProofToast.tsx` (~40 lines)
  - Add `useEffect` to fetch from API on mount with 2s AbortController timeout
  - If response valid and non-empty → use real data messages
  - If fetch fails or empty → use existing static `MESSAGES`
  - Re-fetch every 60s via `setInterval`
- [ ] Build passes with no errors
- [ ] Commit to main branch

---

## Summary

**Growth idea:** Replace the `SocialProofToast` component's hardcoded static messages with real recent booking/inquiry data from the `inquiries` table, surfaced via a new API endpoint. Toast shows genuine recent activity ("Chef Antoine received a booking for 6 guests on Saturday") instead of fake static messages, creating credible urgency and trust at the top of the funnel.

**Expected impact:** +5–10% increase in homepage → `/book` conversion rate; measurable via existing pageview analytics. Toast becomes a credible social proof signal rather than a cosmetic feature.

**Effort:** Low — one API route + small component update, ~90 lines total, no design changes.

**Owner:** Growth Marketer → Backend if API endpoint needed (Frontend for toast update)

---

*Generated by Growth Marketer — MAI-2913*