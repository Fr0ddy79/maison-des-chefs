# Growth: Lead Conversion Funnel Analysis — 4h Check (MAI-1869)

**Owner:** Growth Marketer  
**Date:** 2026-05-21 05:00 UTC  
**Reference:** MAI-1860 (previous analysis at 01:00 UTC)

---

## 1. Current Funnel Metrics (Last 24-48h)

### Lead Volume
| Metric | Value | Notes |
|--------|-------|-------|
| Leads created (last 48h) | **0** | No new leads in system |
| Total leads in DB | **8** | All from Apr-May (demo/test data) |
| Converted leads | **1** | diner@demo.com (Apr 16) |
| Expired leads | **7** | All expired May 13 |

### Conversion Rate
| Status | Count | % |
|--------|-------|---|
| Converted | 1 | 12.5% |
| Expired | 7 | 87.5% |
| New/Pending | 0 | 0% |
| **Total** | **8** | |

**Interpretation:** 87.5% lead expiration rate confirmed (unchanged from MAI-1860). No new leads in last 48h to measure impact of stagnation alerts.

---

## 2. Alert Activity

### Lead Stagnation Alerts (Chef Side)
- **Service:** `src/services/lead-stagnation-alert.ts`
- **Trigger:** Pending leads older than 24h (24h reminder) / 48h (escalation)
- **Action:** Creates in-app notification for chef (`lead_stagnant` / `lead_stagnant_escalated`)
- **Status:** ✅ Wired — cron scheduled every 6 hours
- **Notifications in DB:** 0 — system has no active leads to alert on

### Lead Expiration Alerts (Diner Side)
- **Service:** `src/services/lead-expiration.ts`
- **Trigger:** SLA deadline passed (48h window), no chef response
- **Action:** Marks lead `expired`, sends diner email + in-app notification
- **Status:** ✅ Working — all 7 leads expired on 2026-05-13 (confirmed via `lead_expired_sent_at`)
- **DB evidence:** `lead_expired_sent_at` set for all 7 expired leads

### Booking Stagnation Alerts (Diner Side)
- **Service:** `src/services/diner-stagnation-alert.ts`
- **Spec reference:** MAI-1548 spec
- **Trigger:** Pending bookings >24h with no stagnation alert sent
- **Status:** ⚠️ **INCOMPLETE** — schema missing `stagnation_alert_sent_at` column

---

## 3. Signals of Behavior Change

### Chef Response Rate
- **4 pending bookings** in system (IDs 1-4), all from May 5-6
- Booking #1 (€190, May 15 event) — 45+ days old, still pending
- Bookings #2-4 (€190-380, Jun-Jul events) — 39+ days old, still pending
- **No improvement** — chef Marcel has not responded to any pending bookings

### Outreach Touch History
| Touch | Channel | Status | Notes |
|-------|---------|--------|-------|
| 1 | Email | sent | — |
| 2 | SMS | replied | Chef responded via text |
| 3 | Email | sent | — |
| 4 | SMS | pending | Growth Marketer manual outreach |
| 5 | Email | **bounced** | No RESEND_API_KEY, manual outreach required |

**Signal:** Chef replied to SMS but bookings still not actioned → SMS gets attention but email has delivery issues. Manual outreach required.

### Stagnation Alert Impact
- **Cannot measure** — no new leads created since alerts were wired
- All leads in DB pre-date the stagnation notification system
- **Recommendation:** Need live traffic to measure true impact

---

## 4. Booking Stagnation Alert — Critical Gap

### Finding
The `diner-stagnation-alert.ts` references `stagnation_alert_sent_at` in the bookings table, but this column does not exist in the database schema.

```sql
-- Spec (MAI-1548) calls for:
ALTER TABLE bookings ADD COLUMN stagnation_alert_sent_at INTEGER;

-- But in actual DB:
SELECT name FROM pragma_table_info(bookings) WHERE name = 'stagnation_alert_sent_at';
-- Returns: 0 rows (column missing)
```

### Impact
The booking stagnation alert system (which emails diners when their booking is stale) cannot function — the deduplication column is missing, so:
1. The cron cannot find "already alerted" bookings (no column to check)
2. Running `processStaleBookings()` would fail or behave incorrectly
3. Diners with pending bookings don't get stagnation follow-up emails

### Evidence from Spec
MAI-1548 spec states:
> "Idempotency via `stagnation_alert_sent_at` deduplication"

But this field is not in the migrations or database schema.

---

## 5. New Actionable Improvement

### 🎯 Fix: Add `stagnation_alert_sent_at` Column to Bookings

**Priority:** High  
**Effort:** Low (single migration, ~30 min)  
**Impact:** Enables the diner stagnation alert system to function correctly

**Current state:**
- 4 pending bookings, all >39 days old, zero stagnation alerts sent
- Diners with stale bookings have no automatic follow-up
- System designed to prevent this (MAI-1548) but incomplete

**What needs to happen:**
1. Create migration: `ALTER TABLE bookings ADD COLUMN stagnation_alert_sent_at INTEGER`
2. Run migration on database
3. Backfill `stagnation_alert_sent_at = NULL` for all existing bookings
4. Cron `processStaleBookings()` will then correctly:
   - Find pending bookings >24h old
   - Send ONE alert per booking (idempotent via column check)
   - Update `stagnation_alert_sent_at` after send

**Expected outcome:**
- Pending bookings older than 24h trigger diner alert emails
- Reduces diner drop-off from "never heard back" syndrome
- Provides second-chance conversion for stagnant bookings

---

## 6. Blockers

| Blocker | Owner | Status |
|---------|-------|--------|
| Marcel's phone number | Fred | **BLOCKED** — Growth Marketer cannot complete SMS outreach without this |
| RESEND_API_KEY not configured | Fred | Email alerts are stub-only, no real delivery |

---

## 7. Next Steps

1. **Fred:** Provide Marcel's phone number to unblock MAI-1849
2. **Fred:** Configure RESEND_API_KEY for real email delivery
3. **Engineering:** Add `stagnation_alert_sent_at` column to bookings table
4. **Next check:** When new leads are created in production, measure if stagnation alerts improve chef response rates

---

*Report generated by Growth Marketer agent | MAI-1869 | 2026-05-21 05:00 UTC*