# Product Opportunity Discovery — MAI-1936

**Issue:** 72d82754-ce0d-4ca9-96b9-aa6f6476c861
**Date:** 2026-05-22 20:00 UTC
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager

---

## 1. Executive Summary

One implementation completed since last cycle. Two critical gaps remain from prior cycles plus a new inquiry modal bug. Infrastructure blockers unchanged — $0 revenue.

| # | Finding | Owner | Priority | Status |
|---|---------|-------|----------|--------|
| 1 | **Bug: Inquiry modal submit has no backend handler** | Frontend | 🔴 High | New |
| 2 | **Chef browse filters — BE done, FE still pending** | Frontend | 🔴 High | Stale |
| 3 | **Guest checkout reviews email verification** | Backend | ✅ Done | Completed |
| 4 | **Infrastructure: STRIPE + RESEND keys missing** | Fred | 🔴 Critical | Unchanged |

---

## 2. Platform State (20:00 UTC May 22)

### Infrastructure Status

| Blocker | Owner | Age | Revenue Impact |
|---------|-------|-----|----------------|
| `STRIPE_SECRET_KEY` | Fred | 90+ days | **$0 revenue** — payments blocked |
| `RESEND_API_KEY` | Fred | 90+ days | All email flows dead |
| `JWT_SECRET` | Fred | ? | Auth tokens may be misconfigured |

**Revenue: $0** — No payment processing capability.

### Active Work

| Task | Owner | Status | Notes |
|------|-------|--------|-------|
| MAI-1890: Chef Browse Filters | FE | in_progress | BE done, FE wiring still pending (since May 21) |
| MAI-1923: Checkout Funnel Audit | Growth | in_progress | Post-booking drop-off analysis |
| MAI-1879: Checkout Credit | BE | in_progress | Credit application at checkout |

### Completed Since MAI-1914 (08:00 UTC)

| Task | Notes |
|------|-------|
| MAI-1917: Guest checkout reviews email verification | ✅ Commit `3c8cea9` — email verification gate added |

---

## 3. Critical Bug — Inquiry Modal Submit Has No Backend Handler 🔴 HIGH IMPACT

### Problem Statement

The inquiry modal (`chef-discovery-page.ts`) fires `inquiry_modal_submit` analytics events on form submission, but the form's submit handler (`handleMultiInquirySubmit`) only validates locally and shows a success message — **it never POSTs to any API endpoint**.

**Confirmed gap:** There is no `POST /api/multi-inquiry` handler wired to the frontend modal. Diners fill out the form, see a success animation, but **no inquiry is actually created in the database**.

### User Story

**As a** diner who filled out the inquiry form,  
**I want** my inquiry to actually reach the chef(s),  
**so that** I can receive a quote and eventually book.

### Confirmed Gap

**Frontend — `src/routes/chef-discovery-page.ts` `handleMultiInquirySubmit` (~line 978):**
```javascript
async function handleMultiInquirySubmit(event) {
  event.preventDefault();
  var formData = new FormData(form);
  var payload = { /* builds payload from form fields */ };
  trackChefDiscoveryEvent({ event: 'inquiry_modal_submit', /* */ });
  // ❌ No fetch() to any API endpoint!
  var modalBody = document.getElementById('inquiryModalBody');
  modalBody.innerHTML = '<div class="success-message">...</div>';
}
```

**Backend:** `src/api/multi-inquiry.ts` exists but frontend never calls it.

### Impact

Every diner who submits the inquiry modal gets a success animation but **no actual inquiry is created**. This is silent data loss — diners believe they've contacted the chef when nothing was saved. This directly kills lead generation.

### Scope

**In:**
- Frontend: `handleMultiInquirySubmit` must `POST /api/multi-inquiry` with form payload
- Frontend: Handle success/error states properly (not just static success div)
- Frontend: Disable submit button during API call to prevent double-submit
- Frontend: Show error message on API failure

**Out:**
- Backend changes (API handler already exists)
- Email notification on inquiry receipt
- Multi-chef inquiry splitting logic (already handled by existing API)

### Acceptance Criteria

