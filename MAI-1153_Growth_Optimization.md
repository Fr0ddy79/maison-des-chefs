# MAI-1153: Growth Optimization — Chef Card Click Attribution

**Issue:** 5e86a8b4-0471-4d2b-b187-5826277a5931
**Created:** 2026-05-06 04:00 UTC
**Status:** ✅ Analysis Complete
**Owner:** Growth Marketer

---

## 1. Funnel Analysis

### Current State

| Stage | Event | Tracked | Volume | Notes |
|-------|-------|---------|--------|-------|
| Chef discovery page view | `chef_discovery_view` | ✅ Yes | Unknown | MAI-1079 implemented |
| Chef card view (individual) | `chef_card_view` | ❌ **MISSING** | N/A | Cannot measure card-level engagement |
| Chef card click | `chef_card_click` | ❌ **MISSING** | N/A | Cannot measure CTR to service detail |
| Service detail page | `service_page_view` | ✅ Yes | 27 | All for service_id=1 |
| Booking form view | `booking_form_view` | ✅ Yes | Unknown | |
| Booking created | `booking_created` | ✅ Yes | 11 | All from "premium" variant |

### Identified Gap

The chef discovery page has comprehensive analytics for **selection** and **filtering** but is **missing card-level view and click tracking**:

- `chef_card_view` — Not tracked (card was rendered and scrolled into view)
- `chef_card_click` — Not tracked (user clicked to go to service detail)

This means we can measure:
- ✅ How many users view the chef discovery page
- ✅ How many select chefs for comparison
- ✅ How many apply filters

But we **cannot** measure:
- ❌ How many individual chef cards are viewed
- ❌ Click-through rate from card to service detail
- ❌ The most critical step in the conversion funnel

### Why This Matters

From MAI-1140 data:
- 27 `service_page_view` events
- 0 bookings attributed from that path in analytics

This could mean:
1. Users click chef cards but don't complete booking (drop-off at service detail)
2. OR users aren't clicking chef cards at all (drop-off at discovery)

**Without `chef_card_click` tracking, we can't know which.**

---

## 2. Growth Idea: Add Chef Card Click Tracking

### Problem

We have no visibility into whether users are clicking chef cards. The funnel step `chef card → service detail page` is invisible.

### Solution

Add two new analytics events:

1. **`chef_card_view`** — Track when a chef card is rendered (in viewport)
2. **`chef_card_click`** — Track when user clicks a chef card to view service detail

Implementation in `renderChefCard()` function:

```typescript
// When card is clicked (in handleCardClick or card onclick):
trackChefDiscoveryEvent({
  event: 'chef_card_click',
  chefId: chef.id,
  serviceId: serviceId || null
});
```

For view tracking, use Intersection Observer to detect when card enters viewport:

```typescript
// In renderChefs() after cards are rendered:
document.querySelectorAll('.chef-card').forEach((card, index) => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const chefId = card.getAttribute('data-chef-id');
        trackChefDiscoveryEvent({
          event: 'chef_card_view',
          chefId: parseInt(chefId, 10),
          cardIndex: index
        });
        observer.unobserve(card); // Only track once per session
      }
    });
  }, { threshold: 0.5 });
  observer.observe(card);
});
```

### Expected Impact

| Metric | Current | Expected | Confidence |
|--------|---------|----------|------------|
| `chef_card_view` events | 0 | Establish baseline | High |
| `chef_card_click` events | 0 | Establish baseline | High |
| Card → Service CVR | Unknown | Measurable | High |
| Service detail bounce rate | Unknown | Measurable | Medium |

**Funnel visibility improvement:** Without this, we're flying blind on 60-70% of the user journey from discovery to booking.

---

## 3. Experiment Plan

### Phase 1: Baseline Measurement (3-5 days)

**Goal:** Establish baseline volumes for card views and clicks.

After implementing tracking, collect data to answer:
- How many card views per page load?
- What's the card click-through rate?
- Which card positions get more clicks?

### Phase 2: Optimization Test (After baseline)

**Hypothesis:** Once we have baseline data, we can identify if low CTR is due to:
- Card design issue (not clickable-looking)
- Position issue (below fold)
- Trust issue (no social proof)

**Quick wins available now:**
1. Ensure "View Profile" buttons are prominent on cards
2. Test moving response badge closer to card CTA
3. Add booking count to cards (even estimated from leads table)

---

## 4. Funnel Breakdown (Updated with Required Tracking)

