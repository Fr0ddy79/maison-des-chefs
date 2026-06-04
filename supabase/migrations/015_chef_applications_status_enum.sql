-- Migration: 015_chef_applications_status_enum
-- Converts status column from TEXT to ENUM type for constraint enforcement
-- Migration 014 already added the columns with TEXT type; this migration converts them
-- to proper ENUM with constraints. Safe to run multiple times (idempotent).

BEGIN;

-- Create the ENUM type if it doesn't exist (idempotent)
DO $$ BEGIN
  CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Convert existing TEXT status column to ENUM type
-- If columns don't exist yet (fresh DB), this will fail but that's expected
-- If already ENUM, the USING clause is a no-op
ALTER TABLE public.chef_applications
  ALTER COLUMN status TYPE application_status
  USING status::application_status;

-- Ensure NOT NULL constraint is in place
ALTER TABLE public.chef_applications
  ALTER COLUMN status SET NOT NULL;

-- Add index for filtering by status (idempotent)
-- Note: 014 may have already created idx_chef_applications_status as TEXT index
DROP INDEX IF EXISTS idx_chef_applications_status;
CREATE INDEX idx_chef_applications_status
  ON public.chef_applications (status);

-- Add partial index for pending applications (most common admin query)
DROP INDEX IF EXISTS idx_chef_applications_pending;
CREATE INDEX idx_chef_applications_pending
  ON public.chef_applications (status)
  WHERE status = 'pending';

-- RLS: Allow admins to update chef applications (replaces any existing policy)
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
  
  -- Convert ENUM back to TEXT
  ALTER TABLE public.chef_applications
    ALTER COLUMN status TYPE TEXT;
  
  -- Restore NOT NULL on TEXT column
  ALTER TABLE public.chef_applications
    ALTER COLUMN status SET NOT NULL;
  
  -- Re-add TEXT index (replace ENUM indexes)
  DROP INDEX IF EXISTS idx_chef_applications_pending;
  DROP INDEX IF EXISTS idx_chef_applications_status;
  CREATE INDEX idx_chef_applications_status ON public.chef_applications (status);
  
  -- RLS: Keep existing policies (no policy drop on downgrade)
  
  COMMIT;
  
  -- Drop ENUM type
  DROP TYPE IF EXISTS application_status;
]]