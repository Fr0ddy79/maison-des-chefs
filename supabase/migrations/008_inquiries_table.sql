-- Migration: Add inquiries table for chef profile contact form
-- Issue: MAI-2317

CREATE TABLE IF NOT EXISTS public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  chef_id UUID REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  diner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  inquiry_date DATE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'contacted', 'converted', 'cancelled')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_inquiries_chef_id ON public.inquiries(chef_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_inquiry_date ON public.inquiries(inquiry_date);

-- RLS Policies
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an inquiry (no auth required for contact form)
CREATE POLICY "Anyone can create inquiries"
  ON public.inquiries FOR INSERT
  WITH CHECK (true);

-- Chefs can view inquiries for their services
CREATE POLICY "Chefs can view inquiries for their services"
  ON public.inquiries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.services
      WHERE id = service_id AND chef_id = auth.uid()
    )
  );
