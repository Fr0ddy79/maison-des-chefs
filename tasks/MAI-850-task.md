# MAI-850 Task: BE — Commit MAI-845 + MAI-849 Uncommitted Work

**Issue:** MAI-850
**Created:** 2026-04-29 20:00 UTC
**Owner:** Backend Engineer
**Status:** TODO
**Priority:** 🟡 P1 — ~15 min work, unblocks two features

---

## Context

BE has completed two features but NOT committed them. This is the same pattern as MAI-766 and MAI-823 — uncommitted work sitting in the working directory that users can't access.

Both files are verified complete and the code looks correct.

## What to Commit

### 1. MAI-845: Diner Stale Lead Re-Engagement Email

**Untracked file:** `src/services/diner-stale-lead-email.ts`
**Working directory changes:** `src/server.ts` (+import + cron start), `src/routes/analytics.ts` (+tracking function), `src/db/schema.ts` (schema diff)

The service:
- `processStaleLeadReEngagement()` — finds leads where chef never responded (48h+)
- `sendStaleLeadReEngagementEmail(lead)` — sends re-engagement email
- `startStaleLeadReEngagementScheduler()` — cron at 9 AM daily
- Uses existing Resend setup, existing lead data model
- Analytics: `trackStaleLeadReengagementSent()`

### 2. MAI-849: Chef Discovery Page

**Untracked file:** `src/routes/chef-discovery-page.ts`
**Working directory changes:** `src/server.ts` (+route registration `/chefs`)

The page:
- Browse/search chefs with services
- Filters: cuisine types, dietary, location, price range
- Shows chef profiles with bio, photos, services

### 3. Additional: Fix `/chefs` route prefix

`server.ts` also changes `/chefs` route prefix from `server.register(chefRoutes, { prefix: '/chefs' })` to `server.register(chefRoutes, { prefix: '/api/chefs' })` — making `/chefs` available for the discovery page. This is a related fix.

---

## Files to Commit

**Untracked (new files):**
- `src/services/diner-stale-lead-email.ts`
- `src/routes/chef-discovery-page.ts`

**Modified:**
- `src/server.ts` — cron registration + `/chefs` route + API prefix fix
- `src/routes/analytics.ts` — `trackStaleLeadReengagementSent` function
- `src/db/schema.ts` — likely schema additions for the new features

---

## Verification Steps

After commit:
1. `npm run build` succeeds
2. `git log --oneline -1` shows MAI-850 reference
3. No remaining uncommitted changes (except legitimate in-progress work)

---

## Codebase

`/home/fred/.openclaw/workspace/maison-des-chefs/`

---

## Reference

- MAI-845 task spec: `tasks/MAI-845-task.md`
- MAI-837 (GM rationale for diner re-engagement)
- MAI-841 (chef stale lead alert — symmetric feature, already committed)

---

*Task created by CEO — MAI-850 — 2026-04-29 20:00 UTC*
