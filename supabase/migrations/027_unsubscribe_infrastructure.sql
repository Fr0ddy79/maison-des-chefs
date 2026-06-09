-- Migration: 027_unsubscribe_infrastructure
-- Description: Add unsubscribe_token and email_unsubscribed columns to profiles table
-- Owner: Backend Engineer
-- Date: 2026-06-09

-- Add unsubscribe_token column (UUID for unique unsubscribe link)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS unsubscribe_token UUID;

-- Add email_unsubscribed column (default false, true when user unsubscribes)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_unsubscribed BOOLEAN DEFAULT FALSE;

-- Create index on unsubscribe_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_unsubscribe_token ON profiles(unsubscribe_token);

-- Create index on email_unsubscribed for filtering
CREATE INDEX IF NOT EXISTS idx_profiles_email_unsubscribed ON profiles(email_unsubscribed) WHERE email_unsubscribed = TRUE;

-- Generate unsubscribe tokens for all existing profiles that don't have one
UPDATE profiles
SET unsubscribe_token = gen_random_uuid()
WHERE unsubscribe_token IS NULL;

-- Add constraint to ensure unsubscribe_token is unique (not enforced at DB level since it's nullable)
-- Note: We handle uniqueness at the application level since not all profiles need a token

COMMENT ON COLUMN profiles.unsubscribe_token IS 'UUID token for email unsubscribe link - unique per user';
COMMENT ON COLUMN profiles.email_unsubscribed IS 'When true, user will not receive marketing/transactional emails';