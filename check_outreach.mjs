import Database from 'better-sqlite3';

const db = new Database('./data/maison.db');

// Check existing campaigns
const campaigns = db.prepare('SELECT * FROM outreach_campaigns LIMIT 10').all();
console.log('Campaigns:', campaigns);

// Check existing outreach_touches for Marcel
const touches = db.prepare('SELECT * FROM outreach_touches WHERE chef_id = 1 ORDER BY created_at DESC').all();
console.log('\nExisting outreach touches for Marcel:', JSON.stringify(touches, null, 2));

// Check schema for outreach_touches
const cols = db.prepare('PRAGMA table_info(outreach_touches)').all();
console.log('\noutreach_touches columns:', cols);

db.close();
