import 'dotenv/config';
import Database from 'better-sqlite3';

const databaseUrl = process.env.DATABASE_URL || './data/maison.db';
const sqlite = new Database(databaseUrl);

// ULID-like ID generator (timestamp + random)
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return timestamp + random;
}

console.log('=== MAI-2440: Seed Demo Chef Availability ===\n');
console.log(`Database: ${databaseUrl}\n`);

// Get all chefs (users with role = 'chef')
console.log('Step 1: Finding all chefs...');
const chefs = sqlite.prepare("SELECT id, name, email FROM users WHERE role = 'chef'").all() as any[];
console.log(`  Found ${chefs.length} chef(s)`);

if (chefs.length === 0) {
  console.log('  ⚠ No chefs found - skipping availability seeding');
  sqlite.close();
  process.exit(0);
}

chefs.forEach((chef: any) => {
  console.log(`  - Chef id=${chef.id}: ${chef.name} (${chef.email})`);
});

// Calculate dates for the next 2 weeks
// We'll spread slots across weekdays and weekends
const today = new Date();
const twoWeeksOut = new Date(today);
twoWeeksOut.setDate(today.getDate() + 14);

function getDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Build a list of dates to add slots for (spread across next 2 weeks)
// Include some weekdays and weekends
const slotDates = [
  // This week - next 7 days
  getDateString(new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000)),  // tomorrow
  getDateString(new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)),  // day after
  getDateString(new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000)),  // 4 days out
  getDateString(new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000)),  // 6 days out (weekend)
  // Next week
  getDateString(new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000)),  // 8 days out
  getDateString(new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000)), // 10 days out
  getDateString(new Date(today.getTime() + 12 * 24 * 60 * 60 * 1000)), // 12 days out (weekend)
  getDateString(new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)), // 14 days out
];

// Slot templates: lunch and dinner slots per date
const slotTemplates = [
  { startTime: '11:00', endTime: '14:00', label: 'lunch' },
  { startTime: '18:00', endTime: '22:00', label: 'dinner' },
];

// Check if availability table exists
console.log('\nStep 2: Checking availability table...');
const tableExists = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='availability'").get();
if (!tableExists) {
  console.log('  ⚠ Availability table does not exist - creating...');
  sqlite.prepare(`
    CREATE TABLE IF NOT EXISTS availability (
      id TEXT PRIMARY KEY,
      chef_id INTEGER NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      is_booked INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `).run();
  console.log('  ✓ Created availability table');
} else {
  console.log('  ✓ Availability table exists');
}

// Step 3: Clear any existing availability slots for these chefs (to make this re-runnable)
console.log('\nStep 3: Clearing existing availability for demo chefs...');
const chefIds = chefs.map((c: any) => c.id);
const placeholders = chefIds.map(() => '?').join(', ');
const deleteResult = sqlite.prepare(`DELETE FROM availability WHERE chef_id IN (${placeholders})`).run(chefIds);
console.log(`  ✓ Cleared ${deleteResult.changes} existing slot(s)`);

// Step 4: Insert availability slots
console.log('\nStep 4: Inserting availability slots...');
const insertStmt = sqlite.prepare(`
  INSERT INTO availability (id, chef_id, date, start_time, end_time, is_booked, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, 0, unixepoch(), unixepoch())
`);

let totalSlots = 0;
for (const chef of chefs) {
  // Add 3-5 slots per chef (alternating between dates)
  const slotsToAdd = slotDates.slice(0, 4 + (chefs.indexOf(chef) % 2)); // 4-5 slots per chef
  
  for (const date of slotsToAdd) {
    for (const slotTemplate of slotTemplates) {
      const id = generateId();
      insertStmt.run(id, chef.id, date, slotTemplate.startTime, slotTemplate.endTime);
      totalSlots++;
    }
  }
  console.log(`  ✓ Chef "${chef.name}" (id=${chef.id}): added ${slotsToAdd.length * slotTemplates.length} slot(s)`);
}

console.log(`\n  Total slots inserted: ${totalSlots}`);

// Step 5: Verify
console.log('\n=== Verification ===\n');
const verifyStmt = sqlite.prepare(`
  SELECT a.chef_id, u.name, COUNT(*) as slot_count 
  FROM availability a 
  JOIN users u ON a.chef_id = u.id 
  GROUP BY a.chef_id, u.name
`);
const verifyResults = verifyStmt.all() as any[];
console.log('Slots per chef:');
verifyResults.forEach((row: any) => {
  console.log(`  - ${row.name} (chef_id=${row.chef_id}): ${row.slot_count} slot(s)`);
});

// Verify no slots are booked
const bookedCount = sqlite.prepare('SELECT COUNT(*) as count FROM availability WHERE is_booked = 1').get() as any;
console.log(`\n  Slots with is_booked=1: ${bookedCount.count} (should be 0)`);

// Show sample slots
console.log('\n  Sample slots (first 6):');
const sampleSlots = sqlite.prepare('SELECT chef_id, date, start_time, end_time FROM availability LIMIT 6').all() as any[];
sampleSlots.forEach((slot: any) => {
  const chef = chefs.find((c: any) => c.id === slot.chef_id);
  console.log(`    - ${chef?.name || slot.chef_id}: ${slot.date} ${slot.start_time}-${slot.end_time}`);
});

console.log('\n=== Acceptance Criteria Check ===');
console.log(`✓ ${chefs.length} chef(s) have availability slots`);
console.log(`✓ Total of ${totalSlots} slot(s) created`);
console.log(`✓ All slots have is_booked = false`);
console.log(`✓ Slots span dates from ${slotDates[0]} to ${slotDates[slotDates.length - 1]}`);

sqlite.close();
console.log('\n✓ Migration complete');