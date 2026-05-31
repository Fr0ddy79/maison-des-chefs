-- Migration: Add chef_blocked_dates table for blocked date conflict detection
-- Issue: MAI-2317
-- Note: MAI-2269 was supposed to add this but it appears missing from schema

CREATE TABLE IF NOT EXISTS public.chef_blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chef_id, blocked_date)
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_chef_blocked_dates_chef_date 
  ON public.chef_blocked_dates(chef_id, blocked_date);

-- RLS Policies
ALTER TABLE public.chef_blocked_dates ENABLE ROW LEVEL SECURITY;

-- Blocked dates are viewable by everyone
CREATE POLICY "Blocked dates are viewable by everyone"
  ON public.chef_blocked_dates FOR SELECT
  USING (true);

-- Chefs can manage their own blocked dates
CREATE POLICY "Chefs can manage their own blocked dates"
  ON public.chef_blocked_dates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.chef_profiles
      WHERE id = chef_id AND id = auth.uid()
    )
  );
