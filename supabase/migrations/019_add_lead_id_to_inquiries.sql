-- Migration: Add lead_id to inquiries table
-- Issue: MAI-2617

ALTER TABLE public.inquiries
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;

-- Index for efficient queries on lead_id
CREATE INDEX IF NOT EXISTS idx_inquiries_lead_id ON public.inquiries(lead_id);