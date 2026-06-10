-- Migration: 033_service_image_url
-- Description: Add image_url column to services table for service image gallery
-- Phase 1 of MAI-2832 (backend only, Phase 2 handles frontend)

ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);