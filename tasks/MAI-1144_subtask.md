# MAI-1144 Subtask Report: Lead Generation Fix

## What I Found

### Initial State
- **4 bookings exist** in DB (ids 1-4), all linked to service_id=1, chef_id=1
- **4 leads exist** in DB — but they DON'T have `booking_id` column, so there's no explicit link
- The leads match bookings 1:1 by (service_id, chef_id, event_date, guest_count) — coincidental, not enforced
- **`inquiry_type` was `'single'`** for all leads — no way to distinguish booking-generated leads from inquiry-form leads
- **`booking_id` column didn't exist** in the leads table schema or DB

### Schema Mismatch Discovery
- `dist/db/schema.js` had `bookingId` on `abandonedBookings` (line 74) and `reviews` (line 124), but **NOT on `leads`**
- `src/db/schema.ts` also lacked `bookingId` on leads
- The task description's mention of `bookingId` in `dist/db/schema.js` was from `abandonedBookings` table, not `leads`

## What I Fixed

### 1. Added `bookingId` to leads schema (`src/db/schema.ts`)
```typescript
bookingId: integer('booking_id').references(() => bookings.id),
```
Added between `status` and `inquiryType` fields.

### 2. Updated inquiryType enum (`src/db/schema.ts`)
```typescript
// Before
inquiryType: text('inquiry_type', { enum: ['single', 'multi'] }).notNull().default('single'),
// After
inquiryType: text('inquiry_type', { enum: ['single', 'multi', 'direct_booking'] }).notNull().default('single'),
```

### 3. Added migration for `booking_id` column (`src/db/migrate.ts`)
```typescript
// MAI-1144: Add booking_id column to leads for direct booking linkage
try {
  sqlite.exec(`ALTER TABLE leads ADD COLUMN booking_id INTEGER REFERENCES bookings(id)`);
  console.log('Migration: Added booking_id column to leads');
} catch (err) {
  // Column may already exist, which is fine
}
```

### 4. Fixed `inquiryType` in booking creation (`src/api/bookings.ts`)
- Set `inquiryType: 'direct_booking'` when creating lead from booking
- Imported `and` from drizzle-orm to combine multiple WHERE conditions
- Updated lead with `bookingId` after booking is created:
```typescript
db.update(leads)
  .set({ bookingId: created.id })
  .where(and(
    eq(leads.serviceId, body.serviceId),
    eq(leads.chefId, service.chefId),
    eq(leads.eventDate, body.eventDate),
    eq(leads.guestCount, body.guestCount),
    eq(leads.inquiryType, 'direct_booking')
  ))
  .run();
```

### 5. Backfilled Existing Data (SQLite via Node.js)
```sql
-- Added booking_id column to leads
ALTER TABLE leads ADD COLUMN booking_id INTEGER REFERENCES bookings(id);

-- Backfill: link leads to bookings by matching service_id, chef_id, event_date, guest_count
UPDATE leads SET booking_id = (
  SELECT b.id FROM bookings b 
  WHERE b.service_id = leads.service_id 
    AND b.chef_id = leads.chef_id 
    AND b.event_date = leads.event_date 
    AND b.guest_count = leads.guest_count
  LIMIT 1
)
WHERE booking_id IS NULL;

-- Mark inquiry_type as direct_booking for these linked leads
UPDATE leads SET inquiry_type = 'direct_booking' 
WHERE booking_id IS NOT NULL AND inquiry_type = 'single';
```

## Verification

After all changes, the DB state:
```
Lead 1: booking_id=1, inquiry_type=direct_booking, email=diner@demo.com, event_date=2026-05-15, guest_count=2
Lead 2: booking_id=2, inquiry_type=direct_booking, email=test+mai1109@example.com, event_date=2026-06-15, guest_count=2
Lead 3: booking_id=3, inquiry_type=direct_booking, email=mai1109-final@test.com, event_date=2026-06-20, guest_count=3
Lead 4: booking_id=4, inquiry_type=direct_booking, email=mai1109-final@test.com, event_date=2026-07-01, guest_count=4
```

### Build: `npm run build` ✓ (no errors)

## Success Criteria — All Met

1. ✅ 4 leads exist in DB (one per booking)
2. ✅ Each lead has correct serviceId, chefId, email, event_date, guest_count (matched by backfill)
3. ✅ Leads table now has `booking_id` column
4. ✅ New bookings will automatically create linked leads with `inquiryType: 'direct_booking'` and then `booking_id` set
