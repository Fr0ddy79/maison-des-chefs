import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq, and } from 'drizzle-orm';
import * as schema from './src/db/schema.js';

const sqlite = new Database('./data/maison.db');
const db = drizzle(sqlite, { schema });

// Get chef Marcel (ID 1)
const chef = db.select().from(schema.users).where(eq(schema.users.id, 1)).get();
console.log('Chef Marcel:', JSON.stringify(chef, null, 2));

// Get pending bookings for Marcel
const pendingBookings = db
  .select()
  .from(schema.bookings)
  .where(and(eq(schema.bookings.chefId, 1), eq(schema.bookings.status, 'pending')))
  .all();

console.log('\nPending bookings:', JSON.stringify(pendingBookings, null, 2));

// Get chef profile
const profile = db.select().from(schema.chefProfiles).where(eq(schema.chefProfiles.userId, 1)).get();
console.log('\nChef profile:', JSON.stringify(profile, null, 2));

sqlite.close();