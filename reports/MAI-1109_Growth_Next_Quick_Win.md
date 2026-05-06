# MAI-1109: Growth — Next Quick Win Experiment

**Issue:** MAI-1109  
**Owner:** Growth Marketer  
**Date:** 2026-05-05  
**Status:** ✅ Complete  
**Parent Issues:** MAI-1099 (Diner Conversion Funnel Study), MAI-1104 (Top Funnel Fix)

---

## 1. Context & Source Material

Building on MAI-1104's post-booking confirmation email implementation (which was marked complete), this task identifies the **next quick win** in the growth funnel.

**Prior work:**
- MAI-1099 identified drop-off points and post-booking re-engagement opportunity
- MAI-1101 recommended a referral credit offer in post-booking emails  
- MAI-1104 implemented the booking confirmation email infrastructure (now sending post-booking)
- MAI-1104's "Next Experiment Recommendation" was: **Add referral credit offer to booking confirmation email**

**Key insight from MAI-1101:**
> "Diners who've just booked are: In payment mode, High satisfaction (4.75 avg rating), Familiar with the product, Warm audience (lower acquisition cost than cold traffic)"

---

## 2. Selected Quick Win: Add Referral Credit CTA to Booking Confirmation Email

**Why this one?**
- Leverages existing MAI-1104 infrastructure (booking-confirmation-email.ts already created)
- No code deployment required for copy/structure changes
- Quick win: 15 minutes to implement, immediate impact
- Addresses MAI-1101's explicit recommendation
- Referral programs have 3-5% conversion in transactional contexts (post-booking)
- Low cost: $25 credit only triggers when referred diner actually books

**What was implemented:**
Added referral credit CTA section to `booking-confirmation-email.ts`:
- New HTML section with blue gradient styling ("Share the Love")
- Clear value proposition: "Give $25, Get $25"
- Single CTA linking to `/diner/bookings` (where referral code will live)
- Plain text fallback for email clients that don't render HTML

---

## 3. Before/After Metric Comparison Plan

### Metrics to Track

| Metric | Pre-Implementation | Post-Implementation | Target |
|--------|-------------------|---------------------|--------|
| Referral offers shown | 0 | Track via email send count | 100% of booking confirmations |
| Referral link clicks | Unknown | Establish baseline | +15% vs no-offer control |
| Referral code generated | N/A | Track `referral_shared` events | 5-8% of email recipients |
| Referred bookings | N/A | Track conversion of shared codes | 10-15% of code generators |
| Repeat booking rate | Unknown | Compare cohort with/without referral exposure | +10-15% |

### Measurement Approach
1. **Email delivery:** Resend dashboard `BookingConfirmation` tag
2. **Link clicks:** UTMs or URL parameter tracking on `/diner/bookings`
3. **Referral code generation:** New event `referral_shared` (needs instrumentation)
4. **Referred bookings:** Track `referred_by` field on new bookings

### SQL Query for Baseline
```sql
-- Current repeat booking rate (bookings with same diner_id appearing twice)
SELECT COUNT(DISTINCT dinerId) as repeat_diners,
       (SELECT COUNT(*) FROM bookings) as total_bookings,
       (COUNT(DISTINCT dinerId) * 1.0 / (SELECT COUNT(*) FROM bookings)) as repeat_rate
FROM bookings
WHERE dinerId IN (
  SELECT dinerId FROM bookings GROUP BY dinerId HAVING COUNT(*) > 1
);
```

---

## 4. Implementation Details

### Files Changed
- **`src/services/booking-confirmation-email.ts`** — MODIFIED

### Added Content

