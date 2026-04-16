import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { config } from '../config/index.js';
import * as schema from './schema.js';

const sqlite = new Database(config.databaseUrl);
export const db = drizzle(sqlite, { schema });
