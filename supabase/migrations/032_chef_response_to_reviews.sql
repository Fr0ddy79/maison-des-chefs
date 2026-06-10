-- Migration: Add chef_response and chef_response_at columns to reviews table
-- This allows chefs to publicly respond to reviews they receive

ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS chef_response TEXT,
ADD COLUMN IF NOT EXISTS chef_response_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN reviews.chef_response IS 'Chef public response to the review (max 500 chars)';
COMMENT ON COLUMN reviews.chef_response_at IS 'Timestamp when chef last updated their response';