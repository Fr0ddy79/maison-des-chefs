# POD 05:00 UTC — Diner Lead Status Tracker + Stale Inquiry Escalation

## Context: What I Analyzed

Reviewed the active product state:
- **In progress:** MAI-1700 (Chef notification UI — FE wiring), MAI-1694 (Marcel outreach), MAI-1250 (Stripe instant booking — blocked on Fred's API keys)
- **Recently completed:** MAI-1698 (BE notification system), MAI-1708 (stale lead re-engagement cron for chefs), MAI-1681 (outreach tracker)
- **Critical blockers:** RESEND_API_KEY missing (email dead 57+ days), STRIPE keys missing (payments blocked), Marcel has no contact info on file

## The Problem I'm Identifying

**Diner has zero visibility into lead status after submission.**

Today: Diner submits inquiry → gets confirmation email (if it sends) → then nothing. They don't know if:
- The chef received it
- The chef is actively working on a quote
- The chef declined but email failed
- The lead is stale

This creates two problems:
1. **Diners abandon the platform** when they don't hear back within 24-48h (no awareness that a response is coming)
2. **MAI-1708 (stale lead cron) only nudges chefs** — diners get no proactive communication about status

**This is the missing half of the stale lead problem.** We built chef nudges (MAI-1708), but the diner on the other end of that stale lead is completely left in the dark.

## User Story

> **As a diner**, I want to see where my booking inquiry stands so I can decide whether to wait, follow up, or book elsewhere — **so I'm not left wondering and eventually churn silently.**

> **As a platform**, we want to surface stale inquiry status to diners proactively — **so they don't assume silence = rejection and never come back.**

## Feature Proposal: Diner Lead Status Tracker

### What It Is
A status page the diner can access via a link (emailed after inquiry submission, also visible in "My Bookings"). Shows real-time lead status with clear visual stages and expected response time.

### Status Stages (Visual Tracker)
```
[Inquiry Sent] → [Chef Received] → [Chef Working on Quote] → [Quote Ready] → [Booked/Declined]
      ✓                ?                    ?                    ?              ?
```

### What It Shows Per Stage
| Stage | Signal | Next Expected Action |
|-------|--------|----------------------|
| Inquiry Sent | ✅ Confirmed | "Chef typically responds within 24h" |
| Chef Received | 👁️ Viewed timestamp | "Chef has seen your request" |
| Stale (>12h no response) | ⏰ "Chef hasn't responded yet" | Shows nudge button: "Remind Chef" |
| Quote Ready | 💰 Amount + accept/decline | Links to checkout (MAI-1250) |
| Declined | 📧 Chef declined | "Other chefs available" CTA |

### Stale Inquiry Nudge (Escalation)
When a lead is >12h old and status is still not "responded":
- Show banner: "Taking longer than usual — we'll send a reminder to the chef"
- After 24h: send diner email (via working channel — **not Resend**, use internal notification queue if available, or WhatsApp if on file)
- After 48h: offer diner "re-assign to another chef" option

### MVP Scope

**In:**
- New route: `/lead-status?token=XXX` (token from lead record, sent in confirmation email)
- Status display: current stage + time elapsed
- Stale indicator with "Remind Chef" action (calls existing outreach tracker API — MAI-1681 already has touch tracking)
- If lead is responded: show quote summary (amount, chef message, event details)
- Responsive, minimal UI — mobile-first

**Out:**
- No real-time WebSocket — poll every 60s on page
- No email/SMS integration in v1 (requires Resend fix)
- No re-assignment flow in v1 (requires multi-chef discovery page changes)
- No changes to chef-side UX (MAI-1700 already addresses chef action gap)

## Acceptance Criteria

- [ ] Diner can access `/lead-status?token=XXX` after submitting inquiry
- [ ] Page shows current status stage with elapsed time
- [ ] Stale leads (>12h no chef response) show escalation nudge UI
- [ ] "Remind Chef" button calls outreach API and shows confirmation
- [ ] Responded leads show quote amount + accept/decline links
- [ ] Mobile-responsive
- [ ] No console errors, graceful degradation if lead not found

## Metrics

| Metric | Baseline | Target |
|--------|----------|--------|
| Diner lead abandonment rate | ~60% (est.) | <40% after 48h |
| Diner "Remind Chef" click rate on stale leads | N/A (new) | >15% |
| Quote response rate | ~45% (est.) | >55% (via nudge) |

## Open Questions

| # | Question | Blocking? |
|---|----------|-----------|
| OQ-1 | Can we reliably email diners without RESEND_API_KEY? | **YES** — if not, use existing diner notification table as queue |
| OQ-2 | Is there an outreach API endpoint to trigger a nudge touch? | No — MAI-1681 tracks touches but doesn't have a "reminder" trigger |
| OQ-3 | Should stale status also appear in "My Bookings" for logged-in diners? | Nice to have, defer to v2 |
| OQ-4 | What's the re-assignment flow? | v2 — needs chef discovery integration |

## Why This Is MVP-Level

- Reuses existing infrastructure: lead status data already exists in DB, outreach tracker (MAI-1681) can track reminder touches
- No new tables needed — `leads.accessToken` already exists for diner-facing links
- Chef-side already has notifications (MAI-1700) — this is the missing diner-side mirror
- Limited scope: one new page, status display logic, one new button → estimate 2-3h

## Why Not the Other Options I Considered

1. **Lead quality scoring** —有价值 but requires ML/ranking logic; too complex for current product stage
2. **Instant booking with pre-set availability** — blocked on Stripe keys AND requires significant UX redesign
3. **Chef activation nudges** — MAI-1708 already handles chef side; this is the diner-side complement

## Recommendation Priority

| Priority | Feature | Reason |
|----------|---------|--------|
| **This POD** | Diner Lead Status Tracker | Closes the loop on stale leads from both sides; small scope |
| 2nd | Lead Quality Scoring | Helps chefs prioritize, but requires data analysis pass first |
| 3rd | Instant Booking v1 completion | Blocked on Fred for Stripe keys — can't ship until resolved |

---

*Generated by: Product Manager Agent (Max)*
*Model: MiniMax-M2.7*
*Date: 2026-05-18 05:00 UTC*
*Issue: MAI-1722*