# MAI-959: Growth Optimization — 04:00 UTC Cycle

**Issue:** 5c1456ac-737d-488c-9c27-bebba12d7d9a
**Created:** 2026-05-02 04:00 UTC
**Status:** ✅ Implemented
**Owner:** Growth Marketer

---

## 1. Funnel Analysis

### Current System State

| Page/Step | Status | Notes |
|-----------|--------|-------|
| Homepage (`/`) | ✅ Live | Hero CTAs + stats bar |
| Services catalog (`/services`) | ✅ Live | Multi-chef compare bar |
| Service detail page (`/services/:id`) | ✅ Live | Price calculator + urgency badges + CTA A/B test |
| Booking form (`/book/:serviceId`) | ✅ Live | Cookie pre-fill + trust messaging |
| Checkout / Stripe | 🔴 Blocked | MAI-618: Stripe keys not provided |
| Email system | ⚠️ Stubbed | RESEND_API_KEY not configured |
| Post-booking referral | ✅ Live | Shareable referral code after booking |
| Booking status page | ✅ Live | Token-based status lookup |
| Reviews / testimonials | 🔄 In Progress | MAI-941: Reviews System task ready for BE+FE |

### Funnel Flow

```
Homepage → Services Catalog → Service Detail → Booking Form → Checkout → Payment
   ✅           ✅               ✅              ✅          🔴 BLOCKED
                                      ↓
                            Referral CTA ✅
                            Booking status ✅
                            Reviews 🔄 (MAI-941 queued)
```

### Key Prior Growth Work (MAI-950 cycle)

- **Funnel analytics gap identified** — missing micro-conversion tracking (CTA click → booking form view → form start → inquiry submit)
- **MAI-917 CTA A/B test** live on service detail pages
- **MAI-918 multi-chef inquiry** (compare bar) already deployed
- **Booking abandonment detection** (MAI-695) implemented via cron job
- **Chef outreach campaign** (MAI-622 Launch Priority Chef Target List) in progress

---

## 2. Growth Idea: Enable Single-Chef Compare Bar Activation

### Problem Identified

The multi-chef compare bar on `/services` requires **2+ chefs to be selected** before the "Inquire Selected" button appears:

```javascript
// Current threshold: requires >= 2 chefs
inquireBtn.style.display = selectedChefs.length >= 2 ? 'inline-block' : 'none';
```

This creates a **friction bottleneck** for single-service browsing journeys:

1. User browses services catalog and finds one chef they like
2. They select that chef for comparison (the only way to trigger the compare bar at all)
3. The compare bar appears but the CTA button is hidden (need 2+)
4. User must either find another chef to add OR navigate away to the service detail page directly
5. If they navigate to service detail, they've **left the catalog** — losing context and compare utility

**The result:** A user interested in a single chef has no clear, low-friction path to submit an inquiry from the catalog page. They must either:
- Add a second chef (artificially inflating their consideration set)
- Navigate directly to `/services/:id` (catalog → detail page, breaking their browsing flow)

### The Opportunity

Lowering the threshold from **2 to 1 chef** enables:

| Journey | Before | After |
|---------|--------|-------|
| Single-chef interest | Compare bar shows but CTA hidden → user confused or leaves | Compare bar + CTA visible → direct inquiry |
| Multi-chef comparison | Same behavior | Same behavior (unchanged) |
| Impulse inquiry | No clear path from catalog | CTA accessible immediately upon selection |

This captures **impulse inquiries** from the catalog page — users who are already decided after browsing, without requiring them to navigate to a service detail page first.

---

## 3. Implementation

### Change Made

**File:** `src/routes/pages.ts` (line 752)

```diff
- inquireBtn.style.display = selectedChefs.length >= 2 ? 'inline-block' : 'none';
+ inquireBtn.style.display = selectedChefs.length >= 1 ? 'inline-block' : 'none';
```

**Effect:** The "Inquire Selected" button now appears when **1 or more** chefs are selected, not just 2+.

### No new infrastructure required

