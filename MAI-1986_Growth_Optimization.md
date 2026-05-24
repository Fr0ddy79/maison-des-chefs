# Growth Optimization — MAI-1986: Fake Urgency Claims in Touch 2/3 Emails

**Issue:** 838c0925-4efe-4892-8af4-51711cb70b67
**Created:** 2026-05-23 22:00 UTC
**Status:** ✅ Complete
**Owner:** Growth Marketer
**Run:** 22:00 UTC autopilot

---

## Executive Summary

**Growth idea:** The Touch 2 and Touch 3 re-engagement emails in `stale-quoted-lead-reengagement.ts` use completely fabricated urgency and social proof data — random "other viewers" counts and generic placeholder testimonials. This undermines email credibility and erodes diner trust. Fix: make urgency claims data-driven using real analytics, and source real testimonials from actual verified reviews.

**Expected impact:** Higher email open rates, click-through, and booking conversion from re-engagement sequence. Real urgency > fake urgency.

**Priority:** Medium
**Effort:** Low-Medium — requires pulling real data into the email builder

---

## 1. Funnel Analysis — Current State

### 1a. Lead Pipeline

| Stage | Count | Notes |
|-------|-------|-------|
| New/Pending leads | 0 | No active leads |
| Responded (quoted) leads | ~some | Diners with quotes, no booking yet |
| Converted leads | 1 | Guest checkout (Apr 16) |
| Expired leads | 7 | All expired May 13 |

### 1b. Email Re-engagement Sequence

The `stale-quoted-lead-reengagement.ts` sends a 3-touch sequence to diners who received a quote but haven't booked:

| Touch | Timing | Purpose | Status |
|-------|--------|---------|--------|
| Touch 1 | Day 1 post-quote | "Your quote is ready" | ✅ Wired |
| Touch 2 | Day 3 post-quote | Value reminder + urgency | ⚠️ Has fake data |
| Touch 3 | Day 7 post-quote | Final reminder | ⚠️ Has fake data |

---

## 2. The Problem — Fabricated Urgency & Social Proof

### 2a. Touch 2 Email: Fake "Other Viewers" Count

In `sendStaleLeadEmail()` at line 426:

```typescript
let otherViewers = Math.floor(Math.random() * 3) + 1; // 1-3 other viewers for urgency
```

This generates a random number (1, 2, or 3) claiming other parties are viewing the chef's availability. **There is no data source for this.** It's a random number generator producing fake urgency.

### 2b. Touch 2 & Touch 3 Emails: Placeholder Testimonials

Lines 427-428:

```typescript
let testimonialText = 'An absolutely incredible experience. The chef was professional, creative, and the food was phenomenal.';
let testimonialAuthor = 'Verified Customer';
```

Same generic text for every email, every chef. "Verified Customer" isn't a real person. Diners who've read other emails or have been on the platform will recognize this as fake.

### 2c. What This Looks Like to a Diner

> *"⏰ 3 other parties are currently viewing Chef [Name]'s availability for June 14."*

> *"What diners are saying:*
> *'An absolutely incredible experience. The chef was professional, creative, and the food was phenomenal.'*
> *— Verified Customer"*

Diners who know the platform has low traffic (which it does — 0 active leads) will immediately see through this. Even those who don't know will eventually learn. **Fake urgency destroys trust faster than no urgency.**

---

## 3. Growth Idea: Data-Driven Urgency + Real Testimonials

### 3a. Fix "Other Viewers" with Real Inquiry Data

Instead of `Math.random()`, query actual data:

```typescript
// Option 1: Count leads (other diners) created for same chef + service + overlapping dates
const overlappingLeads = await db
  .select()
  .from(schema.leads)
  .where(
    and(
      eq(schema.leads.serviceId, lead.serviceId),
      ne(schema.leads.id, lead.id),  // exclude current lead
      isNotNull(schema.leads.eventDate)
    )
  )
  .all();

// Filter to leads with overlapping event dates (±3 days)
const otherViewers = overlappingLeads.filter(other => {
  if (!other.eventDate || !lead.eventDate) return false;
  const diff = Math.abs(new Date(other.eventDate).getTime() - new Date(lead.eventDate).getTime());
  return diff < 3 * 24 * 60 * 60 * 1000;
}).length;
```

**If there are 0 real other inquirers → don't show the urgency widget at all.** Silence > fake noise.

### 3b. Source Real Testimonials from Reviews

The platform has a `chefProfiles` table and likely has booking/reviews data. Pull real testimonials:

```typescript
// Get a real testimonial from confirmed bookings with this chef
const [booking] = await db
  .select()
  .from(schema.bookings)
  .where(
    and(
      eq(schema.bookings.chefId, lead.chefId),
      isNotNull(schema.bookings.reviewText)
    )
  )
  .limit(1);

if (booking) {
  testimonialText = booking.reviewText;
  testimonialAuthor = booking.reviewerName || 'Verified Diner';
}
```

**Fallback**: If no real reviews exist → don't show the testimonial section at all. A testimonial section with one real review beats a section with a fake generic one.

### 3c. Don't Show Urgency Widget If No Real Data

Both urgency elements should be conditional:

- **Other viewers**: Only show if `otherViewers > 0` (real data)
- **Testimonial**: Only show if we actually found a real review

If neither has real data, Touch 2 becomes a simple value reminder without fake urgency. That's still effective.

---

## 4. Experiment Plan

### A/B Test: Real Urgency vs. No Urgency Widget

| Variant | Description | Hypothesis |
|---------|-------------|-----------|
| **Control** | Current Touch 2 with random otherViewers (1-3) + placeholder testimonial | Fake urgency erodes trust over time |
| **Treatment A** | Touch 2 with real overlapping lead count + real testimonial (or no widget if none) | Real data drives higher CTR and booking |

**Primary metric:** Reply rate to re-engagement emails, booking conversion within 7 days of quote
**Secondary metric:** Unsubscribe rate (higher in control if fake urgency is annoying)

**Sample size needed:** ~50 leads per variant (for statistical significance with ~20% baseline conversion)

---

## 5. Metrics to Track

| Metric | Current | Target |
|--------|---------|--------|
| Re-engagement email CTR | Unknown | +15% with real urgency |
| Booking conversion (quoted → booked) | ~10% est. | +20% |
| Unsubscribe rate | Unknown | No increase |
| Fake urgency complaints | Unknown (not tracked) | 0 |

---

## 6. Implementation Notes

- **File**: `src/services/stale-quoted-lead-reengagement.ts`
- **Lines**: 426-428 (urgency/testimonial assignment), 183-261 (Touch 2 email builder), 277-357 (Touch 3 email builder)
- **Dependencies**: Real lead overlap query (uses existing `schema.leads`), real review query (needs `schema.reviews` or `schema.bookings.reviewText`)
- **Risk**: Low — this is a data fix, not a logic change. Worst case: we show less urgency rather than fake urgency.

---

## 7. What Was Done

- [x] Analyzed current lead pipeline state
- [x] Identified fabricated urgency data in Touch 2/3 emails
- [x] Proposed data-driven alternative approach
- [x] Designed A/B experiment to validate real vs. fake urgency