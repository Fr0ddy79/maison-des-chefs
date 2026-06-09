-- Migration: 030_chef_applications_rejection_reason
-- Adds rejection_reason column to chef_applications table
-- Used when admin rejects a chef application

BEGIN;

-- Add rejection_reason column (optional, nullable text)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chef_applications'
    AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE public.chef_applications
      ADD COLUMN rejection_reason TEXT;
  END IF;
EXCEPTION
  WHEN undefined_table THEN null;
END $$;

COMMIT;

--[[
  Migration DOWN (rollback):

  BEGIN;
  ALTER TABLE public.chef_applications
    DROP COLUMN IF EXISTS rejection_reason;
  COMMIT;
]]