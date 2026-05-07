# MAI-942: Chef Lead Response Time Display

## Status
**SPEC_DEFINED** — moved from `in_progress` (stuck since May 3, no code)

---

## What This Feature Is

**"Chef Lead Response Time Display"** means showing chefs their own average response time to booking inquiries on their dashboard, and optionally surfacing it on their public chef profile.

The backend already has partial implementation (see below), but the data capture is broken.

---

## What Already Exists

The codebase already has:
- `firstResponseAt` column on `leads` table — **never written to**
- `firstChefActionAt` column on `leads` table — **correctly set** when chef sends quote
- `calculate_response_time_tier()` function in `src/api/chefs.ts` and `src/api/services.ts`
- Response time tier shown on public chef profile (`/chef/:id`) — but always `null` because `firstResponseAt` is never set
- `responseTimeTier` attached to service search results

**The data display pipeline exists end-to-end. The data source is broken.**

---

## Root Cause

In `chef-leads.ts` POST `/respond`, the code sets:
```typescript
firstChefActionAt: lead.firstChefActionAt ?? now,
```

But it does **not** set `firstResponseAt`. The `calculate_response_time_tier()` function reads `firstResponseAt`, which remains NULL for all leads, so every chef always appears as "New chef" (no avg response time).

---

## Metric Definition

**Metric: Average Response Time**
- Definition: Time between `leads.created_at` and `leads.firstResponseAt`
- Window: Last 30 days of leads per chef
- Tier thresholds:
  - Fast: < 60 min
  - Medium: 60–240 min (< 4h)
  - Slow: 240–1440 min (< 24h)
  - New chef: < 3 leads in window → no tier assigned
- Display: Avg response time in minutes (e.g., "47 min") for chefs with ≥3 leads

---

## Data Source

**Primary:** `leads` table
- `createdAt` — lead creation timestamp (already set)
- `firstResponseAt` — **needs to be set** when chef first responds to a lead

**Fix required:** Set `firstResponseAt = NOW()` in `POST /api/chef/leads/:leadId/respond` when transitioning status from `new` to `responded`.

Also set `responseWithinSla = true` if response was within 24 hours (useful for SLA tracking).

---

## Where Displayed

1. **Chef Dashboard** (`/chef/leads`): Add a summary card showing:
   - Avg response time (e.g., "47 min avg")
   - Tier badge (Fast/Medium/Slow/New chef)
   - Count of leads responded to in last 30 days

2. **Public Chef Profile** (`/chef/:id`): Already implemented — shows `avgResponseMinutes` and `response_time_tier`. Will populate correctly once data fix is in place.

---

## Scope

### In
- Fix `POST /api/chef/leads/:leadId/respond` to set `firstResponseAt` and `responseWithinSla`
- Update `/chef/leads` page to show response time summary card
- Keep public profile display (already exists, will auto-populate)

### Out
- No changes to email alerting (MAI-581 already covers SLA alerts)
- No diner-facing display of chef response time in v1
- No tiered SLA by pricing plan (defer to v2)

---

## Acceptance Criteria

| # | Criterion | Testable Condition |
|---|-----------|-------------------|
| AC1 | `firstResponseAt` is set when chef sends first quote | POST `/respond` on a `new` lead sets `firstResponseAt` to current timestamp |
| AC2 | `responseWithinSla` is set based on 24h threshold | If `firstResponseAt - createdAt < 24h`, set `responseWithinSla = true` |
| AC3 | Chef dashboard shows avg response time card | `/chef/leads` displays avg response minutes for chefs with ≥3 responded leads in last 30 days |
| AC4 | Chef dashboard shows tier badge | Card shows "Fast/Medium/Slow/New chef" badge based on tier |
| AC5 | Public profile shows avg response time | GET `/chef/:id` returns `avgResponseMinutes` and `response_time_tier` for chefs with ≥3 leads |
| AC6 | Tier thresholds enforced correctly | Avg <60m = Fast, 60-240m = Medium, 240-1440m = Slow, else New chef |
| AC7 | Only counted leads are those with `firstResponseAt` set | `calculate_response_time_tier()` correctly filters to leads with non-null `firstResponseAt` |
| AC8 | No regression on existing lead flow | Existing `firstChefActionAt` behavior preserved; respond endpoint still sets all other fields |

---

## Implementation Plan

### Step 1: Fix data capture (backend)
**File:** `src/api/chef-leads.ts`
**Change:** In `POST /respond`, add `firstResponseAt` and `responseWithinSla` to the update set:
```typescript
const responseMinutes = now.getTime() - new Date(lead.createdAt).getTime() / (1000 * 60);
const responseWithinSla = responseMinutes < 1440; // 24h in minutes

db.update(leads).set({
  // ... existing fields ...
  firstResponseAt: lead.firstResponseAt ?? now,
  responseWithinSla: lead.firstResponseAt ? lead.responseWithinSla : (lead.firstResponseAt ?? responseWithinSla),
} as Record<string, unknown>)
```
Actually simpler: set `firstResponseAt` only if not already set (first response wins), and compute `responseWithinSla` from that.

### Step 2: Add summary card to chef leads page
**File:** `src/routes/chef-leads-page.ts`
**Change:** Fetch `/api/chef/response-stats` (new endpoint) or compute client-side from lead list. Add a stats card showing avg response time + tier.

### Step 3: Add response stats API (optional optimization)
If needed, add a lightweight `GET /api/chef/response-stats` endpoint that returns `{ avgResponseMinutes, tier, leadCount }` without requiring a full leads query.

---

## Open Questions

| # | Question | Decision |
|---|----------|----------|
| OQ1 | Should we track response time for leads that are converted vs lost? | **Yes** — any lead with a response counts, regardless of outcome |
| OQ2 | Should first response time be when chef first acts OR when quote is sent? | **First chef action** (`firstChefActionAt`) — the simpler trigger. If needed, we can distinguish later. |
| OQ3 | Show response time on diner-facing search results? | **No — deferred to v2** — requires UX review and diner trust signals |

---

## Dependencies

- `MAI-581` (Lead Response SLA Alert) — related but separate concern; no direct dependency
- `MAI-823` (referral tracking) — unrelated
- `leads` table schema — confirmed existing with `firstResponseAt`, `firstChefActionAt`, `responseWithinSla` fields

---

## Priority

**P2 — Medium** — High value for chef trust and diner decision-making. Fixes a broken data pipeline.

---

## Status History

- May 3: moved to `in_progress` with no implementation
- May 6: Spec defined. Found root cause — data capture broken, display pipeline intact.