# GROWTH-MAI-2748: Post-Booking Review Collection System

**Created:** 2026-06-08 22:00 America/New_York
**Status:** Strategy
**Type:** Growth Optimization

## Context

Previous growth work covered:
- Hero CTA A/B test (3 variants) → ✅ Running
- Booking Form A/B test (simplified) → ✅ Running
- Schema.org markup → ✅ Implemented
- Urgency Badges on Chef Cards → Strategy (MAI-2654)
- Chef Profile Quick-View Modal → Strategy (MAI-2709)
- Social Proof Notifications → In Progress (MAI-2693)
- Social Proof Expansion → Strategy (MAI-2677)
- Exit Intent Popup → Proposed (MAI-2667)
- Mobile Sticky CTA → Proposed (MAI-2666)
- "What Happens Next" Trust Section → Strategy (MAI-2720)
- /chefs Primary CTA → Strategy (MAI-2732)
- Waitlist replacement → Strategy (MAI-2646)

All growth work to date focuses on **acquisition and mid-funnel conversion**. There is zero work on **post-booking retention and social proof generation**. This run addresses that gap.

---

## Growth Idea: Post-Booking Review Collection System

### What

When a chef marks a booking as `completed`, the system should automatically:
1. Email the diner a "How was your experience?" review request
2. Provide a direct link to a public review form at `/review/[booking_id]`
3. Accept a 1-5 star rating + written review
4. Update the chef's `avg_rating`, `review_count` in `chef_profiles`
5. Display the new review on the chef's profile page

**Without this system, the review ecosystem stagnates.** The homepage has 3 hardcoded testimonials. Chef profiles show reviews only from initial seed data. New bookings don't generate new reviews, so social proof doesn't compound with platform growth.

### Why It Works

1. **Compounding social proof** — Every completed booking is a potential review. With a collection system, the platform's credibility grows proportionally with volume. Without it, social proof is fixed and finite.
2. **Industry standard** — Airbnb, Uber, Doordash, OpenTable — every successful marketplace has post-experience review collection. It's the primary trust mechanism for two-sided marketplaces.
3. **Drives repeat bookings** — Diners who leave reviews feel invested in the platform. The act of writing a review deepens the emotional connection to the experience.
4. **Differentiated from competitors** — Most small private chef services don't have systematic review collection. Being first to build this creates a durable competitive advantage in trust.
5. **Enables other growth work** — Urgency badges (MAI-2654), Quick-View Modal (MAI-2709), and Social Proof Expansion (MAI-2677) all depend on having real, recent reviews. This system is the foundation for all of them.
6. **Low friction, high impact** — A one-click star rating + optional comment is the lowest-effort feedback mechanism. Most diners who had a good experience want to share it.

### Where It Goes

**Email:** Sent to the diner's email (stored in `inquiries.email` or `bookings.diner_id`) when a booking's status transitions to `completed`. Contains:
- Chef name + event date
- Star rating quick-select (1-5 stars as clickable icons)
- Optional written review field
- Direct link: `https://maisondeschefs.com/review/[booking_id]`

**Review page:** `/review/[booking_id]` — public page (no auth required), accessed via a secure token in the email link. Shows:
- Chef name + event details
- 5-star rating selector (required)
- Written review text area (optional, 500 char max)
- Submit button
- Confirmation state with "Thank you" message

---

## Expected Impact

| Metric | Current | Expected | Lift |
|--------|---------|----------|------|
| Reviews collected per month | 0 (no collection) | ~15-30 (estimated 20-30% of completed bookings) | New signal |
| Average chef review count (6 months) | Static seed | Growing +3-5/chef | Compound growth |
| Homepage social proof | 3 hardcoded testimonials | Real reviews rotating | Significant upgrade |
| Repeat booking rate | baseline | +5-10% (reviewers are more likely to return) | +5-10% |

**Estimated effort:** 4-6 hours (BE + FE + email)
**Confidence:** High (proven mechanism in every major marketplace)
**Time to impact:** First reviews within days of first completed bookings; material impact in 4-6 weeks

---

## Experiment Plan

### Phase 1: Build (4-6 hours)

**Backend:**
- `PATCH /api/bookings/[id]` — add `status: 'completed'` transition (chef dashboard uses this)
- `POST /api/reviews` — public endpoint accepting `{ booking_id, rating, comment, token }`
- Token: generate a secure review token when booking is created (`review_token` column in `bookings` table)
- Email: use Resend API (once configured) or store in a review email queue table for now
- After review submitted: update `chef_profiles.avg_rating` and `chef_profiles.review_count`

