# MAI-1096: Automated Chef Onboarding Workflow — Audit & Implementation

## 1. Current Chef Onboarding Flow Audit

### Human Intervention Points (Manual Steps)

| Step | Human Action | Who | Time Required | Automation Status |
|------|-------------|-----|---------------|------------------|
| **Profile Creation** | Chef fills out profile basics | Chef | Self-serve | ✅ Automated (wizard step 1) |
| **Service Creation** | Chef creates first service listing | Chef | Self-serve | ✅ Automated (wizard step 2) |
| **Availability Setup** | Chef blocks unavailable dates | Chef | Self-serve | ✅ Automated (wizard step 3) |
| **Service Publication** | Wizard publishes service | Chef | Self-serve | ✅ Automated (wizard step 4) |
| **Post-Publication** | Chef waits for first booking | — | N/A | ❌ No notification |
| **First Inquiry Received** | Chef manually checks dashboard | Chef | Manual | ❌ No notification |
| **Profile Verification** | Staff would manually verify chef credentials | Staff | ~15-30 min | ❌ Not implemented |
| **Payment Setup** | Chef goes through Stripe Connect | Chef/External | External | ❌ Out of scope |

### Bottleneck Analysis: Profile Completion → Verification → Listing Activation

Based on code audit:

1. **Profile Completion → Listing Activation**: The onboarding wizard (MAI-712) is fully built. After a chef publishes their service in step 4, the `POST /api/onboarding/publish` endpoint:
   - Sets `onboardingCompletedAt` and `profileCompletedAt`
   - Clears the onboarding state
   - Returns `{ success: true, published: true }`
   - **Missing**: No welcome/activation email is sent to the chef

2. **Listing Activation → First Inquiry**: Chef must manually check `/chef/leads` for new inquiries. No proactive notification exists.

3. **Verification**: No manual verification flow exists in the codebase. `chefProfiles.verified` field exists but is never set automatically.

---

## 2. Top 3 Automation Candidates (Ranked by Impact)

### #1 — ✅ AUTOMATED: Post-Publication Welcome Email (IMPLEMENTED)
**Trigger**: Chef publishes first service via onboarding wizard  
**Action**: Send welcome email with next steps  
**Expected Time Saved**: ~10-15 min per chef (reduces "what now?" support questions)  
**Impact**: HIGH — immediately confirms chef is live, sets expectations, reduces support load  
**Status**: **Implemented** in this session

**What the email includes**:
- Congratulations message confirming service is live
- Direct link to leads dashboard
- Tips for getting first booking
- 24-hour response time expectation reminder

---

### #2 — 🔲 NOT IMPLEMENTED: First Inquiry Alert
**Trigger**: New lead created for a chef who has never received one  
**Action**: Send "You have your first inquiry!" email/SMS with one-click respond  
**Expected Time Saved**: ~5-10 min (chef knows immediately vs checking dashboard)  
**Impact**: MEDIUM — improves first booking conversion rate  
**Current blocker**: No per-chef "first lead" tracking (would need `chefProfiles.firstLeadReceivedAt` or similar)

**Implementation approach**:
```sql
-- Add to chef_profiles
ALTER TABLE chef_profiles ADD COLUMN firstLeadReceivedAt INTEGER;
```
```typescript
// In leads creation (inquiry.ts or multi-inquiry.ts):
// On new lead creation, if chefProfiles.firstLeadReceivedAt is null:
// 1. Set firstLeadReceivedAt = now
// 2. Send "First Inquiry!" email to chef
```

---

### #3 — 🔲 NOT IMPLEMENTED: Stale Onboarding Recovery
**Trigger**: Chef starts wizard (step1 saved) but doesn't complete within 48 hours  
**Action**: Send "Continue your setup" reminder email  
**Expected Time Saved**: Recover chefs who drop off mid-wizard  
**Impact**: MEDIUM — improves onboarding completion rate  
**Current blocker**: `chefOnboardingState.createdAt` exists but no cron/scheduler checks for stalled wizards

**Implementation approach**:
- Add a scheduled job (like `quote-reminder.ts`) that queries for:
  - `chefOnboardingState` rows where `createdAt` > 48h ago AND `step4Completed` = false
  - Join with `chefProfiles` where `onboardingCompletedAt` IS NULL
- Send recovery email with direct resume link

---

## 3. Implemented Change

### #1: Chef Onboarding Completion Email

**Files Created**:
- `src/services/chef-onboarding-complete-email.ts` — Email service for onboarding completion

**Files Modified**:
- `src/api/onboarding-wizard.ts` — Added email send call in `POST /api/onboarding/publish`

**Email Trigger**: Immediately when a chef publishes their first service via the onboarding wizard (Step 4).

**Email Content**:
- Subject: `🎉 Welcome, Chef {name}! Your service is now live.`
- Confirms service is live with green "LIVE" badge
- Links to leads dashboard
- Sets 24-hour response expectation
- Tips for first booking (prompt response, personalized quotes, chef's note)

**Technical Details**:
- Fire-and-forget (`.catch()` handles errors silently so it doesn't block the publish response)
- Uses existing `resend` infrastructure and `FROM_EMAIL`/``DASHBOARD_URL`` env vars
- Graceful stub when `RESEND_API_KEY` is placeholder or missing
- Idempotent: no DB flag needed (sending once per publish is correct behavior)

---

## 4. Testing Steps

1. **Start the server**: `cd /home/fred/.openclaw/workspace/maison-des-chefs && npm run start`
2. **Create a test chef account** via `POST /auth/register` with `role: "chef"`
3. **Log in** to get JWT token
4. **Complete wizard steps** in sequence:
   - `PUT /api/onboarding/step1` with profile data
   - `PUT /api/onboarding/step2` with service data
   - `PUT /api/onboarding/step3` with empty blocked dates
5. **Publish** via `POST /api/onboarding/publish`
6. **Verify**: Check server logs for `[ChefOnboardingComplete] Onboarding completion email sent for chef X`
7. **Verify**: Check Resend dashboard (or stub log `[ChefOnboardingComplete] RESEND_API_KEY is placeholder, stubbing email send`)

**Negative test cases**:
- Publish with missing service fields → 400 error, no email sent
- Publish without going through wizard → works fine (any chef can publish, not just onboarding ones)

---

## 5. Migration Notes

- **Database**: No changes required
- **Environment**: No new env vars required (uses existing `RESEND_API_KEY`, `FROM_EMAIL`, `DASHBOARD_URL`)
- **Dependencies**: No new packages (uses existing `resend` package already in use for diner emails)
- **Breaking changes**: None — additive feature only

---

## 6. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Email not sent (Resend failure) | Low | Low | Fire-and-forget; errors logged but don't block chef |
| Chef email missing | Low | Medium | Guard clause checks for email before sending |
| Duplicate emails if publish called twice | Low | Low | Each publish to a new service sends one email (expected behavior for multi-service chefs) |

---

## 7. Dependencies & Blockers

- **MAI-618**: Fred approval needed for infrastructure changes (if any infra-level changes were needed — none in this implementation)
- **No new external dependencies**: Uses existing email infrastructure
- **Fred review**: May want to customize email copy/content before going live