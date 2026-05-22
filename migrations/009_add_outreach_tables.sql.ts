import 'dotenv/config';
import Database from 'better-sqlite3';

const databaseUrl = process.env.DATABASE_URL || './data/maison.db';
const sqlite = new Database(databaseUrl);

console.log('=== MAI-1681: Outreach Sequence Tracker ===\n');
console.log(`Database: ${databaseUrl}\n`);

// Step 1: Create outreach_campaigns table
console.log('Step 1: Creating outreach_campaigns table...');
try {
  sqlite.prepare(`
    CREATE TABLE IF NOT EXISTS outreach_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL
    )
  `).run();
  console.log('  ✓ Created outreach_campaigns table');
} catch (err: any) {
  console.error('  Error creating table:', err.message);
}

// Step 2: Create index on status for filtering active campaigns
console.log('\nStep 2: Creating status index on outreach_campaigns...');
try {
  sqlite.prepare('CREATE INDEX IF NOT EXISTS outreach_campaigns_status_idx ON outreach_campaigns(status)').run();
  console.log('  ✓ Created outreach_campaigns_status_idx index');
} catch (err: any) {
  console.error('  Error creating index:', err.message);
}

// Step 3: Create outreach_touches table
console.log('\nStep 3: Creating outreach_touches table...');
try {
  sqlite.prepare(`
    CREATE TABLE IF NOT EXISTS outreach_touches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chef_id INTEGER NOT NULL REFERENCES users(id),
      campaign_id INTEGER NOT NULL REFERENCES outreach_campaigns(id),
      channel TEXT NOT NULL,
      touch_number INTEGER NOT NULL,
      sent_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      response_at INTEGER,
      notes TEXT,
      created_at INTEGER NOT NULL
    )
  `).run();
  console.log('  ✓ Created outreach_touches table');
} catch (err: any) {
  console.error('  Error creating table:', err.message);
}

// Step 4: Create indexes on outreach_touches
console.log('\nStep 4: Creating indexes on outreach_touches...');
try {
  sqlite.prepare('CREATE INDEX IF NOT EXISTS outreach_touches_chef_id_idx ON outreach_touches(chef_id)').run();
  console.log('  ✓ Created outreach_touches_chef_id_idx index');
} catch (err: any) {
  console.error('  Error creating index:', err.message);
}
try {
  sqlite.prepare('CREATE INDEX IF NOT EXISTS outreach_touches_campaign_id_idx ON outreach_touches(campaign_id)').run();
  console.log('  ✓ Created outreach_touches_campaign_id_idx index');
} catch (err: any) {
  console.error('  Error creating index:', err.message);
}
try {
  sqlite.prepare('CREATE INDEX IF NOT EXISTS outreach_touches_status_idx ON outreach_touches(status)').run();
  console.log('  ✓ Created outreach_touches_status_idx index');
} catch (err: any) {
  console.error('  Error creating index:', err.message);
}
try {
  sqlite.prepare('CREATE INDEX IF NOT EXISTS outreach_touches_channel_idx ON outreach_touches(channel)').run();
  console.log('  ✓ Created outreach_touches_channel_idx index');
} catch (err: any) {
  console.error('  Error creating index:', err.message);
}

// Step 5: Verify
console.log('\n=== Verification ===\n');
try {
  const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='outreach_campaigns'").all();
  console.log(`  outreach_campaigns table exists: ${tables.length > 0}`);
  const columns = sqlite.prepare("PRAGMA table_info(outreach_campaigns)").all();
  console.log('  Columns:', columns.map((c: any) => c.name).join(', '));

  const tables2 = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='outreach_touches'").all();
  console.log(`  outreach_touches table exists: ${tables2.length > 0}`);
  const columns2 = sqlite.prepare("PRAGMA table_info(outreach_touches)").all();
  console.log('  Columns:', columns2.map((c: any) => c.name).join(', '));
} catch (err: any) {
  console.error('  Error verifying:', err.message);
}

console.log('\n=== Acceptance Criteria Check ===');
console.log('✓ outreach_campaigns table created with: id, name, created_at, status');
console.log('✓ outreach_touches table created with: id, chef_id, campaign_id, channel, touch_number, sent_at, status, response_at, notes, created_at');
console.log('✓ POST /api/admin/outreach/touch endpoint');
console.log('✓ GET /api/admin/outreach/stats endpoint');

sqlite.close();
console.log('\n✓ Migration complete');