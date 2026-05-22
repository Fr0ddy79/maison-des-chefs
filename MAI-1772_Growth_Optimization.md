# MAI-1772: Growth Optimization — Referral Reward Incentive Gap

**Issue:** abcbc3b7-4ca9-4cb5-bd19-26d43bdf975f  
**Owner:** Growth Marketer  
**Status:** ✅ Analysis Complete  
**Created:** 2026-05-19 04:00 UTC  
**Workspace:** Maison des Chefs (1e6afa55-862a-4767-9181-61e71e03a316)

---

## Executive Summary

**Growth idea:** Implement referral credit rewards ("Refer a friend, both get $25 off") to turn satisfied diners into active advocates. Currently, the platform only tracks referral code clicks but provides no tangible incentive for diners to refer friends.

**Expected impact:** 
- Satisfied diners become active advocates (word-of-mouth is strongest acquisition for premium niche services)
- Each successful referral that converts to booking is essentially free marketing
- $25 credit is cheaper than paid customer acquisition
- Creates network effect as platform grows

**Priority:** High — acquisition lever for premium niche market with no current reward mechanism

---

## 1. Funnel Analysis — Referral System

### 1a. Current State (MAI-823 — Click Tracking Only)

| Component | Status | Notes |
|-----------|--------|-------|
| Referral code in leads table | ✅ Implemented | `referralCode` field exists |
| Click tracking via `/referral/track` | ✅ Implemented | Logs source (copy/email/whatsapp) |
| Referral share event | ✅ Implemented | `referral_share` event tracked |
| Referral credit system | 🔴 **Not implemented** | No dinerCredits table, no credit generation |
| Share UI ("Refer Friends" button) | 🔴 **Not implemented** | No CTA on booking confirmation |
| Referral code generation per diner | 🔴 **Not implemented** | No unique codes |

### 1b. What MAI-670 Proposes (Not Yet Built)

MAI-670 (Referral Reward System) specifies:
- `dinerCredits` table with amount, expiration, used status
- `referralCodes` table with unique 8-char codes per diner
- `$25 credit` when referee completes first booking (both parties)
- "Refer Friends" button on booking confirmation + `/diner/bookings`
- Credit application at checkout

**Status:** Spec exists, not implemented.

### 1c. The Gap — No Referral Incentive

Today's situation:
- A diner has a great experience with a private chef
- They have no reason to tell friends (no reward)
- Referral codes exist but are just URL parameters with no reward backing
- Word-of-mouth potential is completely unmonetized

**For a premium niche service ($150+/person), word-of-mouth from satisfied customers is the most credible and cost-effective acquisition channel.** But without an incentive, there's no friction to act.

---

## 2. Growth Opportunity: Referral Credit Implementation

### 2a. Why This Matters for Maison des Chefs

Private chef bookings are:
- High-consideration (not a impulse purchase)
- Trust-dependent (you're inviting someone into your home)
- Social by nature (dinner parties, events, celebrations)

→ **Word-of-mouth recommendations are extremely powerful** but completely unharnessed.

A "refer a friend, both get $25 off" program:
- Gives satisfied diners a tangible reason to share
- Makes the referral feel like a "gift" rather than a favor
- The $25 credit is trivial relative to the average booking value ($150-300+)
- The referrer becomes invested in the platform's success

### 2b. The Math (Why This Works)

| Metric | Value |
|--------|-------|
| Average booking value | ~$300 (2 guests × $150) |
| Referral credit per party | $25 |
| Referrer credit cost | $25 |
| Referee first booking value | $300 |
| Net platform value (referee booking) | $275 (after $25 credit) |
| CPA via paid ads (est.) | $50-100+ |
| **CPA via referral** | **$25** |

Referrals are 2-4x cheaper than paid acquisition for a premium niche service.

---

## 3. Experiment Plan

### Phase 1: Implement Core Referral Credits (MAI-670)

**Build:**
1. `dinerCredits` table — tracks earned/used credits per diner
2. `referralCodes` table — unique 8-char codes per diner
3. `POST /api/diner/referral-code` — generate diner's unique code
4. `GET /api/diner/referral-code` — retrieve existing code
5. Checkout credit application (`POST /api/checkout/apply-credit`)
6. Credit trigger when referee completes first booking
7. "Refer Friends" button on `/booking/:id/success` and `/diner/bookings`
8. Share modal (copy link, email, WhatsApp)

**A/B Test Design:**

| | Control | Variant |
|---|---|---|
| **Name** | No referral CTA | Referral CTA + share modal |
| **Placement** | Booking confirmation (as-is) | Booking confirmation + referral CTA |
| **Traffic** | 50% | 50% |
| **Hypothesis** | 0% referral code usage | >10% of diners use referral code |

### Phase 2: Measure Referral Funnel

| Metric | How to Measure |
|--------|---------------|
| Referral button click rate | `referral_share` events / `booking_created` |
| Referral code usage rate | Codes used / codes generated |
| Time to first referral | Days from booking to first share |
| Referral → booking conversion | Bookings with referral_code / total referrals |

### Phase 3: Optimize Referral Flow

Based on Phase 2 data:
- If click rate < 5%: Test different CTA copy/placement
- If usage after click < 20%: Simplify the share flow
- If conversion < 10%: Increase credit amount or add urgency

---

## 4. Metrics to Track

| Metric | Baseline | Target | How |
|--------|----------|--------|-----|
| Referral button click rate | 0% (not implemented) | >10% of bookings | `referral_share` events |
| Referral code conversion | 0% | >15% of codes used | Bookings with referral_code |
| Revenue per referral | $0 | >$25 net | Booking value - credit cost |
| Referrals per month | 0 | Establish baseline | Count new referral bookings |
| Referral share channel mix | N/A | Copy: 60%, Email: 25%, WhatsApp: 15% | Channel from `referral_share` event |

---

## 5. Relationship to Prior Work

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-823 | Referral click tracking | ✅ Implemented |
| MAI-670 | Referral reward system spec | 🔴 Not implemented |
| MAI-1772 | This — identify gap + suggest experiment | ✅ Analysis complete |

**This issue identifies MAI-670 as the next priority implementation and designs the experiment.**

---

## 6. Definition of Done

- [x] Current funnel analyzed (referral system has click tracking, no rewards)
- [x] 1 improvement identified (referral credit system)
- [x] Expected impact estimated (2-4x cheaper CPA)
- [x] Experiment plan designed (A/B test on booking confirmation)
- [x] Metrics to track defined
- [ ] MAI-670 implementation (deferred to Product/Engineering)
- [ ] Baseline established post-implementation

---

## 7. Recommended Next Steps

1. **Product/Engineering** picks up MAI-670 implementation
2. **Growth Marketer** designs A/B test copy variants once implemented
3. **3-4 weeks post-launch**: Measure referral code usage rate, optimize based on data

---

*Growth Optimization — MAI-1772 — Growth Marketer — 2026-05-19 04:00 UTC*
