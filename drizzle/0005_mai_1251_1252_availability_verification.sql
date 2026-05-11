-- MAI-1251/MAI-1252: Chef availability and verification tables
-- Chef weekly availability schedule
CREATE TABLE IF NOT EXISTS chef_availability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chef_id INTEGER NOT NULL REFERENCES users(id),
  day_of_week INTEGER NOT NULL, -- 0=Sunday, 6=Saturday
  start_time TEXT NOT NULL, -- HH:MM format
  end_time TEXT NOT NULL, -- HH:MM format
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Chef blocked dates
CREATE TABLE IF NOT EXISTS chef_blocked_dates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chef_id INTEGER NOT NULL REFERENCES users(id),
  date TEXT NOT NULL, -- YYYY-MM-DD format
  reason TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Chef verification submissions
CREATE TABLE IF NOT EXISTS chef_verification_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chef_id INTEGER NOT NULL REFERENCES users(id),
  -- Tier 1: Identity
  identity_full_name TEXT,
  identity_phone_verified INTEGER NOT NULL DEFAULT 0,
  identity_government_id_url TEXT,
  -- Tier 2: Experience
  experience_years INTEGER,
  experience_past_employment TEXT NOT NULL DEFAULT '[]', -- JSON array
  experience_cuisine_training TEXT NOT NULL DEFAULT '[]', -- JSON array
  -- Tier 3: Safety
  safety_food_safety_cert TEXT,
  safety_cert_expiry_date TEXT, -- YYYY-MM-DD
  safety_cert_url TEXT,
  -- Review fields
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  submitted_at INTEGER,
  reviewed_at INTEGER,
  reviewed_by INTEGER REFERENCES users(id),
  review_notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- MAI-1326: Add verification_badges column to chef_profiles if it doesn't exist
-- This is a schema extension, not a new table, but included here for completeness
-- (The column is added via ALTER TABLE in existing migrations or fresh installs get it via CREATE TABLE)
