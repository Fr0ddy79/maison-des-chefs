# Growth: CTA Text A/B Test Specification

**Issue:** MAI-1076  
**Owner:** Growth Marketer  
**Date:** 2026-05-04  
**Status:** Ready for Implementation  
**Parent:** MAI-1072 (Growth Funnel Analysis)

---

## 1. Objective

Increase CTA click rate on service detail pages by testing alternative framing that reduces perceived commitment barrier while maintaining booking quality.

---

## 2. Test Hypothesis

| Variant | Hypothesis |
|---------|------------|
| Control | Baseline click rate (~5% based on MAI-1072) |
| Test A | FOMO framing ("Request Your Date") will increase urgency and clicks |
| Test B | Lower-commitment framing ("Check Availability") will increase clicks by reducing friction |
| Test C | Premium/exclusivity framing ("Reserve Your Chef") will attract higher-intent users, may reduce clicks but improve completion |

**Primary hypothesis:** Lower-commitment framing (Test B) will increase CTA clicks, but higher-commitment framing (Test C) may yield better booking completion if it filters for higher-intent users.

---

## 3. Test Variants

All variants use the same button styling; only text changes.

### Control
**Label:** `control`  
**CTA Text:** "Book This Service"  
**Placement:** Primary CTA button on service detail page  
**Rationale:** Current default; baseline measurement

### Test A — FOMO Framing
**Label:** `testA`  
**CTA Text:** "Request Your Date"  
**Placement:** Primary CTA button on service detail page  
**Subtext (optional):** "Limited availability this season"  
**Rationale:** Creates urgency by implying limited slots; frames booking as a request (slightly lower commitment than "book")

### Test B — Low Commitment
**Label:** `testB`  
**CTA Text:** "Check Availability"  
**Placement:** Primary CTA button on service detail page  
**Subtext (optional):** "No commitment required"  
**Rationale:** Removes financial commitment perception entirely; shifts action from "buy" to "browse"

### Test C — Premium/Exclusivity
**Label:** `testC`  
**CTA Text:** "Reserve Your Chef"  
**Placement:** Primary CTA button on service detail page  
**Subtext (optional):** "Exclusive experience"  
**Rationale:** Positions experience as premium and exclusive; may attract higher-intent users willing to commit

---

## 4. Traffic Allocation

| Parameter | Value |
|-----------|-------|
| Allocation method | Even split (25% per variant) |
| Minimum sample per variant | 100 visitors |
| Target total visitors | 400 minimum (100 × 4) |
| Recommended runtime | 2 weeks minimum (to reach sample) |
| Assignment method | Random assignment on first page view |
| Persistence | Variant persisted to sessionStorage to ensure consistency |

---

## 5. Services & Chefs to Test On

| service_id | Chef | Cuisine | Price Point | Notes |
|------------|------|---------|-------------|-------|
| 1 | Chef 1 | French | $100-150/person | Primary traffic service (MAI-1072); include in test |
| Any | Any | All | All | If traffic allows, test across services |

**Note:** Based on MAI-1072, 100% of tracked service page views are for service_id=1. Begin testing there; expand to other services once traffic increases.

---

## 6. Metrics

### Primary Metric
| Metric | Definition | Success Criteria |
|--------|------------|------------------|
| CTA Click Rate | `cta_click` / `service_page_view` per variant | Test variant beat control by ≥10% relative |

### Secondary Metrics
| Metric | Definition |
|--------|------------|
| Booking Completion Rate | `booking_created` / `cta_click` per variant |
| Bounce Rate | Single-page sessions after service view |
| Time on Page | Average `time_on_page` per variant |

### Guardrail Metrics (stop if degraded)
| Metric | Threshold |
|--------|-----------|
| Booking completion rate | Must not drop >20% vs control |
| Revenue per session | Must not drop >15% vs control |

---

## 7. Implementation Notes for Frontend

### Variant Assignment
```typescript
// In service detail page route handler
const validVariants = ['control', 'testA', 'testB', 'testC'];
const ctaParam = url.searchParams.get('cta');
const ctaVariant = validVariants.includes(ctaParam || '') ? ctaParam : 'control';

// Persist to sessionStorage for consistency
// Client-side JS should read variant from sessionStorage on subsequent loads
```

### Tracking Requirements
1. **Page view:** Fire `service_page_view` with variant assigned
2. **CTA click:** Fire `cta_click` with variant and service_id
3. **Booking created:** Fire `booking_created` with variant, service_id, guest_count
4. **Session storage:** Store `ctaVariant` and `serviceId` for cross-page attribution

### Button Implementation
```html
<!-- Control -->
<button data-variant="control" data-cta-text="Book This Service">
  Book This Service
</button>

<!-- Test A -->
<button data-variant="testA" data-cta-text="Request Your Date">
  Request Your Date
</button>

<!-- Test B -->
<button data-variant="testB" data-cta-text="Check Availability">
  Check Availability
</button>

<!-- Test C -->
<button data-variant="testC" data-cta-text="Reserve Your Chef">
  Reserve Your Chef
</button>
```

### Variant Data Attribute (for SSR)
```html
<!-- On the service page container -->
<div id="service-page" data-variant="{{ ctaVariant }}" data-service-id="{{ service.id }}">
```

### Analytics Events
```typescript
// On CTA click
trackCtaClickEvent({
  variant: ctaVariant,        // control | testA | testB | testC
  serviceId: service.id,
  chefId: service.chefId,
  pricePerPerson: service.pricePerPerson,
  ctaText: buttonText        // The actual button text shown
});

// On booking created (via sessionStorage correlation)
trackBookingCreatedEvent({
  variant: sessionStorage.get('ctaVariant'),  // Origin variant
  serviceId: sessionStorage.get('serviceId'),
  guestCount: bookingForm.guestCount,
  totalPrice: bookingForm.guestCount * service.pricePerPerson
});
```

---

## 8. Test Duration & Stopping Rules

| Condition | Action |
|-----------|--------|
| Reached 100 visitors/variant | Can evaluate (may need more for significance) |
| Reached 200 visitors/variant | Sufficient for 80% power at 10% effect size |
| p-value < 0.05 before sample | Flag for early significance review |
| Any guardrail metric breached | Pause test, evaluate |
| 4 weeks elapsed without reaching sample | Escalate to Growth Lead |

---

## 9. Success Definition

| Level | Criteria |
|-------|----------|
| 🟢 Full Success | Primary metric improved ≥10% AND secondary metrics stable/decreased |
| 🟡 Partial Success | Primary metric improved ≥5% OR significant click increase but no booking lift |
| 🔴 Inconclusive | No meaningful difference between variants |
| 🆘 Negative Result | Control outperforms all variants |

---

## 10. Next Steps

- [ ] Frontend: Implement variant assignment in service detail page route
- [ ] Frontend: Add sessionStorage persistence for variant
- [ ] Frontend: Implement dynamic CTA text rendering based on variant
- [ ] Analytics: Ensure `cta_click` event includes `ctaText` field
- [ ] Analytics: Add booking→variant correlation via sessionStorage
- [ ] QA: Verify all 4 variants render correctly
- [ ] QA: Confirm tracking fires correctly in dev tools
- [ ] Launch: Enable test, monitor daily

---

## 11. Reference

- MAI-1072 funnel analysis: `maison-des-chefs/reports/MAI-1072-funnel-analysis.md`
- Analytics events schema: `services/analytics.ts`
- Service detail page: `services/pages.ts`