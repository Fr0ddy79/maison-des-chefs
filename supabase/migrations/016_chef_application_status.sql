-- Migration: 016_chef_application_status
-- Adds status tracking columns to chef_applications table
-- Idempotent: safely runs even if columns already exist
-- Dependencies: 015 (creates ENUM type)

BEGIN;

-- Add status column (TEXT with CHECK constraint as fallback, or rely on ENUM from 015)
-- This is idempotent - IF NOT EXISTS doesn't work for columns, so we use a procedural approach
DO $$ BEGIN
  -- Check if status column exists and is not already the right type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chef_applications'
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.chef_applications
      ADD COLUMN status TEXT DEFAULT 'pending'
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
EXCEPTION
  WHEN undefined_table THEN null;
END $$;

-- Add reviewed_at timestamp column (nullable)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chef_applications'
    AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE public.chef_applications
      ADD COLUMN reviewed_at TIMESTAMPTZ;
  END IF;
EXCEPTION
  WHEN undefined_table THEN null;
END $$;

-- Add reviewed_by foreign key column (nullable)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chef_applications'
    AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE public.chef_applications
      ADD COLUMN reviewed_by UUID REFERENCES public.profiles(id);
  END IF;
EXCEPTION
  WHEN undefined_table THEN null;
END $$;

-- Ensure default for status is 'pending' for new applications
DO $$ BEGIN
  ALTER TABLE public.chef_applications
    ALTER COLUMN status SET DEFAULT 'pending';
EXCEPTION
  WHEN ambiguous_function THEN null;
END $$;

-- Ensure NOT NULL on status
DO $$ BEGIN
  ALTER TABLE public.chef_applications
    ALTER COLUMN status SET NOT NULL;
EXCEPTION
  WHEN ambiguous_function THEN null;
END $$;

-- Index for efficient status filtering
CREATE INDEX IF NOT EXISTS idx_chef_applications_status
  ON public.chef_applications (status);

-- Partial index for pending applications (most common admin query)
CREATE INDEX IF NOT EXISTS idx_chef_applications_pending
  ON public.chef_applications (status)
  WHERE status = 'pending';

-- RLS: Allow admins to update chef applications
-- Drop and recreate to ensure it applies to our new columns
DROP POLICY IF EXISTS "Admins can update chef applications" ON public.chef_applications;
CREATE POLICY "Admins can update chef applications"
  ON public.chef_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Ensure RLS is enabled
ALTER TABLE public.chef_applications ENABLE ROW LEVEL SECURITY;

COMMIT;

--[[
  Migration DOWN (rollback via SQL):

  BEGIN;
  
  -- Remove added columns (but keep base table structure)
  ALTER TABLE public.chef_applications
    DROP COLUMN IF EXISTS reviewed_by,
    DROP COLUMN IF EXISTS reviewed_at;
  
  -- Keep status column but reset to simple TEXT (in case 015 converted to ENUM)
  -- Note: Full ENUM removal requires CASCADE and would affect 015
  ALTER TABLE public.chef_applications
    ALTER COLUMN status TYPE TEXT,
    ALTER COLUMN status SET DEFAULT 'pending',
    ALTER COLUMN status SET NOT NULL;
  
  -- Re-add CHECK constraint in case ENUM was converted back
  ALTER TABLE public.chef_applications
    ADD CONSTRAINT chef_applications_status_check
    CHECK (status IN ('pending', 'approved', 'rejected'));
  
  COMMIT;
]]