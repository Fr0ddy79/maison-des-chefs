-- Migration: Add booking_internal_notes table for admin notes
-- Issue: MAI-2833

CREATE TABLE public.booking_internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient lookup by booking
CREATE INDEX IF NOT EXISTS idx_booking_internal_notes_booking_id ON public.booking_internal_notes(booking_id);

-- Index for ordering by created_at within a booking
CREATE INDEX IF NOT EXISTS idx_booking_internal_notes_created ON public.booking_internal_notes(booking_id, created_at);

-- Row Level Security
ALTER TABLE public.booking_internal_notes ENABLE ROW LEVEL SECURITY;

-- Only admins can view and insert internal notes
CREATE POLICY "Only admins can view booking internal notes"
  ON public.booking_internal_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can insert booking internal notes"
  ON public.booking_internal_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