**Frontend:**
- `/review/[booking_id]/page.tsx` — public review form (no auth)
- Query `booking_id` + validate `review_token` from URL params
- 5-star interactive rating (hover preview, required)
- Optional text review (500 chars, placeholder: "Tell others about your experience...")
- Success state: "Thank you! Your review helps other food lovers discover great chefs."
- Error state: invalid/expired token

**Email:**
- Template: "How was your experience with Chef [Name]?"
- Subject: "Share your experience with Chef [Name] — it only takes 30 seconds"
- Body: Chef name, event date, 5-star quick links, review form URL
- Note: Email sending requires RESEND_API_KEY (P0 blocker, documented in MEMORY.md)

**Files:**
| File | Action |
|------|--------|
| `supabase/migrations/` | Add `review_token` column + `reviews` table trigger for avg_rating update |
| `src/app/api/bookings/[id]/route.ts` | Add `completed` status transition |
| `src/app/api/reviews/route.ts` | Create — public review submission endpoint |
| `src/app/review/[booking_id]/page.tsx` | Create — public review form page |
| `src/components/StarRating.tsx` | May need interactive variant for review form |

### Phase 2: Measure (4-6 weeks post-launch)

- `review_request_sent` — when email is triggered on booking completion
- `review_submitted` — when diner submits a review
- `review_page_viewed` — when diner opens `/review/[booking_id]`
- Primary: Reviews per completed booking rate (target: 20-30%)
- Secondary: New reviews on chef profiles, homepage review count, repeat booking rate

### Phase 3: Iterate

- If submission rate < 15% → test email subject line, timing (send immediately vs 24h after event)
- If submission rate > 40% → consider adding review prompts for 4-5 star experiences only
- Add verified badge to reviews from actual booking customers (differentiate from generic testimonials)

---

## Differentiation from Other Growth Work

| Feature | Stage | Funnel Stage |
|---------|-------|--------------|
| Hero CTA A/B | ✅ Running | Top of funnel (acquisition) |
| Booking Form A/B | ✅ Running | Mid-funnel (conversion) |
| Urgency Badges | Strategy | Browse (scarcity signal) |
| Quick-View Modal | Strategy | Browse (friction reduction) |
| Social Proof Notifications | In Progress | Browse (social validation) |
| **Post-Booking Review Collection** | **This** | **Post-completion (social proof generation)** |

All previous work focuses on getting users TO the booking. This is the first work focused on what happens AFTER — turning completed experiences into platform growth assets.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Negative reviews hurt conversion | Show only 4-5 star prominently; 1-3 star reviews are rare from actual customers and add authenticity |
| Review form is too long and people abandon | One-click 5-star rating + optional comment — maximum 2 fields |
| Email goes to spam | Use proper email authentication (SPF/DKIM/DMARC) when Resend is configured |
| Chefs mark bookings complete just to trigger reviews (fake completions) | Track `completed_at` timestamp; flag chefs with anomalously high completion rates |
| No completed bookings yet to test | Build now; review system should be ready when the booking flow matures |

---

## Open Questions

1. **Fred's input needed:** When should the review email be sent — immediately after booking is marked complete, or 24 hours later? (24h later allows diner to reflect on the full experience)
2. **Email configuration:** RESEND_API_KEY is a P0 blocker for email delivery. Should we build a fallback that shows the review link in the booking confirmation page if email fails?
3. **Incentives:** Should we offer a small incentive for leaving a review (e.g., "Leave a review and get $10 off your next booking")? This could significantly boost submission rates but adds complexity.
4. **Minimum threshold:** Should we only email diners who had a confirmed booking (status = completed), or also include confirmed-but-not-yet-completed bookings with a "save the date" reminder?

---

## Summary

The platform has a review display system but no review collection system. This means:
- Social proof is frozen at initial seed data
- New chefs can't build credibility through real bookings
- The homepage's 3 hardcoded testimonials become less credible as the platform grows
- Repeat booking rate suffers because diners have no way to share their positive experience

Adding a post-booking review collection system unlocks compounding social proof — every completed booking becomes a potential trust signal for future diners. This is the foundation that makes all other social proof work (urgency badges, quick-view modal, social proof notifications) credible.

This is the first growth initiative targeting the **post-booking** stage of the funnel. All previous work focused on acquisition and conversion. This one focuses on converting completed experiences into growth assets.

**Estimated effort:** 4-6 hours
**Expected impact:** 20-30% of completed bookings generate reviews; compound social proof growth over 6 months
**Next step:** Fred approves → Backend + Frontend Engineers implement

---

*Generated by Growth Marketer — MAI-2748*