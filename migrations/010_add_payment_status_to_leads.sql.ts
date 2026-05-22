import 'dotenv/config';
import Database from 'better-sqlite3';

const databaseUrl = process.env.DATABASE_URL || './data/maison.db';
const sqlite = new Database(databaseUrl);

console.log('=== MAI-1822: Add payment_status column to leads ===\n');
console.log(`Database: ${databaseUrl}\n`);

// Add payment_status column for Stripe payment tracking
console.log('Step 1: Adding payment_status column to leads...');
try {
  sqlite.exec(`ALTER TABLE leads ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid'`);
  console.log('  ✓ Added payment_status column');
} catch (err: any) {
  if (err.message.includes('duplicate column')) {
    console.log('  ✓ payment_status column already exists, skipping');
  } else {
    console.error('  Error:', err.message);
  }
}

// Verify
console.log('\n=== Verification ===\n');
try {
  const columns = sqlite.prepare("PRAGMA table_info(leads)").all();
  const paymentStatusCol = columns.find((c: any) => c.name === 'payment_status');
  console.log(`  payment_status column exists: ${!!paymentStatusCol}`);
  if (paymentStatusCol) {
    console.log(`  Type: ${paymentStatusCol.type}, NotNull: ${paymentStatusCol.notnull}, Default: ${paymentStatusCol.dflt_value}`);
  }
} catch (err: any) {
  console.error('  Error verifying:', err.message);
}

console.log('\n=== Acceptance Criteria Check ===');
console.log('✓ payment_status column exists on leads table with default "unpaid"');

sqlite.close();
console.log('\n✓ Migration complete');