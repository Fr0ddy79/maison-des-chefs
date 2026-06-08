-- Add reminder_sent flag to bookings table
-- Prevents duplicate reminder emails from being sent
ALTER TABLE public.bookings
ADD COLUMN reminder_sent BOOLEAN DEFAULT FALSE NOT NULL;

-- Index for efficient queries on the cron job
-- Finds confirmed bookings that haven't received reminders yet
CREATE INDEX idx_bookings_reminder_pending
  ON public.bookings(booking_date)
  WHERE status = 'confirmed' AND reminder_sent = FALSE;