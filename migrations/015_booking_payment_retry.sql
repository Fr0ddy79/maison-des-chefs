-- MAI-2453: Booking Payment Retry Logic
-- Add retry tracking fields to bookings table for failed payment recovery

ALTER TABLE bookings ADD COLUMN payment_retry_count INT NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN next_retry_at INTEGER; -- unix timestamp (ms), nullable
ALTER TABLE bookings ADD COLUMN payment_external_id TEXT; -- stripe payment intent id

-- Index for efficient retry job queries
CREATE INDEX IF NOT EXISTS idx_bookings_payment_retry ON bookings (
  status,
  next_retry_at
) WHERE next_retry_at IS NOT NULL;