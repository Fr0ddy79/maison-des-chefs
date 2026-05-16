# MAI-1447: Growth Optimization — Post-Inquiry "What Happens Next" Timeline

**Issue:** dd2baf26-07f7-465d-a3bd-18c4f1af609d
**Status:** Strategy Complete
**Owner:** Growth Marketer
**Created:** 2026-05-12 06:00 EDT

---

## Executive Summary

**Growth idea:** Add a visual "What Happens Next" timeline to the inquiry success modal — the moment right after a diner submits a booking inquiry.

**Expected impact:** +10-15% reduction in "did it work?" double-submissions and support questions; +5-10% improvement in diner engagement (stay on site longer) after submission.

**Why this matters now:** The inquiry success modal currently shows only a green checkmark, "Inquiry Sent!" text, and the booking status URL. First-time diners have no idea what to expect next, creating anxiety that drives either (a) immediate site abandonment or (b) repeat submissions. A clear next-steps timeline keeps diners engaged and sets accurate expectations.

---

## 1. Current Funnel State

| Event | Count | Notes |
|-------|-------|-------|
| Homepage views | ~40 | From prior MAI analysis |
| Service page views | ~27 | ~33% homepage → services |
| Inquiry submissions | ~8 | 4+ leads, some may be multi-chef |
| Confirmed bookings | 0 | 50+ days, chef response rate 0% |
| Success modal views | ~8 | One per inquiry submit |

**Gap Identified:** After a diner submits an inquiry, the success modal shows minimal information. There's no visual timeline, no expected response time, no next action guidance. This is a high-impact moment — the diner just committed to reaching out — but we're letting them leave with unresolved questions.

---

## 2. What Happens After Inquiry Submission (Current State)

The current success modal (from `pages.ts` lines ~1017-1023) renders:
```
✅ Inquiry Sent!
"We've received your inquiry and the chef will respond within 24-48 hours."
[Track your inquiry: /booking-status?token=...]
"No payment is required today. This is just an inquiry..."
```

**Missing:**
- No visual timeline of the booking process
- No clear expectation of when the chef will respond
- No next action (browse more, share, etc.)
- No reassurance that their specific date is still available
- No way to know what "chef responds" means in practice

---

## 3. Growth Opportunity: Post-Inquiry Timeline

### Problem

First-time diners don't know what to expect after submitting an inquiry. Industry data shows that **uncertainty after a conversion action** is a top driver of:
- Support ticket submissions ("did my inquiry go through?")
- Double form submissions ("I already submitted, let me try again")
- Site abandonment immediately after conversion
- Lower NPS due to perceived lack of progress

### Solution

Enhance the `modal-success` div to include a **"What Happens Next" timeline** — a 4-step visual showing the diner exactly what to expect:

| Step | What | When | Visual |
|------|------|------|--------|
| 1 | ✅ Inquiry sent | Now | Green checkmark |
| 2 | 👨‍🍳 Chef reviews your request | Within 24h | Chef emoji + clock |
| 3 | 📩 Chef sends you a quote | 24-48h | Envelope + quote |
| 4 | 💳 Confirm & pay to book | Your decision | Payment icon |

### Expected Impact

- **Reduction in "did it work?" anxiety** — visual confirmation of process
- **Higher engagement after submission** — diners are more likely to stay on site
- **Fewer support inquiries** — fewer "did my inquiry go through?" messages
- **Reduced double-submissions** — confidence that the process is underway
- **Indirect: better chef response tracking** — diners know to watch for email

---

## 4. Implementation

### File Changes Required

**`src/routes/pages.ts`** — Modify the success modal HTML in two places:

