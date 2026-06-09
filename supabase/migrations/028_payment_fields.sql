-- Add payment-related fields to bookings table for Stripe integration

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
ADD COLUMN IF NOT EXISTS checkout_session_id TEXT;

-- Add index for faster lookup of bookings by payment status
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings(payment_status);

-- Add index for faster lookup by checkout session ID
CREATE INDEX IF NOT EXISTS idx_bookings_checkout_session ON public.bookings(checkout_session_id);

-- Add index for faster lookup by payment intent ID
CREATE INDEX IF NOT EXISTS idx_bookings_payment_intent ON public.bookings(payment_intent_id);