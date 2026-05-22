# Product Spec: Quick Opportunity Scan — Growth + Revenue Levers
**Issue:** MAI-1651  
**Created:** 2026-05-16  
**Owner:** Product Manager  
**Timebox:** 30 minutes  

---

## Problem Statement

The platform has critical infrastructure blockers (RESEND email + Vercel/Stripe deployment) that lock out revenue. The CEO needs 1-2 quick wins identified that can ship within 24 hours without requiring Fred's keys.

Analysis of recent Growth Marketer outputs (MAI-1630, MAI-1641) and current funnel state reveals two actionable opportunities.

---

## Background

### Funnel State (as of 2026-05-16 10:00 UTC)
- **8 leads** created total → **1 converted** → **7 expired** → **0 confirmed** → **0 completed**
- **0/8 chef response rate** (0%)
- **Infrastructure blocked:** RESEND_API_KEY missing (email dead), Vercel OIDC expired (deploys dead), Stripe keys missing (payment dead)
- **Frontend blocked:** JS syntax error in leads page breaks all lead card rendering

### What MAI-1630 Found
Hero search form (highest-intent homepage entry) only logs to `console.log` — no analytics event sent. No conversion funnel visibility.

### What MAI-1641 Found
Critical bug: `DEFAULT_TEMPLATES` array in `chef-leads-page.ts` line ~167 has double-comma `,,` syntax error. Breaks entire leads page JS (lead cards, template picker, Accept/Decline/Info buttons, modal interactions).

---

## Opportunity 1: Fix Lead Page JS Syntax Error

**Severity:** 🔴 HIGH — zero chef response capability  
**Effort:** ~5 min  
**Owner:** FE (any engineer)  
**Ships:** Immediately (no infrastructure keys needed)

### What
Remove one extra comma in `src/routes/chef-leads-page.ts` line ~167.

**Current (broken):**
```javascript
{"id":"counter_date","label":"Different Date","text":"..."},,
{"id":"accept_menu","label":"Accept + Menu","text":"..."}
```

**Fixed (1 char deletion):**
```javascript
{"id":"counter_date","label":"Different Date","text":"..."},
{"id":"accept_menu","label":"Accept + Menu","text":"..."}
```

### Why It Matters
Currently the chef leads page is completely broken for all users. Every chef sees a broken page with no functional buttons. Fixing this is a prerequisite for any lead response measurement.

### Scope
- **In:** Fix the `,,` → `,` in DEFAULT_TEMPLATES array
- **Out:** No new features, no other files

### Acceptance Criteria
- [ ] `npm run build` passes with no TS errors
- [ ] Lead cards render on chef-leads-page
- [ ] Template picker opens in modal
- [ ] Accept/Decline/Info buttons respond on click

### One-Line Next Action
FE: Delete one comma in `src/routes/chef-leads-page.ts` line 167, then `npm run build` to verify

---

## Opportunity 2: Hero Search Analytics Tracking

**Effort:** ~15-20 min  
**Owner:** FE  
**Ships:** Within 24h (no backend/infrastructure needed)

### What
Replace `console.log` in the hero search form submit handler with a `sendBeacon` call to `/api/analytics/event` — capturing search submission as a measurable event.

### Why It Matters
The hero search form is the highest-intent entry point on the homepage. Without tracking, there's zero visibility into:
- Search submission rate (baseline: unknown)
- Search → inquiry → booking conversion path
- Field-level abandonment (which field causes drop-off)
- A/B testing capability for form optimizations

### Scope
- **In:** Add `sendBeacon` analytics event on hero search form submit in `pages.ts` (~line 2197)
- **Out:** No backend changes, no new API endpoints

### Implementation Required
**File:** `src/routes/pages.ts` ~line 2197

Replace:
```javascript
console.log('[EVENT] homepage_search_submitted', {...});
```

With:
```javascript
const payload = JSON.stringify({
  event: 'homepage_search_submitted',
  cuisine: formData.get('cuisine'),
  guests: formData.get('guests'),
  date: formData.get('date'),
  eventType: formData.get('type'),
  timestamp: Date.now()
});
navigator.sendBeacon('/api/analytics/event', payload);
```

**Already exists:** `/api/analytics/event` endpoint in `src/routes/analytics.ts`

### Acceptance Criteria
- [ ] Hero search form submit fires `sendBeacon` to `/api/analytics/event`
- [ ] `npm run build` passes
- [ ] Event is visible in analytics (check via DB or logs)

### One-Line Next Action
FE: Replace console.log with sendBeacon in pages.ts hero-search-form submit handler

---

## Summary

| # | Opportunity | Impact | Effort | Owner | Ships |
|---|-------------|--------|--------|-------|-------|
| 1 | Fix JS syntax error in leads page | Unblock chef response capability | 5 min | FE | Immediately |
| 2 | Hero search analytics tracking | Enable conversion funnel measurement | 15-20 min | FE | Within 24h |

**Both ship without Fred's keys.** Opportunity 1 is prerequisite for any lead response measurement. Opportunity 2 enables the growth measurement loop.

---

## Open Questions
1. Is MAI-1650 (the unblocker for template TS errors) being worked? The syntax fix here is a subset.
2. Should hero search analytics also capture field-focus/abandonment events (MAI-1630 suggestion)? Scope creep risk — recommend starting with submit event only.
3. What's the current analytics DB schema? Need to confirm event payload fields.