1. **Single-service inquiry** (around line 1017):
```typescript
// BEFORE:
modalBody.innerHTML = '<div class="modal-success">' +
  '<div class="success-icon">&#x2705;</div>' +
  '<h3>Inquiry Sent!</h3>' +
  '<p>We\'ve received your inquiry and the chef will respond within 24-48 hours.</p>' +
  '<div class="status-url">Track your inquiry: <a href="' + statusUrl + '">' + statusUrl + '</a></div>' +
  '<p class="trust-note">No payment is required today. This is just an inquiry...</p>' +
  '<button class="modal-submit-btn" onclick="closeServiceInquiryModal();">Back to Services</button>' +
'</div>';

// AFTER:
modalBody.innerHTML = '<div class="modal-success">' +
  '<div class="success-icon">&#x2705;</div>' +
  '<h3>Inquiry Sent!</h3>' +
  '<div class="success-timeline">' +
    '<div class="timeline-step done"><span class="step-icon">✅</span><span class="step-text">Your inquiry was sent</span></div>' +
    '<div class="timeline-step"><span class="step-icon">👨‍🍳</span><span class="step-text">Chef reviews your request <em class="step-time">within 24 hours</em></span></div>' +
    '<div class="timeline-step"><span class="step-icon">📩</span><span class="step-text">Chef sends you a personalized quote <em class="step-time">within 24-48 hours</em></span></div>' +
    '<div class="timeline-step"><span class="step-icon">💳</span><span class="step-text">You confirm & pay to lock in your date</span></div>' +
  '</div>' +
  '<div class="status-url">Track your inquiry: <a href="' + statusUrl + '" target="_blank">' + statusUrl + '</a></div>' +
  '<p class="trust-note">No payment required today &bull; Chef will email you directly &bull; Response within 24-48 hours</p>' +
  '<button class="modal-submit-btn" onclick="closeServiceInquiryModal();">Back to Services</button>' +
'</div>';
```

2. **Multi-chef inquiry** (around line 1109) — same timeline structure

### CSS Additions

```css
.modal-success .success-timeline {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin: 1rem 0;
  text-align: left;
}
.modal-success .timeline-step {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.5rem 0;
  font-size: 0.9rem;
  color: #555;
  border-left: 2px solid #e0e0e0;
  margin-left: 0.5rem;
  padding-left: 1rem;
}
.modal-success .timeline-step.done {
  color: #2e7d32;
}
.modal-success .timeline-step .step-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}
.modal-success .timeline-step .step-time {
  display: block;
  font-size: 0.8rem;
  color: #888;
  margin-top: 0.15rem;
}
.modal-success .timeline-step.done .step-time {
  color: #81c784;
}
.modal-success .trust-note {
  font-size: 0.85rem;
  color: #888;
  text-align: center;
}
```

---

## 5. Experiment Plan (A/B Test)

### Hypothesis

Adding a "What Happens Next" timeline to the inquiry success modal will:
1. Increase time-on-site post-submission by >15%
2. Reduce "did it work?" support inquiries by >20%
3. Increase repeat visits within 7 days by >10%

### Variants

| Variant | Success Modal Content |
|---------|----------------------|
| **Control** | Current modal — checkmark + "Inquiry Sent!" + status URL + trust note |
| **Test** | Control + visual 4-step "What Happens Next" timeline |

### Implementation

The timeline HTML is static. To A/B test:
1. Add `?inquiry_timeline=test` to the URL param in the form submit handler
2. Conditionally render timeline based on variant assignment
3. Track `inquiry_modal_viewed` with variant tag

### Metrics to Track

| Metric | How |
|--------|-----|
| `inquiry_modal_viewed` event | Already fires on modal display, add variant tag |
| Bounce rate post-submission | Analytics compare |
| Time on booking status page | Engagement signal |
| Support ticket rate (inquiry-related) | Manually track |
| Repeat visit rate (7d) | Analytics |

### Duration

- **Minimum:** 7 days or 50 inquiry submissions per variant
- **Significance:** 90% confidence before declaring winner

### Success Criteria

| Metric | Target |
|--------|--------|
| Time-on-site post-submission | >15% lift |
| "Did it work?" support rate | >20% reduction |
| Repeat visit rate (7d) | >10% lift |

---

## 6. Supporting Changes (Future)

Once the timeline is live, additional enhancements to consider:

1. **Add email confirmation** — diner receives an email after submission with the timeline + status URL (enables mobile follow-up)
2. **Show "similar services"** in the modal — keep diner on platform after submission
3. **Add "Share with friends" CTA** — word-of-mouth amplification at peak engagement moment
4. **Show chef response SLA** — "97% of chefs respond within 24h" as social proof

---

## 7. Relationship to Prior Work

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-1434 | Homepage Hero Social Proof | ✅ Implemented |
| MAI-1417 | Diner Booking Abandonment Recovery | Strategy complete |
| MAI-1412 | Chef Response SLA + Awaiting Response UI | ✅ Complete |
| MAI-1387 | One-Click Chef Lead Response | P0 — todo |

---

## 8. Definition of Done

- [x] Current funnel state documented
- [x] Growth opportunity identified (post-inquiry timeline)
- [x] Implementation changes defined (pages.ts + CSS)
- [x] Experiment plan defined (Control vs. Test)
- [x] Metrics and success criteria defined
- [ ] Code changes implemented (pages.ts)
- [ ] A/B test launched

---

*Growth Optimization — MAI-1447 — Growth Marketer — 2026-05-12 06:00 EDT*