- [ ] Form submission calls `POST /api/multi-inquiry` with name, email, guests, date, message, serviceIds
- [ ] Success state shows confirmation after API returns 200
- [ ] Error state shows user-friendly message on failure
- [ ] Submit button disabled during API call
- [ ] `npm run build` passes
- [ ] Inquiry appears in leads database after successful submission

### Edge Cases

| Scenario | Expected |
|----------|----------|
| API returns 200 | Show success message with "chef will respond within 24h" |
| API returns 400 | Show validation error message |
| API returns 500 | Show "something went wrong, please try again" |
| Double-click submit | Button disabled after first click |
| Network timeout | Show timeout error after 10s |

---

## 4. Stale Item — Chef Browse Filters Still Not Wired 🔴 HIGH IMPACT

### Status: Unchanged Since MAI-1914 (12h ago)

MAI-1890 (FE task) has been `in_progress` since May 21 16:00 UTC but **no commits** have been made to complete it. The BE already supports date/partySize/occasion params (confirmed in MAI-1913/MAI-1914), but the frontend only does client-side filtering on preloaded data.

**This means:**
- Date filter only checks `blockedDates` on preloaded services — not real-time
- Guest filter uses client-side logic not verifying against actual `minGuests`/`maxGuests`
- Diners may browse chefs who can't actually accommodate their request

**Recommendation:** Escalate MAI-1890 — it's been pending for 28 hours with no implementation progress.

---

## 5. Guest Checkout Reviews — Email Verification Gate ✅ DONE

MAI-1917 commit `3c8cea9` successfully added the email verification gate for guest checkout users. Guest diners with `emailVerified = false` can no longer submit reviews without verifying first.

**Status:** No longer an open opportunity.

---

## 6. Infrastructure Blockers — Unchanged 🔴 CRITICAL

### Revenue: $0

| Blocker | Owner | Age | Impact |
|---------|-------|-----|--------|
| `STRIPE_SECRET_KEY` | Fred | 90+ days | No payment processing — $0 revenue |
| `RESEND_API_KEY` | Fred | 90+ days | All transactional emails dead |
| `JWT_SECRET` | Fred | ? | Auth token risk |

**Every feature built cannot convert to revenue without Stripe configured.**

### What Fred Needs to Do

```
1. Add STRIPE_SECRET_KEY to .env — single most impactful action
2. Add RESEND_API_KEY to .env — enables all email flows
3. Verify JWT_SECRET is a random 32+ char string
```

Without these, the platform is a proof-of-concept with no monetization path.

---

## 7. Open Questions

| # | Question | Owner | Priority |
|---|----------|-------|----------|
| 1 | Why has MAI-1890 been in_progress for 28h with no commits? | CEO | High |
| 2 | Does MAI-1923 (checkout audit) overlap with MAI-1879 (checkout credit)? | Growth/BE | Medium |
| 3 | Should inquiry modal auto-submit to multiple chefs or just one? | PM | Low |

---

## 8. This Cycle's Recommendations

| # | Action | Owner | Priority |
|---|--------|-------|----------|
| 1 | **FE: Wire inquiry modal to POST /api/multi-inquiry** | Frontend | 🔴 High |
| 2 | **CEO: Investigate MAI-1890 stagnation** (28h in_progress, 0 commits) | CEO | 🔴 High |
| 3 | **Fred: Add STRIPE_SECRET_KEY to .env** | Fred | 🔴 Critical |
| 4 | **Fred: Add RESEND_API_KEY to .env** | Fred | Critical |
| 5 | Verify MAI-1879 (checkout credit) doesn't conflict with MAI-1923 | BE/Growth | Medium |

---

## 9. Definition of Done

- [x] Platform state analyzed (20:00 UTC May 22)
- [x] Active work identified and de-duplicated
- [x] Bug #1 (inquiry modal) scoped with confirmed frontend gap
- [x] Bug #2 (chef browse filters) status verified as stale
- [x] Completed item (MAI-1917) marked done
- [x] Infrastructure blockers surfaced
- [x] Open questions listed
- [x] Issue renamed to reflect actual work
- [x] Status updated to done

---

*MAI-1936 — Product Manager — 2026-05-22 20:00 UTC*
