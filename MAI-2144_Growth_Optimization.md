# Growth Optimization — Conversion Funnel Analysis
**Issue:** MAI-2144  
**Owner:** Growth Marketer  
**Date:** 2026-05-27 09:00 UTC  
**Context:** Email dead (RESEND missing), SMS Marcel blocked (no #), Stripe blocked (Fred) → focus on on-site optimizations only

---

## 1. Funnel Analysis

### Current Funnel Stages

```
Homepage → Service Search → Service Detail → Booking Form → Lead Created → [blocked: chef response → payment → complete]
                                              ↑________________________| 
                                              (auth panel + dense booking card friction)
```

### Stage-by-Stage Drop-off

| Stage | Volume Driver | Drop-off Point | Estimated Loss |
|-------|-------------|----------------|---------------|
| Homepage → Services | Organic / referral | Low urgency hero CTA | ~60% never click CTA |
| Services → Service Detail | Search / browse | Results page or CTA click | ~70-80% browse without clicking |
| Service Detail → Booking Form | "Request Your Date" CTA | Dense booking card (7 elements) | ~85-92% don't reach form |
| Booking Form → Submit | Auth panel + form friction | Auth panel shown to returning diners | ~25-35% abandon at auth |
| Lead Created → Booking Accepted | Chef Marcel responds | 48h SLA passes, no email delivery | 87.5% leads expire |

### What's Broken (External Blocker Impact)
- **RESEND missing** → All email confirmations dead. Diners don't receive booking status. No referral emails.
- **MARCEL_PHONE null** → SMS outreach impossible. 4 stale bookings (~$1,045) can't be rescued by SMS.
- **STRIPE blocked** → Payment flow not functional. ~$380 from Lead #551498 unrealized.

*These are Fred's action items. Engineering cannot unblock them.*

---

## 2. Top 2 High-Impact On-Site Conversion Improvements

### 🎯 Improvement #1 — Default to Simplified Booking Card

**Problem:** Service detail page shows a busy booking card with 7+ elements (price calculator, guest selector, demand badge, urgency line, min-notice warning, CTA, price). This causes analysis paralysis. A simplified card variant already exists (`cardVariant === 'simplified'`) but requires `?card=simplified` in the URL — users never find it.

**Evidence:** MAI-2090 landing page audit confirmed the simplified card outperforms the control. It wasn't made the default.

**Fix:** Change default in `pages.ts` from `control` to `simplified`.

```
# Current (pages.ts, ~line 551):
const cardVariant = urlCardParams.get('card') || 'control';

# Fix:
const cardVariant = urlCardParams.get('card') || 'simplified';
```

**Expected Impact:** +15–25% booking form submit rate (Service Detail → Inquiry). Existing A/B data already directional.

**Effort:** 1 line change + 10 min testing.

---

### 🎯 Improvement #2 — Suppress Auth Panel for Returning Diners

**Problem:** Returning diners (with cookies pre-filled) see a "Welcome back, [Name]!" banner immediately followed by an auth panel labeled "Sign In to Continue." This contradicts the welcome message and creates a detour that causes confusion and abandonment.

**Evidence:** The `isReturningDiner` check exists but the auth panel still renders. The auth panel should be hidden entirely for authenticated/cookie-identifiable users.

**Fix:** In `booking-page.ts`, add `style="display:none"` to the auth panel element when `isReturningDiner` is true, OR gate the auth panel render behind `!isReturningDiner`.

**Expected Impact:** Eliminates confused drop-off for ~30-40% of traffic (returning diners who already have pre-filled forms).

**Effort:** 1 conditional, ~15-30 min.

---

## 3. A/B Test Plan — Top Opportunity

### Test: Simplified vs. Control Booking Card

**Hypothesis:** The simplified booking card (price + CTA + trust line only — 3 elements vs. 7) will outperform the control card by reducing decision friction and increasing CTA click-through to the booking form.

**Variant names in code:**
- `cardVariant = 'simplified'` — Treatment
- `cardVariant = 'control'` — Control

**Assignment:** 50/50 random traffic split. Maintain `?card=control` or `?card=simplified` in URL for reproducibility.

#### Funnel Metrics to Track

| Event | Description | Target |
|-------|-------------|--------|
| `service_detail_view` | User lands on service detail page | Baseline volume |
| `booking_card_shown` | Variant rendered (`simplified` vs `control`) | 100% of visitors |
| `cta_click` | "Request Your Date" CTA clicked | Primary metric |
| `booking_form_view` | Landed on booking form page | Secondary metric |
| `booking_form_submit` | Inquiry submitted successfully | Primary conversion |

**Primary metric:** `cta_click_rate = cta_click / service_detail_view`  
**Primary conversion:** `booking_form_submit / service_detail_view`

| Variant | Est. CTA Click Rate | Est. Form Submit Rate |
|---------|-------------------|----------------------|
| Control | baseline | baseline |
| Simplified | +15–25% vs control | +12–20% vs control |

**Minimum sample:** 200 clicks per variant before calling significance.

#### What to Measure
- CTA click rate (primary)
- Booking form submit rate (conversion)
- Bounce rate from service detail page
- Time on page (engagement proxy)

#### What NOT to Change in This Test
- Do not modify the simplified card further during the test
- Do not change auth panel behavior in this test (that's Improvement #2)
- Keep all other page elements identical

---

## 4. Metrics to Track

| Metric | Event Name | Where to Instrument |
|--------|-----------|---------------------|
| Homepage hero CTA clicks | `hero_cta_click` | pages.ts |
| Search form submissions | `hero_search_submitted` | pages.ts |
| Service detail views | `service_detail_view` | pages.ts |
| Booking card variant shown | `booking_card_variant` | pages.ts |
| Booking CTA clicks | `cta_click` | pages.ts |
| Booking form views | `booking_form_view` | booking-page.ts |
| Auth panel shown | `booking_form_auth_panel_shown` | booking-page.ts |
| Auth panel completed | `booking_form_auth_panel_completed` | booking-page.ts |
| Inquiry submissions | `booking_form_submit` | api/inquiry.ts |

---

## 5. Output Summary

- ✅ **Funnel analysis** — 6 stages mapped with drop-off points identified
- ✅ **Top 2 improvements** — Simplified booking card (1-line fix, ~15-25% lift potential) + auth panel suppression for returning diners (~30-40% of traffic)
- ✅ **A/B test plan** — Simplified vs. control card, 5 funnel events to track, 200 click minimum per variant

---

## 6. Next Steps (Engineering)

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| P0 | Change default booking card to `simplified` in `pages.ts` | 1 line | +15-25% CTA click rate |
| P0 | Gate auth panel behind `!isReturningDiner` in `booking-page.ts` | 1 conditional | -25-35% auth friction |
| P1 | Instrument all funnel events in table above | 2-3 hrs | Measurable funnel data |
| P2 | Run A/B test (control vs simplified) with proper randomization | Next sprint | Validate + quantify lift |

---

*Growth Marketer — MAI-2144 — 2026-05-27 09:00 UTC*
