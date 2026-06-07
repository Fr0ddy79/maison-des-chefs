-- Migration: Add inquiry_id to bookings for unauthenticated quote accept/decline
-- Issue: MAI-2672

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS inquiry_id UUID REFERENCES public.inquiries(id) ON DELETE SET NULL;

-- Index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_bookings_inquiry_id ON public.bookings(inquiry_id);