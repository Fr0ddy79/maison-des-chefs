-- MAI-1135: Backfill leads for existing bookings that have no corresponding lead
-- 
-- Root cause: POST /bookings creates a booking but never creates a lead record.
-- The inquiry form (POST /api/inquiry) creates leads, but it only works for 
-- published services. Direct booking creation bypassed lead creation entirely.
--
-- Fix applied to src/api/bookings.ts: new bookings now create a lead alongside
-- the booking record. This script backfills leads for the 4 pre-existing bookings
-- that were created before the fix.

-- Preview: show what we'll insert
SELECT 
  b.id as booking_id,
  b.service_id,
  b.chef_id,
  u.email as diner_email,
  u.name as diner_name,
  b.event_date,
  b.guest_count,
  b.notes
FROM bookings b
LEFT JOIN users u ON b.diner_id = u.id
LEFT JOIN leads l ON l.message = b.notes AND l.event_date = b.event_date AND l.guest_count = b.guest_count
WHERE l.id IS NULL;

-- Backfill: insert leads for bookings that don't have one
-- Using the same lead creation logic as the fixed bookings.ts
INSERT INTO leads (
  service_id,
  chef_id,
  client_name,
  email,
  phone,
  event_date,
  guest_count,
  message,
  status,
  created_at
)
SELECT 
  b.service_id,
  b.chef_id,
  u.name,
  u.email,
  NULL,
  b.event_date,
  b.guest_count,
  b.notes,
  'new',
  b.created_at
FROM bookings b
INNER JOIN users u ON b.diner_id = u.id
LEFT JOIN leads l ON 
  l.service_id = b.service_id 
  AND l.chef_id = b.chef_id
  AND l.event_date = b.event_date
  AND l.guest_count = b.guest_count
  AND l.created_at = b.created_at
WHERE l.id IS NULL;