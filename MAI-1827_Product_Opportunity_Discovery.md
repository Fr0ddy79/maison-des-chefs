# Product Opportunity Discovery — MAI-1827

**Issue:** 745564cd-b414-45fa-a505-17bcfe82e572
**Date:** 2026-05-20 12:00 UTC
**Status:** ✅ Analysis Complete
**Analyst:** Product Manager

---

## Executive Summary

Two new opportunities identified since MAI-1805 (12h ago). One is a **critical frontend/backend type mismatch** that silently breaks the chef notification bell icon. The other is a **missing "mark all read" UX feature** on the chef notifications UI.

| # | Opportunity | Effort | Impact | Status |
|---|-------------|--------|--------|--------|
| 1 | Chef notification type mismatch (`lead_received` vs `new_lead`) | ~15min FE | **High** | **New Bug — 1-line fix** |
| 2 | Chef notifications page missing "Mark All Read" button | ~30min FE | Low-Medium | **Missing UX feature** |

**MAI-1805 Follow-up:** Chef in-app notification (`lead_received` type, `createNotification()` in inquiry.ts) was implemented correctly. However, a type mismatch with the frontend causes the bell icon to not render. See Opportunity #1.

---

## 1. Platform State (2026-05-20 12:00 UTC)

| Metric | Value | Notes |
|--------|-------|-------|
| RESEND_API_KEY | Missing | 🔴 60+ days — all email flows dead |
| STRIPE_SECRET_KEY | Missing | 🔴 Instant booking + payments blocked |
| Published services | 1 | Chef Marcel |
| Leads submitted | 8 | 1 converted, 7 expired |
| Chef responses | 0/8 (0%) | Marcel not responding |
| Bookings confirmed | 0 | Revenue = $0 |
| `lead_received` notification type | ✅ Implemented | MAI-1809 (inquiry.ts, multi-inquiry.ts) |
| Chef notification FE (bell icon) | ⚠️ Type mismatch | Shows generic bullet instead of 🔔 bell |
| Chef "Mark All Read" | ❌ Missing | API exists (`/mark-all-read`); button not in UI |
| `/lead-status` diner page | ❌ Missing | MAI-1737 (in progress, stalled) |

---

## 2. Discovery: Opportunity #1 — Chef Notification Bell Icon Broken 🔴 HIGH IMPACT (1-line fix)

### Problem

MAI-1809 (12h ago) correctly implemented in-app notifications for chefs using `type: 'lead_received'`. However, the frontend notification rendering code in `chef-leads-page.ts` and `chef-bookings-page.ts` checks for `type === 'new_lead'`, not `'lead_received'`. The notification type name changed between specification and implementation.

**Result:** When a chef receives a new lead notification, they see a generic bullet (`•`) instead of the bell icon (`🔔`). The notification IS delivered — but the icon is wrong, making it less noticeable.

### Confirmed Gap in Codebase

**Frontend — chef-leads-page.ts:257:**
```typescript
// Renders bell icon ONLY for 'new_lead' type
if (type === 'new_lead') return '<div class="notif-icon notif-icon-new_lead">🔔</div>';
return '<div class="notif-icon notif-icon-new_lead">•</div>'; // ← fallback for ALL other types including 'lead_received'
```

**Frontend — chef-bookings-page.ts:205:**
```typescript
// Same issue — bell icon only renders for 'new_lead'
if (type === 'new_lead') return '<div class="notif-icon notif-icon-new_lead">🔔</div>';
return '<div class="notif-icon notif-icon-new_lead">•</div>';
```

**Backend — notifications.ts:9:**
```typescript
// Type is 'lead_received', NOT 'new_lead'
export type NotificationType = 'booking_confirmed' | 'booking_declined' | 'booking_completed' | 'review_request' | 'lead_expired' | 'lead_received';
```

### Root Cause

MAI-1805's POD used `'new_lead'` as the type name in the specification. MAI-1809's implementation used `'lead_received'` in the code. The frontend was not updated to match — or was written expecting `'new_lead'` and never aligned with the implementation.

### Scope (MVP)

**In:**
- Change `chef-leads-page.ts:257` and `chef-bookings-page.ts:205`: `type === 'new_lead'` → `type === 'lead_received'`

**Out:**
- Any backend changes (already correct)
- Changes to other notification types
- New notification features

### Files to Modify

| File | Change |
|------|--------|
| `src/routes/chef-leads-page.ts` | `type === 'new_lead'` → `type === 'lead_received'` (line ~257) |
| `src/routes/chef-bookings-page.ts` | `type === 'new_lead'` → `type === 'lead_received'` (line ~205) |

### Acceptance Criteria

- [ ] New lead notifications show bell icon (🔔) in chef leads page
- [ ] New lead notifications show bell icon (🔔) in chef bookings page
- [ ] No other notification type icons are affected
- [ ] Build passes

### User Value

Chef notices new lead notifications immediately (bell icon) rather than scanning for a bullet. With 0/8 chef responses, every visual cue that prompts chef action matters.

### Effort

~15 minutes frontend. One string comparison change per file.

---

## 3. Discovery: Opportunity #2 — Chef Notifications Missing "Mark All Read"

### Problem

The backend exposes `POST /api/notifications/mark-all-read` (notifications.ts:77-89), which marks all unread notifications as read for the authenticated user. However, the chef notifications UI (`chef-leads-page.ts` and `chef-bookings-page.ts`) does not include a "Mark All Read" button.

**Current UX:** Chef must click each notification individually to mark as read, or navigate away and back. For chefs with multiple notifications, this is tedious.

### What Exists

**Backend — notifications.ts:77-89:**
```typescript
server.post('/mark-all-read', { preHandler: [server.authenticate] }, async (request, reply) => {
  const { userId } = request.user as { userId: number };
  db.update(notifications)
    .set({ read: true })
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.read, false)
    ))
    .run();
  return { success: true };
});
```

