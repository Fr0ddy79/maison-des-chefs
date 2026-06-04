# Product Opportunity Discovery — MAI-2519

**Autopilot Run:** 2026-06-04 08:00 UTC
**Analyst:** Product Manager

---

## Executive Summary

Core booking flow (inquiry → accept → quote → accept quote) is confirmed working end-to-end. Chef application flow (MAI-2504/2505) has working backend API but the **chef onboarding is fundamentally broken** — approved chefs receive no login credentials. Three distinct gaps block the platform from operating as a real marketplace.

---

## What's Working (Confirmed This Run)

| Feature | Status | Notes |
|---------|--------|-------|
| Inquiry submission + conflict detection | ✅ Working | `/api/inquiry` |
| Chef inquiry dashboard + accept/reject | ✅ Working | `/api/inquiries` PATCH |
| Quote send/accept/decline flow | ✅ Working | `/api/bookings/[id]/quote` |
| Availability management | ✅ Working | Chef dashboard |
| Admin chef application review API | ✅ Working | GET + PATCH endpoints ready |
| Admin stats bar | ✅ Working | Pending count from API |
| Diner booking dashboard | ✅ Working | Quote accept/decline UI |
| Analytics tracking | ✅ Working | `/api/analytics/*` |
| Email infrastructure (non-blocking) | ✅ Working | All email calls use `.catch()` |
| Compare page | ✅ Functional | `/compare?chefs=id1,id2` |
| A/B testing framework | ✅ Functional | `simplified` vs `standard` booking form |

---

## Critical Gap #1: Chef Approval Creates Ghost Accounts (P0)

### Problem Statement

When an admin approves a chef application via `PATCH /api/admin/chef-applications/[id]` with `action=approve`, the code:

1. Creates a `profiles` record using the **application ID** as the profile UUID
2. Creates a `chef_profiles` record with the same ID
3. **Does NOT create an `auth.users` entry**

```ts
// Current broken flow (line ~60 in [id]/route.ts)
const { data: newProfile, error: profileError } = await supabase
  .from('profiles')
  .insert({
    id: id, // ← APPLICATION ID, not a real auth user UUID
    email: application.email,
    full_name: application.name,
    role: 'chef',
  })
```

**Result:** Approved chefs have database records but **no login credentials**. They cannot authenticate. The chef account is a ghost.

### User Story

**As an** admin
**I want** approved chefs to receive login credentials automatically
**So that** they can immediately access their dashboard and start receiving bookings

**Currently:** Admin clicks "Approve", system says "success", but chef gets no email with password/set-password link and cannot log in.

### Scope

**In:**
- Generate a secure temporary password on approval
- Create a real `auth.users` entry with the chef's email
- Send a "welcome + set password" email to the chef (depends on Resend key)
- Create profile and chef_profiles linked to the real auth user ID

**Out:**
- Full invitation email template redesign (future)
- Password reset flow improvements (future)
- Multiple chef approval in bulk (future)

### Acceptance Criteria

- [ ] Approved chef receives an email with login credentials (or set-password link)
- [ ] Chef can successfully log in with provided credentials
- [ ] Chef's profile and chef_profiles are correctly linked to their auth user
- [ ] Duplicate approval attempts are handled gracefully (not creating orphaned records)

### Metrics

- **Primary:** % of approved chefs who can successfully log in (target: 100%)
- **Secondary:** Admin approval → chef first login time (target: <24h)

### Open Questions

- Should we use Supabase's built-in invite functionality (`supabase.auth.admin.inviteUserByEmail`)?
- Should we send the chef a "check your email to set password" link instead of a generated password?
- Do we need to handle the case where the email already exists in auth.users?

---

## Critical Gap #2: Resend API Key Still Placeholder (P0 — Fred's Action)

**Status:** Unchanged since MAI-2513 (4 days ago). All transactional emails silently fail.

### Impact

