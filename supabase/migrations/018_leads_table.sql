-- Migration: Create leads table for guest email capture
-- Issue: MAI-2617

CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'booking_form' CHECK (source IN ('booking_form', 'waitlist', 'contact', 'other')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email)
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);

-- RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert leads (from booking form, etc.)
CREATE POLICY "Anyone can create leads"
  ON public.leads FOR INSERT
  WITH CHECK (true);

-- Only authenticated users can read leads (for admin dashboard)
CREATE POLICY "Authenticated users can read leads"
  ON public.leads FOR SELECT
  USING (auth.role() = 'authenticated');