-- Migration: Add messages table for in-platform messaging between chefs and diners
-- Issue: MAI-2699

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT CHECK (sender_type IN ('chef', 'diner')) NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient lookup by booking
CREATE INDEX IF NOT EXISTS idx_messages_booking_id ON public.messages(booking_id);

-- Index for ordering by created_at within a booking
CREATE INDEX IF NOT EXISTS idx_messages_booking_created ON public.messages(booking_id, created_at);

-- Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Messages are viewable by participants of the booking (chef and diner)
-- Authorization is enforced at the API level, not RLS
CREATE POLICY "Messages are viewable by booking participants"
  ON public.messages FOR SELECT
  USING (true);

-- Messages can be inserted by booking participants
-- Authorization is enforced at the API level
CREATE POLICY "Messages can be inserted by booking participants"
  ON public.messages FOR INSERT
  WITH CHECK (true);