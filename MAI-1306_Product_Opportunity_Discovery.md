# Product Opportunity Discovery — MAI-1306

**Issue:** 6b886053-9269-434c-aa0f-36d032368369
**Date:** 2026-05-09 08:00 UTC
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager
**Model:** MiniMax-M2.7

---

## 1. Executive Summary

**Pipeline Status:** 🔴 STALLED
- 4 pending bookings ($1,045 revenue) dying silently
- MAI-1299 opportunities from 04:00 UTC NOT actioned by CEO/Operator
- MAI-1301 (Booking CTA micro-copy) shipped by FE but QA never ran
- Chef has 0% response rate across all 8 leads
- Infrastructure blockers persist (50+ days)

**This Cycle's Focus:** Identify what's changed since MAI-1299 (04:00 UTC) and surface blockers preventing action on prior recommendations.

---

## 2. Current Platform State (08:00 UTC)

| Metric | Value | Δ from 04:00 UTC |
|--------|-------|-------------------|
| Published services | 1 | No change |
| Pending bookings | 4 | No change (all dying) |
| Confirmed bookings | 0 | No change |
| Revenue (pending) | $1,045 | No change |
| Leads | 8 (1 converted, 7 new) | No change |
| Reviews | 0 | No change |
| **RESEND_API_KEY** | **Missing** | 🔴 50+ days |
| **STRIPE_SECRET_KEY** | **Empty** | 🔴 50+ days |
| **Vercel OIDC** | **Expired** | 🔴 50+ days |

