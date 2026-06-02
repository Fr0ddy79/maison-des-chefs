-- Migration: Add guest_count and inquiry_time to inquiries table
-- Issue: MAI-2423

ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS guest_count INTEGER CHECK (guest_count >= 1 AND guest_count <= 50),
  ADD COLUMN IF NOT EXISTS inquiry_time TIME;