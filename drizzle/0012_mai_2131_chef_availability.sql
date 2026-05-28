-- MAI-2131/MAI-2135: Chef Availability MVP Backend
-- Creates chef_availability_slots (weekly recurring template) with proper indexes.
-- chef_blocked_dates already exists from MAI-1251; this migration adds indexes to it.

-- chef_availability_slots: weekly recurring availability template per chef (MAI-2131)
CREATE TABLE IF NOT EXISTS chef_availability_slots (
  id TEXT PRIMARY KEY,
  chef_id INTEGER NOT NULL REFERENCES users(id),
  day_of_week INTEGER NOT NULL CHECK(day_of_week >= 0 AND day_of_week <= 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_chef_avail_slots_chef_id
  ON chef_availability_slots(chef_id);

CREATE INDEX IF NOT EXISTS idx_chef_avail_slots_chef_day
  ON chef_availability_slots(chef_id, day_of_week, is_active);

-- Add indexes to existing chef_blocked_dates table (MAI-2131) for faster lookups
CREATE INDEX IF NOT EXISTS idx_chef_blocked_dates_chef_id
  ON chef_blocked_dates(chef_id);

CREATE INDEX IF NOT EXISTS idx_chef_blocked_dates_chef_date
  ON chef_blocked_dates(chef_id, date);

-- Add index to existing chef_availability table (MAI-2131) for faster lookups
CREATE INDEX IF NOT EXISTS idx_chef_availability_chef_day
  ON chef_availability(chef_id, day_of_week, is_active);
