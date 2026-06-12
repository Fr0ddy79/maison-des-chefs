-- MAI-2503: Add status tracking to chef_applications table
-- Columns: status (pending|approved|rejected), reviewed_at, reviewed_by

-- Create chef_applications table if it doesn't exist
CREATE TABLE IF NOT EXISTS chef_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  cuisine_types TEXT NOT NULL DEFAULT '[]',
  years_experience INTEGER NOT NULL DEFAULT 0,
  bio TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_at INTEGER,
  reviewed_by INTEGER REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- Index for fast lookups by status (for admin filtering)
CREATE INDEX IF NOT EXISTS idx_chef_applications_status ON chef_applications(status);

-- Index for fast lookups by email (for checking existing applications)
CREATE INDEX IF NOT EXISTS idx_chef_applications_email ON chef_applications(email);

-- DOWN migration (revert)
-- DROP INDEX IF EXISTS idx_chef_applications_status;
-- DROP INDEX IF EXISTS idx_chef_applications_email;
-- DROP TABLE IF EXISTS chef_applications;