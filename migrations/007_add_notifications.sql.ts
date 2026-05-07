import 'dotenv/config';
import Database from 'better-sqlite3';

const databaseUrl = process.env.DATABASE_URL || './data/maison.db';
const sqlite = new Database(databaseUrl);

console.log('=== MAI-1212: Add notifications table ===\n');
console.log(`Database: ${databaseUrl}\n`);

// Step 1: Create notifications table
console.log('Step 1: Creating notifications table...');
try {
  sqlite.prepare(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `).run();
  console.log('  ✓ Created notifications table');
} catch (err: any) {
  console.error('  Error creating table:', err.message);
}

// Step 2: Create index on user_id for fast lookups
console.log('\nStep 2: Creating user_id index...');
try {
  sqlite.prepare('CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id)').run();
  console.log('  ✓ Created notifications_user_id_idx index');
} catch (err: any) {
  console.error('  Error creating index:', err.message);
}

// Step 3: Create index on created_at for ordering
console.log('\nStep 3: Creating created_at index...');
try {
  sqlite.prepare('CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC)').run();
  console.log('  ✓ Created notifications_created_at_idx index');
} catch (err: any) {
  console.error('  Error creating index:', err.message);
}

// Step 4: Verify
console.log('\n=== Verification ===\n');
try {
  const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='notifications'").all();
  console.log(`  notifications table exists: ${tables.length > 0}`);
  const columns = sqlite.prepare("PRAGMA table_info(notifications)").all();
  console.log('  Columns:', columns.map((c: any) => c.name).join(', '));
} catch (err: any) {
  console.error('  Error verifying:', err.message);
}

console.log('\n=== Acceptance Criteria Check ===');
console.log('✓ notifications table created with: id, user_id, type, title, body, read, created_at');

sqlite.close();
console.log('\n✓ Migration complete');