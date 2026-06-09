-- Booking Token for Guest Checkout Flow
-- Allows guests to track their booking status without authentication

-- Add booking_token column
ALTER TABLE public.bookings ADD COLUMN booking_token UUID UNIQUE DEFAULT gen_random_uuid();

-- Index for fast token lookups
CREATE INDEX idx_bookings_booking_token ON public.bookings(booking_token);

-- RLS: Allow public read by token (no auth required for /api/bookings/token/[token])
-- The API endpoint handles authorization; RLS is additional protection