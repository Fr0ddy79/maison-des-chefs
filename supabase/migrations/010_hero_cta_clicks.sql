-- Migration: Add hero_cta_clicks table for A/B test analytics
-- Issue: MAI-2383

CREATE TABLE IF NOT EXISTS public.hero_cta_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant TEXT NOT NULL CHECK (variant IN ('find_your_chef', 'browse_available')),
  cta_type TEXT NOT NULL CHECK (cta_type IN ('primary', 'secondary')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries by variant and date
CREATE INDEX IF NOT EXISTS idx_hero_cta_clicks_variant ON public.hero_cta_clicks(variant);
CREATE INDEX IF NOT EXISTS idx_hero_cta_clicks_created_at ON public.hero_cta_clicks(created_at);

-- RLS - inserts are allowed without auth (from client-side analytics)
ALTER TABLE public.hero_cta_clicks ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert clicks (analytics from client)
CREATE POLICY "Anyone can create hero CTA click events"
  ON public.hero_cta_clicks FOR INSERT
  WITH CHECK (true);

-- Only authenticated users can read (for analytics dashboard)
CREATE POLICY "Authenticated users can read hero CTA clicks"
  ON public.hero_cta_clicks FOR SELECT
  USING (auth.role() = 'authenticated');