# GROWTH-MAI-2693: Replace Waitlist Section with Soft Engagement CTA

**Created:** 2026-06-08 04:00 UTC
**Status:** Strategy
**Type:** Growth Optimization

## Context

Previous growth work (MAI-2677, MAI-2667, MAI-2666, MAI-2654, MAI-2646) covered:
- Urgency Badges on Chef Cards → Strategy
- Mobile Sticky CTA → Proposed
- Social Proof Expansion → Strategy
- Exit Intent Popup → Proposed
- Social Proof Notifications → In Progress
- Hero CTA A/B test (3 variants) → ✅ Running
- Booking Form A/B test (simplified) → ✅ Running
- Schema.org markup → ✅ Implemented

This run identifies a new growth opportunity: **Homepage Waitlist Section Replacement**.

---

## Growth Idea: Replace Pre-Launch Waitlist with Soft Engagement CTA

### What

The homepage contains a WaitlistCapture section (inline after hero image) with pre-launch messaging:
- "Stay in the Loop"
- "Get early access updates and chef announcements"
- "Join our community of food lovers"
- Success message: "We'll notify you when we launch"

**This messaging is stale.** The product is live — users can book chefs today. The waitlist:
1. Confuses users about whether the product is available
2. Extracts emails into a list that likely goes unmonetized
3. Captures "interested but not ready" users into a dead-end funnel
4. Competes with the primary booking CTA

### Proposed Change

Replace the WaitlistCapture section with a **soft engagement CTA** that keeps users on the booking path:

**Option A (Recommended): "Still Exploring?" Section**
```
Not ready to book yet?

Browse our full chef gallery to see who's available, 
read reviews, and explore different cuisines — no commitment required.

→ Explore All Chefs
```

**Option B: "See What Guests Say" Section**
Replace waitlist with a single featured review carousel, linking to full testimonials section.

**Option C: Remove Entirely**
The section is redundant with the hero CTA above and bottom CTA below. Simply removing it shortens the page and reduces decision fatigue.

### Why It Works

1. **Eliminates confusion** — No more "when we launch" messaging for a live product
2. **Keeps users in funnel** — Instead of email capture, direct to /chefs or testimonials
3. **Reduces friction** — "No commitment required" lowers the barrier to continuing to browse
4. **Shortens page** — Fewer sections = less scroll fatigue = higher bottom-CTA visibility
5. **Matches user intent** — Users who scroll this far are interested; give them a next step, not an email form

### Where It Goes

Replace the existing WaitlistCapture section location (max-w-6xl mx-auto px-6 pb-20, inside the hero section after the hero image).

---

## Expected Impact

| Metric | Current | Expected | Lift |
|--------|---------|----------|------|
| /chefs traffic from homepage | baseline | +8-12% | +8-12% |
| Email capture volume | baseline | -60-80% (eliminated) | -60-80% |
| Bottom CTA click-through | baseline | +5-8% | +5-8% |
| Overall scroll depth | baseline | +5-10% | +5-10% |

**Note:** Email capture loss is acceptable because:
- The captured emails are from pre-launch and likely unmonetized
- Each captured user represents lost booking opportunity
- Better to funnel users to /chefs than capture them in a dead-end waitlist

**Estimated effort:** 1-2 hours (remove WaitlistCapture, add soft CTA text/link)
**Confidence:** High (zero-risk change — can always add email capture back if needed)

---

## Experiment Plan

### Phase 1: Build (1 hour)

**Implementation:**
- Modify `src/app/page.tsx` — replace `<WaitlistCapture />` component with soft engagement text + link
- Keep the section container styling for consistency
- Link text: "Explore All Chefs →" pointing to `/chefs`
- Alternative text option: "See What Guests Say →" pointing to testimonials section

**Files:**
| File | Action |
|------|--------|
| `src/app/page.tsx` | Modify — replace WaitlistCapture with soft CTA |

### Phase 2: Test (Not applicable)

This is a one-way door change (messaging alignment, not A/B testable hypothesis). Monitor metrics post-launch:
- Google Analytics events: `hero_cta_clicked`, `chefs_page_viewed`, `booking_inquiry_started`
- Compare /chefs traffic from homepage before and after (2-week window)

### Phase 3: Measure (2 weeks)

- Monitor homepage → /chefs conversion rate
- Monitor bottom CTA section engagement
- Check for any increase in booking inquiries (primary KPI)

---

## Differentiation from Other Growth Work

| Feature | Stage | Funnel Stage |
|---------|-------|--------------|
| Hero CTA A/B | ✅ Running | Hero (top) |
| Booking Form A/B | ✅ Running | Booking (bottom) |
| Social Proof Notifications | In Progress | Browse |
| Mobile Sticky CTA | Proposed | Mobile scroll |
| Exit Intent Popup | Proposed | Bounce recovery |
| **Waitlist → Soft CTA** | **This** | **Hero continuation** |

The waitlist replacement addresses a specific gap: users who don't convert on the hero CTA but are still engaged. Instead of capturing their email for a dormant list, we redirect them to continue browsing.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Email list loss | Acceptable — pre-launch list is unmonetized; new captures go to CRM if/when email program relaunches |
| Some users genuinely want updates | Add small text: "Want updates? Browse new chefs every week →" (links to /chefs) |
| Reduced "community" feeling | Soft CTA still builds engagement — users browsing = users retained |
| Lower email capture volume | Email volume is vanity metric; booking inquiries are the real KPI |

---

## Open Questions

1. **Fred's input needed:** What was the original purpose of the waitlist? Is the email list being used for anything?
2. **Alternative:** Should we keep a lightweight version (email capture) but update the messaging to "Get new chef announcements" instead of "When we launch"?
3. **Timing:** Is now the right time to make this change, or should we wait for a bigger homepage refresh?

---

## Summary

The WaitlistCapture section is a pre-launch remnant with messaging ("When we launch", "Early access") that contradicts the live product. Replacing it with a soft engagement CTA ("Not ready? Browse our chef gallery →") will:
- Eliminate user confusion about product availability
- Keep engaged users in the booking funnel instead of extracting them to a dormant email list
- Shorten the homepage (fewer sections = less scroll fatigue)
- Drive more traffic to /chefs where conversion happens

This is a low-effort, high-clarity improvement that aligns homepage messaging with actual product status.

**Estimated effort:** 1-2 hours
**Expected impact:** +8-12% /chefs traffic, eliminated confusion, cleaner funnel
**Next step:** Fred approves → Frontend Engineer implements

---

*Generated by Growth Marketer — MAI-2693*