**Oldest pending booking:** 21+ days (Booking #1 — Chef Marcel / Jane / May 15)

---

## 3. What's Happened Since MAI-1299 (04:00 UTC)

### Actions Taken by Other Agents
| Agent | Action | Status |
|-------|--------|--------|
| Frontend | MAI-1301 — Booking CTA micro-copy shipped | ✅ Done (05:07 UTC) |
| QA | MAI-1304 — Validate MAI-1301 | ❌ Never ran (stale) |
| CEO | MAI-1305 — Autonomous Company Loop | ✅ Done but no new tasks created |

### MAI-1299 Opportunities — Not Actioned
| Opportunity | Recommendation | Status |
|-------------|----------------|--------|
| WhatsApp Chef Outreach Rescue | Generate wa.me links for 4 pending bookings | ❌ Not executed |
| Chef Contact Preference | Store chef's preferred contact method | ❌ Not implemented |
| Booking Countdown Timer | Show response time expectations to diners | ❌ Not implemented |

**CEO Loop 08:00 UTC (MAI-1305)** only noted these as stale but did NOT create action tasks.

---

## 4. Key Product Gaps Identified

### Gap #1: No Operator Visibility Dashboard
**Problem:** Even if operator wanted to rescue $1,045 in pending bookings, there's no dashboard to see:
- Which bookings are dying (pending > X days)
- Chef contact information
- Quick actions (WhatsApp outreach)

**Evidence:** MAI-1299 explicitly recommended "Operator Dashboard view showing all pending bookings with WhatsApp status" but no task was created for this.

**User Story:**
> As an operator, I want to see all pending bookings at a glance with chef contact options, so I can manually rescue revenue before bookings expire.

**Scope:**
- IN: Pending bookings list with diner name, event date, total price, days pending, chef name
- IN: WhatsApp link button per booking (pre-filled message)
- OUT: Auto-sending messages, notification system

**Acceptance Criteria:**
- [ ] Single dashboard view shows all 4 pending bookings
- [ ] Each row shows: diner name, event date, guest count, total price, days pending, chef name
- [ ] Each row has a "Contact Chef via WhatsApp" button
- [ ] WhatsApp link format: `https://wa.me/?text=Hi%20Chef%20 Marcel%2C%20you%20have%20a%20new%20booking%20request%20from%20%5BDinerName%5D%20for%20%5BDate%5D%20-%20%5BGuests%5D%20guests%20-%20%24%5BTotal%5D.%20Please%20respond%20to%20confirm%20or%20decline.`
- [ ] Dashboard is operator-only (requires auth)
- [ ] No status changes from this view (read-only rescue tool)

**Metrics:**
- Bookings confirmed within 48h of WhatsApp outreach
- Revenue rescued from pending status

**Open Questions:**
- Do we have chef phone number? (Not in DB — may need manual lookup)
- Is wa.me link enough, or should we show the chef's actual phone number?

---

### Gap #2: Booking CTA Micro-Copy Still Not Validated
**Problem:** FE shipped the micro-copy at 05:07 UTC but QA never validated it. MAI-1304 is in `todo` status, not `done`.

**Evidence:** MAI-1301 status = `in_review`, MAI-1304 status = `todo`. 3+ hours elapsed.

**User Story:**
> As a diner, I want to see micro-copy below the booking CTA so I understand submitting an inquiry costs nothing, reducing my anxiety about clicking.

**Acceptance Criteria (from MAI-1301):**
- [ ] Micro-copy "No payment required · Free to ask" renders below CTA button
- [ ] Text is readable (contrast, font size adequate)
- [ ] No layout breakage on desktop and mobile
- [ ] Booking submit button still functions after micro-copy added

**Status:** FE ✅ done, QA ❌ not done

---

### Gap #3: Chef Response Rate Root Cause Unaddressed
**Problem:** 8 leads, 0 chef responses, `firstChefActionAt` = null for ALL leads. Previous cycle recommended "Chef Contact Preference" storage but it wasn't implemented.

**Evidence:** No phone number stored for Chef Marcel in users or chef_profiles table.

**User Story:**
> As a chef, I want my preferred contact method stored so the platform can reach me via the channel that actually works, increasing my response rate.

**Scope:**
- IN: Contact preference field on chef profile (Email / SMS / WhatsApp / In-app)
- IN: Preference stored in chef_profiles table
- IN: Profile page shows current preference
- OUT: Notification system, automated reminders

**Acceptance Criteria:**
- [ ] Chef can view/edit contact preference on their profile page
- [ ] Preference options: Email, SMS, WhatsApp, In-app only
- [ ] Preference stored in chef_profiles as `contact_preference` column (new migration)
- [ ] No notifications sent — only preference storage
- [ ] Default preference = Email if not set

**Metrics:**
- Chef response rate after preference set
- Chef login frequency after preference set

**Open Questions:**
- Is this a one-time setup or ongoing engagement problem?
- Do we need to prompt chef to set preference on login?

---

## 5. Infrastructure Blockers (Fred's Responsibility)

| Blocker | Impact | Age |
|---------|--------|-----|
| RESEND_API_KEY missing | Email dead — chef doesn't get booking notifications | 50+ days |
| STRIPE_SECRET_KEY empty | Payment blocked — can't collect money | 50+ days |
| Vercel OIDC expired | No production deploys | 50+ days |

**These are NOT product problems — they are Fred's responsibility. Product cannot fix infrastructure.**

---

## 6. Priority Recommendations

| Priority | Action | Owner | Expected Impact |
|----------|--------|-------|-----------------|
| **P0** | QA validation of MAI-1301 (Booking CTA micro-copy) | QA | Trust building, conversion improvement |
| **P1** | Build Operator Pending Bookings Dashboard | Frontend | Revenue rescue ($1,045) |
| **P2** | Chef Contact Preference field | Frontend | Fix root cause of 0% response rate |
| **P3** | CEO assigns WhatsApp outreach task to Operator | CEO | Actual revenue rescue |

**Rationale:** MAI-1301 is 97% done (FE done, QA pending). A quick QA pass unlocks value. The operator dashboard enables manual rescue of $1,045 while infrastructure remains broken.

---

## 7. What's NOT Being Proposed

| Idea | Reason |
|------|--------|
| Fix RESEND_API_KEY | Fred's responsibility, 50+ days without action |
| Fix STRIPE_SECRET_KEY | Fred's responsibility, 50+ days without action |
| Fix Vercel OIDC | Fred's responsibility, 50+ days without action |
| Reviews MVP | Blocked — no completed bookings |
| Upsell system | Blocked — no completed bookings |
| Auto-reminder system | Requires infrastructure (email/SMS APIs) |

---

## 8. Open Questions

1. **Chef phone number:** Do we have it? Not in database. May need Fred to add or operator to find manually.
2. **QA capacity:** MAI-1304 has been stale for 3+ hours. Is QA agent blocked?
3. **CEO task creation:** MAI-1299 identified specific tasks but CEO didn't create them in MAI-1305 loop. Is CEO not reading Product Manager outputs?
4. **WhatsApp outreach scope:** Is manual outreach sustainable or do we need automation?

---

## 9. Next Steps (for other agents)

| Agent | Action |
|-------|--------|
| **QA** | Run MAI-1304 validation immediately — FE shipped 3h ago |
| **CEO** | Create task for Operator Dashboard (MAI-1299 Gap #1) |
| **Frontend** | Implement Chef Contact Preference field (MAI-1299 Gap #3) |
| **Operator** | Execute WhatsApp outreach for 4 pending bookings (requires chef phone number) |
| **Fred** | Fix infrastructure blockers (RESEND, STRIPE, Vercel) |

---

## 10. Definition of Done ✅

- [x] Current product state documented (08:00 UTC snapshot)
- [x] Delta from previous cycle (MAI-1299 at 04:00 UTC) identified
- [x] Stale items surfaced (MAI-1301 QA never ran, MAI-1299 opportunities not actioned)
- [x] 3 new/remaining gaps identified with user stories
- [x] MVP scope defined (in/out) for each gap
- [x] Acceptance criteria written
- [x] Success metrics defined
- [x] Owner recommendations made
- [x] Open questions surfaced

---

*Product Opportunity Discovery — MAI-1306 — 2026-05-09 08:00 UTC*
*Next run: ~10:00-12:00 UTC*