# MAI-1342: Growth Optimization — Review-to-Booking Funnel Activation

**Issue:** 03c497f3-4a56-471c-8f69-0ab4262b9302
**Created:** 2026-05-10 04:00 UTC
**Status:** ✅ Analysis Complete
**Owner:** Growth Marketer

---

## 1. Funnel Analysis

### Current State (2026-05-10)

| Stage | Status | Notes |
|-------|--------|-------|
| Chef Discovery Page filters | ✅ Implemented | Cuisine/price/dietary/sort — functional |
| Chef selection + inquiry modal | ✅ Working | Multi-chef inquiry flow |
| Booking creation | ✅ Working | Lead submitted to chef |
| Booking status tracking | ✅ Working | Status page + email updates |
| Review submission | ✅ Working | `/review/:bookingId` page, POST `/api/reviews` |
| **Review → Booking funnel** | ⚠️ **BROKEN** | No automated path from review completion back to booking |
| Lead → booking conversion | 🔴 Blocked | Chef email blocked (RESEND_API_KEY missing, 50+ days) |
| Referral program | ⚠️ Stub | Confirmed email has referral CTA, but no credits tracked |

### Review System — What's Built

From `SPEC.md` (MAI-1204) and code inspection:

| Component | Status |
|-----------|--------|
| Reviews table | ✅ |
| POST /api/reviews | ✅ |
| GET /api/services/:id/reviews | ✅ |
| GET /api/services/:id/rating | ✅ |
| GET /api/chefs/:id/reviews | ✅ |
| Review page (`/review/:bookingId`) | ✅ |
| Aggregate rating display | ✅ In pages.ts service detail |
| Reviews on service detail page | ✅ In pages.ts |

### The Gap: No "Book Again" After Review Submission

When a diner submits a review:
1. Review is saved ✅
2. Confirmation shown: "Thank you! Your review has been submitted successfully." ✅
3. **Then what?** Page redirects to homepage after 2 seconds — no mention of booking again, no referral credit, no service link

The review flow ends in a dead end. The diner has just had a positive emotional experience (sharing their dining story) but is not given any opportunity to convert that momentum into a repeat booking.

### Funnel Diagram

```
Booking confirmed
        ↓
[24-48h] Review email sent to diner
        ↓
Diner clicks link → /review/:bookingId
        ↓
Diner submits review (positive experience)
        ↓
⚠️ DEAD END → Redirect to homepage after 2s
        ↓
No "Book Again" CTA
No referral credit mention
No service link
        ↓
Diner bounces
```

### Opportunity: Review Confirmation Page is High-Intent Moment

The review submission moment is a **high-intent micro-conversion**:

- Diner just completed a confirmed booking (real experience)
- Diner took time to write a review (engaged, positive)
- Emotional state: satisfied, wanting to share the experience
- **This is the ideal moment to ask for a repeat booking or referral**

The current confirmation message: "Thank you! Your review has been submitted successfully." + redirect to homepage after 2 seconds.

That's it. No service link. No "Book Again." No referral mention.

---

## 2. Growth Idea: Add "Book Again" CTA to Review Confirmation

### Option A — Book Again CTA on Review Confirmation Page

Immediately after submitting a review, show:
- "Book this chef again" CTA → Service detail page
- "Try a different chef" → Chef discovery page
- Referral credit info: "$25 off your next booking when you refer a friend"

**Impact:** Captures post-review intent while emotion is high
**Effort:** Low — modify review-page.ts confirmation section

### Option B — "Leave a Review, Get $25" Referral Incentive

At booking confirmation, promise: "After your event, leave a review and get $25 credit."

At review submission, deliver: Credit code + "Share with friends" CTA

**Impact:** Higher review submission rate + referral activation
**Effort:** Medium — need to track and redeem credits

### Option C — Post-Review Service Recommendations

After review submission, show diner:
- Their reviewed chef's other services
- "Chefs similar to [chef they reviewed]"
- Top-rated chefs they haven't tried

**Impact:** Discovery + reactivation
**Effort:** Medium — requires recommendation logic

### Recommended: Option A (Quick Win) + Option B (Full Activation)

**Phase 1:** Add Book Again CTA + referral mention to review confirmation (this cycle)
**Phase 2:** Build referral credit tracking system (next cycle)

---

## 3. Expected Impact

| Metric | Current | Expected | Confidence |
|--------|---------|----------|------------|
| Review-to-booking rate | 0% (no path) | 5-10% | Medium |
| Review submission rate | Unknown baseline | +10% (with $25 offer) | Medium |
| Referral activations | 0 (no system) | Measurable | Low |
| Review page bounce rate | High (dead end) | Lower | High |

**Why this matters:**

The chef email blocker means **inbound leads aren't converting**. Diners submit inquiries but chefs never respond. This creates a gap in the acquisition funnel.

