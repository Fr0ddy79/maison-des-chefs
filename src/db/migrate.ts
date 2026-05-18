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

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL REFERENCES services(id),
      chef_id INTEGER NOT NULL REFERENCES users(id),
      client_name TEXT,
      email TEXT NOT NULL,
      phone TEXT,
      event_date TEXT,
      guest_count INTEGER NOT NULL DEFAULT 0,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      price_estimate_sent_at INTEGER,
      first_response_at INTEGER,
      first_chef_action_at INTEGER,
      response_within_sla INTEGER NOT NULL DEFAULT 0,
      sla_escalated INTEGER NOT NULL DEFAULT 0,
      sla_escalated_at INTEGER,
      inquiry_confirm_sent_at INTEGER,
      quote_amount REAL,
      quote_message TEXT,
      quote_sent_at INTEGER,
      quote_reminder_sent_at INTEGER,
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

  // MAI-795: Add quote_reminder_sent_at column if it doesn't exist (for existing databases)
  try {
    sqlite.exec(`ALTER TABLE leads ADD COLUMN quote_reminder_sent_at INTEGER`);
    console.log('Migration: Added quote_reminder_sent_at column to leads');
  } catch (err) {
    // Column may already exist, which is fine
  }

  // MAI-205: Add guest checkout fields to bookings if they don't exist
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN guest_email TEXT`);
    console.log('Migration: Added guest_email column to bookings');
  } catch (err) {
    // Column may already exist, which is fine
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN guest_token_hash TEXT`);
    console.log('Migration: Added guest_token_hash column to bookings');
  } catch (err) {
    // Column may already exist, which is fine
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0`);
    console.log('Migration: Added email_verified column to bookings');
  } catch (err) {
    // Column may already exist, which is fine
  }

  // MAI-805: Add access token fields to bookings if they don't exist
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN access_token TEXT`);
    console.log('Migration: Added access_token column to bookings');
  } catch (err) {
    // Column may already exist, which is fine
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN access_token_expires_at INTEGER`);
    console.log('Migration: Added access_token_expires_at column to bookings');
  } catch (err) {
    // Column may already exist, which is fine
  }
  // Create index on access_token for fast lookups
  try {
    sqlite.exec(`CREATE INDEX IF NOT EXISTS bookings_access_token_idx ON bookings(access_token)`);
    console.log('Migration: Created access_token index on bookings');
  } catch (err) {
    // Index may already exist, which is fine
  }

  // MAI-695: Create abandoned_bookings table if it doesn't exist
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS abandoned_bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER NOT NULL UNIQUE REFERENCES bookings(id),
        detected_at INTEGER NOT NULL,
        email_sent INTEGER NOT NULL DEFAULT 0,
        sms_sent INTEGER NOT NULL DEFAULT 0,
        recovered INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `);
    console.log('Migration: Created abandoned_bookings table');
  } catch (err) {
    // Table may already exist, which is fine
  }

  // MAI-805: Add access token fields to leads if they don't exist
  try {
    sqlite.exec(`ALTER TABLE leads ADD COLUMN access_token TEXT`);
    console.log('Migration: Added access_token column to leads');
  } catch (err) {
    // Column may already exist, which is fine
  }
  try {
    sqlite.exec(`ALTER TABLE leads ADD COLUMN access_token_expires_at INTEGER`);
    console.log('Migration: Added access_token_expires_at column to leads');
  } catch (err) {
    // Column may already exist, which is fine
  }
  // Create index on access_token for fast lookups
  try {
    sqlite.exec(`CREATE INDEX IF NOT EXISTS leads_access_token_idx ON leads(access_token)`);
    console.log('Migration: Created access_token index on leads');
  } catch (err) {
    // Index may already exist, which is fine
  }

  // MAI-806: Add chef_note column to leads if it doesn't exist
  try {
    sqlite.exec(`ALTER TABLE leads ADD COLUMN chef_note TEXT NOT NULL DEFAULT ''`);
    console.log('Migration: Added chef_note column to leads');
  } catch (err) {
    // Column may already exist, which is fine
  }

  // MAI-823: Add referral tracking columns to leads if they don't exist
  try {
    sqlite.exec(`ALTER TABLE leads ADD COLUMN referral_code TEXT`);
    console.log('Migration: Added referral_code column to leads');
  } catch (err) {
    // Column may already exist, which is fine
  }
  try {
    sqlite.exec(`ALTER TABLE leads ADD COLUMN referral_source TEXT`);
    console.log('Migration: Added referral_source column to leads');
  } catch (err) {
    // Column may already exist, which is fine
  }
  // Create index on referral_code for fast lookups
  try {
    sqlite.exec(`CREATE INDEX IF NOT EXISTS leads_referral_code_idx ON leads(referral_code)`);
    console.log('Migration: Created referral_code index on leads');
  } catch (err) {
    // Index may already exist, which is fine
  }

  // MAI-921: Add photo_url column to chef_profiles if it doesn't exist
  try {
    sqlite.exec(`ALTER TABLE chef_profiles ADD COLUMN photo_url TEXT`);
    console.log('Migration: Added photo_url column to chef_profiles');
  } catch (err) {
    // Column may already exist, which is fine
  }

  // MAI-926: Add photos column to services if it doesn't exist
  try {
    sqlite.exec(`ALTER TABLE services ADD COLUMN photos TEXT NOT NULL DEFAULT '[]'`);
    console.log('Migration: Added photos column to services');
  } catch (err) {
    // Column may already exist, which is fine
  }

  // MAI-940: Create reviews table if it doesn't exist
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chef_id INTEGER NOT NULL REFERENCES users(id),
        service_id INTEGER NOT NULL REFERENCES services(id),
        diner_id INTEGER NOT NULL REFERENCES users(id),
        booking_id INTEGER NOT NULL REFERENCES bookings(id),
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at INTEGER NOT NULL,
        UNIQUE(booking_id)
      )
    `);
    console.log('Migration: Created reviews table');
  } catch (err) {
    // Table may already exist, which is fine
  }
  // Create index on service_id for fast lookups
  try {
    sqlite.exec(`CREATE INDEX IF NOT EXISTS reviews_service_id_idx ON reviews(service_id)`);
    console.log('Migration: Created service_id index on reviews');
  } catch (err) {
    // Index may already exist, which is fine
  }

  // MAI-1144: Add booking_id column to leads for direct booking linkage
  try {
    sqlite.exec(`ALTER TABLE leads ADD COLUMN booking_id INTEGER REFERENCES bookings(id)`);
    console.log('Migration: Added booking_id column to leads');
  } catch (err) {
    // Column may already exist, which is fine
  }

  // MAI-948: Add multi-chef inquiry tracking columns to leads if they don't exist
  try {
    sqlite.exec(`ALTER TABLE leads ADD COLUMN inquiry_type TEXT NOT NULL DEFAULT 'single'`);
    console.log('Migration: Added inquiry_type column to leads');
  } catch (err) {
    // Column may already exist, which is fine
  }
  try {
    sqlite.exec(`ALTER TABLE leads ADD COLUMN multi_inquiry_id TEXT`);
    console.log('Migration: Added multi_inquiry_id column to leads');
  } catch (err) {
    // Column may already exist, which is fine
  }
  // Create index on multi_inquiry_id for fast lookups
  try {
    sqlite.exec(`CREATE INDEX IF NOT EXISTS leads_multi_inquiry_id_idx ON leads(multi_inquiry_id)`);
    console.log('Migration: Created multi_inquiry_id index on leads');
  } catch (err) {
    // Index may already exist, which is fine
  }

  // MAI-1051: Add signature_dishes column to chef_profiles if it doesn't exist
  try {
    sqlite.exec(`ALTER TABLE chef_profiles ADD COLUMN signature_dishes TEXT NOT NULL DEFAULT '[]'`);
    console.log('Migration: Added signature_dishes column to chef_profiles');
  } catch (err) {
    // Column may already exist, which is fine
  }

  // MAI-766: Add quote_token and quote_token_hash columns if they don't exist
  try {
    sqlite.exec(`ALTER TABLE leads ADD COLUMN quote_token TEXT`);
    console.log('Migration: Added quote_token column to leads');
  } catch (err) {
    // Column may already exist, which is fine
  }
  try {
    sqlite.exec(`ALTER TABLE leads ADD COLUMN quote_token_hash TEXT`);
    console.log('Migration: Added quote_token_hash column to leads');
  } catch (err) {
    // Column may already exist, which is fine
  }

  // MAI-875: Add selected_addons column for upsell tracking
  try {
    sqlite.exec(`ALTER TABLE leads ADD COLUMN selected_addons TEXT NOT NULL DEFAULT '[]'`);
    console.log('Migration: Added selected_addons column to leads');
  } catch (err) {
    // Column may already exist, which is fine
  }

  // MAI-845: Add stale_lead_reengagement_sent_at for idempotency
  try {
    sqlite.exec(`ALTER TABLE leads ADD COLUMN stale_lead_reengagement_sent_at INTEGER`);
    console.log('Migration: Added stale_lead_reengagement_sent_at column to leads');
  } catch (err) {
    // Column may already exist, which is fine
  }

  // MAI-1700: Add metadata column to notifications table
  try {
    sqlite.exec(`ALTER TABLE notifications ADD COLUMN metadata TEXT`);
    console.log('Migration: Added metadata column to notifications');
  } catch (err) {
    // Column may already exist, which is fine
  }

  // MAI-1212: Create notifications table if it doesn't exist
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        read INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `);
    console.log('Migration: Created notifications table');
  } catch (err) {
    // Table may already exist, which is fine
  }
  try {
    sqlite.exec(`CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id)`);
    console.log('Migration: Created notifications_user_id_idx index');
  } catch (err) {
    // Index may already exist, which is fine
  }

  // MAI-1328: Add whatsapp_number column for booking notifications
  try {
    sqlite.exec(`ALTER TABLE chef_profiles ADD COLUMN whatsapp_number TEXT`);
    console.log('Migration: Added whatsapp_number column');
  } catch (err) {
    // Column may already exist
  }

  // MAI-1396: Add lead_expired_sent_at for idempotency tracking of expired lead emails
  try {
    sqlite.exec(`ALTER TABLE leads ADD COLUMN lead_expired_sent_at INTEGER`);
    console.log('Migration: Added lead_expired_sent_at column to leads');
  } catch (err) {
    // Column may already exist, which is fine
  }

  sqlite.close();
  console.log('Migration complete');
}