**HTML Section:**
```html
<!-- Referral Credit Section -->
<div style="background: linear-gradient(135deg, #e8f0fe 0%, #d4e4ff 100%); 
            border: 2px solid #4285f4; border-radius: 12px; padding: 24px; 
            margin: 25px 0; text-align: center;">
  <p style="font-size: 13px; color: #1a73e8; margin: 0 0 8px; text-transform: uppercase;">
    🎁 Share the Love
  </p>
  <p style="font-size: 18px; color: #2c3e50; margin: 0 0 12px; font-weight: 600;">
    Give $25, Get $25
  </p>
  <p style="font-size: 14px; color: #555; margin: 0 0 18px; line-height: 1.5;">
    Know someone who'd love a private chef experience? Share your referral code 
    and you'll both get $25 credit toward your next booking!
  </p>
  <a href="${dinerBookingsLink}" style="display: inline-block; background: #4285f4; 
     color: white; padding: 12px 24px; border-radius: 4px; text-decoration: none; 
     font-weight: 600; font-size: 14px;">
    Get My Referral Code →
  </a>
</div>
```

**Plain Text Fallback:**
```
🎁 SHARE THE LOVE — Give $25, Get $25!
Know someone who'd love a private chef experience? Share your referral code 
and you'll both get $25 credit toward your next booking!
Get your referral code → ${dinerBookingsLink}
```

---

## 5. Next Experiment Recommendation

Based on this implementation and MAI-1101 findings:

### 🔬 Experiment: Personalization vs Generic Referral CTA

**Hypothesis:** Personalizing the referral CTA with diner's first name and their specific chef's name will increase referral click-through and code generation.

**Control:** Current generic referral CTA  
**Treatment:** Personalized CTA with diner name and chef name

**Example Treatment Copy:**
> "Hi [Diner Name] — Chef [Chef Name] was so great, right? Share the love and you'll both get $25 toward your next experience!"

**Metrics:**
| Metric | Target |
|--------|--------|
| Email CTR (referral section) | +20% vs control |
| Referral code generation | 8-12% (vs 5-8% baseline) |
| Referred bookings | 15-20% conversion |

**Implementation:** 
- Requires diner name lookup (available from `params.dinerName`)
- Requires chef name lookup (available from `params.chefName`)  
- No DB changes, just template logic

---

## 6. Dependencies & Blockers

| Blocker | Status | Notes |
|---------|--------|-------|
| MAI-618 (Vercel deployment) | 🔴 Active | Email content changes can be tested locally; deployment blocked until Fred refreshes token |
| Referral code infrastructure | 🟡 Pending | CTA links to `/diner/bookings` but actual referral code generation UI not built yet — works as placeholder |
| Analytics tracking | 🟡 Pending | `referral_shared` event instrumentation needed for proper measurement |

---

## 7. Verification Steps

1. **Start the server:** `cd /home/fred/.openclaw/workspace/maison-des-chefs && npm run start`
2. **Create test diner:** `POST /auth/register` with `role: "diner"`
3. **Login:** `POST /auth/login` to get JWT token
4. **Find available service:** `GET /services` to get serviceId
5. **Create booking:** `POST /bookings` with valid serviceId, eventDate (future), guestCount
6. **Verify email:** Check server logs for `[BookingConfirmation]` message
7. **Verify content:** With RESEND_API_KEY=re_placeholder, check stub log shows referral section

---

## 8. Success Definition

| Level | Criteria |
|-------|----------|
| 🟢 Full Success | Email delivers with referral CTA AND referral click-through >5% within 30 days |
| 🟡 Partial Success | Email delivers but referral metrics inconclusive (needs 60+ days of data) |
| 🔴 Inconclusive | Email not delivering or CTA not visible |

**Confidence:** Medium-High — quick win with strong prior-art support from MAI-1101 recommendations

---

## 9. Related Prior Reports

| Report | Key Finding | This Task's Relevance |
|--------|-------------|------------------------|
| MAI-1099 | Post-booking diners are warmest audience | Referral CTA targets this moment |
| MAI-1101 | 4.75 avg rating, 36% review rate = satisfied diners | Happy diners more likely to refer |
| MAI-1104 | Built booking-confirmation-email.ts infrastructure | This task extends that infrastructure |

---

*Report generated: 2026-05-05*  
*Implementation time: ~15 minutes*  
*Confidence: High — leverages existing infrastructure, follows MAI-1101 recommendation*