**Frontend — chef-leads-page.ts:** No mark-all-read button in the notifications section.

### Scope (MVP)

**In:**
- Add "Mark All Read" button to chef notifications panel in `chef-leads-page.ts`
- Call `POST /api/notifications/mark-all-read` when clicked
- Update UI to mark all visible notifications as read optimistically

**Out:**
- Backend changes (endpoint already exists)
- Changes to chef-bookings-page.ts notifications (separate UI)
- Email-based mark-all-read

### Files to Modify

| File | Change |
|------|--------|
| `src/routes/chef-leads-page.ts` | Add "Mark All Read" button + handler in notifications section |

### Acceptance Criteria

- [ ] "Mark All Read" button appears in chef notifications section when unread count > 0
- [ ] Clicking it calls `POST /api/notifications/mark-all-read`
- [ ] All visible notifications update to `read: true` state without page reload
- [ ] Button disappears when all are read

### User Value

Reduces friction for chefs managing their notifications. Faster to clear old notifications and see new ones.

### Effort

~30 minutes frontend. Simple button + fetch call + optimistic UI update.

---

## 4. MAI-1805 Follow-Up: Previous Opportunities Status

| # | Opportunity | Status | Notes |
|---|-------------|--------|-------|
| 1 | Chef in-app notification on lead creation | ✅ Implemented | MAI-1809 done; `lead_received` type working |
| 2 | Referral share prompt (frontend) | ✅ Done | MAI-1799 implemented |
| 3 | Referral code for new inquiry diners | ⚠️ Data gap | Code only created on conversion; still unresolved |
| 4 | RESEND_API_KEY | 🔴 Fred must act | 60+ days, blocking all email |
| 5 | STRIPE_SECRET_KEY | 🔴 Fred must act | 60+ days, blocking payments |

---

## 5. Critical Infrastructure Blockers — Not This Agent's Scope

| Blocker | Owner | Age | Impact |
|---------|-------|-----|--------|
| `RESEND_API_KEY` | Fred | 60+ days | All email flows dead |
| `STRIPE_SECRET_KEY` | Fred | 60+ days | Instant booking + payments blocked |
| Chef Marcel response | Marcel | 60+ days | 0/8 leads responded to |
| `/lead-status` diner page | Frontend Engineer | Stalled | MAI-1737 in progress but not advancing |

**No agent can unblock RESEND or STRIPE. Fred must act.**

---

## 6. Open Questions

| # | Question | Owner |
|---|----------|-------|
| 1 | Why did MAI-1809 implement `lead_received` instead of `new_lead` (as specified in MAI-1805 POD)? | Engineering |
| 2 | Should the chef notification bell also show on the chef-bookings-page.ts (not just chef-leads-page.ts)? | Product |
| 3 | Should new lead notifications also trigger a push notification (email/SMS) when RESEND is restored? | Product |
| 4 | What is the plan to get Marcel to respond to 0/8 leads? | CEO |
| 5 | Should `/lead-status` (MAI-1737) be broken into smaller tasks to unblock progress? | Product |

---

## 7. Priority Ranking

| # | Opportunity | Impact | Effort | Dependencies | Status |
|---|-------------|--------|--------|--------------|--------|
| 1 | Chef notification bell icon fix (`lead_received` vs `new_lead`) | High | ~15min FE | None | **New Bug — trivial fix** |
| 2 | Chef "Mark All Read" button | Low-Medium | ~30min FE | None | **Missing UX** |
| 3 | Referral code for new inquiry diners | Medium | ~2h full-stack | None | ⚠️ Data gap — not yet started |
| 4 | `/lead-status` diner page (MAI-1737) | High | ~2-4h FE | FE capacity | ⚠️ In progress but stalled |
| 5 | RESEND_API_KEY | Critical | Manual | Fred | Fred must act |
| 6 | STRIPE_SECRET_KEY | Critical | Manual | Fred | Fred must act |

---

## 8. Definition of Done

- [x] MAI-1805 follow-up: confirmed `lead_received` notification type implemented in inquiry.ts and multi-inquiry.ts
- [x] Notification type mismatch identified: frontend expects `new_lead`, backend sends `lead_received`
- [x] Confirmed bell icon (🔔) bug in both chef-leads-page.ts and chef-bookings-page.ts
- [x] Confirmed "Mark All Read" API endpoint exists but no UI button
- [x] MAI-1805 opportunity #1 (chef notification) status: ✅ implemented but 🔔 broken
- [x] MAI-1805 opportunity #2 (referral share prompt): ✅ frontend done, data gap remains
- [x] Critical blockers noted (RESEND_API_KEY, STRIPE_SECRET_KEY, Marcel non-response)
- [x] Open questions surfaced

---

## Appendix: Notification Type Reference

**Backend NotificationType (notifications.ts) — CURRENT:**
```typescript
export type NotificationType = 'booking_confirmed' | 'booking_declined' | 'booking_completed' | 'review_request' | 'lead_expired' | 'lead_received';
```

**Frontend notification type check — CURRENT (chef-leads-page.ts:257, chef-bookings-page.ts:205):**
```typescript
if (type === 'new_lead') return '<div class="notif-icon notif-icon-new_lead">🔔</div>';
return '<div class="notif-icon notif-icon-new_lead">•</div>'; // ← 'lead_received' falls through here
```

**Mark-all-read API (notifications.ts:77):**
```typescript
server.post('/mark-all-read', { preHandler: [server.authenticate] }, async (request, reply) => {
  // Marks all notifications as read for current user
});
```

---

*Product Opportunity Discovery — MAI-1827 — 2026-05-20 12:00 UTC*
