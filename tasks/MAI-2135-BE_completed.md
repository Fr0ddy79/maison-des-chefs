# MAI-2135-BE Completed — Chef Availability MVP Backend

## What Was Built

### 1. Database Migration (`drizzle/0012_mai_2131_chef_availability.sql`)

Created the following in the SQLite database:

- **`chef_availability_slots`** table — weekly recurring availability template per chef
  - `id` TEXT PRIMARY KEY (UUID)
  - `chef_id` INTEGER FK → `users(id)`
  - `day_of_week` INTEGER (0–6)
  - `start_time` TEXT (HH:MM)
  - `end_time` TEXT (HH:MM)
  - `is_active` INTEGER (boolean)
  - Indexes: `idx_chef_avail_slots_chef_id`, `idx_chef_avail_slots_chef_day`

- **Indexes on existing tables** (MAI-2131 optimization):
  - `chef_blocked_dates`: `idx_chef_blocked_dates_chef_id`, `idx_chef_blocked_dates_chef_date`
  - `chef_availability`: `idx_chef_availability_chef_day`

### 2. Schema Additions (`src/db/schema.ts`)

Added `chefAvailabilitySlots` Drizzle model pointing to `chef_availability_slots` table (UUID PK, integer FK to users).

### 3. API Endpoints (`src/api/chef-availability.ts`)

All registered under `/api/chefs/:id/availability/*`:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/chefs/:id/availability?from=&to=` | Public | Returns available slots for a date range (max 30 days). Also returns weekly template if no range specified. |
| PUT | `/api/chefs/:id/availability/slots` | Chef (own) | Replaces weekly availability template. Accepts array of day/slot objects. |
| POST | `/api/chefs/:id/availability/blocked-dates` | Chef (own) | Blocks one or more specific dates. Idempotent (skips already-blocked). |
| DELETE | `/api/chefs/:id/availability/blocked-dates/:date` | Chef (own) | Unblocks a specific date. Returns 404 if not blocked. |

### 4. Booking Conflict Detection (`src/api/bookings.ts`)

Added 409 Conflict responses to `POST /bookings` when:
- Chef has no availability slot for the requested day of week → `NO_AVAILABILITY_SLOT`
- Chef has blocked the specific date → `DATE_BLOCKED`
- Chef already has a non-cancelled booking on that date → `DATE_ALREADY_BOOKED`

### 5. Route Registration (`src/server.ts`)

- Imported and registered `chefAvailabilityRoutes` at `/api/chefs` prefix (after `chefRoutes`)

## Files Changed

| File | Change |
|------|--------|
| `drizzle/0012_mai_2131_chef_availability.sql` | **New** — migration |
| `src/db/schema.ts` | Added `chefAvailabilitySlots` model |
| `src/api/chef-availability.ts` | **New** — API routes |
| `src/api/bookings.ts` | Added conflict detection (3 checks → 409) |
| `src/server.ts` | Imported and registered new routes |

## Success Criteria

- [x] `chef_availability_slots` table created with proper indexes
- [x] `chef_blocked_dates` table has proper indexes (existing table, new indexes added)
- [x] GET `/api/chefs/:id/availability` returns slots + blocked dates + booked dates
- [x] PUT `/api/chefs/:id/availability/slots` updates weekly template
- [x] POST `/api/chefs/:id/availability/blocked-dates` blocks dates
- [x] DELETE `/api/chefs/:id/availability/blocked-dates/:date` unblocks
- [x] Booking conflict detection returns 409 on conflict (3 conflict types)

## Notes

- Uses existing `chefBlockedDates` table (MAI-1251) rather than creating a duplicate. The new `chefAvailabilitySlots` table uses UUID TEXT primary keys as specified.
- The `chefAvailability` table (MAI-1251) is untouched — the new API uses the new `chefAvailabilitySlots` table.
- Date range for availability query is capped at 30 days (MVP constraint).
- All chef-only endpoints verify `role === 'chef'` AND `chefId === userId`.
