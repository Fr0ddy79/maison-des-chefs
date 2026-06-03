-- MAI-2458: Stripe Payment Integration via Payment Intents
-- Add quote_amount, quote_status to bookings for payment flow
-- Add booking_refunds table for refund tracking

-- 1. Add quote_amount column to bookings (chef-set quote amount for payment)
ALTER TABLE bookings ADD COLUMN quote_amount REAL;

-- 2. Add quote_status column to bookings (payment state machine)
-- Values: pending | accepted | paid | failed | refunded | cancelled
ALTER TABLE bookings ADD COLUMN quote_status TEXT NOT NULL DEFAULT 'pending';

-- 3. Create booking_refunds table for tracking refunds
CREATE TABLE IF NOT EXISTS booking_refunds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  amount INTEGER NOT NULL, -- amount in cents
  stripe_refund_id TEXT, -- Stripe Refund object ID
  reason TEXT, -- admin-provided reason for refund
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  UNIQUE(booking_id, stripe_refund_id)
);

-- Index for looking up refunds by booking
CREATE INDEX IF NOT EXISTS idx_booking_refunds_booking ON booking_refunds(booking_id);
-- Run migration
-- sqlite3 data/maison-des-chefs.db < migrations/016_stripe_payment_intents.sql
