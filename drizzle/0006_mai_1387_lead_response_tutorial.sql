-- Migration: MAI-1387 add_lead_response_tutorial_dismissed
-- Adds lead_response_tutorial_dismissed boolean to chef_profiles (default false)

ALTER TABLE chef_profiles ADD COLUMN lead_response_tutorial_dismissed INTEGER NOT NULL DEFAULT 0;
