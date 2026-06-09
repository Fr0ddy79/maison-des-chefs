-- Migration: Create lead_sources table for UTM and acquisition channel tracking
-- Issue: MAI-2804

-- Lead sources table: stores UTM params and referrer for first-touch attribution
CREATE TABLE IF NOT EXISTS public.lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  referrer TEXT,
  landing_page TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_lead_sources_lead_id ON public.lead_sources(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_sources_utm_source ON public.lead_sources(utm_source);
CREATE INDEX IF NOT EXISTS idx_lead_sources_utm_medium ON public.lead_sources(utm_medium);
CREATE INDEX IF NOT EXISTS idx_lead_sources_utm_campaign ON public.lead_sources(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_lead_sources_created_at ON public.lead_sources(created_at);

-- RLS
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert lead sources (from booking form, waitlist, etc.)
CREATE POLICY "Anyone can create lead sources"
  ON public.lead_sources FOR INSERT
  WITH CHECK (true);

-- Only authenticated users can read lead sources (for admin dashboard)
CREATE POLICY "Authenticated users can read lead sources"
  ON public.lead_sources FOR SELECT
  USING (auth.role() = 'authenticated');

-- Add lead_source_id to inquiries table
ALTER TABLE public.inquiries
ADD COLUMN IF NOT EXISTS lead_source_id UUID REFERENCES public.lead_sources(id) ON DELETE SET NULL;

-- Index for efficient queries on lead_source_id
CREATE INDEX IF NOT EXISTS idx_inquiries_lead_source_id ON public.inquiries(lead_source_id);

-- Add lead_source_id to emails table (for waitlist signups)
ALTER TABLE public.emails
ADD COLUMN IF NOT EXISTS lead_source_id UUID REFERENCES public.lead_sources(id) ON DELETE SET NULL;

-- Index for waitlist UTM tracking
CREATE INDEX IF NOT EXISTS idx_emails_lead_source_id ON public.emails(lead_source_id);