| Email | Recipient | Status |
|-------|-----------|--------|
| Chef approval notification | Chef applicant | ❌ Silent fail |
| Chef rejection notification | Chef applicant | ❌ Silent fail |
| Inquiry confirmation to diner | Diner | ❌ Silent fail |
| Booking confirmed email | Diner | ❌ Silent fail |
| Quote available notification | Diner | ❌ Silent fail |

### What Works Without It

- All booking flows work via UI (dashboard)
- No user-facing crashes

### What Requires It

- Chef onboarding (Gap #1 above needs email sending)
- Diner trust/confirmation emails
- All other transactional emails

### Action Required (Fred)

```bash
# In /home/fred/.local/share/Trash/files/maison-des-chefs/.env.local
RESEND_API_KEY=re_your_actual_key_here
```

Get a free key at [resend.com](https://resend.com).

---

## Gap #3: Admin Revenue Calculation is Still Wrong (P1)

### Problem Statement

MAI-2518 was created (Fix Admin Revenue Calculation Query) but remains in `todo` status. The admin dashboard still calculates:

```ts
// Current (wrong) — in admin/page.tsx
.eq('status', 'completed')
```

Should be:

```ts
// Correct — in quote-based workflow, revenue = accepted quotes
.eq('quote_status', 'accepted')
```

### User Story

**As an** admin
**I want** the revenue metric to show all confirmed bookings (accepted quotes)
**So that** I can accurately track platform business health before events happen

**Currently:** Revenue shows $0 unless a booking has `status = 'completed'` (event already happened). All future confirmed bookings are invisible in revenue stats.

### Scope

**In:**
- Fix revenue query filter in admin stats calculation
- Update the "Revenue" label to clarify it means "Confirmed Revenue"

**Out:**
- Potential revenue / pending revenue breakdown (future)
- Historical revenue chart (future)

### Acceptance Criteria

- [ ] Admin dashboard shows revenue = SUM of bookings where `quote_status = 'accepted'`
- [ ] Revenue figure is non-zero once any quote is accepted

### Metrics

- **Primary:** Revenue accuracy vs. actual accepted quotes (target: 100% match)

### Open Questions

- Should we also show "Potential Revenue" from pending quotes as a secondary metric?
- Do we want a "Completed Events" revenue figure separate from "Confirmed Bookings"?

---

## Gap #4: Service Management UI is Missing (P2)

### Problem Statement

The chef dashboard has a "Manage Services" link in the Quick Actions sidebar:

```tsx
<a href="#" className="...">Manage Services</a>
```

This link goes to `#` (nowhere). Chefs have **no UI** to:
- Create a new service (title, description, cuisine type, duration, price per person, max guests)
- Edit an existing service
- Deactivate a service without deleting it

The `services` table exists in the schema, but there's no CRUD UI for it.

### User Story

**As a** chef
**I want** to create and manage my service offerings
**So that** diners can see what experiences I provide and book accordingly

**Currently:** Chef completes application, gets approved (somehow), logs in, has empty services. No way to add services.

### Scope

**In:**
- `/dashboard/chef/services` page
- Create service form: title, description, cuisine type, duration, price_per_person, max_guests
- List existing services with edit/deactivate actions
- Services are linked to the chef's profile

**Out:**
- Service image upload (future)
- Service popularity analytics (future)
- Bulk service creation (future)

### Acceptance Criteria

- [ ] Chef can create a new service with all required fields
- [ ] Chef can view a list of their existing services
- [ ] Chef can edit an existing service
- [ ] Chef can deactivate a service (soft delete, not removing bookings)
- [ ] New services appear in the chef profile and booking flow

### Metrics

- **Primary:** % of verified chefs with ≥1 active service (target: >80%)
- **Secondary:** Services per chef (target: >2)

### Open Questions

- Should there be a required minimum of services before a chef appears in search?
- Do we need a "featured service" or primary service designation?

---

## Gap #5: No Review System UI (P2)

### Problem Statement

The SPEC.md defines a review system:

```sql
reviews (
  booking_id UUID REFERENCES bookings(id),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT
)
```

The `reviews` table exists in the schema. However:
- No UI exists for diners to leave reviews
- No UI exists for chefs to view reviews
- No rating aggregation exists on chef profiles
- The "Leave a Review" trigger is missing

### User Story

**As a** diner
**I want** to rate and review my experience after a booking
**So that** future diners can make informed decisions and chefs get feedback

**Currently:** Post-booking experience leaves no trace. Chef ratings remain at 0.

### Scope

**In:**
- "Leave a Review" button on diner booking dashboard for `status = completed` bookings
- Star rating (1-5) + comment form
- Review submission endpoint (`POST /api/reviews`)
- Reviews appear on chef profile page
- Chef `avg_rating` and `review_count` update on review submission

**Out:**
- Review moderation UI (future)
- Review flagged as inappropriate handling (future)
- Photo reviews (future)

### Acceptance Criteria

- [ ] Diners see "Leave a Review" option for completed bookings
- [ ] Star rating selection works (1-5)
- [ ] Comment field accepts text
- [ ] Review appears on chef's public profile
- [ ] Chef's avg_rating updates correctly

### Metrics

- **Primary:** Review completion rate for completed bookings (target: >50%)
- **Secondary:** Average rating of platform chefs (target: >4.0)

### Open Questions

- Should reviews be visible immediately or held for moderation?
- Can diners edit their reviews after submitting?
- Do we need a "first review" bonus or incentive?

---

## Priority Ranking

| # | Opportunity | Priority | Effort | Owner | Status |
|---|------------|----------|--------|-------|--------|
| 1 | Chef Approval Ghost Accounts | **P0** | Medium | Backend + Email | MAI-2504 API done; onboarding broken |
| 2 | Resend API Key Configuration | **P0** | Low | Fred (action required) | Key still placeholder |
| 3 | Admin Revenue Calculation Fix | **P1** | Low | Backend | MAI-2518 created but not done |
| 4 | Service Management UI | P2 | Medium | Frontend + Backend | No UI exists |
| 5 | Review System UI | P2 | Medium | Frontend + Backend | Schema exists, no UI |

---

## Technical Notes

### Chef Approval Bug Detail

The approve flow in `/api/admin/chef-applications/[id]/route.ts`:

1. Line ~60: Inserts into `profiles` with `id: id` (application UUID, not auth UUID)
2. Line ~75: Inserts into `chef_profiles` with same ID
3. **Missing**: No call to `supabase.auth.admin.createUser()` or `inviteUserByEmail()`
4. **Result**: Database records exist, auth records do not

**Correct approach**: Use Supabase Admin API to create the auth user:
```ts
const { data: authUser, error: authError } = await supabase.auth.admin.inviteUserByEmail(
  application.email,
  {
    data: { full_name: application.name, role: 'chef' }
  }
)
if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })
// Then create profile + chef_profiles with authUser.id
```

### Revenue Query Fix

In `src/app/admin/page.tsx`, line ~93:
```ts
// WRONG (current):
.eq('status', 'completed')

// CORRECT:
.eq('quote_status', 'accepted')
```

---

## Changes Since Previous Run (MAI-2513)

| Item | MAI-2513 | MAI-2519 |
|------|----------|----------|
| Core booking flow | Working | ✅ Still working |
| Resend API key | Placeholder | ❌ Still placeholder |
| Admin revenue | Wrong filter | ❌ Still wrong (MAI-2518 pending) |
| Chef approval API | Working | ✅ Working but **broken** (ghost accounts) |
| Service management UI | Not present | ❌ Still missing |
| Review system UI | Not present | ❌ Still missing |
| Compare page | Functional | ✅ Functional but undiscoverable |

---

## Open Questions for Fred

1. **Resend API Key** — When can you provide the actual key? This blocks chef onboarding emails and diner confirmations.
2. **Chef Login Credentials** — Should approved chefs get an auto-generated password emailed to them, or receive a "set your password" link via Supabase invite?
3. **Admin Revenue Definition** — Confirm: should revenue = all accepted quotes (current proposal), or only completed events?
4. **Service Minimum** — Should chefs be required to have at least 1 service before appearing in search?

---

*Generated by Product Manager — MAI-2519*
