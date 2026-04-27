import 'dotenv/config';
import Database from 'better-sqlite3';
import { config } from '../config/index.js';

export function migrate() {
  const sqlite = new Database(config.databaseUrl);
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'diner',
      has_completed_onboarding INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chef_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      bio TEXT,
      cuisine_types TEXT NOT NULL DEFAULT '[]',
      location TEXT NOT NULL DEFAULT '',
      price_per_person REAL NOT NULL DEFAULT 0,
      available INTEGER NOT NULL DEFAULT 1,
      verified INTEGER NOT NULL DEFAULT 0,
      profile_completed_at INTEGER,
      onboarding_started_at INTEGER,
      onboarding_completed_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS diner_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
      cuisines TEXT NOT NULL DEFAULT '[]',
      dietary_restrictions TEXT NOT NULL DEFAULT '[]',
      spice_tolerance TEXT NOT NULL DEFAULT 'medium',
      default_party_size INTEGER NOT NULL DEFAULT 2,
      default_delivery INTEGER NOT NULL DEFAULT 1,
      default_location TEXT NOT NULL DEFAULT '',
      wizard_completion_status TEXT NOT NULL DEFAULT 'none',
      wizard_completed_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS diner_wizard_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      event TEXT NOT NULL,
      step INTEGER,
      session_id TEXT,
      event_data TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chef_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price_per_person REAL NOT NULL,
      min_guests INTEGER NOT NULL DEFAULT 1,
      max_guests INTEGER NOT NULL DEFAULT 10,
      dietary_tags TEXT NOT NULL DEFAULT '[]',
      category TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      blocked_dates TEXT NOT NULL DEFAULT '[]',
      is_onboarding_service INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL REFERENCES services(id),
      diner_id INTEGER NOT NULL REFERENCES users(id),
      chef_id INTEGER NOT NULL REFERENCES users(id),
      event_date TEXT NOT NULL,
      guest_count INTEGER NOT NULL,
      total_price REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      token TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chef_onboarding_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chef_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
      current_step INTEGER NOT NULL DEFAULT 1,
      step1_data TEXT,
      step2_data TEXT,
      step3_data TEXT,
      step4_completed INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  sqlite.close();
  console.log('Migration complete');
}