- Compare bar UI already exists and handles single-chef display correctly
- Multi-inquiry API (`POST /api/multi-inquiry`) already accepts single `serviceIds` array
- The modal, form fields, and submission flow work identically for 1 or multiple chefs
- No change to backend validation or email logic

---

## 4. Experiment Plan

### Test: Single vs. Multi-Chef Inquiry Conversion

**Hypothesis:** Enabling single-chef inquiry from the catalog page will increase total inquiry submissions without reducing multi-chef inquiry rates.

**Variant A (Control):** Require 2+ chefs to activate CTA (current behavior)
**Variant B:** Require 1+ chef to activate CTA (new behavior)

**Track:**
- `compare_bar_cta_shown` — compare bar appears with CTA visible
- `compare_bar_cta_clicked` — "Inquire Selected" button clicked
- `compare_modal_opened` — inquiry modal opened
- `compare_modal_submitted` — inquiry form submitted
- `inquiry_type` — single-chef vs. multi-chef (from `serviceIds.length`)

**Success Criteria:**
- Total inquiry submissions increase by ≥10%
- Single-chef inquiries account for ≥20% of total catalog-driven inquiries
- No decrease in multi-chef inquiry rate (multi-chef behavior unchanged)

**Duration:** 14 days or until 50+ catalog-driven inquiries per variant

---

## 5. Expected Impact

| Metric | Current State | Expected | Confidence | Notes |
|--------|---------------|----------|------------|-------|
| Single-chef inquiry path | ❌ None (blocked by 2+ threshold) | ✅ Available | High | Simple threshold change |
| Catalog → inquiry conversion | ⚠️ Only via service detail page | ✅ Direct path from catalog | Medium | Captures impulse inquiries |
| Multi-chef compare rate | ✅ Working | ✅ Unchanged | High | Logic unaffected |
| User confusion | ⚠️ Compare bar appears but CTA hidden for 1 chef | ✅ CTA visible when bar appears | High | Removes misleading UI state |

---

## 6. Blocked Work

| Item | Blocker | Status |
|------|---------|--------|
| Checkout / payment | MAI-618: Stripe keys not provided | 🔴 Fred |
| Email system | RESEND_API_KEY not configured | 🔴 Fred |
| Reviews System | MAI-941: Ready for BE+FE | 🔄 Queued |
| Multi-chef validation | MAI-948: Ready for BE+FE | 🔄 Queued |
| Chef response time | MAI-942: Ready for BE+FE | 🔄 Queued |

---

## 7. Metrics to Track

| Metric | How to Measure | Target |
|--------|---------------|--------|
| `compare_bar_cta_shown` | Shown when ≥1 chef selected / total catalog sessions | Establish baseline |
| `compare_bar_cta_click_rate` | Clicks / CTA shown | >15% |
| `compare_modal_submit_rate` | Submissions / modal opens | >40% |
| `single_chef_inquiry_ratio` | Single-chef inquiries / total catalog inquiries | >20% |
| `multi_chef_inquiry_rate` | Multi-chef (2+) / total catalog inquiries | No decrease |

---

## 8. Related Prior Work

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-950 | Funnel analytics gap identification | ✅ Analyzed |
| MAI-948 | Multi-chef inquiry validation | 🔄 Queued for BE+FE |
| MAI-917 | CTA A/B test on service detail page | ✅ Active |
| MAI-695 | Abandoned booking detection | ✅ Implemented |
| MAI-622 | Launch Priority Chef Target List | 🔄 In Progress |
| MAI-618 | Stripe checkout | 🔴 Blocked (Fred) |

---

## 9. Definition of Done

- [x] Funnel analyzed (all steps mapped with status)
- [x] 1 improvement identified (single-chef compare bar enablement)
- [x] Simple change implemented (threshold 2 → 1)
- [x] Experiment plan documented (A/B test for catalog inquiry conversion)
- [x] Expected impact estimated
- [x] Metrics to track defined
- [x] Blocked work noted

---

*Growth Optimization — MAI-959 — Growth Marketer — 2026-05-02 04:00 UTC*