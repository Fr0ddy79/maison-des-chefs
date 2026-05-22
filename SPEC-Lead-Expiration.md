# Spec: Lead Expiration — Decouple Status from Email

## 1. Problem Statement

Leads with no chef response for 72+ hours are not being marked as `expired` because the status transition is coupled to email success. When `RESEND_API_KEY` is missing (60+ days), `sendExpiredEmail()` returns `true` (stub), which causes leads to be marked expired correctly. BUT when Resend is configured but fails, leads never expire.

The bigger gap: even when leads are marked expired, there's no diner-facing communication directing them back to the platform to browse other chefs.

## 2. User Story

**As a** diner who submitted an inquiry  
**I want** to know when my lead has expired and be shown alternatives  
**So that** I don't abandon the platform wondering why no chef responded

## 3. Scope

### In
- Modify `src/services/lead-expiration.ts` to mark leads as `expired` **regardless of email success**
- Add diner-facing in-app notification (for diners with accounts) when lead is marked expired
- Include "Browse other chefs" CTA in the diner notification
- Idempotency: skip leads already marked `expired` or with `leadExpiredSentAt` set

### Out
- Push notifications or SMS
- Changes to chef notification flow (MAI-1716 already done)
- Automatic re-matching to alternative chefs
- Guest diner email (requires RESEND_API_KEY)

## 4. Notification Types

Add new notification type to support lead expiration:
- `lead_expired` — sent to diner when their lead expires (no chef response in 72h)

## 5. Acceptance Criteria

- [ ] Leads with status `new`/`pending` older than 72h are marked `expired` even if email fails
- [ ] `leadExpiredSentAt` is set regardless of email success (for idempotency)
- [ ] Diner with existing account receives in-app notification with "Browse other chefs" CTA when lead expires
- [ ] Guest diners (no account) do not receive in-app notification (no userId to target) — email fallback not available without RESEND_API_KEY
- [ ] Leads already marked `expired` are skipped (idempotency)
- [ ] Works without RESEND_API_KEY (in-app notification path)
- [ ] Chef continues to receive in-app notification on lead creation (MAI-1716 already wired)

## 6. Metrics

- Lead expiration rate (expired leads / total leads)
- Diner re-engagement rate (diners who click "Browse other chefs" after lead expiration)
- Conversion rate from expired lead → new inquiry

## 7. Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Diner has no account (guest) | Skip in-app notification; email not available without RESEND_API_KEY |
| Lead already expired | Skip — `leadExpiredSentAt` already set |
| Email fails but notification succeeds | Mark `leadExpiredSentAt` anyway; email retry not attempted |
| Multiple leads for same diner | Each lead expires independently; each gets own notification |

## 8. Open Questions

| # | Question | Owner |
|---|----------|-------|
| 1 | Should expired leads be automatically declined, or remain as a distinct `expired` state? | Product |
| 2 | Should diners be able to re-inquire after lead expires? | Product |
| 3 | Is there a plan to activate chef_id=2 who has a published service? | CEO |

## 9. Implementation Notes

**File to modify:** `src/services/lead-expiration.ts`

**Key change:**
```typescript
// OLD: Only mark expired if email succeeds
if (success) {
  await db.update(schema.leads).set({ status: 'expired', leadExpiredSentAt: new Date() }).where(...);
}

# NEW: Mark expired regardless, set leadExpiredSentAt for idempotency
await db.update(schema.leads).set({ 
  status: 'expired',
  leadExpiredSentAt: new Date(),  // Always set for idempotency
}).where(eq(schema.leads.id, lead.id));

// Then try notification (for diners with accounts)
if (dinerUserId) {
  createNotification({
    userId: dinerUserId,
    type: 'lead_expired',
    title: 'Your inquiry has expired',
    body: `No chef responded to your ${serviceName} inquiry. Browse other chefs to find your perfect match.`,
    metadata: { leadId: lead.id, browseUrl: SERVICES_URL },
  });
}
```

**Note on `createNotification`:** Currently in `src/api/notifications.ts`, used for API routes. For cron service use, either:
- Export it as a standalone function from `src/api/notifications.ts`
- Or create a simple in-app notification function directly in `lead-expiration.ts`

## 10. Definition of Done

- [ ] Engineers can implement without guessing
- [ ] Leads marked expired independent of email success
- [ ] Diner with account gets in-app notification on lead expiration
- [ ] Idempotency confirmed (re-runs don't cause duplicate emails/notifications)
- [ ] Works without RESEND_API_KEY