Meanwhile, the review-to-booking path bypasses the broken chef email entirely — a diner who already had a great experience and wants to rebook can do so directly. We should not let that momentum die.

---

## 4. Experiment Plan

### A/B Test: Review Confirmation Page — CTA vs No CTA

**Hypothesis:** Adding a "Book Again" CTA and referral offer to the review confirmation page will increase the rate at which diners return to book another chef within 30 days, because the CTA captures post-review intent while the diner's satisfaction is high.

**Test Design:**

| Element | Control | Variant |
|---------|---------|---------|
| Confirmation message | "Thank you! Your review has been submitted." | Same + "Book Again" section |
| Book Again CTA | None | Button: "Book Chef [Name] Again →" |
| Referral offer | None | "$25 credit when you refer a friend →" |
| Service recommendations | None | "You might also like..." (3 cards) |
| Redirect | Auto-redirect after 2s | No auto-redirect |

**Implementation:**
```typescript
// In buildReviewPage(), modify the success state HTML
// Instead of just "Thank you!", add:
// 1. Service link (from booking.serviceId)
// 2. "Try another chef" → /chefs
// 3. Referral offer CTA (when system exists)
// 4. Remove or extend auto-redirect
```

**Metrics:**

| Metric | Event | How to Track |
|--------|-------|-------------|
| Review submitted | `review_submitted` | ✅ Already tracked |
| Book Again CTA clicked | `review_page_cta_click` | New event |
| Referral link clicked | `referral_cta_click` | New event |
| Next booking within 30d | `booking_created` + attribution | Attribution by dinerId |
| Review page exit rate | `review_page_exit` | New event (no interaction after submit) |

---

## 5. Quick Win (No A/B — Ship Immediately)

**Change:** Add "Book Again" link + "Browse Chefs" link to the review success state.

Current success state in `review-page.ts`:
```javascript
showSuccess('Thank you! Your review has been submitted successfully.');
document.getElementById('reviewForm').style.display = 'none';
btn.textContent = 'Review Submitted';
setTimeout(function() {
  window.location.href = '/';
}, 2000);
```

**Immediate improvement:**
```javascript
// Show booking action links
showSuccess(`
  <div style="text-align:center;margin-top:1rem;">
    <p style="font-size:1.1rem;color:#2c3e50;margin-bottom:1rem;">Thank you! Your review has been submitted.</p>
    <a href="/services/${serviceId}" class="btn" style="margin:0.5rem;">Book Again →</a>
    <a href="/chefs" class="btn btn-secondary" style="margin:0.5rem;">Browse Chefs</a>
  </div>
`);
```

This is a one-line change that captures intent that currently leaks away.

---

## 6. Relationship to Prior Work

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-1321 | Chef Discovery filters | ✅ Implemented |
| MAI-1298 | Booking CTA reframe | ✅ Recommended |
| MAI-1289 | Social proof badge | ✅ Implemented |
| MAI-1255 | Booking email confirmation flow | ✅ Complete |
| MAI-1214 | Reviews MVP spec | ✅ Implemented |
| MAI-1192 | RESEND_API_KEY missing | 🔴 Email blocked 50+ days |

---

## 7. Metrics to Track

| Metric | Current | Target | Notes |
|--------|---------|--------|-------|
| Review submission rate | Unknown | Establish baseline |reviews_submitted / eligible_bookings |
| Review-to-booking conversion | 0% (no path) | 5%+ | Measure with diner attribution |
| Book Again CTA click rate | N/A | 10-15% of reviewers | New event: `review_page_cta_click` |
| Review page exit rate | High (no CTA) | 50% reduction | After adding CTA |
| Referral activation rate | 0 (no system) | TBD | After Phase 2 |

---

## 8. Definition of Done

- [x] Funnel analyzed (Review → Booking is broken)
- [x] 1 improvement identified (Book Again CTA on review confirmation)
- [x] Quick win identified (Add service/chef links to review success state)
- [x] Experiment designed (A/B test with CTA + referral offer)
- [x] Expected impact estimated (5%+ booking lift)
- [x] Metrics to track defined

---

## 9. Next Steps for Implementation

**Quick Win (1 line change):**
1. Modify `buildReviewPage()` success state in `src/routes/review-page.ts`
2. Add "Book Again" and "Browse Chefs" buttons to success message
3. Remove or extend auto-redirect

**Full Implementation (next cycle):**
1. Add `review_page_cta_click` analytics event
2. Build referral credit tracking (DB table + redemption flow)
3. Add referral offer to review confirmation + booking confirmation emails
4. A/B test variant with referral offer vs. without

---

*Growth Optimization — MAI-1342 — Growth Marketer — 2026-05-10 04:00 UTC*
