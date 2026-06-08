# GROWTH-MAI-2720: Add "What Happens Next" Trust Section to Pending Inquiry Page

**Created:** 2026-06-08 06:00 America/New_York
**Status:** Strategy
**Type:** Growth Optimization

## Context

Previous growth work (MAI-2709, MAI-2693, MAI-2677, MAI-2667, MAI-2666, MAI-2654, MAI-2646) covered:
- Quick-View Modal on /chefs → Strategy
- Waitlist → Soft CTA replacement → Strategy
- Urgency Badges on Chef Cards → Strategy
- Mobile Sticky CTA → Proposed
- Social Proof Expansion → Strategy
- Exit Intent Popup → Proposed
- Social Proof Notifications → In Progress
- Hero CTA A/B test (3 variants) → ✅ Running
- Booking Form A/B test (simplified) → ✅ Running
- Schema.org markup → ✅ Implemented

This run identifies a new growth opportunity: **Post-inquiry trust & guidance for pending bookings**.

---

## Growth Idea: "What Happens Next" Section on Pending Inquiry Page

### What

The `/inquiry/[id]` page currently shows pending inquirers only:
- Status badge (yellow "Pending")
- Booking details (date, time, guests)
- No guidance on what to expect or what to do next

**Add a "What Happens Next" trust section** below the booking details card for pending inquiries. It answers the implicit questions every pending diner has:

```
⏱️  Typical Response Time
Your chef typically responds within 24–48 hours.
We'll email you as soon as they confirm or decline.

🔄  If Your Chef Can't Make It
If the chef is unavailable, you can:
• Browse other available chefs on our marketplace
• Modify your date/time and submit a new request

💬  Message Your Chef
Once your booking is confirmed, you can message
your chef directly here to coordinate menu details,
dietary needs, or special requests.

📧  Check Your Email
A confirmation was sent to [diner email].
Check your inbox for updates from your chef.
```

### Why It Works

1. **Reduces post-submission anxiety** — The "what now?" moment is the highest-anxiety point in the booking funnel. After clicking submit, diners enter a void. This section fills that void with clear expectations.
2. **Sets appropriate wait-time expectations** — "24-48 hours" anchors expectations and reduces premature follow-up emails and support tickets.
3. **Keeps users in the funnel** — If the chef can't make it, the section redirects to `/chefs` instead of losing the user entirely. This is a re-engagement opportunity.
4. **Improves perceived platform quality** — Transparent process = trust in the service. A diner who knows what to expect is more likely to return for future bookings.
5. **Reduces support burden** — Clear FAQ-style content reduces "where's my response?" inquiries.
6. **Complements confirmation email** — If/when confirmation email is implemented (MAI-2377, blocked on RESEND_API_KEY), this section reinforces the same trust signals.

### Where It Goes

Below the booking details card on `/inquiry/[id]`, for `inquiry.status === 'pending'` only. Not shown for confirmed/rejected (those states have their own next steps messaging).

---

## Expected Impact

| Metric | Current | Expected | Lift |
|--------|---------|----------|------|
| Support tickets ("when will chef respond?") | baseline | -20-30% | -20-30% |
| /chefs re-browse rate from pending inquiry page | baseline | +10-15% | +10-15% |
| Overall inquiry completion rate (pending→confirmed) | baseline | +5-8% | +5-8% |
| User confidence score (trust signals) | baseline | +10-15% | +10-15% |

**Estimated effort:** 1-2 hours (simple UI addition to existing inquiry page)
**Confidence:** High (low-risk, high-clarity improvement)

---

## Experiment Plan

### Phase 1: Build (1-2 hours)

**Implementation:**
- Modify `src/app/inquiry/[id]/page.tsx` — add "What Happens Next" section below the booking details card
- Only render for `inquiry.status === 'pending'`
- Include 4 trust-building content blocks with icons
- "Browse chefs" link points to `/chefs`
- "Check your email" dynamically shows the inquirer's email

**Files:**
| File | Action |
|------|--------|
| `src/app/inquiry/[id]/page.tsx` | Modify — add pending trust section |

### Phase 2: Measure (2 weeks post-launch)

- Google Analytics event: `pending_inquiry_viewed`
- Check support ticket volume for "when will chef respond?" type inquiries
- Monitor /chefs traffic referred from `/inquiry/[id]` pages
- Compare pending→confirmed conversion rate before/after

---

## Differentiation from Other Growth Work

| Feature | Stage | Funnel Stage |
|---------|-------|--------------|
| Hero CTA A/B | ✅ Running | Top of funnel (acquisition) |
| Booking Form A/B | ✅ Running | Mid-funnel (conversion) |
| Quick-View Modal | Strategy | Browse → inquiry (browse stage) |
| **Pending Inquiry Trust Section** | **This** | **Post-submission (retention/confirmation)** |

This addresses the post-submission gap, distinct from pre-submission improvements (hero, form) and browse-stage improvements (quick-view, urgency badges).

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Section looks like generic FAQ | Use diner's specific email, date, chef name — personalizes the content |
| Over-promises on response time | Use "typically responds within 24-48 hours" (not "will respond within") |
| Confuses users who already got a confirmation | Section only shown for `pending` status, not confirmed/rejected |

---

## Open Questions

1. **Fred's input needed:** Is there data on average chef response time? The "24-48 hours" is an estimate — if actual data exists, we should use it.
2. **Email confirmation:** This section would be strengthened by a confirmed/confirmation email (MAI-2377, blocked on RESEND_API_KEY). Should we prioritize getting the API key first?
3. **Rejection flow:** When a chef rejects an inquiry, does the diner currently get any guidance? If not, a similar trust section for rejected status might be warranted.

---

## Summary

The pending inquiry page (`/inquiry/[id]` with status=pending) is a post-submission blind spot. Diners submit a booking request and immediately enter a high-anxiety void — "did it go through? when will I hear back? what do I do now?"

Adding a "What Happens Next" trust section addresses all three:
- **Did it go through?** → "Check your email" + confirmation message
- **When will I hear back?** → "Typically responds within 24-48 hours"
- **What do I do now?** → "Browse other chefs" + "Message your chef once confirmed"

This is a low-effort, high-clarity improvement that reduces anxiety, keeps users in the funnel, and improves perceived platform quality.

**Estimated effort:** 1-2 hours
**Expected impact:** -20-30% support tickets, +10-15% /chefs re-browse rate, +5-8% inquiry completion
**Next step:** Fred approves → Frontend Engineer implements

---

*Generated by Growth Marketer — MAI-2720*