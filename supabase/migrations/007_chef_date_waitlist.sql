-- Migration: Add chef_date_waitlist table for Waitlist MVP
-- Issue: MAI-495

CREATE TABLE IF NOT EXISTS public.chef_date_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  chef_id UUID REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  desired_date DATE NOT NULL,
  email TEXT NOT NULL,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries on chef_id + desired_date
CREATE INDEX IF NOT EXISTS idx_chef_date_waitlist_chef_date 
  ON public.chef_date_waitlist(chef_id, desired_date);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_chef_date_waitlist_email 
  ON public.chef_date_waitlist(email);

-- RLS Policies
ALTER TABLE public.chef_date_waitlist ENABLE ROW LEVEL SECURITY;

-- Public read access for waitlist status
CREATE POLICY "Waitlist entries are viewable by everyone"
  ON public.chef_date_waitlist FOR SELECT
  USING (true);

-- Chefs can manage their own waitlist entries
CREATE POLICY "Chefs can manage waitlist entries for their services"
  ON public.chef_date_waitlist FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.services
      WHERE id = service_id AND chef_id = auth.uid()
    )
  );

-- Anyone can subscribe to waitlist (no auth required for signup flow)
CREATE POLICY "Anyone can join waitlist"
  ON public.chef_date_waitlist FOR INSERT
  WITH CHECK (true);