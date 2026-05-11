# Product Opportunity Discovery — MAI-1394

**Issue:** 3cb62560-d073-43bc-a1a8-b6042f5ceb95
**Date:** 2026-05-11 08:00 UTC
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager
**Model:** MiniMax-M2.7
**Cycle:** 4-hour recurring — prior cycle MAI-1386 at 04:00 UTC (May 11)

---

## 1. Executive Summary

**Pipeline Status:** 🟡 PARTIALLY UNBLOCKED — MAI-1387 (One-Click Chef Lead Response) filed by CEO this cycle, addressing root cause of 0% response rate. Infrastructure still blocks email notifications.

New opportunity this cycle: **Automated Chef Lead Escalation System** — time-based escalation when chefs don't respond within SLA threshold.

---

## 2. Current Platform State (08:00 UTC May 11)

| Metric | Value | Change Since 04:00 UTC |
|--------|-------|------------------------|
| Published services | 1 | No change |
| Pending bookings/leads | 4+ | No change |
| Confirmed bookings | 0 | No change |
| Revenue at stake | ~$1,045 | No change |
| Leads (new/converted) | 8 (7/1) | No change |
| Reviews | 0 | No change |
| Chef response rate | **0/8 = 0%** | 🔴 Unchanged (50+ days) |
| MAI-1387 status | **Todo** | CEO filed this cycle — scope ready |
| RESEND_API_KEY | Missing | 50+ days (Fred's action) |
| STRIPE_SECRET_KEY | Empty | 50+ days (Fred's action) |

---

## 3. What's Already In Flight

| Issue | Title | Status | Gap |
|-------|-------|--------|-----|
| MAI-1387 | One-Click Chef Lead Response | todo, high, CEO | Accept/decline endpoints exist in API, FE UI not built |
| MAI-1381 | BE: Prepare Chef Notification Code | todo, high, BE | Code prep (no RESEND needed yet), unblocks MAI-1359 |
| MAI-1366 | FE: Inline Auth Panel on Booking Form | todo, high, FE | Stalled — needs attention |
| MAI-1324 | FE Fix: Chef Dashboard Urgency QA Failures | todo, high, FE | REBUILD NEEDED, blocked by MAI-1320 |
| MAI-1320 | QA: Validate Chef Dashboard Urgency System | todo, unassigned | Blocked by MAI-1324 |

---

## 4. Root Cause Deep Dive: Chef Response Rate

### The Core Problem

**0% response rate over 50+ days is not a UX problem — it's a behavioral/incentive problem.**

Looking at the lead flow:
1. Diner submits inquiry → lead created with `status: "new"`
2. Chef receives email notification (blocked — RESEND_API_KEY missing)
3. Chef must manually navigate to `/chef/leads`, find the lead, open detail modal, fill in quote form, submit
4. **Friction at every step**: no direct link in email (email blocked), multi-step quote process, no urgency signal

### What MAI-1387 Addresses

MAI-1387 adds **one-click accept/decline** to the chef leads page. This reduces the multi-step quote process to two buttons.

**But there's a gap**: the accept endpoint (`POST /api/chef/leads/:id/accept`) sends an email notification to the diner via `sendQuoteEmail()` — but that email requires RESEND_API_KEY to work.

### The Escalation Gap

Even with one-click accept, there's no **urgency/escalation mechanism**:
- Leads older than 12h show a stale banner on the chef dashboard
- But there's no automatic follow-up, no external reminder, no escalation to the platform team
- Chef can simply ignore leads indefinitely with no consequence

### Why Chefs Don't Respond

Hypotheses (not confirmed — would need user research):
1. **Email never received** — RESEND_API_KEY missing, chefs literally don't know they have leads
2. **Too much friction** — multi-step quote process is too time-consuming for busy chefs
3. **No direct link** — even if they check dashboard, finding the right lead takes effort
4. **No penalty for ignoring** — no SLA enforcement, no follow-up emails, no consequence for silence
5. **Not enough incentive** — unclear how responding leads to more bookings/revenue for them

---

## 5. New Opportunity This Cycle: Automated Chef Lead Escalation System

### Problem Statement

**Who:** Platform operator / system (for chef behavior)
**Problem:** When chefs don't respond to leads within the SLA window (24h), there's no automated follow-up, no escalation, and no consequence. This results in:
- Diners waiting indefinitely with no response
- High-value leads going stale and converting to 0 revenue
- No accountability mechanism for chefs

**Evidence:** 
- `staleLeadReengagementSentAt` field exists in leads table (MAI-845)
- `slaEscalated` and `slaEscalatedAt` fields exist in leads table (MAI-948)
- 12-hour stale banner exists on chef dashboard UI (stale leads still get zero response)
- No cron job or automated process that actually triggers escalation

**Impact:**
- Diners abandon the platform when chefs don't respond
- Revenue loss (unconverted leads = $0)
- No learning loop to understand why chefs don't respond

### User Story

> As a platform operator, I want an automated escalation system that reminds chefs of pending leads, flags unresponsive chefs, and notifies the platform team when SLA is breached — so that lead response rates improve and diners don't wait indefinitely.

### Scope (MVP)

**In Scope:**
1. **Chef SLA Tracking**
   - Track `firstResponseAt` (when chef first responds to a lead)
   - Track `responseWithinSla` boolean (did chef respond within SLA window?)
   - SLA window: 12 hours for new leads (configurable)

2. **Automated Follow-up Email** (when chef doesn't respond within 24h)
   - Cron job runs every 2 hours
   - Finds leads where `status = "new"` and `createdAt` > 24h ago
   - Sends reminder email to chef with direct link to respond
   - Marks `staleLeadReengagementSentAt`

3. **Escalation Flag for Unresponsive Chefs**
   - After 48h with no response, flag lead as `slaEscalated: true`
   - Increment a counter on the chef profile for "unresponsive incidents"
   - After N escalations (e.g., 3), flag chef account for review

4. **Platform Team Alert**
   - When `slaEscalated = true` for any lead, send alert email to platform team
   - Include lead details, chef details, time waiting

5. **Chef Response Rate Dashboard** (simple)
   - On chef dashboard, show response rate: leads responded to / leads received (last 30 days)
   - Display as percentage with color indicator (red < 50%, yellow 50-80%, green > 80%)

**Out of Scope:**
- Automatic re-matching diners to other chefs (too complex for MVP)
- Penalizing chefs financially (requires payment integration)
- Auto-declining leads on chef's behalf
- Multi-channel follow-up (SMS, push notifications — email only for v1)

### Acceptance Criteria

- [ ] Cron job runs every 2 hours to check for stale leads
- [ ] Chef receives reminder email after 24h of no response (when RESEND is configured)
- [ ] Leads with no response after 48h are flagged as `slaEscalated: true`
- [ ] Chef profile tracks escalation count
- [ ] Platform team receives alert email when lead is escalated
- [ ] Chef dashboard shows response rate percentage
- [ ] Escalation counts reset after chef responds to X consecutive leads (e.g., 5)
- [ ] Works correctly even when RESEND_API_KEY is missing (graceful degradation — logs warning, doesn't crash)

### Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Chef response rate (within 24h) | ≥ 50% | 0% |
| Average time to first response | < 12h | ❌ Not tracked |
| Leads escalated per week | Track baseline | ❌ Not tracked |
| Chef response rate on dashboard | Visible | ❌ Not implemented |

### Effort

~5-6 hours total:
- SLA tracking fields in schema/API: ~1h
- Cron job for stale lead follow-up: ~1.5h
- Escalation flagging + counter: ~1h
- Platform alert email: ~1h
- Chef dashboard response rate display: ~1h

### Dependencies

- RESEND_API_KEY (Fred's action — 50+ days overdue)
- Lead status tracking fields (already exist in schema)
- Cron job infrastructure (node-cron already in package.json)

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| RESEND_API_KEY missing | Log warning, skip email, continue escalation flagging |
| Chef already responded before cron runs | No email sent (lead no longer "new") |
| Multiple stale leads for same chef | Send one email per lead (may batch later) |
| Escalation counter overflow | Cap at reasonable max (999) to avoid integer issues |
| Chef responds after escalation but before platform alert | Cancel platform alert, clear escalation flag |

---

## 6. Priority Recommendation

| Priority | Opportunity | Reason | Effort |
|----------|-------------|--------|--------|
| P0 | **MAI-1387: One-Click Chef Lead Response (FE)** | CEO already scoped, addresses response friction | 2-3h |
| P1 | **Automated Chef Lead Escalation System** | Closes the loop on unresponsive chefs | 5-6h |
| P2 | **MAI-1366: Inline Auth Panel** | Revenue conversion, but stalled — need to unblock | 3-4h |
| P3 | **MAI-1320: QA Validation** | Needed to close MAI-1324 chain | 1h |

**Rationale for P1:** Even with one-click accept (MAI-1387), if chefs don't check their dashboard or email, leads still go stale. An escalation system creates accountability and ensures leads don't die silently.

---

## 7. What Still Requires Fred's Action (Infrastructure Blockers)

| Blocker | Required Action | Days Overdue |
|---------|----------------|--------------|
| RESEND_API_KEY | Fred add API key to environment | 50+ days |
| STRIPE_SECRET_KEY | Fred add Stripe keys | 50+ days |
| Vercel OIDC Token | Fred refresh Vercel token | 40+ days |

**All email notifications (accept/decline/stale follow-up/quote reminders) are blocked without RESEND_API_KEY.**

---

## 8. Open Questions

| Question | Decision Needed | Priority |
|----------|-----------------|----------|
| What is the SLA window for chef response? | 12h, 24h, or 48h? | P1 |
| How many escalations before chef account is flagged for review? | 3? 5? | P1 |
| Should we auto-decline leads after 72h of no response? | Yes/no — affects diner experience | P2 |
| Do we want platform team to receive ALL escalation emails or only high-value leads? | Filter by lead value or send all | P2 |
| Should we display response rate publicly on chef profiles? | Affects trust/safety vs. pressure on chefs | P3 |

---

## Definition of Done

This spec is complete when:
- [ ] Cron job implemented and tested for stale lead detection
- [ ] Chef receives follow-up email after 24h of no response
- [ ] Leads escalated after 48h of no response
- [ ] Chef profile tracks escalation count
- [ ] Platform team receives escalation alert
- [ ] Chef dashboard shows response rate percentage
- [ ] Engineers can implement without guessing