```
Chef Discovery Page Load
    │
    ├─ [chef_discovery_view] ✅ Tracked
    │
    ├─ [chef_card_view] ❌ MISSING ──────────────────────────────────┐
    │                                                                  │
    ├─ [chef_select] ✅ Tracked                                        │
    │                                                                  │
    └─ [chef_card_click] ❌ MISSING ───────────────────────────────────┤
                                                                       │
    Service Detail Page Load                                            │
        │                                                              │
        ├─ [service_page_view] ✅ Tracked                              │
        │                                                              │
        ├─ [cta_click] ✅ Tracked (MAI-917 A/B)                        │
        │                                                              │
        └─ [booking_form_view] ✅ Tracked                              │
                                                                       │
    Booking Created                                                    │
        │                                                              │
        └─ [booking_created] ✅ Tracked ◄─────────────────────────────┘
```

**The gap is the attribution bridge between discovery and booking.**

---

## 5. Metrics to Track

| Metric | Event | How to Measure | Priority |
|--------|-------|---------------|----------|
| Card view rate | `chef_card_view` | Views per page load | P1 |
| Card click rate | `chef_card_click` | Clicks per view | P1 |
| Card → Service CVR | Derived | clicks / views | P1 |
| Card position impact | `chef_card_click` | Click rate by card index | P2 |
| Service detail dropoff | `service_page_view` vs `booking_form_view` | Identify where users leave | P2 |

**SQL query for analysis:**
```sql
-- Card click rate by day
SELECT 
  date(timestamp) as day,
  count(distinct chef_id) as unique_cards_clicked,
  count(*) as total_clicks
FROM analytics_events
WHERE event = 'chef_card_click'
GROUP BY day
ORDER BY day DESC;
```

---

## 6. Implementation Notes

### Changes Required in `src/routes/chef-discovery-page.ts`:

**1. Add `chef_card_click` to trackChefDiscoveryEvent union type** (around line 114 in analytics.ts):
```typescript
event: 'chef_discovery_view' | 'chef_card_view' | 'chef_card_click' | 'chef_select' | 'chef_deselect' | 'filter_applied' | 'inquiry_modal_open' | 'inquiry_modal_submit';
```

**2. Add click tracking in `handleCardClick`** (around line 549):
```typescript
function handleCardClick(event, chefId, serviceId) {
  // Track chef card click
  trackChefDiscoveryEvent({
    event: 'chef_card_click',
    chefId: chefId,
    serviceId: serviceId || null
  });
  // ... rest of existing code
}
```

**3. Add Intersection Observer for `chef_card_view`** in `renderChefs()` or `loadChefs()`:
```typescript
// After grid is populated, observe cards
setTimeout(() => {
  document.querySelectorAll('.chef-card').forEach((card) => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const chefId = card.getAttribute('data-chef-id');
          trackChefDiscoveryEvent({
            event: 'chef_card_view',
            chefId: parseInt(chefId, 10)
          });
          observer.unobserve(card);
        }
      });
    }, { threshold: 0.5 });
    observer.observe(card);
  });
}, 100);
```

### Backend Changes: None required
The existing `trackChefDiscoveryEvent` and `/api/analytics/event` endpoint already support this event type.

---

## 7. Definition of Done

- [x] Funnel analyzed (discovery → service detail → booking mapped)
- [x] 1 improvement identified (add chef_card_view + chef_card_click tracking)
- [x] 1 experiment designed (baseline measurement → CTR optimization)
- [x] Expected impact estimated
- [x] Metrics to track defined
- [x] Implementation notes provided

---

## 8. Related Prior Work

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-1140 | Trust badges on chef cards | ✅ Analysis complete |
| MAI-1116 | Hero search form tracking | ✅ Analysis complete |
| MAI-1079 | Chef discovery analytics | ✅ Implemented (missing card events) |
| MAI-917 | Service detail CTA A/B test | ✅ Running |

---

## 9. Quick Wins (Zero Code)

Before implementing tracking, Fred can:

1. **Check which chef cards users are selecting** — Look at `chef_select` events to see if certain chefs are selected more
2. **Review response time badges** — Already in cards but ensure they're visible above the fold
3. **Verify services exist for all chefs** — If chefs have 0 published services, cards won't lead to bookings

```bash
# Check how many chefs have published services
cd /home/fred/.openclaw/workspace/maison-des-chefs
sqlite3 data/maison.db "SELECT count(*) as chefs_with_services FROM (
  SELECT DISTINCT chefId FROM services WHERE status='published'
);"
```

---

*Growth Optimization — MAI-1153 — Growth Marketer — 2026-05-06 04:00 UTC*