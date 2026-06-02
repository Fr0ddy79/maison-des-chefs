-- Migration: Add booking_form_events table for A/B test analytics
-- Issue: MAI-2408

CREATE TABLE IF NOT EXISTS public.booking_form_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL,
  service_id UUID NOT NULL,
  variant TEXT NOT NULL CHECK (variant IN ('standard', 'simplified')),
  event_type TEXT NOT NULL CHECK (event_type IN ('viewed', 'submitted')),
  lead_id UUID,
  guest_count INTEGER,
  event_date DATE,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_booking_form_events_chef_id ON public.booking_form_events(chef_id);
CREATE INDEX IF NOT EXISTS idx_booking_form_events_variant ON public.booking_form_events(variant);
CREATE INDEX IF NOT EXISTS idx_booking_form_events_event_type ON public.booking_form_events(event_type);
CREATE INDEX IF NOT EXISTS idx_booking_form_events_created_at ON public.booking_form_events(created_at);

-- RLS - inserts are allowed without auth (from client-side analytics)
ALTER TABLE public.booking_form_events ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert events (analytics from client)
CREATE POLICY "Anyone can create booking form events"
  ON public.booking_form_events FOR INSERT
  WITH CHECK (true);

-- Only authenticated users can read (for analytics dashboard)
CREATE POLICY "Authenticated users can read booking form events"
  ON public.booking_form_events FOR SELECT
  USING (auth.role() = 'authenticated');