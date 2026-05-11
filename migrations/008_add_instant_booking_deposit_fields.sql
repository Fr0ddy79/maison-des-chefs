-- MAI-1250: Instant Booking with Stripe Payment
-- Add deposit fields to leads and bookings tables

-- Add deposit fields to leads table
ALTER TABLE leads ADD COLUMN deposit_amount REAL;
ALTER TABLE leads ADD COLUMN deposit_payment_intent_id TEXT;
ALTER TABLE leads ADD COLUMN deposit_captured_at INTEGER;

-- Add deposit fields to bookings table
ALTER TABLE bookings ADD COLUMN deposit_amount REAL;
ALTER TABLE bookings ADD COLUMN deposit_payment_intent_id TEXT;
ALTER TABLE bookings ADD COLUMN deposit_captured_at INTEGER;
ALTER TABLE bookings ADD COLUMN refundable_until INTEGER;

-- Verify the columns were added (for SQLite, use PRAGMA table_info)
-- PRAGMA table_info(leads);
-- PRAGMA table_info(bookings);