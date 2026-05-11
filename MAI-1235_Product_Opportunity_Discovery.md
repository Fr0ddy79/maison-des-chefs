# MAI-1235: Product Opportunity Discovery

**Issue:** d406ebd7-c8ba-4e46-b2f3-156f537f4ace
**Created:** 2026-05-07 20:00 UTC
**Status:** ✅ Analysis Complete — 1 Opportunity Identified
**Owner:** Product Manager

---

## 1. Current State Summary

| Stage | Status | Count | Notes |
|-------|--------|-------|-------|
| Published services | ✅ Live | 1 | "Dinner for 2" by Chef Marcel ($95/person) |
| Diner booking inquiries | ✅ Submitting | 4 bookings pending | Oldest: May 15 (23 days) |
| Chef response (accept/reject) | 🔴 **BOTTLENECK** | 0/4 actioned | All stuck waiting |
| Booking confirmed → payment | 🔴 Blocked | 0 confirmed | Revenue = $0 |
| Leads (unconverted) | ⚠️ 4 leads | IDs 5-8 | New QA test leads |
| Reviews MVP | ✅ Implemented | Review page live | No reviews yet |
| Review email trigger | 🔴 Not working | RESEND_API_KEY missing | Blocked |

### What's Changed Since MAI-1228 (May 7 16:00 UTC → 20:00 UTC)

- 4 hours elapsed, no chef response improvement (still 0/4)
- QA test leads (IDs 5-8) created but not converted
- Reviews MVP fully implemented — review page at `/review/:bookingId`
- Review email system blocked — cannot send review request emails

---

## 2. Core Problem Analysis

### The Blocking Issue: Chef Response

The entire funnel is dead because the chef (Chef Marcel, user_id=1) is not responding to bookings. All 4 pending bookings have been waiting for chef action:

| Booking | Event Date | Days Waiting | Status |
|---------|------------|--------------|--------|
| #1 | May 15 | 23 days | Pending (Anniversary) |
| #2 | June 15 | 4 days | Pending |
| #3 | June 20 | 4 days | Pending |
| #4 | July 1 | 4 days | Pending |

**This is a chef-side problem, not a diner-side problem.**

### What's Preventing Chef Response?

Based on the data:
1. Chef has 1 published service (onboarding service with is_onboarding_service=1)
2. Chef hasn't accepted/declined any bookings in 23+ days
3. No payment has been collected

Possible root causes:
- Chef onboarding incomplete (wizard not finished)
- Chef not checking the dashboard
- Chef doesn't understand the booking flow
- Email/notification issue preventing chef from seeing bookings

---

## 3. Product Opportunities Identified

### Opportunity #1: Chef Booking Response Acceleration

**Problem:** Bookings are dying in "pending" state because chefs aren't responding.

**Impact if Solved:** Unblock revenue. Currently 4 bookings × avg $190 = $760 potential revenue stuck.

**Discovery Analysis:**

Looking at the chef-onboarding flow, there are several potential friction points:

1. **Booking notification gap** — Chef may not realize bookings need action
2. **Ambiguous CTA** — "Accept/Decline" buttons may not be clear enough
3. **No urgency signal** — Chef doesn't see how old bookings are

**Recommended Feature: Booking Response Dashboard with Urgency Indicators**

| Element | Current State | Proposed State |
|---------|--------------|----------------|
| Booking card | Shows basic details | Shows "X days waiting" badge in red |
| Response deadline | None | Visual deadline indicator |
| Reminder system | Manual | Auto-reminder after 24h no response |
| Chef notification | Email only | In-app badge + email |

**User Story:**

**As a** chef  
**I want to** see booking requests with clear urgency indicators  
**So that** I can prioritize and respond before diners lose interest

**Scope (MVP):**
- Add urgency badge to chef bookings page showing days since booking received
- Add "Response Reminder" automated email after 24h of no action
- Add in-app notification for new booking requests

**Out of Scope:**
- Auto-decline after X days
- Booking response SLA enforcement
- Diners seeing chef response time

**Acceptance Criteria:**
- [ ] Chef sees "X days waiting" badge on each pending booking card
- [ ] Automated reminder email fires after 24h of no response
- [ ] Chef receives in-app notification when new booking arrives
- [ ] Email contains direct link to booking action page

**Metrics:**
| Metric | Target | How to Measure |
|--------|--------|----------------|
| Chef response rate | 80%+ within 48h | bookings.actioned_at within 48h / total bookings |
| Response time | <24h median | avg time from booking.created_at to first chef action |
| Booking conversion | >60% to confirmed | confirmed / (accepted + confirmed) |

---

## 4. Secondary Opportunity: Lead Quality Notification

**Problem:** 4 new leads (IDs 5-8) are QA test entries with fake emails. These are wasting pipeline space.

**Recommended:** Add lead quality indicator showing "Test lead" vs "Real lead" based on email domain pattern.

*This is lower priority — only relevant if we continue using test data.*

---

## 5. Metrics to Track

| Metric | Current | Target | Notes |
|--------|---------|--------|-------|
| Pending bookings | 4 | <2 | Chef responding |
| Confirmed bookings | 0 | ≥1 | First revenue |
| Revenue | $0 | >$0 | Any money in |
| Booking response time | N/A (no responses) | <24h median | Time to chef action |
| Review submission rate | N/A | 40%+ | When email is live |

---

## 6. Open Questions

| Question | Owner | Priority |
|----------|-------|----------|
| Why isn't Chef Marcel responding? | Need Fred input | P1 |
| Is the chef checking the right email? | Debug | P2 |
| Should we auto-expire stale bookings? | Product decision | P3 |

---

## 7. Definition of Done

- [x] Current state analyzed (4 pending bookings, 0 confirmed, $0 revenue)
- [x] Core blocking issue identified (chef not responding)
- [x] 1 product opportunity defined (Booking Response Acceleration)
- [x] User story written with clear scope
- [x] Acceptance criteria defined (engineer can implement)
- [x] Metrics identified for tracking success

---

*Product Opportunity Discovery — MAI-1235 — Product Manager — 2026-05-07 20:00 UTC*