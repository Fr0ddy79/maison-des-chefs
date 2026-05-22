import Database from 'better-sqlite3';

const db = new Database('./data/maison.db');

console.log('Starting MAI-1912 migration: make reviews.dinerId nullable for guest checkout...');

// Check current schema
const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='reviews'").get();
console.log('\nCurrent reviews table schema:');
console.log(schema.sql);

// Check if diner_id is nullable
const columns = db.prepare("PRAGMA table_info(reviews)").all();
console.log('\nCurrent columns:');
columns.forEach(c => console.log('  ' + c.name + ': ' + (c.notnull ? 'NOT NULL' : 'NULL')));

// Apply the migration - Create new reviews table with nullable diner_id
console.log('\nCreating reviews_new table with nullable diner_id...');
db.exec(`
CREATE TABLE IF NOT EXISTS reviews_new (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  chef_id integer NOT NULL,
  service_id integer NOT NULL,
  diner_id integer,
  booking_id integer NOT NULL,
  rating integer NOT NULL,
  comment text,
  created_at integer NOT NULL,
  FOREIGN KEY (chef_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (service_id) REFERENCES services(id) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (diner_id) REFERENCES users(id) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON UPDATE no action ON DELETE no action
)
`);

// Copy data
const count = db.prepare('SELECT count(*) as cnt FROM reviews').get();
console.log('Copying ' + count.cnt + ' rows from reviews to reviews_new...');

db.exec(`
INSERT INTO reviews_new (id, chef_id, service_id, diner_id, booking_id, rating, comment, created_at)
SELECT id, chef_id, service_id, diner_id, booking_id, rating, comment, created_at FROM reviews
`);

// Drop old table and rename
console.log('Dropping old reviews table...');
db.exec('DROP TABLE reviews');

console.log('Renaming reviews_new to reviews...');
db.exec('ALTER TABLE reviews_new RENAME TO reviews');

// Recreate indexes
console.log('Recreating indexes...');
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS reviews_booking_id_unique ON reviews (booking_id)');
db.exec('CREATE INDEX IF NOT EXISTS reviews_service_id_idx ON reviews (service_id)');

console.log('\nMigration complete. Verifying...');

const newSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='reviews'").get();
console.log('\nNew reviews table schema:');
console.log(newSchema.sql);

const newColumns = db.prepare("PRAGMA table_info(reviews)").all();
console.log('\nNew columns:');
newColumns.forEach(c => console.log('  ' + c.name + ': ' + (c.notnull ? 'NOT NULL' : 'NULL')));

// Verify no data loss
const newCount = db.prepare('SELECT count(*) as cnt FROM reviews').get();
console.log('\nRows in reviews after migration: ' + newCount.cnt);

db.close();
console.log('\n✅ MAI-1912 migration complete!');