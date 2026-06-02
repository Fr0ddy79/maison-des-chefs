-- Migration: Add quote fields to bookings table for on-platform quote acceptance
-- Issue: MAI-2394

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS quote_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS quote_message TEXT,
ADD COLUMN IF NOT EXISTS quote_valid_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS quote_status TEXT CHECK (quote_status IN ('pending', 'accepted', 'declined', 'expired')) DEFAULT NULL;

-- Index for efficient queries on quote_status
CREATE INDEX IF NOT EXISTS idx_bookings_quote_status ON public.bookings(quote_status);

-- Backfill existing 'confirmed' bookings as accepted quotes (no quote data)
UPDATE public.bookings
SET quote_status = 'accepted'
WHERE status = 'confirmed' AND quote_status IS NULL;