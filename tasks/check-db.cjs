import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'data/maison.db');
const db = Database(dbPath);

console.log('=== DATABASE CONTENTS ===');

// Count services
const servicesCount = db.prepare("SELECT COUNT(*) as count FROM services WHERE status='published'").get();
console.log(`Published services: ${servicesCount.count}`);

const allServices = db.prepare("SELECT id, name, status FROM services").all();
console.log(`\nAll services (${allServices.length}):`);
allServices.forEach(s => console.log(`  ID ${s.id}: "${s.name}" (status: ${s.status})`));

// Count chefs
const chefsCount = db.prepare("SELECT COUNT(*) as count FROM chefProfiles WHERE available=1").get();
console.log(`\nAvailable chefs: ${chefsCount.count}`);

// Count users
const usersCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
console.log(`Total users: ${usersCount.count}`);

db.close();