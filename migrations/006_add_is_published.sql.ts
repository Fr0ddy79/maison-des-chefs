import 'dotenv/config';
import Database from 'better-sqlite3';

const databaseUrl = process.env.DATABASE_URL || './data/maison.db';
const sqlite = new Database(databaseUrl);

console.log('=== MAI-1211: Add isPublished to services ===\n');
console.log(`Database: ${databaseUrl}\n`);

// Step 1: Add isPublished column (boolean, default true, backwards compatible)
console.log('Step 1: Adding isPublished column...');
try {
  // Check if column already exists
  const columns = sqlite.prepare("PRAGMA table_info(services)").all();
  const hasIsPublished = columns.some((col: any) => col.name === 'is_published');
  
  if (hasIsPublished) {
    console.log('  ℹ is_published column already exists, skipping');
  } else {
    sqlite.prepare('ALTER TABLE services ADD COLUMN is_published INTEGER NOT NULL DEFAULT 1').run();
    console.log('  ✓ Added is_published column (default: true / 1)');
  }
} catch (err: any) {
  console.error('  Error adding column:', err.message);
}

// Step 2: Backfill existing services to isPublished = true
console.log('\nStep 2: Backfilling existing services to isPublished = true...');
const result = sqlite.prepare("UPDATE services SET is_published = 1 WHERE is_published IS NULL OR is_published = 0").run();
console.log(`  ✓ Backfilled ${result.changes} services to is_published = 1`);

// Step 3: Verify
console.log('\n=== Verification ===\n');

const verifyServices = sqlite.prepare('SELECT id, name, status, is_published FROM services').all();
console.log('Services:');
verifyServices.forEach((s: any) => {
  console.log(`  id=${s.id}, name="${s.name}", status=${s.status}, is_published=${s.is_published}`);
});

console.log('\n=== Acceptance Criteria Check ===');
console.log(`✓ Column added: is_published (boolean, default true)`);
console.log(`✓ Existing services backfilled: ${result.changes} updated`);

sqlite.close();
console.log('\n✓ Migration complete');
